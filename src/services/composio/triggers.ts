/**
 * Composio Triggers Service
 *
 * Handles Composio webhook triggers for real-time notifications.
 * Replaces Gmail Push API with Composio's trigger system (1-minute polling).
 */

import { ComposioClient } from './client';
import { logger } from '../../utils/pino-logger';
import { env } from '../../config/environment';
import {
  TriggerInstanceUpsertParams,
  TriggerInstanceUpsertResponse,
  TriggerInstanceListActiveResponse,
  TriggerInstanceManageDeleteResponse
} from './types';

export interface TriggerPayload {
  trigger_name: string;
  entity_id: string;
  payload: any;
  metadata?: Record<string, any>;
}

export class ComposioTriggersService {
  /**
   * Set up Gmail new message trigger for a user
   *
   * @param entityId - User's Composio entity ID
   * @param webhookUrl - Your webhook URL to receive trigger notifications
   * @returns Trigger configuration with proper typing
   */
  static async setupGmailTrigger(entityId: string, webhookUrl: string): Promise<TriggerInstanceUpsertResponse> {
    try {
      const client = ComposioClient.getInstance();

      logger.info({
        entityId,
        webhookUrl,
        trigger: 'gmail_new_gmail_message'
      }, 'composio.trigger.setup.start');

      // Proper SDK usage: create(userId: string, slug: string, body?: TriggerInstanceUpsertParams)
      const params: TriggerInstanceUpsertParams = {
        triggerConfig: {
          webhookUrl
        }
      };

      const response: TriggerInstanceUpsertResponse = await client.triggers.create(
        entityId,
        'gmail_new_gmail_message',
        params
      );

      logger.info({
        entityId,
        triggerId: response.triggerId
      }, 'composio.trigger.setup.success');

      return response;
    } catch (error) {
      logger.error({
        entityId,
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.trigger.setup.failed');
      throw error;
    }
  }

  /**
   * Process incoming Composio trigger webhook
   *
   * @param payload - Trigger payload from Composio
   * @returns Processed trigger data
   */
  static async processTrigger(payload: TriggerPayload): Promise<any> {
    try {
      logger.info({
        triggerName: payload.trigger_name,
        entityId: payload.entity_id
      }, 'composio.trigger.received');

      switch (payload.trigger_name) {
        case 'gmail_new_gmail_message':
          return await this.processGmailNewMessage(payload);

        case 'googlecalendar_event_created':
          return await this.processCalendarEventCreated(payload);

        case 'googlecalendar_event_updated':
          return await this.processCalendarEventUpdated(payload);

        default:
          logger.warn({
            triggerName: payload.trigger_name
          }, 'composio.trigger.unknown');
          return null;
      }
    } catch (error) {
      logger.error({
        triggerName: payload.trigger_name,
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.trigger.process.failed');
      throw error;
    }
  }

  /**
   * Process new Gmail message trigger
   */
  private static async processGmailNewMessage(payload: TriggerPayload): Promise<any> {
    try {
      const { entity_id, payload: triggerData } = payload;

      logger.debug({
        entityId: entity_id,
        messageId: triggerData.messageId
      }, 'composio.trigger.gmail.processing');

      // Extract message details from trigger payload
      const messageData = {
        messageId: triggerData.messageId || triggerData.id,
        threadId: triggerData.threadId,
        historyId: triggerData.historyId,
        emailAddress: triggerData.emailAddress,
        from: triggerData.from,
        subject: triggerData.subject,
        snippet: triggerData.snippet,
        labelIds: triggerData.labelIds || []
      };

      logger.info({
        entityId: entity_id,
        messageId: messageData.messageId,
        from: messageData.from
      }, 'composio.trigger.gmail.processed');

      return messageData;
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.trigger.gmail.failed');
      throw error;
    }
  }

  /**
   * Process calendar event created trigger
   */
  private static async processCalendarEventCreated(payload: TriggerPayload): Promise<any> {
    try {
      const { entity_id, payload: triggerData } = payload;

      logger.debug({
        entityId: entity_id,
        eventId: triggerData.id
      }, 'composio.trigger.calendar.created');

      return {
        eventId: triggerData.id,
        summary: triggerData.summary,
        start: triggerData.start,
        end: triggerData.end,
        attendees: triggerData.attendees
      };
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.trigger.calendar.create.failed');
      throw error;
    }
  }

  /**
   * Process calendar event updated trigger
   */
  private static async processCalendarEventUpdated(payload: TriggerPayload): Promise<any> {
    try {
      const { entity_id, payload: triggerData } = payload;

      logger.debug({
        entityId: entity_id,
        eventId: triggerData.id
      }, 'composio.trigger.calendar.updated');

      return {
        eventId: triggerData.id,
        summary: triggerData.summary,
        start: triggerData.start,
        end: triggerData.end,
        status: triggerData.status
      };
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.trigger.calendar.update.failed');
      throw error;
    }
  }

  /**
   * Validate Composio webhook signature (security)
   *
   * @param signature - Signature from Composio webhook header
   * @param payload - Raw webhook payload
   * @returns true if signature is valid
   */
  static validateWebhookSignature(signature: string, payload: string): boolean {
    try {
      // TODO: Implement signature validation using Composio's webhook secret
      // For now, return true (implement proper validation in production)
      return true;
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.webhook.signature.failed');
      return false;
    }
  }

  /**
   * List active triggers for an entity
   *
   * @param entityId - User's Composio entity ID (optional - if not provided, lists all triggers)
   * @returns Array of active triggers with proper typing
   */
  static async listTriggers(entityId?: string): Promise<TriggerInstanceListActiveResponse['items']> {
    try {
      const client = ComposioClient.getInstance();

      // Proper SDK usage: listActive() returns TriggerInstanceListActiveResponse
      const response: TriggerInstanceListActiveResponse = await client.triggers.listActive();

      logger.debug({
        entityId,
        triggerCount: response.items.length
      }, 'composio.triggers.listed');

      // If entityId provided, filter by that entity
      // Otherwise return all triggers
      if (entityId) {
        return response.items.filter(item => item.connectedAccountId === entityId);
      }

      return response.items;
    } catch (error) {
      logger.error({
        entityId,
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.triggers.list.failed');
      return [];
    }
  }

  /**
   * Delete trigger for an entity
   *
   * @param triggerId - Trigger ID to delete
   * @returns Success status
   */
  static async deleteTrigger(triggerId: string): Promise<boolean> {
    try {
      const client = ComposioClient.getInstance();

      // Proper SDK usage: delete(triggerId: string) returns TriggerInstanceManageDeleteResponse
      const response: TriggerInstanceManageDeleteResponse = await client.triggers.delete(triggerId);

      logger.info({
        triggerId: response.triggerId
      }, 'composio.trigger.deleted');

      return true;
    } catch (error) {
      logger.error({
        triggerId,
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.trigger.delete.failed');
      return false;
    }
  }
}
