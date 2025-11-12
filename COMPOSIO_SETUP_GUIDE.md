# Composio Integration Setup Guide

**Based on Official Composio Docs + Your Current Setup**

---

## Step 1: Install Composio SDK

```bash
npm install composio-core
```

**Type Definitions:** Full TypeScript support included

---

## Step 2: Environment Variables (Already Done ✅)

You already have these in `.env`:
```env
COMPOSIO_API_KEY=ak_9ckm0hutPg5atdGFtJEd
USE_COMPOSIO=true
COMPOSIO_AUTH_CONFIG_ID=ac_M2QcFWIKvXv0
```

---

## Step 3: Create Composio Service

**File:** `src/services/composio.ts`

```typescript
import { Composio } from 'composio-core';
import { logger, sanitizeUserId } from '../utils/pino-logger';

export class ComposioService {
  private composio: Composio;

  constructor() {
    this.composio = new Composio({
      apiKey: process.env.COMPOSIO_API_KEY!
    });
  }

  /**
   * Create a Composio entity (user) for a Chief AI user
   * Entity ID = your user's database ID
   */
  async createEntity(userId: string): Promise<string> {
    try {
      const entity = await this.composio.entities.create({
        id: userId  // Use your database user ID
      });

      logger.info({
        userId: sanitizeUserId(userId),
        entityId: entity.id
      }, 'composio.entity.created');

      return entity.id;
    } catch (error) {
      logger.error({
        userId: sanitizeUserId(userId),
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.entity.create.failed');
      throw error;
    }
  }

  /**
   * Initiate Gmail connection for a user
   * Returns redirect URL for user to complete OAuth
   */
  async initiateGmailConnection(userId: string): Promise<{
    redirectUrl: string;
    connectionId: string;
  }> {
    try {
      const connection = await this.composio.connectedAccounts.initiate({
        integrationId: 'gmail',
        entityId: userId,  // Your user's DB ID
        redirectUrl: `${process.env.FRONTEND_URL}/integrations/callback`,
        // Optional: Use your auth config for custom OAuth client
        authConfig: process.env.COMPOSIO_AUTH_CONFIG_ID
      });

      logger.info({
        userId: sanitizeUserId(userId),
        redirectUrl: connection.redirectUrl
      }, 'composio.gmail.connection.initiated');

      return {
        redirectUrl: connection.redirectUrl,
        connectionId: connection.connectionId
      };
    } catch (error) {
      logger.error({
        userId: sanitizeUserId(userId),
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.gmail.connection.initiate.failed');
      throw error;
    }
  }

  /**
   * Initiate Google Calendar connection
   */
  async initiateCalendarConnection(userId: string): Promise<{
    redirectUrl: string;
    connectionId: string;
  }> {
    try {
      const connection = await this.composio.connectedAccounts.initiate({
        integrationId: 'googlecalendar',
        entityId: userId,
        redirectUrl: `${process.env.FRONTEND_URL}/integrations/callback`,
        authConfig: process.env.COMPOSIO_AUTH_CONFIG_ID
      });

      logger.info({
        userId: sanitizeUserId(userId),
        redirectUrl: connection.redirectUrl
      }, 'composio.calendar.connection.initiated');

      return {
        redirectUrl: connection.redirectUrl,
        connectionId: connection.connectionId
      };
    } catch (error) {
      logger.error({
        userId: sanitizeUserId(userId),
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.calendar.connection.initiate.failed');
      throw error;
    }
  }

  /**
   * Check connection status
   */
  async getConnectionStatus(connectionId: string): Promise<{
    status: 'initiated' | 'active' | 'failed';
    connectedAccountId?: string;
  }> {
    try {
      const connection = await this.composio.connectedAccounts.get({
        connectedAccountId: connectionId
      });

      return {
        status: connection.status,
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

  /**
   * Fetch emails using Gmail action
   */
  async fetchEmails(userId: string, params?: {
    maxResults?: number;
    query?: string;  // Gmail search query
  }): Promise<any> {
    try {
      const result = await this.composio.actions.execute({
        actionName: 'GMAIL_FETCH_EMAILS',
        params: {
          maxResults: params?.maxResults || 50,
          query: params?.query || ''
        },
        entityId: userId
      });

      logger.info({
        userId: sanitizeUserId(userId),
        emailCount: result.data?.messages?.length || 0
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

  /**
   * Send email using Gmail action
   */
  async sendEmail(userId: string, params: {
    to: string;
    subject: string;
    body: string;
    inReplyTo?: string;      // For threading
    references?: string;     // For threading
    cc?: string;
    bcc?: string;
  }): Promise<{ id: string; threadId: string }> {
    try {
      const result = await this.composio.actions.execute({
        actionName: 'GMAIL_SEND_EMAIL',
        params: {
          to: params.to,
          subject: params.subject,
          body: params.body,
          in_reply_to: params.inReplyTo,
          references: params.references,
          cc: params.cc,
          bcc: params.bcc
        },
        entityId: userId
      });

      logger.info({
        userId: sanitizeUserId(userId),
        emailId: result.data.id,
        threadId: result.data.threadId
      }, 'composio.gmail.email.sent');

      return {
        id: result.data.id,
        threadId: result.data.threadId
      };
    } catch (error) {
      logger.error({
        userId: sanitizeUserId(userId),
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.gmail.send.failed');
      throw error;
    }
  }

  /**
   * Reply to email thread
   */
  async replyToThread(userId: string, params: {
    threadId: string;
    body: string;
    to: string;
    subject: string;
  }): Promise<{ id: string; threadId: string }> {
    try {
      const result = await this.composio.actions.execute({
        actionName: 'GMAIL_REPLY_TO_THREAD',
        params: {
          thread_id: params.threadId,
          body: params.body,
          to: params.to,
          subject: params.subject
        },
        entityId: userId
      });

      logger.info({
        userId: sanitizeUserId(userId),
        threadId: params.threadId,
        emailId: result.data.id
      }, 'composio.gmail.reply.sent');

      return {
        id: result.data.id,
        threadId: result.data.threadId
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

  /**
   * List calendar events
   */
  async listCalendarEvents(userId: string, params: {
    timeMin: Date;
    timeMax: Date;
    maxResults?: number;
  }): Promise<any[]> {
    try {
      const result = await this.composio.actions.execute({
        actionName: 'GOOGLECALENDAR_LIST_EVENTS',
        params: {
          timeMin: params.timeMin.toISOString(),
          timeMax: params.timeMax.toISOString(),
          maxResults: params.maxResults || 100
        },
        entityId: userId
      });

      logger.info({
        userId: sanitizeUserId(userId),
        eventCount: result.data?.items?.length || 0
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

  /**
   * Create calendar event
   */
  async createCalendarEvent(userId: string, params: {
    summary: string;
    start: Date;
    end: Date;
    attendees?: string[];
    description?: string;
    location?: string;
  }): Promise<{ id: string; htmlLink: string }> {
    try {
      const result = await this.composio.actions.execute({
        actionName: 'GOOGLECALENDAR_CREATE_EVENT',
        params: {
          summary: params.summary,
          start: { dateTime: params.start.toISOString() },
          end: { dateTime: params.end.toISOString() },
          attendees: params.attendees?.map(email => ({ email })),
          description: params.description,
          location: params.location
        },
        entityId: userId
      });

      logger.info({
        userId: sanitizeUserId(userId),
        eventId: result.data.id
      }, 'composio.calendar.event.created');

      return {
        id: result.data.id,
        htmlLink: result.data.htmlLink
      };
    } catch (error) {
      logger.error({
        userId: sanitizeUserId(userId),
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.calendar.create.failed');
      throw error;
    }
  }

  /**
   * Setup webhook trigger for new Gmail messages
   */
  async setupGmailTrigger(userId: string, callbackUrl: string): Promise<string> {
    try {
      const trigger = await this.composio.triggers.setup({
        appName: 'gmail',
        triggerName: 'GMAIL_NEW_GMAIL_MESSAGE',
        entityId: userId,
        config: {
          webhookUrl: callbackUrl,
          interval: 60  // Minimum 1 minute polling
        }
      });

      logger.info({
        userId: sanitizeUserId(userId),
        triggerId: trigger.id
      }, 'composio.trigger.gmail.setup');

      return trigger.id;
    } catch (error) {
      logger.error({
        userId: sanitizeUserId(userId),
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.trigger.setup.failed');
      throw error;
    }
  }

  /**
   * Get list of all actions available for an integration
   */
  async getAvailableActions(integrationId: string): Promise<string[]> {
    try {
      const actions = await this.composio.actions.list({
        appNames: [integrationId]
      });

      return actions.items.map(action => action.name);
    } catch (error) {
      logger.error({
        integrationId,
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.actions.list.failed');
      throw error;
    }
  }
}

// Export singleton instance
export const composioService = new ComposioService();
```

---

## Step 4: Key Concepts from Composio Docs

### Entity vs Connected Account

**Entity (User ID):**
- Top-level identifier for your user
- Maps to your `users.id` in database
- One entity can have multiple connected accounts

**Connected Account:**
- A specific OAuth connection (Gmail, Calendar, etc.)
- Stores access tokens, refresh tokens
- Multiple per entity (work Gmail + personal Gmail)

### Usage Pattern

```typescript
// 1. Create entity when user signs up
const entityId = await composioService.createEntity(userId);

// 2. Initiate connection (user completes OAuth)
const { redirectUrl } = await composioService.initiateGmailConnection(userId);

// 3. User visits redirectUrl, completes OAuth
// 4. Composio redirects back with connection_status=active

// 5. Execute actions
const emails = await composioService.fetchEmails(userId);
```

### Authentication Flow

```
User clicks "Connect Gmail"
    ↓
Your backend: composioService.initiateGmailConnection(userId)
    ↓
Returns: redirectUrl
    ↓
Frontend redirects user to redirectUrl
    ↓
User completes Google OAuth (on Composio/Google)
    ↓
Composio redirects back to your callback URL
    ↓
Your callback: ?connection_status=active&connectedAccountId=xxx
    ↓
Store connectedAccountId in database
    ↓
Done! User's Gmail is connected
```

---

## Step 5: Available Gmail Actions

From Composio docs, these are supported:

```typescript
// Email Operations
'GMAIL_FETCH_EMAILS'           // Get list of emails
'GMAIL_SEND_EMAIL'             // Send new email
'GMAIL_REPLY_TO_THREAD'        // Reply to existing thread
'GMAIL_CREATE_EMAIL_DRAFT'     // Create draft
'GMAIL_FETCH_MESSAGE_BY_ID'    // Get specific email
'GMAIL_FETCH_MESSAGE_BY_THREAD_ID'  // Get thread

// Label Operations
'GMAIL_ADD_LABEL_TO_EMAIL'     // Add label
'GMAIL_REMOVE_LABEL'           // Remove label
'GMAIL_LIST_LABELS'            // List all labels
'GMAIL_CREATE_LABEL'           // Create new label
'GMAIL_MODIFY_THREAD_LABELS'   // Modify thread labels

// Other
'GMAIL_GET_ATTACHMENT'         // Download attachment
'GMAIL_GET_PROFILE'            // Get user profile
```

---

## Step 6: Available Calendar Actions

```typescript
// Event Operations
'GOOGLECALENDAR_LIST_EVENTS'       // List events in range
'GOOGLECALENDAR_CREATE_EVENT'      // Create new event
'GOOGLECALENDAR_UPDATE_EVENT'      // Update existing event
'GOOGLECALENDAR_DELETE_EVENT'      // Delete event
'GOOGLECALENDAR_GET_EVENT'         // Get specific event

// Calendar Operations
'GOOGLECALENDAR_LIST_CALENDARS'    // List all calendars
'GOOGLECALENDAR_CREATE_CALENDAR'   // Create calendar
```

---

## Step 7: Webhook Triggers (Real-time Events)

Composio provides triggers for real-time notifications:

```typescript
// Setup trigger for new Gmail messages
const triggerId = await composioService.setupGmailTrigger(
  userId,
  'https://your-app.railway.app/api/composio/webhooks'
);

// Your webhook handler
app.post('/api/composio/webhooks', async (req, res) => {
  const event = req.body;

  if (event.triggerName === 'GMAIL_NEW_GMAIL_MESSAGE') {
    const { entityId, payload } = event;

    // payload contains new email data
    await processNewEmail(entityId, payload.message);
  }

  res.sendStatus(200);
});
```

**Important:** Gmail triggers use **polling with minimum 1-minute frequency**. Not true real-time, expect up to 1-minute delay.

---

## Step 8: Error Handling

Composio SDK throws errors that you should catch:

```typescript
try {
  await composioService.fetchEmails(userId);
} catch (error) {
  if (error.code === 'UNAUTHORIZED') {
    // User needs to reconnect Gmail
    // Redirect to initiate connection again
  } else if (error.code === 'RATE_LIMIT') {
    // Too many requests, back off
  } else {
    // Log and handle
  }
}
```

---

## Step 9: Rate Limiting

**Composio handles Google API rate limiting for you.**

- No need to implement your own rate limiting for Gmail/Calendar
- Composio automatically retries with backoff
- If you hit limits, Composio will throw `RATE_LIMIT` error

---

## Step 10: Token Refresh

**Composio handles token refresh automatically.**

- Access tokens expire every 1 hour
- Composio refreshes them transparently
- You never see or store Google tokens
- Zero downtime, zero errors

---

## Next Steps

1. Install SDK: `npm install composio-core`
2. Create `src/services/composio.ts` with the code above
3. Test with your personal account first
4. Add routes for connection flow (next guide)

---

**Official Docs:**
- https://docs.composio.dev/docs/quickstart
- https://docs.composio.dev/toolkits/gmail
- https://docs.composio.dev/toolkits/googlecalendar
- https://docs.composio.dev/docs/using-triggers
