/**
 * Composio Client Wrapper
 *
 * Centralized Composio SDK client with:
 * - Singleton pattern for API key management
 * - Request-scoped entity management
 * - Error handling and retry logic
 * - Logging integration
 */

import { Composio } from '@composio/core';
import { env } from '../../config/environment';
import { logger, sanitizeUserId } from '../../utils/pino-logger';
import {
  ComposioToolExecuteParams,
  ComposioToolExecuteResponse,
  ConnectedAccountListParams,
  ConnectedAccountListResponse
} from './types';

export class ComposioClient {
  private static instance: Composio | null = null;

  /**
   * Get Composio SDK instance (singleton)
   * Reuses same client for all requests to optimize performance
   */
  static getInstance(): Composio {
    if (!ComposioClient.instance) {
      if (!env.COMPOSIO_API_KEY) {
        throw new Error('COMPOSIO_API_KEY is required but not configured');
      }

      ComposioClient.instance = new Composio({
        apiKey: env.COMPOSIO_API_KEY
      });

      logger.info('composio.client.initialized');
    }

    return ComposioClient.instance;
  }

  /**
   * Execute a Composio action with error handling and logging
   *
   * @param entityId - User's Composio entity ID
   * @param action - Action name (e.g., 'GMAIL_SEND_EMAIL')
   * @param params - Action parameters
   * @returns Action execution result
   */
  static async executeAction(
    entityId: string,
    action: string,
    params: Record<string, any>
  ): Promise<any> {
    const startTime = Date.now();
    const client = ComposioClient.getInstance();

    try {
      logger.debug({
        entityId: sanitizeUserId(entityId),
        action,
        paramsKeys: Object.keys(params)
      }, 'composio.action.start');

      // Proper SDK usage: execute(slug: string, body: ToolExecuteParams, modifiers?: ExecuteToolModifiers)
      const executeParams: ComposioToolExecuteParams = {
        userId: entityId,
        arguments: params,
        dangerouslySkipVersionCheck: true // Skip version check for now (TODO: add proper versions)
      };

      const result: ComposioToolExecuteResponse = await client.tools.execute(action, executeParams);

      const duration = Date.now() - startTime;

      // Validate response has expected structure
      if (!result || typeof result.successful !== 'boolean') {
        throw new Error('Invalid response structure from Composio');
      }

      // Check if execution was successful
      if (!result.successful) {
        throw new Error(result.error || 'Tool execution failed');
      }

      logger.info({
        entityId: sanitizeUserId(entityId),
        action,
        duration,
        success: result.successful
      }, 'composio.action.success');

      return result.data;
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error({
        entityId: sanitizeUserId(entityId),
        action,
        duration,
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.action.failed');

      throw new Error(`Composio action ${action} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }


  /**
   * Get entity connection status
   *
   * @param entityId - User's Composio entity ID
   * @returns Connection information with proper typing
   */
  static async getConnectedAccounts(entityId: string): Promise<ConnectedAccountListResponse> {
    const client = ComposioClient.getInstance();

    try {
      // Proper SDK usage: list() with ConnectedAccountListParams
      const params: ConnectedAccountListParams = {
        userIds: [entityId]
      };

      const response: ConnectedAccountListResponse = await client.connectedAccounts.list(params);

      logger.debug({
        entityId: sanitizeUserId(entityId),
        connectionCount: response.items.length
      }, 'composio.connections.fetched');

      return response;
    } catch (error) {
      logger.error({
        entityId: sanitizeUserId(entityId),
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.connections.fetch.failed');

      throw error;
    }
  }

  /**
   * Reset instance (for testing purposes)
   */
  static resetInstance(): void {
    ComposioClient.instance = null;
  }
}

/**
 * Export singleton instance getter as default
 */
export const getComposioClient = () => ComposioClient.getInstance();
