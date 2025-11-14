/**
 * Email Provider Interface
 *
 * Defines the contract for email operations that can be implemented
 * by different providers (Composio, Google OAuth, etc.)
 *
 * This abstraction allows the application to switch between providers
 * without changing business logic.
 */

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
   * Get provider name (for logging/debugging)
   */
  getProviderName(): string;
}
