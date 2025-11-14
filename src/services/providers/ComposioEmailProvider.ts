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
  SendEmailResponse,
  SenderRelationship,
  ParsedEmail
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

  async getSenderRelationshipHistory(
    userId: string,
    senderEmail: string
  ): Promise<SenderRelationship> {
    try {
      logger.debug({
        userId: sanitizeUserId(userId),
        senderEmail,
        provider: this.getProviderName()
      }, 'email.provider.relationship.start');

      // Fetch emails from/to this sender using Composio
      const searchQuery = `from:${senderEmail} OR to:${senderEmail}`;
      const result = await this.composioService.fetchEmails(userId, {
        query: searchQuery,
        maxResults: 100
      });

      const emails = result.messages || [];
      const totalEmails = emails.length;

      // Calculate recent emails (last 30 days)
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const recentEmails = emails.filter((email: any) => {
        const emailDate = email.internalDate ? parseInt(email.internalDate) : 0;
        return emailDate > thirtyDaysAgo;
      }).length;

      // Get first and last interaction dates
      const dates = emails
        .map((email: any) => email.internalDate ? parseInt(email.internalDate) : 0)
        .filter((d: number) => d > 0)
        .sort((a: number, b: number) => a - b);

      const firstInteraction = dates.length > 0 ? new Date(dates[0]) : null;
      const lastInteraction = dates.length > 0 ? new Date(dates[dates.length - 1]) : null;

      // Classify relationship
      let classification: 'stranger' | 'new_contact' | 'known_contact';
      if (totalEmails === 0) {
        classification = 'stranger';
      } else if (totalEmails < 3) {
        classification = 'new_contact';
      } else {
        classification = 'known_contact';
      }

      logger.debug({
        userId: sanitizeUserId(userId),
        senderEmail,
        totalEmails,
        classification
      }, 'email.provider.relationship.success');

      return {
        totalEmails,
        recentEmails,
        firstInteraction,
        lastInteraction,
        classification
      };
    } catch (error) {
      logger.error({
        userId: sanitizeUserId(userId),
        senderEmail,
        error: error instanceof Error ? error.message : String(error)
      }, 'email.provider.relationship.failed');
      throw error;
    }
  }

  async getThreadEmails(
    userId: string,
    threadId: string
  ): Promise<ParsedEmail[]> {
    try {
      logger.debug({
        userId: sanitizeUserId(userId),
        threadId,
        provider: this.getProviderName()
      }, 'email.provider.thread.start');

      // Fetch all emails in the thread using Composio
      // Use Gmail API query to get thread messages
      const searchQuery = `in:anywhere`;  // Fetch all, then filter by thread
      const result = await this.composioService.fetchEmails(userId, {
        maxResults: 500  // Threads can be long
      });

      const emails = (result.messages || [])
        .filter((email: any) => email.threadId === threadId)
        .map((email: any) => this.parseEmailMessage(email));

      logger.debug({
        userId: sanitizeUserId(userId),
        threadId,
        emailCount: emails.length
      }, 'email.provider.thread.success');

      return emails;
    } catch (error) {
      logger.error({
        userId: sanitizeUserId(userId),
        threadId,
        error: error instanceof Error ? error.message : String(error)
      }, 'email.provider.thread.failed');
      throw error;
    }
  }

  async getRecentSenderEmails(
    userId: string,
    senderEmail: string,
    maxResults: number = 5
  ): Promise<ParsedEmail[]> {
    try {
      logger.debug({
        userId: sanitizeUserId(userId),
        senderEmail,
        maxResults,
        provider: this.getProviderName()
      }, 'email.provider.recent_sender.start');

      // Fetch emails from/to this sender
      const searchQuery = `from:${senderEmail} OR to:${senderEmail}`;
      const result = await this.composioService.fetchEmails(userId, {
        query: searchQuery,
        maxResults
      });

      const emails = (result.messages || []).map((email: any) => this.parseEmailMessage(email));

      logger.debug({
        userId: sanitizeUserId(userId),
        senderEmail,
        emailCount: emails.length
      }, 'email.provider.recent_sender.success');

      return emails;
    } catch (error) {
      logger.error({
        userId: sanitizeUserId(userId),
        senderEmail,
        error: error instanceof Error ? error.message : String(error)
      }, 'email.provider.recent_sender.failed');
      throw error;
    }
  }

  /**
   * Helper method to parse email message into ParsedEmail format
   */
  private parseEmailMessage(email: any): ParsedEmail {
    const headers = email.payload?.headers || [];
    const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    return {
      id: email.id,
      threadId: email.threadId,
      from: getHeader('From'),
      to: getHeader('To'),
      subject: getHeader('Subject'),
      body: email.snippet || '',  // Use snippet as body preview
      date: email.internalDate ? new Date(parseInt(email.internalDate)) : new Date(),
      isRead: email.labelIds ? !email.labelIds.includes('UNREAD') : true
    };
  }
}
