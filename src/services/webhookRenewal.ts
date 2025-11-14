import { TokenStorageService } from './tokenStorage';
import { GmailService } from './gmail';

import { logger, sanitizeUserId } from '../utils/pino-logger';
export class WebhookRenewalService {
  private tokenStorageService: TokenStorageService;
  private renewalInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    this.tokenStorageService = new TokenStorageService();
  }

  /**
   * Start automatic webhook renewal service
   * Checks every 6 hours for webhooks expiring in the next 24 hours
   *
   * 🚀 PHASE 5: Can be disabled via DISABLE_GOOGLE_WEBHOOKS env var when using Composio triggers
   */
  startRenewalService(): void {
    // Check if Google webhooks are disabled (using Composio triggers instead)
    if (process.env.DISABLE_GOOGLE_WEBHOOKS === 'true') {
      logger.info({
        reason: 'using_composio_triggers'
      }, 'webhook.renewal.service.disabled');
      console.log('⚠️  Google webhook renewal service disabled - using Composio triggers');
      console.log('   To re-enable: set DISABLE_GOOGLE_WEBHOOKS=false');
      return;  // Don't start renewal service
    }

    logger.info({ intervalHours: 6 }, 'webhook.renewal.service.started');
    console.log('✅ Google webhook renewal service started (checks every 6 hours)');

    // Run immediately on startup
    this.checkAndRenewWebhooks();

    // Then run every 6 hours
    this.renewalInterval = setInterval(() => {
      this.checkAndRenewWebhooks();
    }, 6 * 60 * 60 * 1000); // 6 hours in milliseconds

      }

  /**
   * Stop the renewal service
   */
  stopRenewalService(): void {
    if (this.renewalInterval) {
      clearInterval(this.renewalInterval);
      this.renewalInterval = null;
          }
  }

  /**
   * Check for expiring webhooks and renew them
   */
  private async checkAndRenewWebhooks(): Promise<void> {
    try {
            
      const expiringUsers = await this.tokenStorageService.getUsersWithExpiringWebhooks();
      
      if (expiringUsers.length === 0) {
                return;
      }

      logger.warn({ count: expiringUsers.length }, 'webhook.renewal.required');

      // Renew webhooks for each user
      for (const user of expiringUsers) {
        await this.renewWebhookForUser(user.userId, user.gmailAddress);
      }

    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'webhook.renewal.check.failed');
    }
  }

  /**
   * Renew webhook for a specific user
   */
  private async renewWebhookForUser(userId: string, gmailAddress: string): Promise<void> {
    try {
      
      const gmailService = new GmailService();
      
      // Initialize Gmail service for the user
      await gmailService.initializeForUser(userId);
      
      // Setup/renew the webhook
      const watchResponse = await gmailService.setupWebhook();
      
      logger.info({ gmailAddress, expiresAt: new Date(parseInt(watchResponse.expiration)).toISOString(), historyId: watchResponse.historyId }, 'webhook.renewed');

    } catch (error) {
      logger.error({ gmailAddress, error: error instanceof Error ? error.message : String(error) }, 'webhook.renewal.failed');
      
      // If renewal fails, disable webhook to prevent continuous failures
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('invalid_grant') || errorMessage.includes('credentials')) {
        logger.warn({ gmailAddress, reason: 'invalid_credentials' }, 'webhook.disabled');
        await this.tokenStorageService.disableWebhookForUser(userId, 'Invalid credentials');
      }
    }
  }

  /**
   * Manually trigger webhook renewal check (for testing/debugging)
   */
  async manualRenewalCheck(): Promise<void> {
        await this.checkAndRenewWebhooks();
  }

  /**
   * Get webhook status for all active users
   */
  async getWebhookStatus(): Promise<any[]> {
    try {
      const activeUsers = await this.tokenStorageService.getActiveWebhookUsers();
      
      return activeUsers.map(user => ({
        userId: user.userId,
        gmailAddress: user.gmailAddress,
        webhookActive: user.webhookActive,
        webhookExpiresAt: user.webhookExpiresAt,
        timeUntilExpiration: user.webhookExpiresAt 
          ? Math.max(0, user.webhookExpiresAt.getTime() - Date.now()) 
          : null,
        needsRenewal: user.webhookExpiresAt 
          ? user.webhookExpiresAt.getTime() <= (Date.now() + 24 * 60 * 60 * 1000)
          : false
      }));
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'webhook.status.failed');
      return [];
    }
  }
}