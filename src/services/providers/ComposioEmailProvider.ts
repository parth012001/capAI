/**
 * Composio Email Provider
 *
 * Implements IEmailProvider using Composio SDK
 * Wraps Composio service methods with standard interface
 */

import {
  IEmailProvider,
  SendEmailParams,
  ReplyToThreadParams,
  FetchEmailsParams,
  FetchEmailsResponse,
  SendEmailResponse
} from './IEmailProvider';
import { ComposioService } from '../composio';
import logger, { sanitizeUserId } from '../../utils/pino-logger';

export class ComposioEmailProvider implements IEmailProvider {
  private composioService: ComposioService;

  constructor(composioService: ComposioService) {
    this.composioService = composioService;
  }

  getProviderName(): string {
    return 'Composio';
  }

  async fetchEmails(
    userId: string,
    params?: FetchEmailsParams
  ): Promise<FetchEmailsResponse> {
    try {
      logger.info({
        userId: sanitizeUserId(userId),
        provider: this.getProviderName(),
        maxResults: params?.maxResults || 50
      }, 'email.provider.fetch.start');

      // Call Composio service
      const result = await this.composioService.fetchEmails(userId, {
        maxResults: params?.maxResults,
        query: params?.query
      });

      logger.info({
        userId: sanitizeUserId(userId),
        provider: this.getProviderName(),
        emailCount: result.messages?.length || 0
      }, 'email.provider.fetch.success');

      return {
        messages: result.messages || [],
        nextPageToken: result.nextPageToken,
        resultSizeEstimate: result.resultSizeEstimate
      };
    } catch (error) {
      logger.error({
        userId: sanitizeUserId(userId),
        provider: this.getProviderName(),
        error: error instanceof Error ? error.message : String(error)
      }, 'email.provider.fetch.failed');
      throw error;
    }
  }

  async sendEmail(
    userId: string,
    params: SendEmailParams
  ): Promise<SendEmailResponse> {
    try {
      logger.info({
        userId: sanitizeUserId(userId),
        provider: this.getProviderName(),
        to: params.to,
        subject: params.subject
      }, 'email.provider.send.start');

      // Call Composio service
      const result = await this.composioService.sendEmail(userId, {
        to: params.to,
        subject: params.subject,
        body: params.body,
        inReplyTo: params.inReplyTo,
        references: params.references,
        cc: params.cc,
        bcc: params.bcc
      });

      logger.info({
        userId: sanitizeUserId(userId),
        provider: this.getProviderName(),
        emailId: result.id,
        threadId: result.threadId
      }, 'email.provider.send.success');

      return {
        id: result.id,
        threadId: result.threadId
      };
    } catch (error) {
      logger.error({
        userId: sanitizeUserId(userId),
        provider: this.getProviderName(),
        error: error instanceof Error ? error.message : String(error)
      }, 'email.provider.send.failed');
      throw error;
    }
  }

  async replyToThread(
    userId: string,
    params: ReplyToThreadParams
  ): Promise<SendEmailResponse> {
    try {
      logger.info({
        userId: sanitizeUserId(userId),
        provider: this.getProviderName(),
        threadId: params.threadId
      }, 'email.provider.reply.start');

      // Call Composio service
      const result = await this.composioService.replyToThread(userId, {
        threadId: params.threadId,
        body: params.body,
        to: params.to,
        subject: params.subject
      });

      logger.info({
        userId: sanitizeUserId(userId),
        provider: this.getProviderName(),
        emailId: result.id,
        threadId: result.threadId
      }, 'email.provider.reply.success');

      return {
        id: result.id,
        threadId: result.threadId
      };
    } catch (error) {
      logger.error({
        userId: sanitizeUserId(userId),
        provider: this.getProviderName(),
        error: error instanceof Error ? error.message : String(error)
      }, 'email.provider.reply.failed');
      throw error;
    }
  }
}
