/**
 * Composio Webhook Routes
 *
 * Handles incoming webhook notifications from Composio triggers
 */

import { Router } from 'express';
import { ComposioTriggersService, TriggerPayload } from '../services/composio/triggers';
import { logger, sanitizeUserId } from '../utils/pino-logger';
import { redis } from '../utils/redis';
import { ServiceFactory } from '../utils/serviceFactory';
import { EmailModel } from '../models/Email';
import { IntelligentEmailRouter } from '../services/intelligentEmailRouter';

const router = Router();

// Track webhook statistics
const webhookStats = {
  totalReceived: 0,
  totalProcessed: 0,
  lastReceived: null as Date | null,
  lastProcessed: null as Date | null
};

/**
 * Composio webhook endpoint
 * Receives trigger notifications from Composio (Gmail, Calendar, etc.)
 */
router.post('/webhooks/composio', async (req, res) => {
  try {
    webhookStats.totalReceived++;
    webhookStats.lastReceived = new Date();

    logger.info({
      totalReceived: webhookStats.totalReceived
    }, 'webhook.composio.received');

    logger.debug({
      headers: req.headers,
      body: req.body
    }, 'webhook.composio.raw_data');

    // Acknowledge receipt immediately (best practice for webhooks)
    res.status(200).send('OK');

    // Validate webhook signature (if Composio provides one)
    const signature = req.headers['x-composio-signature'] as string;
    if (signature) {
      const isValid = ComposioTriggersService.validateWebhookSignature(
        signature,
        JSON.stringify(req.body)
      );

      if (!isValid) {
        logger.warn('webhook.composio.invalid_signature');
        return;
      }
    }

    // Extract trigger payload
    const triggerPayload: TriggerPayload = req.body;

    if (!triggerPayload.trigger_name || !triggerPayload.entity_id) {
      logger.warn({
        payload: req.body
      }, 'webhook.composio.invalid_payload');
      return;
    }

    // Idempotency check to prevent duplicate processing
    const lockKey = `webhook:composio:${triggerPayload.trigger_name}:${triggerPayload.payload?.messageId || Date.now()}`;
    const lockAcquired = await redis.acquireLock(lockKey, 60);

    if (!lockAcquired) {
      logger.warn({
        trigger: triggerPayload.trigger_name,
        messageId: triggerPayload.payload?.messageId
      }, 'webhook.composio.duplicate_skipped');
      return;
    }

    logger.debug({
      trigger: triggerPayload.trigger_name,
      entityId: sanitizeUserId(triggerPayload.entity_id)
    }, 'webhook.composio.lock_acquired');

    // Release lock after short delay (deduplication window)
    setTimeout(() => {
      redis.releaseLock(lockKey).catch(err => {
        logger.debug({
          lockKey,
          error: err instanceof Error ? err.message : String(err)
        }, 'webhook.composio.lock_release_error');
      });
    }, 5000); // 5 second deduplication window

    // Process trigger asynchronously
    setImmediate(async () => {
      try {
        await processComposioTrigger(triggerPayload);
        webhookStats.totalProcessed++;
        webhookStats.lastProcessed = new Date();
      } catch (error) {
        logger.error({
          trigger: triggerPayload.trigger_name,
          error: error instanceof Error ? error.message : String(error)
        }, 'webhook.composio.processing.failed');
      }
    });

  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error)
    }, 'webhook.composio.error');
  }
});

/**
 * Process Composio trigger webhook
 */
async function processComposioTrigger(payload: TriggerPayload): Promise<void> {
  const startTime = Date.now();

  logger.info({
    trigger: payload.trigger_name,
    entityId: sanitizeUserId(payload.entity_id)
  }, 'webhook.composio.process.start');

  try {
    // Process trigger through ComposioTriggersService
    const triggerData = await ComposioTriggersService.processTrigger(payload);

    if (!triggerData) {
      logger.warn({
        trigger: payload.trigger_name
      }, 'webhook.composio.process.no_data');
      return;
    }

    // Handle Gmail new message trigger
    if (payload.trigger_name === 'gmail_new_gmail_message') {
      await processGmailNewMessage(payload.entity_id, triggerData);
    }

    // Handle Calendar triggers
    else if (payload.trigger_name === 'googlecalendar_event_created' ||
             payload.trigger_name === 'googlecalendar_event_updated') {
      await processCalendarEvent(payload.entity_id, triggerData);
    }

    const duration = Date.now() - startTime;
    logger.info({
      trigger: payload.trigger_name,
      duration
    }, 'webhook.composio.process.success');

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error({
      trigger: payload.trigger_name,
      duration,
      error: error instanceof Error ? error.message : String(error)
    }, 'webhook.composio.process.failed');
    throw error;
  }
}

/**
 * Process new Gmail message from Composio trigger
 */
async function processGmailNewMessage(entityId: string, messageData: any): Promise<void> {
  try {
    logger.info({
      entityId: sanitizeUserId(entityId),
      messageId: messageData.messageId,
      from: messageData.from
    }, 'webhook.composio.gmail.new_message');

    // Get userId from entityId
    const { TokenStorageService } = await import('../services/tokenStorage');
    const tokenStorage = new TokenStorageService();

    // Find user by Composio entity ID
    const query = `
      SELECT user_id FROM user_gmail_tokens
      WHERE composio_entity_id = $1 AND auth_method = 'composio'
    `;
    const { queryWithRetry } = await import('../database/connection');
    const result = await queryWithRetry(query, [entityId]);

    if (result.rows.length === 0) {
      logger.warn({
        entityId: sanitizeUserId(entityId)
      }, 'webhook.composio.gmail.user_not_found');
      return;
    }

    const userId = result.rows[0].user_id;

    // Create service container for this user
    const services = ServiceFactory.createForUser(userId, entityId);
    const gmail = await services.getGmailService();

    // Fetch the full email details
    const email = await gmail.getEmailByMessageId(messageData.messageId);

    if (!email) {
      logger.warn({
        userId: sanitizeUserId(userId),
        messageId: messageData.messageId
      }, 'webhook.composio.gmail.email_not_found');
      return;
    }

    // Parse and save email
    const parsedEmail = gmail.parseEmail(email);
    const emailModel = new EmailModel();

    // Check if email already exists
    const exists = await emailModel.emailExists(parsedEmail.id, userId);

    if (!exists) {
      const emailDbId = await emailModel.saveEmail(parsedEmail, userId);

      logger.info({
        userId: sanitizeUserId(userId),
        emailId: parsedEmail.id,
        emailDbId
      }, 'webhook.composio.gmail.email_saved');

      // Route through intelligent email router
      if (emailDbId) {
        const responseService = await services.getResponseService();
        const intelligentRouter = new IntelligentEmailRouter(responseService);

        const routingResult = await intelligentRouter.routeEmail(
          parsedEmail,
          userId,
          emailDbId
        );

        logger.info({
          userId: sanitizeUserId(userId),
          route: routingResult.routingDecision.route,
          confidence: routingResult.routingDecision.confidence
        }, 'webhook.composio.gmail.routed');
      }
    } else {
      logger.debug({
        userId: sanitizeUserId(userId),
        emailId: parsedEmail.id
      }, 'webhook.composio.gmail.email_exists');
    }

  } catch (error) {
    logger.error({
      entityId: sanitizeUserId(entityId),
      error: error instanceof Error ? error.message : String(error)
    }, 'webhook.composio.gmail.failed');
    throw error;
  }
}

/**
 * Process calendar event from Composio trigger
 */
async function processCalendarEvent(entityId: string, eventData: any): Promise<void> {
  try {
    logger.info({
      entityId: sanitizeUserId(entityId),
      eventId: eventData.eventId,
      summary: eventData.summary
    }, 'webhook.composio.calendar.event');

    // TODO: Implement calendar event processing logic
    // For now, just log the event

  } catch (error) {
    logger.error({
      entityId: sanitizeUserId(entityId),
      error: error instanceof Error ? error.message : String(error)
    }, 'webhook.composio.calendar.failed');
    throw error;
  }
}

/**
 * Get webhook statistics (for monitoring)
 */
router.get('/webhooks/composio/stats', (req, res) => {
  res.json({
    ...webhookStats,
    uptime: process.uptime(),
    status: 'healthy'
  });
});

export default router;
