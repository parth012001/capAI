/**
 * Email Provider Interface
 *
 * Defines the contract for email operations that can be implemented
 * by different providers (Composio, Google OAuth, etc.)
 *
 * This abstraction allows the application to switch between providers
 * without changing business logic.
 */

// Export ParsedEmail for use by providers
export type { ParsedEmail };

export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
  cc?: string;
  bcc?: string;
}

export interface ReplyToThreadParams {
  threadId: string;
  body: string;
  to: string;
  subject: string;
}

export interface FetchEmailsParams {
  maxResults?: number;
  query?: string;
  pageToken?: string;
}

export interface EmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  payload?: {
    headers?: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: any[];
  };
  internalDate?: string;
  raw?: string;
}

export interface FetchEmailsResponse {
  messages: EmailMessage[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

export interface SendEmailResponse {
  id: string;
  threadId: string;
  labelIds?: string[];
}

export interface SenderRelationship {
  totalEmails: number;
  recentEmails: number;
  firstInteraction: Date | null;
  lastInteraction: Date | null;
  classification: 'stranger' | 'new_contact' | 'known_contact';
}

// Import ParsedEmail from types to avoid duplication
import type { ParsedEmail } from '../../types';

/**
 * IEmailProvider Interface
 *
 * All email provider implementations must implement this interface
 */
export interface IEmailProvider {
  /**
   * Fetch emails for a user
   *
   * @param userId - User identifier
   * @param params - Fetch parameters (maxResults, query, etc.)
   * @returns Promise with email messages
   */
  fetchEmails(
    userId: string,
    params?: FetchEmailsParams
  ): Promise<FetchEmailsResponse>;

  /**
   * Send an email
   *
   * @param userId - User identifier
   * @param params - Email parameters (to, subject, body, etc.)
   * @returns Promise with sent email details
   */
  sendEmail(
    userId: string,
    params: SendEmailParams
  ): Promise<SendEmailResponse>;

  /**
   * Reply to an email thread
   *
   * @param userId - User identifier
   * @param params - Reply parameters (threadId, body, to, subject)
   * @returns Promise with sent reply details
   */
  replyToThread(
    userId: string,
    params: ReplyToThreadParams
  ): Promise<SendEmailResponse>;

  /**
   * Get sender relationship history
   *
   * Analyzes email history with a specific sender to determine relationship strength
   *
   * @param userId - User identifier
   * @param senderEmail - Email address of the sender
   * @returns Promise with relationship data
   */
  getSenderRelationshipHistory(
    userId: string,
    senderEmail: string
  ): Promise<SenderRelationship>;

  /**
   * Get all emails in a thread
   *
   * @param userId - User identifier
   * @param threadId - Gmail thread identifier
   * @returns Promise with array of parsed emails in thread
   */
  getThreadEmails(
    userId: string,
    threadId: string
  ): Promise<ParsedEmail[]>;

  /**
   * Get recent emails from/to a specific sender
   *
   * @param userId - User identifier
   * @param senderEmail - Email address of the sender
   * @param maxResults - Maximum number of emails to return (default: 5)
   * @returns Promise with array of parsed emails
   */
  getRecentSenderEmails(
    userId: string,
    senderEmail: string,
    maxResults?: number
  ): Promise<ParsedEmail[]>;

  /**
   * Get provider name (for logging/debugging)
   */
  getProviderName(): string;
}
