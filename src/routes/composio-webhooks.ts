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
import { PromotionalEmailModel } from '../models/PromotionalEmail';
import { IntelligentEmailRouter } from '../services/intelligentEmailRouter';
import {
  EmailWebhookPipeline,
  WebhookNotification,
  IGmailService
} from '../services/emailWebhookPipeline';

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

    // Support both old and new Composio webhook formats
    const triggerName = triggerPayload.trigger_name || triggerPayload.type;
    const entityId = triggerPayload.entity_id || triggerPayload.data?.user_id;
    const messageId = triggerPayload.payload?.messageId || triggerPayload.data?.message_id || triggerPayload.data?.id;

    if (!triggerName || !entityId) {
      logger.warn({
        payload: req.body,
        hasTriggerName: !!triggerPayload.trigger_name,
        hasType: !!triggerPayload.type,
        hasEntityId: !!triggerPayload.entity_id,
        hasDataUserId: !!triggerPayload.data?.user_id,
        reason: 'Missing trigger name or entity ID in both formats'
      }, 'webhook.composio.invalid_payload');
      return;
    }

    // Validate entity ID format
    if (!entityId.startsWith('entity_')) {
      logger.error({
        entityId,
        expected: 'entity_<uuid>',
        payload: req.body
      }, 'webhook.composio.invalid_entity_format');
      return;
    }

    logger.info({
      triggerName,
      entityId: sanitizeUserId(entityId),
      messageId,
      format: triggerPayload.trigger_name ? 'old' : 'new'
    }, 'webhook.composio.payload_validated');

    // Idempotency check to prevent duplicate processing
    const lockKey = `webhook:composio:${triggerName}:${messageId || Date.now()}`;
    const lockAcquired = await redis.acquireLock(lockKey, 60);

    if (!lockAcquired) {
      logger.warn({
        trigger: triggerName,
        messageId
      }, 'webhook.composio.duplicate_skipped');
      return;
    }

    logger.debug({
      trigger: triggerName,
      entityId: sanitizeUserId(entityId)
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
        await processComposioTrigger(triggerPayload, triggerName, entityId, messageId);
        webhookStats.totalProcessed++;
        webhookStats.lastProcessed = new Date();
      } catch (error) {
        logger.error({
          trigger: triggerName,
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
async function processComposioTrigger(
  payload: TriggerPayload,
  triggerName: string,
  entityId: string,
  messageId?: string
): Promise<void> {
  const startTime = Date.now();

  logger.info({
    trigger: triggerName,
    entityId: sanitizeUserId(entityId),
    messageId
  }, 'webhook.composio.process.start');

  try {
    // For new format, extract trigger data directly from payload
    let triggerData: any;

    if (payload.data) {
      // New format: data is already structured
      triggerData = {
        messageId: payload.data.message_id || payload.data.id,
        threadId: payload.data.thread_id,
        from: payload.data.sender,
        subject: payload.data.subject,
        bodyText: payload.data.body_text,
        bodyHtml: payload.data.body_html,
        labelIds: payload.data.label_ids,
        ...payload.data
      };
    } else if (payload.payload) {
      // Old format: use ComposioTriggersService
      triggerData = await ComposioTriggersService.processTrigger(payload);
    }

    if (!triggerData) {
      logger.warn({
        trigger: triggerName
      }, 'webhook.composio.process.no_data');
      return;
    }

    // Handle Gmail new message trigger
    if (triggerName === 'gmail_new_gmail_message') {
      await processGmailNewMessage(entityId, triggerData);
    }

    // Handle Calendar triggers
    else if (triggerName === 'googlecalendar_event_created' ||
             triggerName === 'googlecalendar_event_updated') {
      await processCalendarEvent(entityId, triggerData);
    }

    const duration = Date.now() - startTime;
    logger.info({
      trigger: triggerName,
      duration
    }, 'webhook.composio.process.success');

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error({
      trigger: triggerName,
      duration,
      error: error instanceof Error ? error.message : String(error)
    }, 'webhook.composio.process.failed');
    throw error;
  }
}

/**
 * Transform Composio webhook data to EmailMessage format
 * Composio webhooks include the full email data, so we don't need to fetch it
 */
function transformComposioWebhookToEmailMessage(webhookData: any): any {
  // Composio webhook structure:
  // data: { id, message_id, thread_id, label_ids, message_text, subject, sender, to, payload: {headers, parts}, message_timestamp }

  // Transform to Gmail API EmailMessage format
  const emailMessage = {
    id: webhookData.message_id || webhookData.id,
    threadId: webhookData.thread_id,
    labelIds: webhookData.label_ids || [],
    snippet: webhookData.message_text || webhookData.preview?.body || '',
    payload: {
      headers: webhookData.payload?.headers || [],
      body: webhookData.payload?.body || { size: 0 },
      parts: webhookData.payload?.parts || []
    },
    internalDate: webhookData.message_timestamp
      ? new Date(webhookData.message_timestamp).getTime().toString()
      : Date.now().toString()
  };

  logger.debug({
    originalId: webhookData.id,
    transformedId: emailMessage.id,
    hasHeaders: emailMessage.payload.headers.length > 0,
    hasParts: emailMessage.payload.parts.length > 0
  }, 'webhook.composio.email_transformed');

  return emailMessage;
}

/**
 * Process new Gmail message from Composio trigger
 * Uses the shared EmailWebhookPipeline (same logic as legacy Google Pub/Sub)
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
    // ServiceFactory will return ComposioGmailService (based on USE_COMPOSIO=true)
    const services = ServiceFactory.createForUser(userId, entityId);
    const gmail = await services.getGmailService() as IGmailService;
    const responseService = await services.getResponseService();
    const aiService = services.getAIService();

    // Create shared pipeline instance with dependencies
    const pipeline = new EmailWebhookPipeline({
      intelligentRouter: new IntelligentEmailRouter(responseService),
      aiService: aiService,
      emailModel: new EmailModel(),
      promotionalEmailModel: new PromotionalEmailModel()
    });

    // 🎯 CRITICAL: Transform Composio webhook data to EmailMessage format
    // Composio webhooks already contain the full email - no need to fetch from API!
    const emailMessage = transformComposioWebhookToEmailMessage(messageData);

    logger.info({
      userId: sanitizeUserId(userId),
      messageId: messageData.messageId,
      skipApiFetch: true
    }, 'webhook.composio.gmail.using_webhook_data');

    // Build notification object compatible with shared pipeline
    const notification: WebhookNotification = {
      messageId: messageData.messageId,
      emailAddress: undefined // Composio provides user_id directly, no need for email lookup
    };

    // 🚀 Process through shared pipeline with pre-fetched email
    // This uses ALL the sophisticated logic from legacy system:
    // - webhook_processed check
    // - Smart filtering (no-reply, newsletters)
    // - AI classification
    // - Atomic database operations
    // - IntelligentEmailRouter
    // - Batch processing with concurrency limits
    //
    // By passing emailMessage, we skip the API call and use the webhook data directly
    await pipeline.processNotification(notification, userId, gmail, emailMessage);

    logger.info({
      userId: sanitizeUserId(userId),
      messageId: messageData.messageId
    }, 'webhook.composio.gmail.processed');

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
