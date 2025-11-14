# Phase 5: Webhook System Migration - Analysis & Plan

**Created:** 2025-11-14
**Status:** Planning Complete - Ready for Implementation

---

## Executive Summary

Migrating from Google Pub/Sub webhooks to Composio triggers will **significantly simplify** our webhook infrastructure by eliminating:
- ✅ Manual webhook renewal (every 7 days)
- ✅ Google Cloud Pub/Sub configuration
- ✅ Base64 encoding/decoding complexity
- ✅ Webhook expiration management

Composio **automatically manages** trigger lifecycle, renewal, and delivery.

---

## Current Architecture: Google Pub/Sub Webhooks

### How It Works

1. **Setup** (`GmailService.setupWebhook()`):
   ```typescript
   const watchResponse = await gmail.users.watch({
     userId: 'me',
     requestBody: {
       topicName: 'projects/chief-ai-470506/topics/gmail-notifications',
       labelIds: ['INBOX']
     }
   });
   ```
   - Returns `historyId` and `expiration` (7 days)
   - Must be renewed manually before expiration

2. **Webhook Reception** (`POST /webhooks/gmail`):
   ```typescript
   // Google Pub/Sub sends:
   {
     message: {
       data: "<base64-encoded-json>",
       messageId: "...",
       publishTime: "..."
     }
   }

   // After decoding:
   {
     historyId: "12345",
     emailAddress: "user@gmail.com"
   }
   ```

3. **Renewal Service** (`webhookRenewal.ts`):
   - Runs every 6 hours
   - Checks for webhooks expiring in next 24 hours
   - Calls `setupWebhook()` again for each user

### Problems with Current System

| Issue | Impact | Complexity |
|-------|--------|------------|
| **Manual Renewal** | Must run background service | High |
| **7-Day Expiration** | Webhooks stop if renewal fails | High Risk |
| **Base64 Encoding** | Extra decoding step | Medium |
| **Pub/Sub Setup** | Requires Google Cloud project | High |
| **Multi-User Complexity** | Must track expiration per user | High |

### Current Implementation Files

1. **src/services/webhookRenewal.ts** (89 lines)
   - `startRenewalService()` - Runs every 6 hours
   - `checkAndRenewWebhooks()` - Checks expiring webhooks
   - `renewWebhookForUser()` - Renews individual user webhook

2. **src/services/gmail.ts** - `setupWebhook()` method
   - Calls Gmail API `users.watch()`
   - Stores expiration in database
   - Returns `{ historyId, expiration }`

3. **src/index.ts** - `POST /webhooks/gmail` (lines 4304-4387)
   - Decodes base64 Pub/Sub message
   - Extracts `historyId` and `emailAddress`
   - Calls `processGmailNotificationMultiUser()`

4. **Database: `user_gmail_tokens.webhook_expires_at`**
   - Stores webhook expiration timestamp
   - Used by renewal service to find expiring webhooks

---

## New Architecture: Composio Triggers

### How It Works

1. **Setup** (`ComposioService.setupGmailTrigger()`):
   ```typescript
   const trigger = await composio.triggers.setup({
     connectedAccountId: userId,
     triggerName: 'GMAIL_NEW_GMAIL_MESSAGE',
     config: {
       webhookUrl: 'https://chief-production.railway.app/webhooks/composio',
       interval: 60  // Polling interval in seconds
     }
   });
   ```
   - Returns `trigger.id`
   - **NO EXPIRATION** - Composio manages lifecycle
   - **NO RENEWAL NEEDED** - Trigger stays active

2. **Webhook Reception** (`POST /webhooks/composio`):
   ```typescript
   // Composio sends directly (no base64):
   {
     triggerId: "trigger_abc123",
     connectedAccountId: "user_xyz",
     triggerName: "GMAIL_NEW_GMAIL_MESSAGE",
     payload: {
       historyId: "12345",
       emailAddress: "user@gmail.com"
     }
   }
   ```

3. **Renewal Service**:
   - ❌ **NOT NEEDED** - Composio handles this automatically!

### Benefits of Composio System

| Benefit | Impact | Simplification |
|---------|--------|----------------|
| **Auto-Renewal** | No background service needed | ✅ Remove 89 lines |
| **No Expiration** | Triggers never expire | ✅ Remove DB column |
| **Direct Payload** | No base64 decoding | ✅ Simpler parsing |
| **No Pub/Sub** | No Google Cloud setup | ✅ Remove infrastructure |
| **Per-User Triggers** | Built-in multi-user support | ✅ Cleaner architecture |

---

## Migration Steps

### Step 1: Create Composio Webhook Endpoint

**File:** `src/index.ts`

**New Endpoint:** `POST /webhooks/composio`

```typescript
app.post('/webhooks/composio', async (req, res) => {
  try {
    // Log webhook receipt
    pinoLogger.info({
      triggerId: req.body.triggerId,
      triggerName: req.body.triggerName
    }, 'webhook.composio.received');

    // Acknowledge immediately (same as Google)
    res.status(200).json({ success: true });

    // Extract notification data (NO base64 decoding needed!)
    const { triggerId, connectedAccountId, triggerName, payload } = req.body;

    if (triggerName !== 'GMAIL_NEW_GMAIL_MESSAGE') {
      pinoLogger.warn({ triggerName }, 'webhook.composio.unknown_trigger');
      return;
    }

    // Idempotency check (same as before)
    const lockKey = `webhook:composio:${payload.historyId || Date.now()}`;
    const lockAcquired = await redis.acquireLock(lockKey, 60);

    if (!lockAcquired) {
      pinoLogger.warn({ historyId: payload.historyId }, 'webhook.composio.duplicate_skipped');
      return;
    }

    // Release lock after short delay (same pattern)
    setTimeout(() => {
      redis.releaseLock(lockKey).catch(err => {
        pinoLogger.debug({ lockKey, error: err.message }, 'webhook.composio.lock_release_error');
      });
    }, 100);

    // Process notification (reuse existing logic!)
    processGmailNotificationForUser(
      payload,  // Contains historyId and emailAddress
      connectedAccountId,  // This is the userId
      emailProvider,
      gmail
    ).then(() => {
      pinoLogger.info({ historyId: payload.historyId }, 'webhook.composio.processed');
    }).catch(error => {
      pinoLogger.error({ error: error.message }, 'webhook.composio.processing_failed');
    });

  } catch (error) {
    pinoLogger.error({ error: error.message }, 'webhook.composio.handler_error');
    // Response already sent
  }
});
```

---

### Step 2: Set Up Triggers for Existing Users

**File:** `scripts/setup-composio-triggers.ts` (NEW)

```typescript
/**
 * Setup Composio triggers for all users with connected accounts
 */
import { ServiceFactory } from '../src/utils/serviceFactory';
import { queryWithRetry } from '../src/database/connection';

async function setupTriggersForAllUsers() {
  console.log('🔄 Setting up Composio triggers for all users...\n');

  // Get all users with Composio connected accounts
  const result = await queryWithRetry(`
    SELECT user_id, composio_connected_account_id, gmail_address
    FROM user_gmail_tokens
    WHERE composio_connected_account_id IS NOT NULL
      AND auth_method = 'composio'
  `);

  const users = result.rows;
  console.log(`Found ${users.length} users with Composio connections\n`);

  const webhookUrl = process.env.COMPOSIO_WEBHOOK_URL || 'https://chief-production.railway.app/webhooks/composio';

  for (const user of users) {
    try {
      console.log(`Setting up trigger for ${user.gmail_address}...`);

      const services = ServiceFactory.createForUser(user.user_id);
      const composio = services.getComposioService();

      const triggerId = await composio.setupGmailTrigger(
        user.composio_connected_account_id,
        webhookUrl
      );

      console.log(`✅ Trigger created: ${triggerId}\n`);
    } catch (error) {
      console.error(`❌ Failed for ${user.gmail_address}:`, error.message, '\n');
    }
  }

  console.log('✅ Trigger setup complete!');
}

setupTriggersForAllUsers();
```

---

### Step 3: Update OAuth Callback to Create Trigger

**File:** `src/index.ts` (OAuth callback)

**Add after Composio connection:**

```typescript
// After connection is established
if (composioConnected) {
  try {
    // Set up Gmail trigger automatically
    const webhookUrl = process.env.COMPOSIO_WEBHOOK_URL || 'https://chief-production.railway.app/webhooks/composio';
    const triggerId = await composioService.setupGmailTrigger(
      composio_connected_account_id,
      webhookUrl
    );

    console.log(`✅ Gmail trigger created: ${triggerId}`);
  } catch (triggerError) {
    console.warn('⚠️ Failed to create Gmail trigger:', triggerError);
    // Don't fail OAuth if trigger setup fails
  }
}
```

---

### Step 4: Disable Google Webhook System

**Environment Variable:**
```bash
DISABLE_GOOGLE_WEBHOOKS=true
```

**Update webhook renewal service:**

```typescript
// src/services/webhookRenewal.ts - Add at start of startRenewalService()
startRenewalService(): void {
  if (process.env.DISABLE_GOOGLE_WEBHOOKS === 'true') {
    logger.info({}, 'webhook.renewal.disabled_composio');
    console.log('⚠️  Google webhook renewal disabled - using Composio triggers');
    return;  // Don't start renewal service
  }

  // ... existing renewal code
}
```

**Update OAuth callback:**

```typescript
// src/index.ts - OAuth callback
if (process.env.DISABLE_GOOGLE_WEBHOOKS !== 'true') {
  // Only setup Google webhook if not using Composio
  const watchResponse = await userGmailService.setupWebhook();
  console.log(`✅ Google webhook setup successful`);
}
```

---

### Step 5: Test Composio Webhook Delivery

**Manual Test Script:** `scripts/test-composio-webhook.ts`

```typescript
/**
 * Test Composio webhook by sending test email
 */
async function testComposioWebhook() {
  console.log('🧪 Testing Composio webhook delivery...\n');

  const testUserId = process.argv[2];
  if (!testUserId) {
    console.error('Usage: npx tsx scripts/test-composio-webhook.ts <userId>');
    process.exit(1);
  }

  console.log('1. Send a test email to your Gmail account');
  console.log('2. Wait up to 60 seconds (Composio polling interval)');
  console.log('3. Check Railway logs for webhook receipt\n');

  console.log('Expected log entries:');
  console.log('  • webhook.composio.received');
  console.log('  • webhook.composio.processed');
  console.log('  • webhook.email.processing_start\n');

  console.log('✅ Test prepared - now send an email!');
}
```

---

## Code to Remove (After Migration Complete)

### 1. Webhook Renewal Service
- **File:** `src/services/webhookRenewal.ts` (ENTIRE FILE - 89 lines)
- **Reason:** Composio manages trigger lifecycle automatically

### 2. Webhook Expiration Tracking
- **Database Column:** `user_gmail_tokens.webhook_expires_at`
- **Migration:** `ALTER TABLE user_gmail_tokens DROP COLUMN webhook_expires_at;`
- **Reason:** Composio triggers don't expire

### 3. Google Webhook Setup Calls
- **File:** `src/index.ts` (OAuth callback, line ~286)
- **File:** `src/index.ts` (Manual webhook setup endpoints, lines 5286-5454)
- **Reason:** Use Composio triggers instead

### 4. Pub/Sub Webhook Endpoint (Eventually)
- **File:** `src/index.ts` - `POST /webhooks/gmail` (lines 4304-4387)
- **Keep temporarily** for rollback capability
- **Remove after** 30 days of stable Composio operation

---

## Environment Variables

### New Variables (Add to Railway):
```bash
COMPOSIO_WEBHOOK_URL=https://chief-production.railway.app/webhooks/composio
DISABLE_GOOGLE_WEBHOOKS=true
```

### Existing Variables (Keep):
```bash
COMPOSIO_API_KEY=ak_9ckm0hutPg5atdGFtJEd
COMPOSIO_GMAIL_AUTH_CONFIG_ID=ac_M2QcFWIKvXv0
COMPOSIO_CALENDAR_AUTH_CONFIG_ID=ac_k53apWo91X9Y
```

### Variables to Remove (After migration):
```bash
# Google Cloud Pub/Sub (not needed for Composio)
# (No explicit Pub/Sub env vars currently - topic name is hardcoded)
```

---

## Migration Timeline

| Step | Duration | Status |
|------|----------|--------|
| 1. Create Composio webhook endpoint | 30 min | Pending |
| 2. Create trigger setup script | 30 min | Pending |
| 3. Run script for existing users | 15 min | Pending |
| 4. Update OAuth callback | 15 min | Pending |
| 5. Test with real email | 30 min | Pending |
| 6. Deploy to production | 15 min | Pending |
| 7. Monitor for 24 hours | 1 day | Pending |
| 8. Remove old webhook code | 30 min | Pending (30 days later) |
| **Total** | **3 hours + monitoring** | **Not Started** |

---

## Rollback Plan

If Composio webhooks fail:

1. **Immediate:**
   - Set `DISABLE_GOOGLE_WEBHOOKS=false`
   - Restart Railway deployment
   - Google webhooks automatically re-enabled

2. **24 Hours:**
   - Google webhook renewal service resumes
   - All users' webhooks renewed within 24 hours

3. **Code:**
   - No code changes needed (Google system intact)
   - Just toggle environment variable

---

## Key Differences Summary

| Feature | Google Pub/Sub | Composio |
|---------|---------------|----------|
| **Setup Complexity** | High (Pub/Sub topic, subscriptions) | Low (SDK call) |
| **Expiration** | 7 days | Never |
| **Renewal** | Manual (background service) | Automatic |
| **Payload** | Base64-encoded JSON | Direct JSON |
| **Multi-User** | Single topic, filter by email | Per-user triggers |
| **Latency** | Real-time (push) | ~1 minute (polling) |
| **Management** | We manage lifecycle | Composio manages |
| **Infrastructure** | Google Cloud Project | None |

---

## Success Criteria

- [x] Understand Composio trigger architecture
- [x] Document payload structure differences
- [x] Identify code to remove
- [ ] Implement `/webhooks/composio` endpoint
- [ ] Create trigger setup script
- [ ] Test webhook delivery
- [ ] Deploy to production
- [ ] Monitor for 24 hours
- [ ] Zero webhook failures
- [ ] Remove old code after 30 days

---

**Next:** Implement Step 1 - Create Composio webhook endpoint
