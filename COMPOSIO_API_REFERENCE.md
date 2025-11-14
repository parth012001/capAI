# Composio API Reference - TypeScript SDK v0.2.4

**Generated:** 2025-11-14
**Purpose:** Complete API reference based on working implementation in production codebase
**SDK Version:** @composio/core ^0.2.4

## Table of Contents

1. [SDK Initialization](#sdk-initialization)
2. [Connection Management](#connection-management)
3. [Gmail Operations](#gmail-operations)
4. [Calendar Operations](#calendar-operations)
5. [Trigger/Webhook Management](#triggerwebhook-management)
6. [Response Structures](#response-structures)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)

---

## SDK Initialization

### Constructor Pattern

```typescript
import { Composio } from '@composio/core';

const composio = new Composio({
  apiKey: process.env.COMPOSIO_API_KEY!
});
```

**Environment Variables Required:**
```bash
COMPOSIO_API_KEY=ak_xxxxx                      # Composio API key
COMPOSIO_GMAIL_AUTH_CONFIG_ID=ac_xxxxx         # Gmail auth configuration ID
COMPOSIO_CALENDAR_AUTH_CONFIG_ID=ac_xxxxx      # Calendar auth configuration ID
```

---

## Connection Management

### 1. Create Entity

**Method:** `createEntity(userId: string)`

**Note:** In SDK v0.2.4, entities are created automatically when the first connection is initiated. This method just returns the userId.

```typescript
async createEntity(userId: string): Promise<string> {
  // Entity created automatically - just return userId
  return userId;
}
```

**Parameters:**
- `userId`: Unique identifier for the user (typically your internal user ID)

**Returns:** `string` - The entity ID (same as userId)

---

### 2. Initiate Gmail Connection

**Method:** `composio.connectedAccounts.link(userId, authConfigId)`

```typescript
async initiateGmailConnection(userId: string): Promise<{
  redirectUrl: string;
  connectionRequestId: string;
}> {
  const connectionRequest = await this.composio.connectedAccounts.link(
    userId,
    process.env.COMPOSIO_GMAIL_AUTH_CONFIG_ID!
  );

  return {
    redirectUrl: connectionRequest.redirectUrl!,
    connectionRequestId: connectionRequest.id
  };
}
```

**Parameters:**
- `userId`: User identifier
- `authConfigId`: Gmail auth configuration ID from Composio dashboard

**Returns:**
- `redirectUrl`: OAuth URL to redirect user to
- `connectionRequestId`: ID to track connection completion

**Flow:**
1. Call this method to get OAuth URL
2. Redirect user to `redirectUrl`
3. User completes OAuth on Composio
4. Use `connectionRequestId` to wait for completion

---

### 3. Initiate Calendar Connection

**Method:** `composio.connectedAccounts.link(userId, authConfigId)`

```typescript
async initiateCalendarConnection(userId: string): Promise<{
  redirectUrl: string;
  connectionRequestId: string;
}> {
  const connectionRequest = await this.composio.connectedAccounts.link(
    userId,
    process.env.COMPOSIO_CALENDAR_AUTH_CONFIG_ID!
  );

  return {
    redirectUrl: connectionRequest.redirectUrl!,
    connectionRequestId: connectionRequest.id
  };
}
```

**Parameters:** Same as Gmail connection

---

### 4. Wait for Connection Completion

**Method:** `composio.connectedAccounts.waitForConnection(connectionRequestId, timeout)`

```typescript
async waitForConnectionCompletion(
  connectionRequestId: string,
  userId: string,
  timeoutMs: number = 120000
): Promise<{
  connectedAccountId: string;
  status: string;
}> {
  const connectedAccount = await this.composio.connectedAccounts.waitForConnection(
    connectionRequestId,
    timeoutMs
  );

  return {
    connectedAccountId: connectedAccount.id,
    status: connectedAccount.status
  };
}
```

**Parameters:**
- `connectionRequestId`: From `link()` call
- `timeoutMs`: Timeout in milliseconds (default: 120000 = 2 minutes)

**Returns:**
- `connectedAccountId`: The connected account ID (save this to database!)
- `status`: Connection status (typically 'active')

**Note:** This method blocks until OAuth completes or timeout occurs. Use in backend API endpoints.

---

### 5. Get Connection Status

**Method:** `composio.connectedAccounts.get({ connectedAccountId })`

```typescript
async getConnectionStatus(connectionId: string): Promise<{
  status: string;
  connectedAccountId?: string;
}> {
  const connection = await this.composio.connectedAccounts.get({
    connectedAccountId: connectionId
  });

  return {
    status: connection.status?.toLowerCase() || 'unknown',
    connectedAccountId: connection.id
  };
}
```

---

### 6. List Connected Accounts

**Method:** `composio.connectedAccounts.list({ entityId })`

```typescript
async getConnectedAccountsForUser(userId: string): Promise<any[]> {
  const accounts = await this.composio.connectedAccounts.list({
    entityId: userId
  });

  return Array.isArray(accounts?.items) ? accounts.items : [];
}
```

---

## Gmail Operations

### Core Pattern: `composio.tools.execute()`

**CRITICAL:** The API uses `tools.execute()`, NOT `actions.execute()`

**Method Signature:**
```typescript
await composio.tools.execute(
  toolSlug: string,              // Tool identifier (e.g., 'GMAIL_FETCH_EMAILS')
  {
    userId: string,              // User/entity identifier
    arguments: Record<string, any>,  // Tool-specific parameters
    dangerouslySkipVersionCheck: true  // Required flag for compatibility
  }
);
```

**Response Structure:**
```typescript
{
  data: Record<string, unknown>,     // Actual response data
  error: string | null,              // Error message if failed
  successful: boolean,               // Success indicator
  logId?: string,                    // Composio log ID
  sessionInfo?: unknown              // Session metadata
}
```

---

### 1. Fetch Emails

**Tool:** `GMAIL_FETCH_EMAILS`

```typescript
async fetchEmails(userId: string, params?: {
  maxResults?: number;
  query?: string;
}): Promise<any> {
  const result = await this.composio.tools.execute(
    'GMAIL_FETCH_EMAILS',
    {
      userId: userId,
      arguments: {
        maxResults: params?.maxResults || 50,
        query: params?.query || ''
      },
      dangerouslySkipVersionCheck: true
    }
  );

  if (!result.successful) {
    throw new Error(result.error || 'Failed to fetch emails');
  }

  return result.data;  // Returns { messages: [...] }
}
```

**Arguments:**
- `maxResults`: Number of emails to fetch (default: 50)
- `query`: Gmail search query (e.g., 'is:unread', 'from:user@example.com')

**Response:**
```typescript
{
  messages: Array<{
    id: string;
    threadId: string;
    labelIds: string[];
    snippet: string;
    payload: {
      headers: Array<{ name: string; value: string }>;
      body: { data?: string };
      parts?: Array<any>;
    };
    internalDate: string;
  }>
}
```

---

### 2. Send Email

**Tool:** `GMAIL_SEND_EMAIL`

```typescript
async sendEmail(userId: string, params: {
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
  cc?: string;
  bcc?: string;
}): Promise<{ id: string; threadId: string }> {
  const result = await this.composio.tools.execute(
    'GMAIL_SEND_EMAIL',
    {
      userId: userId,
      arguments: {
        to: params.to,
        subject: params.subject,
        body: params.body,
        in_reply_to: params.inReplyTo,  // Note: snake_case
        references: params.references,
        cc: params.cc,
        bcc: params.bcc
      },
      dangerouslySkipVersionCheck: true
    }
  );

  if (!result.successful) {
    throw new Error(result.error || 'Failed to send email');
  }

  return {
    id: result.data?.id || '',
    threadId: result.data?.threadId || ''
  };
}
```

**Arguments:**
- `to`: Recipient email address (required)
- `subject`: Email subject (required)
- `body`: Email body in HTML or plain text (required)
- `in_reply_to`: Message-ID of email being replied to (optional)
- `references`: Message-IDs of thread (optional)
- `cc`: CC recipients (optional)
- `bcc`: BCC recipients (optional)

**Response:**
```typescript
{
  id: string;       // Gmail message ID
  threadId: string; // Gmail thread ID
}
```

---

### 3. Reply to Thread

**Tool:** `GMAIL_REPLY_TO_THREAD`

```typescript
async replyToThread(userId: string, params: {
  threadId: string;
  body: string;
  to: string;
  subject: string;
}): Promise<{ id: string; threadId: string }> {
  const result = await this.composio.tools.execute(
    'GMAIL_REPLY_TO_THREAD',
    {
      userId: userId,
      arguments: {
        thread_id: params.threadId,  // Note: snake_case
        body: params.body,
        to: params.to,
        subject: params.subject
      },
      dangerouslySkipVersionCheck: true
    }
  );

  if (!result.successful) {
    throw new Error(result.error || 'Failed to reply to thread');
  }

  return {
    id: result.data?.id || '',
    threadId: result.data?.threadId || params.threadId
  };
}
```

---

## Calendar Operations

### 1. List Calendar Events

**Tool:** `GOOGLECALENDAR_LIST_EVENTS`

```typescript
async listCalendarEvents(userId: string, params: {
  timeMin: Date;
  timeMax: Date;
  maxResults?: number;
}): Promise<any[]> {
  const result = await this.composio.tools.execute(
    'GOOGLECALENDAR_LIST_EVENTS',
    {
      userId: userId,
      arguments: {
        timeMin: params.timeMin.toISOString(),
        timeMax: params.timeMax.toISOString(),
        maxResults: params.maxResults || 100
      },
      dangerouslySkipVersionCheck: true
    }
  );

  if (!result.successful) {
    throw new Error(result.error || 'Failed to list calendar events');
  }

  return result.data?.items || [];
}
```

**Arguments:**
- `timeMin`: Start date (ISO 8601 string)
- `timeMax`: End date (ISO 8601 string)
- `maxResults`: Max events to return (default: 100)

**Response:**
```typescript
{
  items: Array<{
    id: string;
    summary: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
    attendees?: Array<{ email: string; responseStatus: string }>;
    description?: string;
    location?: string;
    htmlLink: string;
  }>
}
```

---

### 2. Create Calendar Event

**Tool:** `GOOGLECALENDAR_CREATE_EVENT`

```typescript
async createCalendarEvent(userId: string, params: {
  summary: string;
  start: Date;
  end: Date;
  attendees?: string[];
  description?: string;
  location?: string;
}): Promise<{ id: string; htmlLink: string }> {
  const result = await this.composio.tools.execute(
    'GOOGLECALENDAR_CREATE_EVENT',
    {
      userId: userId,
      arguments: {
        summary: params.summary,
        start: { dateTime: params.start.toISOString() },
        end: { dateTime: params.end.toISOString() },
        attendees: params.attendees?.map(email => ({ email })),
        description: params.description,
        location: params.location
      },
      dangerouslySkipVersionCheck: true
    }
  );

  if (!result.successful) {
    throw new Error(result.error || 'Failed to create calendar event');
  }

  return {
    id: result.data?.id || '',
    htmlLink: result.data?.htmlLink || ''
  };
}
```

**Arguments:**
- `summary`: Event title (required)
- `start`: Event start time as Date object (required)
- `end`: Event end time as Date object (required)
- `attendees`: Array of email addresses (optional)
- `description`: Event description (optional)
- `location`: Event location (optional)

---

## Trigger/Webhook Management

### Setup Gmail Trigger

**Method:** `composio.triggers.setup({ connectedAccountId, triggerName, config })`

```typescript
async setupGmailTrigger(userId: string, callbackUrl: string): Promise<string> {
  const trigger = await this.composio.triggers.setup({
    connectedAccountId: userId,
    triggerName: 'GMAIL_NEW_GMAIL_MESSAGE',
    config: {
      webhookUrl: callbackUrl,
      interval: 60  // Check interval in seconds
    }
  });

  return trigger?.id || '';
}
```

**Parameters:**
- `connectedAccountId`: The connected account ID (from connection completion)
- `triggerName`: Trigger identifier (use 'GMAIL_NEW_GMAIL_MESSAGE')
- `config.webhookUrl`: Your webhook endpoint URL
- `config.interval`: Polling interval in seconds

**Webhook Payload:** (Received at your callbackUrl)
```typescript
{
  triggerId: string;
  connectedAccountId: string;
  triggerName: string;
  payload: {
    // Email notification data
    historyId: string;
    emailAddress: string;
  }
}
```

---

## Response Structures

### Success Response

```typescript
{
  data: {
    // Tool-specific response data
  },
  error: null,
  successful: true,
  logId: "log_xxxxx",
  sessionInfo: { /* ... */ }
}
```

### Error Response

```typescript
{
  data: null,
  error: "Detailed error message",
  successful: false,
  logId: "log_xxxxx",
  sessionInfo: { /* ... */ }
}
```

---

## Error Handling

### Best Practices

```typescript
try {
  const result = await composio.tools.execute(toolSlug, config);

  if (!result.successful) {
    // Handle Composio API error
    logger.error({
      toolSlug,
      userId,
      error: result.error
    }, 'composio.tool.failed');

    throw new Error(result.error || 'Tool execution failed');
  }

  return result.data;
} catch (error) {
  // Handle network/SDK errors
  logger.error({
    toolSlug,
    userId,
    error: error instanceof Error ? error.message : String(error)
  }, 'composio.tool.exception');

  throw error;
}
```

### Common Error Scenarios

1. **Token Expired:** Composio handles token refresh automatically
2. **Rate Limiting:** Implement exponential backoff
3. **Invalid Connection:** Check connection status before operations
4. **Network Errors:** Retry with timeout

---

## Best Practices

### 1. User Isolation

**CRITICAL:** Always pass the correct `userId` to ensure user-specific operations.

```typescript
// ✅ CORRECT - Uses user-specific ID
const emails = await composio.tools.execute('GMAIL_FETCH_EMAILS', {
  userId: req.userId,  // From authenticated request
  arguments: { maxResults: 50 },
  dangerouslySkipVersionCheck: true
});

// ❌ WRONG - Uses global/shared connection
const emails = await composio.tools.execute('GMAIL_FETCH_EMAILS', {
  userId: 'shared',  // Would access wrong user's emails!
  arguments: { maxResults: 50 },
  dangerouslySkipVersionCheck: true
});
```

### 2. Connection Management

```typescript
// Store connected account ID in database
await db.query(`
  UPDATE user_gmail_tokens
  SET composio_connected_account_id = $1,
      composio_connected_at = NOW(),
      auth_method = 'composio'
  WHERE user_id = $2
`, [connectedAccountId, userId]);
```

### 3. Error Logging

Use structured logging (Pino) for better debugging:

```typescript
logger.info({
  userId: sanitizeUserId(userId),
  operation: 'fetch_emails',
  emailCount: result.data?.messages?.length || 0
}, 'composio.gmail.emails.fetched');
```

### 4. Response Validation

Always check `result.successful` before accessing `result.data`:

```typescript
const result = await composio.tools.execute(toolSlug, config);

if (!result.successful) {
  throw new Error(result.error || 'Unknown error');
}

// Safe to access result.data here
return result.data;
```

### 5. Timeout Handling

Set appropriate timeouts for connection waiting:

```typescript
// Short timeout for testing
const connection = await composio.connectedAccounts.waitForConnection(
  connectionRequestId,
  30000  // 30 seconds
);

// Production timeout
const connection = await composio.connectedAccounts.waitForConnection(
  connectionRequestId,
  120000  // 2 minutes
);
```

---

## Migration Notes

### From Custom Google OAuth to Composio

**Key Differences:**

| Custom OAuth | Composio |
|-------------|----------|
| Store encrypted tokens in DB | Composio stores tokens |
| Manually refresh tokens | Auto token refresh |
| Setup Google Pub/Sub webhooks | Use Composio triggers |
| Use googleapis SDK | Use Composio tools.execute() |
| Manage OAuth flow | Composio handles OAuth |

**Data Mapping:**

```typescript
// Custom OAuth (old)
const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
const response = await gmail.users.messages.list({
  userId: 'me',
  maxResults: 50
});

// Composio (new)
const result = await composio.tools.execute('GMAIL_FETCH_EMAILS', {
  userId: userId,
  arguments: { maxResults: 50 },
  dangerouslySkipVersionCheck: true
});
```

---

## Known Limitations (SDK v0.2.4)

1. **No tool listing:** `tools.list()` method doesn't exist
2. **No batch operations:** Must execute tools one at a time
3. **Version check required:** Must use `dangerouslySkipVersionCheck: true`
4. **Limited error details:** Error messages may be generic

---

## Additional Resources

- **Composio Dashboard:** https://app.composio.dev
- **SDK GitHub:** https://github.com/ComposioHQ/composio
- **Support:** Discord community or support@composio.dev

---

**Last Updated:** 2025-11-14
**Verified Against:** Production codebase at commit `0594cc9`
**Status:** ✅ All patterns tested and working in production
