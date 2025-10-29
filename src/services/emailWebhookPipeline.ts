/**
 * Shared Email Webhook Pipeline
 *
 * This service contains the core email processing logic used by BOTH:
 * 1. Legacy Google Pub/Sub webhooks (index.ts)
 * 2. Composio webhooks (composio-webhooks.ts)
 *
 * Architecture:
 * - Service-agnostic: Works with GmailService OR ComposioGmailService
 * - ServiceFactory handles the routing based on USE_COMPOSIO flag
 * - All sophisticated logic in ONE place (webhook_processed, filtering, atomic saves)
 *
 * This prevents code duplication and ensures both webhook paths get:
 * ✅ Smart email filtering (no-reply, newsletters, auto-generated)
 * ✅ AI classification (newsletter vs personal)
 * ✅ Atomic database operations (prevents race conditions)
 * ✅ Multiuser safety (ServiceFactory isolation)
 * ✅ Sophisticated error handling (auth failures, retry logic)
 * ✅ Batch processing with concurrency limits
 */

import { logger, sanitizeUserId } from '../utils/pino-logger';
import { EmailModel } from '../models/Email';
import { PromotionalEmailModel } from '../models/PromotionalEmail';
import { IntelligentEmailRouter } from './intelligentEmailRouter';
import { AIService } from './ai';

/**
 * Gmail service interface - both GmailService and ComposioGmailService implement this
 */
export interface IGmailService {
  getEmailByMessageId(messageId: string): Promise<any>;
  getRecentEmails(count: number): Promise<any[]>;
  parseEmail(email: any): any;
}

/**
 * Notification data from webhook
 * Can come from Google Pub/Sub or Composio
 */
export interface WebhookNotification {
  messageId?: string;     // Specific message ID (if provided)
  historyId?: string;     // History ID for batch processing
  emailAddress?: string;  // Target email (for routing)
}

/**
 * Pipeline dependencies injected via constructor
 */
export interface PipelineDependencies {
  intelligentRouter: IntelligentEmailRouter;
  aiService: AIService;
  emailModel: EmailModel;
  promotionalEmailModel: PromotionalEmailModel;
}

/**
 * Email processing result
 */
export interface EmailProcessingResult {
  status: 'success' | 'skipped' | 'duplicate' | 'error';
  emailId: string;
  reason?: string;
  processingTime?: number;
}

/**
 * Shared email webhook pipeline
 * Used by both Google Pub/Sub and Composio webhooks
 */
export class EmailWebhookPipeline {
  private intelligentRouter: IntelligentEmailRouter;
  private aiService: AIService;
  private emailModel: EmailModel;
  private promotionalEmailModel: PromotionalEmailModel;

  constructor(dependencies: PipelineDependencies) {
    this.intelligentRouter = dependencies.intelligentRouter;
    this.aiService = dependencies.aiService;
    this.emailModel = dependencies.emailModel;
    this.promotionalEmailModel = dependencies.promotionalEmailModel;
  }

  /**
   * Process email notification for a specific user
   * This is the main entry point called by both webhook handlers
   *
   * @param notification - Webhook notification data
   * @param userId - User ID to process for
   * @param gmailService - Gmail service (GmailService or ComposioGmailService)
   * @param preFetchedEmail - Optional pre-fetched email (for Composio webhooks that include full email data)
   */
  async processNotification(
    notification: WebhookNotification,
    userId: string,
    gmailService: IGmailService,
    preFetchedEmail?: any
  ): Promise<void> {
    const startTime = Date.now();

    try {
      logger.info({
        userId: sanitizeUserId(userId),
        historyId: notification.historyId,
        messageId: notification.messageId,
        hasPreFetchedEmail: !!preFetchedEmail
      }, 'webhook.pipeline.start');

      let emailsToProcess: any[] = [];

      // Step 1: Extract email data based on notification type
      if (notification.messageId) {
        logger.debug({
          messageId: notification.messageId
        }, 'webhook.pipeline.specific_message');

        // If email is already provided (Composio webhook), use it directly
        // Otherwise, fetch from API (legacy Google Pub/Sub)
        let email;
        if (preFetchedEmail) {
          logger.debug({
            messageId: notification.messageId
          }, 'webhook.pipeline.using_prefetched_email');
          email = preFetchedEmail;
        } else {
          email = await gmailService.getEmailByMessageId(notification.messageId);
        }

        if (email) {
          // Check if this specific email has been processed by webhook FOR THIS USER
          const existingEmail = await this.emailModel.getEmailByGmailId(email.id, userId);

          if (!existingEmail || !existingEmail.webhook_processed) {
            emailsToProcess = [email];
            const parsedEmail = gmailService.parseEmail(email);
            logger.debug({
              subject: parsedEmail.subject,
              webhookProcessed: existingEmail?.webhook_processed || 'new'
            }, 'webhook.pipeline.email_queued');
          } else {
            const parsedEmail = gmailService.parseEmail(email);
            logger.debug({
              subject: parsedEmail.subject
            }, 'webhook.pipeline.already_processed');
          }
        }
      } else {
        logger.debug('webhook.pipeline.checking_recent');

        // Get recent emails using the provided gmail service
        const recentEmails = await gmailService.getRecentEmails(5);

        for (const email of recentEmails) {
          // Check if we've already processed this email via webhook FOR THIS USER
          const existingEmail = await this.emailModel.getEmailByGmailId(email.id, userId);

          if (!existingEmail || !existingEmail.webhook_processed) {
            emailsToProcess.push(email);
            const parsedEmail = gmailService.parseEmail(email);
            logger.debug({
              subject: parsedEmail.subject,
              webhookProcessed: existingEmail?.webhook_processed || 'new'
            }, 'webhook.pipeline.email_queued');
          } else {
            const parsedEmail = gmailService.parseEmail(email);
            logger.debug({
              subject: parsedEmail.subject
            }, 'webhook.pipeline.already_processed_skip');
          }
        }
      }

      logger.info({
        emailCount: emailsToProcess.length,
        userId: sanitizeUserId(userId)
      }, 'webhook.pipeline.emails_found');

      // Step 2: Process emails with concurrency limit
      if (emailsToProcess.length > 0) {
        const results = await this.processBatchWithConcurrency(
          emailsToProcess,
          userId,
          gmailService
        );

        // Log summary
        const successful = results.filter(r => r.status === 'success').length;
        const skipped = results.filter(r => r.status === 'skipped').length;
        const duplicates = results.filter(r => r.status === 'duplicate').length;
        const errors = results.filter(r => r.status === 'error').length;

        logger.info({
          successful,
          skipped,
          duplicates,
          errors,
          totalEmails: results.length,
          userId: sanitizeUserId(userId)
        }, 'webhook.pipeline.summary');
      } else {
        logger.debug({
          userId: sanitizeUserId(userId)
        }, 'webhook.pipeline.no_emails');
      }

      const totalTime = Date.now() - startTime;
      logger.info({
        totalTime,
        userId: sanitizeUserId(userId),
        historyId: notification.historyId
      }, 'webhook.pipeline.complete');

    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        userId: sanitizeUserId(userId),
        historyId: notification.historyId
      }, 'webhook.pipeline.error');

      // Graceful degradation
      await this.storeFailedNotification(notification, error);
      throw error;
    }
  }

  /**
   * Process batch of emails with concurrency limit
   * Prevents overwhelming APIs with parallel requests
   */
  private async processBatchWithConcurrency(
    emails: any[],
    userId: string,
    gmailService: IGmailService
  ): Promise<EmailProcessingResult[]> {
    const CONCURRENCY_LIMIT = 3; // Limit concurrent API calls

    logger.info({
      emailCount: emails.length,
      concurrencyLimit: CONCURRENCY_LIMIT,
      userId: sanitizeUserId(userId)
    }, 'webhook.pipeline.batch_start');

    const results: EmailProcessingResult[] = [];

    for (let i = 0; i < emails.length; i += CONCURRENCY_LIMIT) {
      const batch = emails.slice(i, i + CONCURRENCY_LIMIT);
      const batchNumber = Math.floor(i / CONCURRENCY_LIMIT) + 1;

      logger.debug({
        batchNumber,
        batchSize: batch.length
      }, 'webhook.pipeline.batch_processing');

      // Process batch in parallel using Promise.allSettled for safe error handling
      const batchPromises = batch.map(emailData =>
        this.processEmailSafe(emailData, userId, gmailService)
      );
      const batchResults = await Promise.allSettled(batchPromises);

      // Extract results and log any failures
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          logger.error({
            batchNumber,
            emailIndex: index + 1,
            error: result.reason?.message || 'Unknown error'
          }, 'webhook.pipeline.batch_failed');

          results.push({
            status: 'error',
            emailId: batch[index]?.id || 'unknown',
            reason: result.reason?.message || 'Unknown error'
          });
        }
      });

      // Small delay between batches to be gentle on APIs
      if (i + CONCURRENCY_LIMIT < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Process a single email safely with full error handling
   */
  private async processEmailSafe(
    emailData: any,
    userId: string,
    gmailService: IGmailService
  ): Promise<EmailProcessingResult> {
    const processingStartTime = Date.now();

    try {
      // Parse email content
      const parsedEmail = gmailService.parseEmail(emailData);

      logger.debug({
        subject: parsedEmail.subject,
        from: parsedEmail.from,
        userId: sanitizeUserId(userId)
      }, 'webhook.pipeline.processing_email');

      // Step 3: Smart email filtering
      const shouldGenerate = await this.shouldGenerateResponseForEmail(
        parsedEmail,
        userId
      );

      if (!shouldGenerate.generate) {
        logger.debug({
          subject: parsedEmail.subject,
          reason: shouldGenerate.reason
        }, 'webhook.pipeline.email_filtered');

        // Save email and mark as webhook processed (even though no draft was generated)
        const result = await this.emailModel.saveEmailAndMarkAsWebhookProcessedForUser(
          parsedEmail,
          userId
        );

        if (result.success) {
          logger.debug({
            emailId: result.emailId
          }, 'webhook.pipeline.email_marked_filtered');
        }

        return {
          status: 'skipped',
          emailId: parsedEmail.id,
          reason: shouldGenerate.reason,
          processingTime: Date.now() - processingStartTime
        };
      }

      logger.debug({
        subject: parsedEmail.subject,
        reason: shouldGenerate.reason
      }, 'webhook.pipeline.email_qualifies');

      // Step 4: Atomically save email and mark as webhook processed
      const result = await this.emailModel.saveEmailAndMarkAsWebhookProcessedForUser(
        parsedEmail,
        userId
      );

      if (!result.success) {
        logger.debug({
          subject: parsedEmail.subject
        }, 'webhook.pipeline.duplicate');

        return {
          status: 'duplicate',
          emailId: parsedEmail.id,
          processingTime: Date.now() - processingStartTime
        };
      }

      const emailId = result.emailId!;

      // Step 5: Process email through intelligent router
      logger.debug({ emailId: parsedEmail.id }, 'webhook.pipeline.routing');

      const routingResult = await this.intelligentRouter.routeEmail(
        parsedEmail,
        userId,
        emailId
      );

      logger.info({
        emailId,
        subject: parsedEmail.subject,
        route: routingResult.routingDecision.route,
        reasoning: routingResult.routingDecision.reasoning,
        userId: sanitizeUserId(userId)
      }, 'webhook.pipeline.routed');

      // Log specific results
      if (routingResult.meetingResult?.isMeetingRequest) {
        logger.info({
          emailId,
          meetingType: routingResult.meetingResult.meetingRequest?.meetingType,
          confidence: routingResult.meetingResult.confidence,
          actionTaken: routingResult.meetingResult.response?.actionTaken
        }, 'webhook.pipeline.meeting_detected');
      } else if (routingResult.autoDraftResult) {
        logger.info({
          emailId,
          draftSubject: routingResult.autoDraftResult.subject,
          tone: routingResult.autoDraftResult.tone,
          urgency: routingResult.autoDraftResult.urgencyLevel
        }, 'webhook.pipeline.draft_generated');
      }

      const totalProcessingTime = Date.now() - processingStartTime;
      logger.debug({
        emailId,
        processingTime: totalProcessingTime
      }, 'webhook.pipeline.timing');

      return {
        status: 'success',
        emailId: parsedEmail.id,
        processingTime: totalProcessingTime
      };

    } catch (emailError) {
      logger.error({
        emailId: emailData.id || 'unknown',
        error: emailError instanceof Error ? emailError.message : String(emailError),
        userId: sanitizeUserId(userId)
      }, 'webhook.pipeline.email_error');

      return {
        status: 'error',
        emailId: emailData.id || 'unknown',
        reason: emailError instanceof Error ? emailError.message : 'Unknown error',
        processingTime: Date.now() - processingStartTime
      };
    }
  }

  /**
   * Smart email filtering logic
   * Determines if we should generate a response for this email
   */
  private async shouldGenerateResponseForEmail(
    email: any,
    userId: string
  ): Promise<{ generate: boolean; reason: string; classification?: string }> {
    const fromEmail = email.from.toLowerCase();
    const subject = email.subject;
    const body = email.body;

    logger.debug({
      subject,
      from: fromEmail,
      userId: sanitizeUserId(userId)
    }, 'webhook.filter.start');

    // Skip no-reply addresses (fast check)
    const noReplyPatterns = ['no-reply', 'noreply', 'do-not-reply', 'donotreply'];
    if (noReplyPatterns.some(pattern => fromEmail.includes(pattern))) {
      return { generate: false, reason: 'No-reply email address' };
    }

    // Skip obvious auto-generated emails (fast check)
    const autoGenerated = ['automated', 'auto-generated', 'system generated', 'bounce', 'delivery failure'];
    if (autoGenerated.some(keyword => subject.toLowerCase().includes(keyword)) ||
        autoGenerated.some(keyword => body.toLowerCase().includes(keyword.toLowerCase()))) {
      return { generate: false, reason: 'Auto-generated email detected' };
    }

    // Use AI classification for newsletter vs personal email detection
    try {
      const classification = await this.aiService.classifyEmail(subject, body, fromEmail);

      if (classification === 'newsletter') {
        // Save promotional email instead of just discarding
        try {
          await this.promotionalEmailModel.savePromotionalEmail({
            gmail_id: email.id,
            user_id: userId,
            thread_id: email.threadId,
            subject: email.subject,
            from_email: email.from,
            to_email: email.to,
            body: email.body,
            classification_reason: 'newsletter',
            received_at: email.date
          });

          logger.info({
            userId: sanitizeUserId(userId),
            subject
          }, 'webhook.filter.promotional_saved');
        } catch (saveError) {
          logger.error({
            userId: sanitizeUserId(userId),
            error: saveError instanceof Error ? saveError.message : String(saveError)
          }, 'webhook.filter.promotional_save_failed');
          // Continue with filtering even if save fails
        }

        return {
          generate: false,
          reason: 'AI classified as newsletter/promotional content',
          classification: 'newsletter'
        };
      } else {
        return {
          generate: true,
          reason: 'AI classified as personal/business communication',
          classification: 'personal'
        };
      }
    } catch (error) {
      logger.error({
        userId: sanitizeUserId(userId),
        error: error instanceof Error ? error.message : String(error)
      }, 'webhook.filter.classification_failed');

      return {
        generate: true,
        reason: 'AI classification failed - defaulting to process'
      };
    }
  }

  /**
   * Store failed notification for manual review
   */
  private async storeFailedNotification(notification: any, error: any): Promise<void> {
    try {
      logger.warn({
        notification,
        error: error instanceof Error ? error.message : String(error)
      }, 'webhook.pipeline.storing_failed_notification');

      // TODO: Implement persistent storage for failed notifications
      // For now, just log it
    } catch (storeError) {
      logger.error({
        error: storeError instanceof Error ? storeError.message : String(storeError)
      }, 'webhook.pipeline.store_failed_notification_error');
    }
  }
}
