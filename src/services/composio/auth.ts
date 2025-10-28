/**
 * Composio Authentication Service
 *
 * Handles OAuth flow for Composio integration:
 * - Generating OAuth URLs using connectedAccounts.link()
 * - Processing OAuth callbacks with connectedAccountId
 * - Managing entity connections with proper types
 *
 * Based on official Composio SDK v0.2.0 documentation
 */

import { Composio } from '@composio/core';
import { env } from '../../config/environment';
import { logger } from '../../utils/pino-logger';
import { TokenStorageService } from '../tokenStorage';
import { ComposioTriggersService } from './triggers';
import {
  ComposioConnectionRequest,
  ComposioConnectedAccount,
  ComposioAuthenticationError,
  ComposioConnectionTimeoutError,
  ConnectedAccountListParams,
  ConnectedAccountListResponse,
  extractEmailFromAccount,
  isActiveConnection
} from './types';

export interface ComposioAuthResult {
  userId: string;
  entityId: string;
  email: string;
  connectedApps: string[];
}

export class ComposioAuthService {
  private composio: Composio;
  private tokenStorage: TokenStorageService;

  constructor() {
    if (!env.COMPOSIO_API_KEY) {
      throw new Error('COMPOSIO_API_KEY is required');
    }

    this.composio = new Composio({
      apiKey: env.COMPOSIO_API_KEY
    });

    this.tokenStorage = new TokenStorageService();
  }

  /**
   * Generate Composio OAuth URL for user authentication
   *
   * Uses connectedAccounts.link() method from official SDK
   * @param redirectUrl - URL to redirect after OAuth (your /auth/composio/callback)
   * @param authConfigId - Gmail auth config ID from Composio dashboard (required)
   * @param intent - 'signup' or 'signin' (for logging only, OAuth flow is the same)
   * @returns OAuth URL
   */
  async getOAuthUrl(
    redirectUrl: string,
    authConfigId: string,
    intent: 'signup' | 'signin' = 'signup'
  ): Promise<string> {
    try {
      logger.info({
        intent,
        redirectUrl,
        authConfigId
      }, 'composio.auth.url.generate.start');

      // Generate temporary entityId for this OAuth flow
      // CRITICAL: This entityId must be reused for API calls! Store in state.
      const tempEntityId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Encode entityId in state to retrieve in callback
      const state = Buffer.from(JSON.stringify({
        entityId: tempEntityId,
        intent,
        timestamp: Date.now()
      })).toString('base64');

      // Build callback URL with state parameter
      const callbackWithState = `${redirectUrl}?state=${encodeURIComponent(state)}`;

      // Create connection request using Composio's link method
      // Per official docs: composio.connectedAccounts.link(entityId, authConfigId, options)
      const connectionRequest: ComposioConnectionRequest = await this.composio.connectedAccounts.link(
        tempEntityId,
        authConfigId,
        {
          callbackUrl: callbackWithState
        }
      );

      if (!connectionRequest.redirectUrl) {
        throw new ComposioAuthenticationError(
          'No redirect URL returned from Composio',
          { tempEntityId, authConfigId }
        );
      }

      logger.info({
        intent,
        tempEntityId,
        hasRedirectUrl: !!connectionRequest.redirectUrl
      }, 'composio.auth.url.generated');

      return connectionRequest.redirectUrl;
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        redirectUrl
      }, 'composio.auth.url.failed');

      if (error instanceof ComposioAuthenticationError) {
        throw error;
      }

      throw new ComposioAuthenticationError(
        `Failed to generate Composio OAuth URL: ${error instanceof Error ? error.message : String(error)}`,
        { originalError: error }
      );
    }
  }

  /**
   * Process OAuth callback and create/update user
   *
   * Per Composio docs: After OAuth, you receive connectedAccountId in callback
   * Use waitForConnection() to get the full connected account details
   *
   * @param connectedAccountId - Connected account ID from Composio callback
   * @param state - State parameter (optional)
   * @returns User authentication result with userId, entityId, email
   */
  async processOAuthCallback(connectedAccountId: string, state?: string): Promise<ComposioAuthResult> {
    try {
      logger.info({ connectedAccountId }, 'composio.auth.callback.start');

      // Wait for connection to become ACTIVE (with 60 second timeout)
      // Returns ComposioConnectedAccount with proper typing
      const connectedAccount: ComposioConnectedAccount = await this.composio.connectedAccounts.waitForConnection(
        connectedAccountId,
        60000
      );

      // Validate connection is active
      if (!isActiveConnection(connectedAccount)) {
        throw new ComposioAuthenticationError(
          `Connection is not active. Status: ${connectedAccount.status}`,
          { connectedAccountId, status: connectedAccount.status }
        );
      }

      // CRITICAL FIX: Extract the original entityId from state parameter
      let entityIdFromState: string | undefined;
      try {
        if (state) {
          const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
          entityIdFromState = decoded.entityId;
          logger.debug({ entityIdFromState }, 'composio.auth.entity.extracted');
        }
      } catch (e) {
        logger.error({ state, error: e }, 'composio.auth.state.parse.failed');
        throw new ComposioAuthenticationError(
          'Failed to parse state parameter - entity ID required for API calls',
          { state }
        );
      }

      if (!entityIdFromState) {
        throw new ComposioAuthenticationError(
          'No entity ID found in state - cannot make API calls',
          { connectedAccountId }
        );
      }

      logger.debug({
        connectedAccountId,
        entityId: entityIdFromState,
        status: connectedAccount.status,
        integrationSlug: connectedAccount.toolkit.slug
      }, 'composio.auth.connection.complete');

      // Get user email by calling Gmail's getProfile API through Composio
      // CRITICAL: Use the SAME entityId that was used to create the connection
      let userEmail: string;

      try {
        const { ComposioClient } = await import('./client');

        logger.debug({
          connectedAccountId,
          entityId: entityIdFromState,
          attemptingProfileCall: true
        }, 'composio.auth.profile.start');

        // Execute Gmail's get profile action using Composio SDK
        // CRITICAL FIX: Pass the original entityId, not 'default'!
        const profileResult = await ComposioClient.executeAction(
          entityIdFromState,  // Use the entity ID that created this connection
          'GMAIL_GET_PROFILE',
          { user_id: 'me' },
          connectedAccountId
        );

        if (!profileResult?.emailAddress) {
          throw new Error('No email address in Gmail profile response');
        }

        userEmail = profileResult.emailAddress;

        logger.info({
          connectedAccountId,
          email: userEmail
        }, 'composio.auth.email.retrieved');

      } catch (error) {
        logger.error({
          connectedAccountId,
          error: error instanceof Error ? error.message : String(error),
          availableData: Object.keys(connectedAccount.data || {})
        }, 'composio.auth.email.retrieval.failed');

        throw new ComposioAuthenticationError(
          'Failed to retrieve user email from Composio',
          { connectedAccountId, originalError: error }
        );
      }

      // CRITICAL FIX: Use connectedAccountId for all API calls
      // The connectedAccountId is the stable, permanent identifier from Composio
      // that should be used for all future API interactions

      logger.info({
        email: userEmail,
        connectedAccountId: connectedAccountId,
        status: connectedAccount.status
      }, 'composio.auth.account.connected');

      // Save to database with connectedAccountId
      // This is what we'll use for ALL Composio API calls
      const userName = connectedAccount.data?.name as string | undefined;
      const userId = await this.tokenStorage.saveComposioEntity(
        userEmail,
        connectedAccountId,  // FIXED: Store connectedAccountId, NOT a generated entityId
        {
          fullName: userName,
          firstName: userName?.split(' ')[0],
          lastName: userName?.split(' ').slice(1).join(' ')
        }
      );

      // Set up Gmail trigger for real-time notifications
      try {
        if (!env.WEBHOOK_DOMAIN) {
          logger.warn('WEBHOOK_DOMAIN not configured, skipping trigger setup');
        } else {
          const webhookUrl = `${env.WEBHOOK_DOMAIN}/webhooks/composio`;
          await ComposioTriggersService.setupGmailTrigger(connectedAccountId, webhookUrl);
          logger.info({ connectedAccountId }, 'composio.auth.trigger.setup.success');
        }
      } catch (triggerError) {
        logger.warn({
          connectedAccountId,
          error: triggerError instanceof Error ? triggerError.message : String(triggerError)
        }, 'composio.auth.trigger.setup.failed');
        // Don't fail the auth if trigger setup fails - user can still use the system
      }

      logger.info({
        userId,
        email: userEmail,
        connectedAccountId
      }, 'composio.auth.callback.success');

      return {
        userId,
        entityId: connectedAccountId,  // FIXED: Return connectedAccountId as entityId
        email: userEmail,
        connectedApps: [connectedAccount.toolkit.slug]
      };
    } catch (error) {
      logger.error({
        connectedAccountId,
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.auth.callback.failed');

      if (error instanceof ComposioAuthenticationError || error instanceof ComposioConnectionTimeoutError) {
        throw error;
      }

      throw new ComposioAuthenticationError(
        `OAuth callback processing failed: ${error instanceof Error ? error.message : String(error)}`,
        { connectedAccountId, originalError: error }
      );
    }
  }

  /**
   * Check if user has valid Composio connection
   *
   * @param userId - User ID to check
   * @returns true if user has valid connection
   */
  async hasValidConnection(userId: string): Promise<boolean> {
    try {
      const entityId = await this.tokenStorage.getComposioEntityId(userId);

      if (!entityId) {
        return false;
      }

      // Check if entity has active connections
      // Proper SDK usage: list() accepts ConnectedAccountListParams with userIds array
      const params: ConnectedAccountListParams = {
        userIds: [entityId],
        statuses: ['ACTIVE']
      };

      const response: ConnectedAccountListResponse = await this.composio.connectedAccounts.list(params);

      // Check for Gmail connections in the response
      const hasGmail = response.items.some(
        (conn) => conn.toolkit.slug === 'gmail' && conn.status === 'ACTIVE'
      );

      return hasGmail;
    } catch (error) {
      logger.error({
        userId,
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.auth.check.failed');
      return false;
    }
  }

  /**
   * Disconnect user's Composio connection
   *
   * @param userId - User ID to disconnect
   * @returns Success status
   */
  async disconnect(userId: string): Promise<boolean> {
    try {
      const entityId = await this.tokenStorage.getComposioEntityId(userId);

      if (!entityId) {
        return false;
      }

      // Get all connections for entity
      // Proper SDK usage: list() with userIds parameter
      const params: ConnectedAccountListParams = {
        userIds: [entityId]
      };

      const response: ConnectedAccountListResponse = await this.composio.connectedAccounts.list(params);

      // Disconnect all connections
      // Proper iteration over typed items array
      for (const connection of response.items) {
        await this.composio.connectedAccounts.delete(connection.id);
      }

      // Update database
      await this.tokenStorage.updateMigrationStatus(userId, 'pending');

      logger.info({ userId, entityId }, 'composio.auth.disconnected');
      return true;
    } catch (error) {
      logger.error({
        userId,
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.auth.disconnect.failed');
      return false;
    }
  }

  /**
   * Get user's connected apps
   *
   * @param userId - User ID
   * @returns Array of connected app slugs (e.g., ['gmail', 'googlecalendar'])
   */
  async getConnectedApps(userId: string): Promise<string[]> {
    try {
      const entityId = await this.tokenStorage.getComposioEntityId(userId);

      if (!entityId) {
        return [];
      }

      // Proper SDK usage: list() with userIds parameter
      const params: ConnectedAccountListParams = {
        userIds: [entityId]
      };

      const response: ConnectedAccountListResponse = await this.composio.connectedAccounts.list(params);

      // Extract toolkit slugs from properly typed response
      return response.items.map((conn) => conn.toolkit.slug);
    } catch (error) {
      logger.error({
        userId,
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.auth.apps.failed');
      return [];
    }
  }
}
