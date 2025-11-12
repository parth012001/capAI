import { Composio } from '@composio/core';
import logger, { sanitizeUserId } from '../utils/pino-logger';

export class ComposioService {
  private composio: any;

  constructor() {
    this.composio = new Composio({
      apiKey: process.env.COMPOSIO_API_KEY!
    });
  }

  async createEntity(userId: string): Promise<string> {
    // NOTE: Composio SDK v0.5.39 doesn't have entities.create()
    // Entity is created automatically when first connection is initiated
    // We just return the userId as the entityId
    logger.info({
      userId: sanitizeUserId(userId),
      entityId: userId
    }, 'composio.entity.created');

    return userId;
  }

  async initiateGmailConnection(userId: string): Promise<{
    redirectUrl: string;
    connectionId?: string;
  }> {
    try {
      const connectionRequest = await this.composio.connectedAccounts.link(
        userId,
        process.env.COMPOSIO_GMAIL_AUTH_CONFIG_ID!
      );

      logger.info({
        userId: sanitizeUserId(userId),
        redirectUrl: connectionRequest.redirectUrl
      }, 'composio.gmail.connection.initiated');

      return {
        redirectUrl: connectionRequest.redirectUrl,
        connectionId: undefined
      };
    } catch (error: any) {
      logger.error({
        userId: sanitizeUserId(userId),
        error: error?.response?.data || error.message
      }, 'composio.gmail.connection.initiate.failed');
      throw error;
    }
  }

  async initiateCalendarConnection(userId: string): Promise<{
    redirectUrl: string;
    connectionId?: string;
  }> {
    try {
      const connectionRequest = await this.composio.connectedAccounts.link(
        userId,
        process.env.COMPOSIO_CALENDAR_AUTH_CONFIG_ID!
      );

      logger.info({
        userId: sanitizeUserId(userId),
        redirectUrl: connectionRequest.redirectUrl
      }, 'composio.calendar.connection.initiated');

      return {
        redirectUrl: connectionRequest.redirectUrl,
        connectionId: undefined
      };
    } catch (error: any) {
      logger.error({
        userId: sanitizeUserId(userId),
        error: error?.response?.data || error.message
      }, 'composio.calendar.connection.initiate.failed');
      throw error;
    }
  }

  async getConnectionStatus(connectionId: string): Promise<{
    status: string;
    connectedAccountId?: string;
  }> {
    try {
      const connection: any = await this.composio.connectedAccounts.get({
        connectedAccountId: connectionId
      });

      return {
        status: connection.status?.toLowerCase() || 'unknown',
        connectedAccountId: connection.id
      };
    } catch (error) {
      logger.error({
        connectionId,
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.connection.status.failed');
      throw error;
    }
  }

  async fetchEmails(userId: string, params?: {
    maxResults?: number;
    query?: string;
  }): Promise<any> {
    try {
      const result: any = await this.composio.actions.execute({
        actionName: 'GMAIL_FETCH_EMAILS',
        requestBody: {
          entityId: userId,
          input: {
            maxResults: params?.maxResults || 50,
            query: params?.query || ''
          }
        }
      });

      logger.info({
        userId: sanitizeUserId(userId),
        emailCount: Array.isArray(result.data?.messages) ? result.data.messages.length : 0
      }, 'composio.gmail.emails.fetched');

      return result.data;
    } catch (error) {
      logger.error({
        userId: sanitizeUserId(userId),
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.gmail.fetch.failed');
      throw error;
    }
  }

  async sendEmail(userId: string, params: {
    to: string;
    subject: string;
    body: string;
    inReplyTo?: string;
    references?: string;
    cc?: string;
    bcc?: string;
  }): Promise<{ id: string; threadId: string }> {
    try {
      const result: any = await this.composio.actions.execute({
        actionName: 'GMAIL_SEND_EMAIL',
        requestBody: {
          entityId: userId,
          input: {
            to: params.to,
            subject: params.subject,
            body: params.body,
            in_reply_to: params.inReplyTo,
            references: params.references,
            cc: params.cc,
            bcc: params.bcc
          }
        }
      });

      logger.info({
        userId: sanitizeUserId(userId),
        emailId: result.data?.id,
        threadId: result.data?.threadId
      }, 'composio.gmail.email.sent');

      return {
        id: result.data?.id || '',
        threadId: result.data?.threadId || ''
      };
    } catch (error) {
      logger.error({
        userId: sanitizeUserId(userId),
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.gmail.send.failed');
      throw error;
    }
  }

  async replyToThread(userId: string, params: {
    threadId: string;
    body: string;
    to: string;
    subject: string;
  }): Promise<{ id: string; threadId: string }> {
    try {
      const result: any = await this.composio.actions.execute({
        actionName: 'GMAIL_REPLY_TO_THREAD',
        requestBody: {
          entityId: userId,
          input: {
            thread_id: params.threadId,
            body: params.body,
            to: params.to,
            subject: params.subject
          }
        }
      });

      logger.info({
        userId: sanitizeUserId(userId),
        threadId: params.threadId,
        emailId: result.data?.id
      }, 'composio.gmail.reply.sent');

      return {
        id: result.data?.id || '',
        threadId: result.data?.threadId || params.threadId
      };
    } catch (error) {
      logger.error({
        userId: sanitizeUserId(userId),
        threadId: params.threadId,
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.gmail.reply.failed');
      throw error;
    }
  }

  async listCalendarEvents(userId: string, params: {
    timeMin: Date;
    timeMax: Date;
    maxResults?: number;
  }): Promise<any[]> {
    try {
      const result: any = await this.composio.actions.execute({
        actionName: 'GOOGLECALENDAR_LIST_EVENTS',
        requestBody: {
          entityId: userId,
          input: {
            timeMin: params.timeMin.toISOString(),
            timeMax: params.timeMax.toISOString(),
            maxResults: params.maxResults || 100
          }
        }
      });

      logger.info({
        userId: sanitizeUserId(userId),
        eventCount: Array.isArray(result.data?.items) ? result.data.items.length : 0
      }, 'composio.calendar.events.fetched');

      return result.data?.items || [];
    } catch (error) {
      logger.error({
        userId: sanitizeUserId(userId),
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.calendar.list.failed');
      throw error;
    }
  }

  async createCalendarEvent(userId: string, params: {
    summary: string;
    start: Date;
    end: Date;
    attendees?: string[];
    description?: string;
    location?: string;
  }): Promise<{ id: string; htmlLink: string }> {
    try {
      const result: any = await this.composio.actions.execute({
        actionName: 'GOOGLECALENDAR_CREATE_EVENT',
        requestBody: {
          entityId: userId,
          input: {
            summary: params.summary,
            start: { dateTime: params.start.toISOString() },
            end: { dateTime: params.end.toISOString() },
            attendees: params.attendees?.map(email => ({ email })),
            description: params.description,
            location: params.location
          }
        }
      });

      logger.info({
        userId: sanitizeUserId(userId),
        eventId: result.data?.id
      }, 'composio.calendar.event.created');

      return {
        id: result.data?.id || '',
        htmlLink: result.data?.htmlLink || ''
      };
    } catch (error) {
      logger.error({
        userId: sanitizeUserId(userId),
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.calendar.create.failed');
      throw error;
    }
  }

  async setupGmailTrigger(userId: string, callbackUrl: string): Promise<string> {
    try {
      const trigger: any = await this.composio.triggers.setup({
        connectedAccountId: userId,
        triggerName: 'GMAIL_NEW_GMAIL_MESSAGE',
        config: {
          webhookUrl: callbackUrl,
          interval: 60
        }
      });

      logger.info({
        userId: sanitizeUserId(userId),
        triggerId: trigger?.id || 'unknown'
      }, 'composio.trigger.gmail.setup');

      return trigger?.id || '';
    } catch (error) {
      logger.error({
        userId: sanitizeUserId(userId),
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.trigger.setup.failed');
      throw error;
    }
  }

  async getAvailableActions(integrationId: string): Promise<string[]> {
    try {
      const actions: any = await this.composio.actions.list({
        apps: integrationId
      });

      return Array.isArray(actions.items) ? actions.items.map((action: any) => action.name) : [];
    } catch (error) {
      logger.error({
        integrationId,
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.actions.list.failed');
      throw error;
    }
  }
}

export const composioService = new ComposioService();
