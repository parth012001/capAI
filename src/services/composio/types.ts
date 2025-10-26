/**
 * Composio SDK Type Definitions
 *
 * These types are based on the official @composio/core SDK v0.2.0
 * and actual API responses. No 'as any' shortcuts - proper type safety.
 */

/**
 * Connection statuses from Composio SDK
 * Source: ConnectedAccountRetrieveResponseSchema in @composio/core
 */
export type ConnectedAccountStatus =
  | 'INITIALIZING'
  | 'INITIATED'
  | 'ACTIVE'
  | 'FAILED'
  | 'EXPIRED'
  | 'INACTIVE';

/**
 * Connected Account response from SDK
 * This is what waitForConnection() returns
 */
export interface ComposioConnectedAccount {
  id: string;
  status: ConnectedAccountStatus;
  toolkit: {
    slug: string;
  };
  authConfig: {
    id: string;
    isComposioManaged: boolean;
    isDisabled: boolean;
  };
  createdAt: string;
  updatedAt: string;
  data?: Record<string, unknown>;
  params?: Record<string, unknown>;
  statusReason?: string | null;
  testRequestEndpoint?: string;
  testRequestStatus?: string;
  testRequestMessage?: string;
}

/**
 * Connection Request returned by connectedAccounts.initiate() or .link()
 */
export interface ComposioConnectionRequest {
  id: string;
  status?: ConnectedAccountStatus;
  redirectUrl?: string | null;
  waitForConnection: (timeout?: number) => Promise<ComposioConnectedAccount>;
}

/**
 * OAuth callback query parameters
 * What Composio sends to your callback URL after OAuth
 */
export interface ComposioOAuthCallbackParams {
  connectedAccountId: string;
  connection_status: 'active' | 'failed' | 'initiated';
  state?: string;
}

/**
 * Tool execution parameters
 * Based on ToolExecuteParamsSchema from SDK
 */
export interface ComposioToolExecuteParams {
  userId: string;
  arguments: Record<string, any>;
  connectedAccountId?: string;
  version?: string;
  dangerouslySkipVersionCheck?: boolean;
  allowTracing?: boolean;
}

/**
 * Tool execution response from Composio
 * Based on ToolExecuteResponseSchema from SDK
 */
export interface ComposioToolExecuteResponse {
  data: Record<string, unknown>;
  successful: boolean;
  error: string | null;
  logId?: string;
  sessionInfo?: unknown;
}

/**
 * Trigger instance upsert parameters
 * Based on TriggerInstanceUpsertParamsSchema from SDK
 */
export interface TriggerInstanceUpsertParams {
  connectedAccountId?: string;
  triggerConfig?: Record<string, unknown>;
}

/**
 * Trigger instance upsert response
 * Based on TriggerInstanceUpsertResponseSchema from SDK
 */
export interface TriggerInstanceUpsertResponse {
  triggerId: string;
}

/**
 * Trigger instance list active response item
 * Based on TriggerInstanceListActiveResponseItemSchema from SDK
 */
export interface TriggerInstanceListActiveResponseItem {
  id: string;
  connectedAccountId: string;
  updatedAt: string;
  state: Record<string, unknown>;
  disabledAt: string | null;
  triggerConfig: Record<string, unknown>;
  triggerName: string;
  uuid?: string;
  triggerData?: string;
}

/**
 * Trigger instance list active response
 * Based on TriggerInstanceListActiveResponseSchema from SDK
 */
export interface TriggerInstanceListActiveResponse {
  items: TriggerInstanceListActiveResponseItem[];
  nextCursor: string | null;
  totalPages: number;
}

/**
 * Trigger instance delete response
 * Based on TriggerInstanceManageDeleteResponseSchema from SDK
 */
export interface TriggerInstanceManageDeleteResponse {
  triggerId: string;
}

/**
 * Email data structure for Gmail actions
 * This matches what GMAIL_FETCH_EMAILS returns
 */
export interface ComposioGmailMessage {
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
  from?: string;
  to?: string;
  subject?: string;
  body?: string;
  date?: string;
}

/**
 * Webhook trigger payload from Composio
 */
export interface ComposioTriggerPayload {
  trigger_name: string;
  entity_id: string;
  connected_account_id: string;
  payload: {
    messageId?: string;
    threadId?: string;
    from?: string;
    subject?: string;
    [key: string]: unknown;
  };
  metadata?: Record<string, unknown>;
}

/**
 * Custom errors for better error handling
 */
export class ComposioAuthenticationError extends Error {
  constructor(message: string, public readonly details?: unknown) {
    super(message);
    this.name = 'ComposioAuthenticationError';
  }
}

export class ComposioAPIError extends Error {
  constructor(message: string, public readonly details?: unknown) {
    super(message);
    this.name = 'ComposioAPIError';
  }
}

export class ComposioConnectionTimeoutError extends Error {
  constructor(message: string, public readonly connectedAccountId?: string) {
    super(message);
    this.name = 'ComposioConnectionTimeoutError';
  }
}

/**
 * Type guard to check if a connection is active
 */
export function isActiveConnection(account: ComposioConnectedAccount): boolean {
  return account.status === 'ACTIVE';
}

/**
 * Type guard to check if OAuth callback has required params
 */
export function isValidOAuthCallback(query: any): query is ComposioOAuthCallbackParams {
  return (
    typeof query === 'object' &&
    typeof query.connectedAccountId === 'string' &&
    typeof query.connection_status === 'string'
  );
}

/**
 * List connected accounts query parameters
 * Based on ConnectedAccountListParamsSchema from SDK
 */
export interface ConnectedAccountListParams {
  authConfigIds?: string[] | null;
  cursor?: string | null;
  labels?: string[] | null;
  limit?: number | null;
  orderBy?: 'created_at' | 'updated_at';
  statuses?: ConnectedAccountStatus[] | null;
  toolkitSlugs?: string[] | null;
  userIds?: string[] | null;
}

/**
 * List connected accounts response
 * Based on ConnectedAccountListResponseSchema from SDK
 */
export interface ConnectedAccountListResponse {
  items: ComposioConnectedAccount[];
  cursor?: string | null;
  hasMore?: boolean;
}

/**
 * Extract email from Composio connected account data
 * Composio stores user email in the data object
 */
export function extractEmailFromAccount(account: ComposioConnectedAccount): string | null {
  // Email might be in different places depending on the integration
  if (account.data?.email && typeof account.data.email === 'string') {
    return account.data.email;
  }
  if (account.data?.accountEmail && typeof account.data.accountEmail === 'string') {
    return account.data.accountEmail;
  }
  if (account.data?.user_email && typeof account.data.user_email === 'string') {
    return account.data.user_email;
  }
  return null;
}
