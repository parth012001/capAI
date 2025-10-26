/**
 * Composio Gmail Service
 *
 * Wrapper around Composio's Gmail actions that maintains the same interface
 * as the original GmailService for seamless migration.
 *
 * Key Differences from Legacy:
 * - No OAuth2Client management (Composio handles it)
 * - No token refresh logic (Composio handles it)
 * - Uses Composio actions instead of direct Gmail API calls
 * - Maintains same method signatures for compatibility
 */

import { ComposioClient } from './client';
import { EmailMessage, ParsedEmail } from '../../types';
import { cleanSubjectLine, encodeEmailHeader } from '../../utils/textEncoding';
import { logger, sanitizeUserId } from '../../utils/pino-logger';

export class ComposioGmailService {
  private entityId: string;
  private userId: string;

  constructor(entityId: string, userId: string) {
    this.entityId = entityId;
    this.userId = userId;
  }

  /**
   * Get recent emails from inbox
   * Maps to GMAIL_FETCH_EMAILS action
   */
  async getRecentEmails(maxResults: number = 50): Promise<EmailMessage[]> {
    try {
      logger.debug({
        userId: sanitizeUserId(this.userId),
        maxResults
      }, 'composio.gmail.fetch.start');

      const result = await ComposioClient.executeAction(
        this.entityId,
        'GMAIL_FETCH_EMAILS',
        {
          maxResults,
          labelIds: ['INBOX']
        }
      );

      // Transform Composio response to EmailMessage format
      const emails = this.transformComposioEmails(result.messages || []);

      logger.info({
        userId: sanitizeUserId(this.userId),
        emailCount: emails.length
      }, 'composio.gmail.emails.fetched');

      return emails;
    } catch (error) {
      logger.error({
        userId: sanitizeUserId(this.userId),
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.gmail.fetch.failed');
      throw error;
    }
  }

  /**
   * Get sent emails
   * Uses GMAIL_FETCH_EMAILS with SENT label filter
   */
  async getSentEmails(maxResults: number = 50): Promise<EmailMessage[]> {
    try {
      const result = await ComposioClient.executeAction(
        this.entityId,
        'GMAIL_FETCH_EMAILS',
        {
          maxResults,
          labelIds: ['SENT']
        }
      );

      const emails = this.transformComposioEmails(result.messages || []);

      logger.info({
        userId: sanitizeUserId(this.userId),
        emailCount: emails.length
      }, 'composio.gmail.sent.fetched');

      return emails;
    } catch (error) {
      logger.error({
        userId: sanitizeUserId(this.userId),
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.gmail.sent.failed');
      throw error;
    }
  }

  /**
   * Get email by message ID
   * Maps to GMAIL_GET_MESSAGE action
   */
  async getEmailByMessageId(messageId: string): Promise<EmailMessage | null> {
    try {
      const result = await ComposioClient.executeAction(
        this.entityId,
        'GMAIL_GET_MESSAGE',
        {
          messageId
        }
      );

      if (!result) return null;

      return this.transformComposioEmail(result);
    } catch (error) {
      logger.error({
        userId: sanitizeUserId(this.userId),
        messageId,
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.gmail.message.failed');
      return null;
    }
  }

  /**
   * Send email via Composio
   * Maps to GMAIL_SEND_EMAIL action
   */
  async sendEmail(
    to: string,
    subject: string,
    body: string,
    threadId?: string
  ): Promise<{ messageId: string; threadId: string }> {
    try {
      const cleanedSubject = cleanSubjectLine(subject);

      logger.debug({
        userId: sanitizeUserId(this.userId),
        to,
        hasThread: !!threadId
      }, 'composio.gmail.send.start');

      const result = await ComposioClient.executeAction(
        this.entityId,
        'GMAIL_SEND_EMAIL',
        {
          to,
          subject: cleanedSubject,
          body,
          threadId
        }
      );

      logger.info({
        userId: sanitizeUserId(this.userId),
        to,
        messageId: result.id,
        threadId: result.threadId
      }, 'composio.gmail.email.sent');

      return {
        messageId: result.id,
        threadId: result.threadId
      };
    } catch (error) {
      logger.error({
        userId: sanitizeUserId(this.userId),
        to,
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.gmail.send.failed');

      throw new Error(`Failed to send email via Composio: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Send email for specific user (wrapper for user context validation)
   * Maintains compatibility with legacy GmailService interface
   */
  async sendEmailForUser(
    userId: string,
    to: string,
    subject: string,
    body: string,
    threadId?: string
  ): Promise<{ messageId: string; threadId: string }> {
    // Validate user context matches
    if (userId !== this.userId) {
      throw new Error('User ID mismatch in Composio Gmail service');
    }

    return this.sendEmail(to, subject, body, threadId);
  }

  /**
   * Get sent emails for specific user (wrapper for user context validation)
   * Maintains compatibility with legacy GmailService interface
   */
  async getSentEmailsForUser(userId: string, maxResults: number = 50): Promise<EmailMessage[]> {
    // Validate user context matches
    if (userId !== this.userId) {
      throw new Error('User ID mismatch in Composio Gmail service');
    }

    return this.getSentEmails(maxResults);
  }

  /**
   * Get thread emails
   * Maps to GMAIL_FETCH_MESSAGE_BY_THREAD_ID action
   */
  async getThreadEmails(threadId: string): Promise<ParsedEmail[]> {
    try {
      const result = await ComposioClient.executeAction(
        this.entityId,
        'GMAIL_FETCH_MESSAGE_BY_THREAD_ID',
        {
          threadId
        }
      );

      const messages = result.messages || [];
      return messages.map((msg: any) => this.parseEmail(this.transformComposioEmail(msg)));
    } catch (error) {
      logger.error({
        userId: sanitizeUserId(this.userId),
        threadId,
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.gmail.thread.failed');
      return [];
    }
  }

  /**
   * Get sender relationship history
   * Uses GMAIL_FETCH_EMAILS with search query
   */
  async getSenderRelationshipHistory(senderEmail: string): Promise<{
    totalEmails: number;
    recentEmails: number;
    firstInteraction: Date | null;
    lastInteraction: Date | null;
    classification: 'stranger' | 'new_contact' | 'known_contact';
  }> {
    try {
      const searchQuery = `from:${senderEmail} OR to:${senderEmail}`;

      const result = await ComposioClient.executeAction(
        this.entityId,
        'GMAIL_FETCH_EMAILS',
        {
          q: searchQuery,
          maxResults: 100
        }
      );

      const messages = result.messages || [];
      const totalEmails = messages.length;

      let firstInteraction: Date | null = null;
      let lastInteraction: Date | null = null;

      if (messages.length > 0) {
        // Assuming messages are sorted by date
        lastInteraction = new Date(messages[0].internalDate);
        firstInteraction = new Date(messages[messages.length - 1].internalDate);
      }

      let classification: 'stranger' | 'new_contact' | 'known_contact';
      if (totalEmails === 0) {
        classification = 'stranger';
      } else if (totalEmails <= 3) {
        classification = 'new_contact';
      } else {
        classification = 'known_contact';
      }

      return {
        totalEmails,
        recentEmails: Math.min(totalEmails, 10),
        firstInteraction,
        lastInteraction,
        classification
      };
    } catch (error) {
      logger.error({
        userId: sanitizeUserId(this.userId),
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.gmail.sender.relationship.failed');

      return {
        totalEmails: 0,
        recentEmails: 0,
        firstInteraction: null,
        lastInteraction: null,
        classification: 'stranger'
      };
    }
  }

  /**
   * Transform Composio email array to EmailMessage array
   */
  private transformComposioEmails(composioMessages: any[]): EmailMessage[] {
    return composioMessages.map(msg => this.transformComposioEmail(msg));
  }

  /**
   * Transform single Composio email to EmailMessage format
   */
  private transformComposioEmail(composioMessage: any): EmailMessage {
    // Composio returns Gmail API format, so we can use it directly
    // or transform if Composio's format differs
    return {
      id: composioMessage.id,
      threadId: composioMessage.threadId,
      labelIds: composioMessage.labelIds || [],
      snippet: composioMessage.snippet || '',
      payload: composioMessage.payload || {},
      internalDate: composioMessage.internalDate || Date.now().toString()
    };
  }

  /**
   * Parse email (reuse logic from original GmailService)
   * This method remains unchanged as it operates on EmailMessage format
   */
  parseEmail(emailData: EmailMessage): ParsedEmail {
    const headers = emailData.payload.headers || [];
    const getHeader = (name: string) =>
      headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    // Extract email body
    let body = '';

    const extractBodyFromPart = (part: any): string => {
      if (!part?.body?.data) return '';
      try {
        return Buffer.from(part.body.data, 'base64').toString('utf-8');
      } catch {
        return '';
      }
    };

    if (emailData.payload.body?.data) {
      body = extractBodyFromPart(emailData.payload);
    } else if (emailData.payload.parts) {
      for (const part of emailData.payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          body = extractBodyFromPart(part);
          if (body) break;
        }
      }
    }

    if (!body && emailData.snippet) {
      body = emailData.snippet;
    }

    body = body.replace(/\r\n/g, '\n').trim();

    return {
      id: emailData.id,
      threadId: emailData.threadId,
      subject: cleanSubjectLine(getHeader('Subject')),
      from: getHeader('From'),
      to: getHeader('To'),
      date: new Date(parseInt(emailData.internalDate)),
      body,
      isRead: !emailData.labelIds.includes('UNREAD')
    };
  }

  /**
   * Filter sent emails for tone analysis
   * (Keep this logic as-is from original service)
   */
  filterSentEmailsForToneAnalysis(emails: EmailMessage[]): EmailMessage[] {
    const filtered: EmailMessage[] = [];

    for (const email of emails) {
      const parsed = this.parseEmail(email);
      if (this.isValidForToneAnalysis(parsed)) {
        filtered.push(email);
      }
    }

    return filtered;
  }

  private isValidForToneAnalysis(email: ParsedEmail): boolean {
    const subject = email.subject.toLowerCase();
    const body = email.body.toLowerCase();

    if (email.body.length === 0) return false;

    const autoReplyKeywords = [
      'out of office',
      'automatic reply',
      'auto-reply',
      'autoreply'
    ];

    for (const keyword of autoReplyKeywords) {
      if (subject.includes(keyword) || body.includes(keyword)) {
        return false;
      }
    }

    const lines = email.body.split('\n');
    const originalLines = lines.filter(line => !line.trim().startsWith('>'));
    const originalText = originalLines.join('\n').trim();

    if (originalText.length < 20) return false;

    return true;
  }

  /**
   * Setup webhook for real-time notifications
   * Note: For Composio, webhooks are managed via triggers (see ComposioTriggersService)
   * This method is a no-op to maintain interface compatibility with legacy GmailService
   */
  async setupWebhook(): Promise<any> {
    logger.info({
      userId: sanitizeUserId(this.userId)
    }, 'composio.gmail.webhook.skip');

    return {
      message: 'Composio webhooks are managed via triggers',
      entityId: this.entityId
    };
  }
}
