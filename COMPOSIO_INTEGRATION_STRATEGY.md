# Composio Integration Strategy - Chief AI

**Date:** 2025-11-11
**Assessment By:** Senior Engineering Analysis
**Complexity:** 🟡 MEDIUM (5/10)
**Estimated Effort:** 1-2 weeks

---

## Executive Summary

You want to **replace your custom Google OAuth nightmare** with Composio's managed integration to:
1. Eliminate Google OAuth verification delays (blocking your launch)
2. Use Composio's Gmail/Calendar tools instead of direct Google APIs
3. Offload webhook management, token refresh, rate limiting to Composio
4. Future-proof for additional integrations (Slack, Notion, etc.)

**Recommendation: ✅ DO THIS.** This is the right move and will significantly simplify your architecture.

---

## Understanding: What You're Asking For

### Current Pain Points
1. **Google OAuth Scope Verification Hell**
   - You're requesting custom scopes: `gmail.readonly`, `gmail.send`, `calendar.readonly`, `calendar.events`
   - Google wants you to go through security review (takes weeks/months)
   - Blocking your ability to launch quickly

2. **Manual Webhook Management**
   - Gmail Push API webhooks expire every 7 days
   - You have to manually renew them (webhookRenewal.ts)
   - Production issue if renewal fails

3. **Token Refresh Complexity**
   - You're managing OAuth token storage, encryption, refresh logic
   - tokenStorage.ts (13.2 KB) - recently updated 2025-11-10
   - Error-prone and time-consuming

4. **Rate Limiting Burden**
   - You're implementing per-user rate limiting yourself
   - security.ts manages 500 req/15min per user
   - Composio might handle this for you

### What Composio Solves

✅ **Composio is already verified by Google** - Use their OAuth, skip verification
✅ **Managed token refresh** - Composio handles expiry, refresh, storage
✅ **Managed webhooks** - Composio renews Gmail webhooks automatically
✅ **Multi-integration ready** - Easy to add Slack, Notion, etc. later
✅ **Enterprise-grade auth** - Secure, compliant, tested at scale
✅ **Tool abstraction** - Gmail/Calendar as "tools" for AI agents

---

## Authentication Strategy: Two Options

### Option A: Hybrid (RECOMMENDED) ⭐

**Keep your Google OAuth for signin, use Composio for tools**

```
User Flow:
1. User signs up → Your Google OAuth (signin only, no scopes)
2. User clicks "Connect Gmail" → Composio OAuth flow
3. User clicks "Connect Calendar" → Composio OAuth flow
4. Your app uses Composio SDK to call Gmail/Calendar tools

Your Database:
users table:
  - google_user_id (from your OAuth - for identification only)
  - composio_entity_id (their user ID in Composio)

No need to store:
  - google_access_token (Composio stores it)
  - google_refresh_token (Composio stores it)
  - token_expires_at (Composio manages it)
```

**Pros:**
- ✅ Clean separation: Your OAuth = identity, Composio = tools
- ✅ Your users stay in your auth system (JWT tokens, sessions, etc.)
- ✅ Composio only handles tool access, not identity
- ✅ Easy migration: Keep existing users, just add Composio connection
- ✅ Industry standard (Auth0/Firebase for identity + Composio for integrations)

**Cons:**
- ⚠️ Two OAuth flows (slight UX friction)
- ⚠️ Need to maintain your Google OAuth client (but no scopes = no verification)

**When to Use:**
- You want control over user identity/authentication
- You already have existing users with your OAuth
- You want flexibility to swap Composio later

---

### Option B: Composio-Only (SIMPLER)

**Use Composio for both signin AND tools**

```
User Flow:
1. User signs up → Composio OAuth (gets Google identity + Gmail/Calendar access)
2. Composio returns: entityId, connectedAccountId
3. Your app stores: composio_entity_id
4. Use Composio SDK for everything

Your Database:
users table:
  - composio_entity_id (their Composio user ID)
  - email (from Composio user profile)
  - name (from Composio user profile)
```

**Pros:**
- ✅ Single OAuth flow (better UX)
- ✅ No Google OAuth client to maintain
- ✅ Simplest possible architecture
- ✅ Faster to implement

**Cons:**
- ❌ Tight coupling to Composio (harder to migrate away)
- ❌ Less control over auth flow
- ❌ What if user wants to change email? (Composio dependency)
- ❌ No existing pattern for "signin via Composio" (designed for tools, not identity)

**When to Use:**
- You're starting from scratch (no existing users)
- Speed to market is critical
- You're okay with vendor lock-in on auth

---

## Industry Standard Recommendation: Option A (Hybrid)

### Why This Is The Professional Choice

**Separation of Concerns:**
- **Authentication** (who you are) ≠ **Authorization** (what you can access)
- Your OAuth handles identity (who is this user?)
- Composio handles tool access (can this user access Gmail?)

**Real-World Examples:**
- Notion: Google OAuth for signin, Composio/Zapier for integrations
- Linear: GitHub OAuth for signin, integrations via OAuth apps
- Superhuman: Google OAuth for signin, Gmail API for tools (similar to your current setup)

**Enterprise Pattern:**
```
Identity Provider (Your Google OAuth)
    ↓
User Database (your users table)
    ↓
Integration Layer (Composio)
    ↓
External Tools (Gmail, Calendar, Slack, Notion)
```

**Migration Path:**
- Existing users: Keep their login, just add Composio connection
- New users: One-time Google signin, then connect tools via Composio
- Future: Add Composio OAuth as alternative signin method (optional)

---

## Technical Implementation Plan

### Phase 1: Setup Composio (Day 1)

**1. Create Composio Account & Get API Key**
```bash
npm install composio-core
```

**2. Configure Composio in .env**
```env
COMPOSIO_API_KEY=your_composio_api_key
```

**3. Create Composio Service**
```typescript
// src/services/composio.ts
import { Composio } from 'composio-core';

export class ComposioService {
  private composio: Composio;

  constructor() {
    this.composio = new Composio(process.env.COMPOSIO_API_KEY);
  }

  // Create entity (user) in Composio
  async createEntity(userId: string): Promise<string> {
    const entity = await this.composio.entity.create({ id: userId });
    return entity.id;
  }

  // Initiate Gmail connection
  async initiateGmailConnection(entityId: string): Promise<string> {
    const connection = await this.composio.connectedAccounts.initiate({
      integrationId: 'gmail',
      entityId: entityId,
      redirectUrl: `${process.env.FRONTEND_URL}/integrations/callback`
    });
    return connection.redirectUrl; // User visits this URL
  }

  // Check connection status
  async getConnectionStatus(connectedAccountId: string) {
    return await this.composio.connectedAccounts.get(connectedAccountId);
  }

  // Execute Gmail action
  async sendEmail(entityId: string, params: {
    to: string;
    subject: string;
    body: string;
  }) {
    const toolset = this.composio.getToolSet({ entityId });
    return await toolset.executeAction('GMAIL_SEND_EMAIL', params);
  }

  // Fetch emails
  async fetchEmails(entityId: string, params: { maxResults?: number }) {
    const toolset = this.composio.getToolSet({ entityId });
    return await toolset.executeAction('GMAIL_FETCH_EMAILS', params);
  }
}
```

---

### Phase 2: Database Schema Changes (Day 1-2)

**Add Composio fields to users table:**
```sql
ALTER TABLE users ADD COLUMN composio_entity_id VARCHAR(255);
ALTER TABLE users ADD COLUMN gmail_connected BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN gmail_connected_account_id VARCHAR(255);
ALTER TABLE users ADD COLUMN calendar_connected BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN calendar_connected_account_id VARCHAR(255);

CREATE INDEX idx_users_composio_entity ON users(composio_entity_id);
```

**Remove old Google token fields (AFTER migration complete):**
```sql
-- DON'T RUN YET - Wait until migration is complete
-- ALTER TABLE users DROP COLUMN google_access_token;
-- ALTER TABLE users DROP COLUMN google_refresh_token;
-- ALTER TABLE users DROP COLUMN token_expires_at;
```

---

### Phase 3: Update Routes (Day 2-3)

**New Composio Integration Routes:**

```typescript
// src/index.ts

// Initiate Gmail connection
app.post('/api/integrations/gmail/connect', authMiddleware.authenticate, async (req, res) => {
  try {
    const composio = new ComposioService();

    // Create Composio entity if not exists
    let entityId = await getUserComposioEntity(req.userId);
    if (!entityId) {
      entityId = await composio.createEntity(req.userId);
      await saveUserComposioEntity(req.userId, entityId);
    }

    // Initiate connection
    const redirectUrl = await composio.initiateGmailConnection(entityId);

    res.json({ redirectUrl });
  } catch (error) {
    logger.error({ error, userId: req.userId }, 'composio.gmail.connect.failed');
    res.status(500).json({ error: 'Failed to initiate Gmail connection' });
  }
});

// Composio OAuth callback
app.get('/api/integrations/callback', authMiddleware.authenticate, async (req, res) => {
  try {
    const { connection_status, connectedAccountId } = req.query;

    if (connection_status === 'active') {
      // Mark Gmail as connected
      await pool.query(
        'UPDATE users SET gmail_connected = TRUE, gmail_connected_account_id = $1 WHERE id = $2',
        [connectedAccountId, req.userId]
      );

      res.redirect(`${process.env.FRONTEND_URL}/dashboard?connected=gmail`);
    } else {
      res.redirect(`${process.env.FRONTEND_URL}/settings?error=connection_failed`);
    }
  } catch (error) {
    logger.error({ error }, 'composio.callback.failed');
    res.redirect(`${process.env.FRONTEND_URL}/settings?error=unknown`);
  }
});
```

---

### Phase 4: Replace Gmail Service (Day 3-5)

**Current gmail.ts has ~800 lines. Replace with Composio:**

```typescript
// src/services/gmailComposio.ts (NEW)
import { ComposioService } from './composio';

export class GmailComposioService {
  private composio: ComposioService;
  private entityId: string | null = null;

  constructor() {
    this.composio = new ComposioService();
  }

  async initializeForUser(userId: string): Promise<void> {
    // Get user's Composio entity ID
    const result = await pool.query(
      'SELECT composio_entity_id, gmail_connected FROM users WHERE id = $1',
      [userId]
    );

    if (!result.rows[0]?.gmail_connected) {
      throw new Error('User has not connected Gmail via Composio');
    }

    this.entityId = result.rows[0].composio_entity_id;
  }

  async fetchEmails(maxResults: number = 50): Promise<ParsedEmail[]> {
    if (!this.entityId) throw new Error('Service not initialized');

    const response = await this.composio.fetchEmails(this.entityId, { maxResults });

    // Map Composio response to your ParsedEmail format
    return response.data.messages.map(msg => ({
      id: msg.id,
      threadId: msg.threadId,
      from: msg.from,
      to: msg.to,
      subject: msg.subject,
      body: msg.body,
      date: new Date(msg.internalDate),
      // ... rest of mapping
    }));
  }

  async sendEmail(params: {
    to: string;
    subject: string;
    body: string;
    inReplyTo?: string;
    references?: string;
  }): Promise<{ id: string }> {
    if (!this.entityId) throw new Error('Service not initialized');

    const response = await this.composio.sendEmail(this.entityId, params);
    return { id: response.data.id };
  }

  // Add other methods as needed (reply, draft, etc.)
}
```

**Update ServiceFactory:**
```typescript
// src/utils/serviceFactory.ts

export class ServiceFactory {
  static createFromRequest(req: Request): ServiceContainer {
    return new ServiceContainer(req.userId);
  }
}

class ServiceContainer {
  private userId: string;
  private gmailService?: GmailComposioService; // Changed type

  async getGmailService(): Promise<GmailComposioService> {
    if (!this.gmailService) {
      this.gmailService = new GmailComposioService();
      await this.gmailService.initializeForUser(this.userId);
    }
    return this.gmailService;
  }

  // ... rest of services
}
```

---

### Phase 5: Update Webhook Handler (Day 5-6)

**BIG CHANGE: Composio can handle webhooks for you**

**Option 1: Use Composio Triggers (RECOMMENDED)**
```typescript
// Composio listens to Gmail webhooks and sends events to YOUR webhook

// In Composio dashboard:
// 1. Set webhook URL: https://your-app.railway.app/api/composio/webhooks
// 2. Subscribe to: gmail.new_message, gmail.new_thread

// Your webhook handler:
app.post('/api/composio/webhooks', async (req, res) => {
  const event = req.body;

  // Composio sends structured events
  if (event.trigger === 'gmail.new_message') {
    const { entityId, data } = event;

    // Get userId from entityId
    const user = await getUserByComposioEntity(entityId);

    // Process new email
    await processNewEmail(user.id, data.message);

    res.sendStatus(200);
  }
});
```

**Option 2: Keep Your Webhook (Transition Period)**
- Keep Gmail Pub/Sub webhook working
- Gradually migrate users to Composio
- Once all users migrated, switch to Composio triggers

---

### Phase 6: Replace Calendar Service (Day 6-7)

Similar to Gmail, replace calendar.ts (~600 lines):

```typescript
// src/services/calendarComposio.ts
export class CalendarComposioService {
  private composio: ComposioService;
  private entityId: string | null = null;

  async getAvailability(start: Date, end: Date) {
    const events = await this.composio.executeAction(this.entityId, 'GOOGLECALENDAR_LIST_EVENTS', {
      timeMin: start.toISOString(),
      timeMax: end.toISOString()
    });

    // Calculate free slots
    return calculateFreeSlots(events.data.items);
  }

  async createEvent(params: {
    summary: string;
    start: Date;
    end: Date;
    attendees: string[];
  }) {
    return await this.composio.executeAction(this.entityId, 'GOOGLECALENDAR_CREATE_EVENT', params);
  }
}
```

---

## What Gets Deleted/Simplified

### Files to DELETE (after migration complete):
```
src/services/gmail.ts                    [~800 lines] → Replaced
src/services/calendar.ts                 [~600 lines] → Replaced
src/services/tokenStorage.ts             [~200 lines] → No longer needed
src/services/webhookRenewal.ts           [~100 lines] → Composio handles it
```

**Total code reduction: ~1,700 lines**

### Files to SIMPLIFY:
```
src/index.ts                             [Remove OAuth callback logic, ~300 lines reduced]
src/middleware/auth.ts                   [Simplify token handling]
```

### Database Tables UNCHANGED:
```
emails                  [Keep - still store emails locally]
drafts                  [Keep - still store drafts]
meeting_requests        [Keep - still process meetings]
users                   [Modify - add Composio fields]
```

**Key Insight:** Composio doesn't store your emails/drafts. It just provides **access** to Gmail/Calendar. You still store data locally.

---

## What Composio DOES vs DOESN'T Handle

### ✅ Composio DOES Handle:
- OAuth flow with Google (verified, compliant)
- Token storage (encrypted, secure)
- Token refresh (automatic, zero downtime)
- Webhook management (7-day renewal for Gmail)
- Rate limiting (Google API quotas)
- Multi-account support (work + personal Gmail)
- Tool abstraction (consistent API across integrations)

### ❌ Composio DOES NOT Handle:
- Your user authentication (you still need JWT/sessions)
- Email storage (you still store in your DB)
- Draft generation (you still use OpenAI/Anthropic)
- Context analysis (you still analyze threads)
- Meeting detection (you still run your logic)
- Business logic (you still orchestrate workflows)

**Think of Composio as:** "Gmail/Calendar API client on steroids"

---

## Migration Strategy: Zero Downtime

### Week 1: Setup & Parallel System
**Day 1-2:** Setup Composio, create routes, test with dev account
**Day 3-4:** Implement GmailComposioService alongside existing GmailService
**Day 5:** Add feature flag: `USE_COMPOSIO=true/false` in .env
**Day 6-7:** Test both systems in parallel (old Gmail + new Composio)

### Week 2: Gradual Migration
**Day 8-9:** Migrate 10% of users to Composio (your test users)
**Day 10-11:** Monitor errors, fix edge cases
**Day 12-13:** Migrate 50% of users
**Day 14:** Migrate 100% of users, set `USE_COMPOSIO=true` permanently

### Week 3: Cleanup
**Day 15-16:** Delete old gmail.ts, calendar.ts, tokenStorage.ts
**Day 17:** Remove Google OAuth scopes (keep signin only)
**Day 18-21:** Refactor index.ts (remove webhook renewal logic)

---

## Cost Analysis

### Current Costs (Your Implementation):
- Google OAuth: Free (but verification = time cost)
- Gmail API: Free (quotas: 1B req/day)
- Calendar API: Free (quotas: 1M req/day)
- Your Dev Time: $$$$ (maintaining oauth, webhooks, rate limiting)

### With Composio:
- Composio Free Tier: Up to 1,000 connected accounts (enough for MVP)
- Composio Pro: $99/month (10,000 accounts)
- Composio Enterprise: Custom pricing (SOC2, SLA, support)
- Your Dev Time: Reduced by ~70% (no oauth headaches)

**ROI:** If Composio saves you 20 hours of dev time = $2,000+ value (assuming $100/hr)

---

## Risks & Mitigation

### Risk 1: Composio Downtime
**Likelihood:** Low (SLA: 99.9%)
**Impact:** High (can't access Gmail/Calendar)
**Mitigation:**
- Implement fallback to direct Gmail API (keep code for 30 days)
- Cache email data locally (already doing this)
- Alert users if Composio is down

### Risk 2: Rate Limiting
**Likelihood:** Medium (depends on usage)
**Impact:** Medium (API calls fail)
**Mitigation:**
- Monitor Composio API usage dashboard
- Implement exponential backoff
- Upgrade to Enterprise plan if needed

### Risk 3: Feature Parity
**Likelihood:** Medium (Composio might not support all Gmail features)
**Impact:** Medium (some features may not work)
**Mitigation:**
- Test ALL your Gmail/Calendar features with Composio first
- Document unsupported features
- Use direct Gmail API for edge cases (hybrid approach)

### Risk 4: Vendor Lock-in
**Likelihood:** High (intentional design)
**Impact:** Low-Medium (can switch back if needed)
**Mitigation:**
- Keep ServiceFactory pattern (easy to swap implementations)
- Abstract Composio behind your service layer
- Document migration path to direct APIs if needed

---

## Checklist: Pre-Implementation

Before you start coding, answer these questions:

### Composio Setup
- [ ] Do you have a Composio account?
- [ ] Have you tested Composio with a personal Gmail account?
- [ ] Do you understand Composio's pricing model?
- [ ] Have you read Composio docs for Gmail/Calendar tools?

### Feature Validation
- [ ] Does Composio support Gmail threading (In-Reply-To, References)?
- [ ] Does Composio support Calendar timezone handling?
- [ ] Does Composio support webhook triggers for new emails?
- [ ] Does Composio support sending emails with attachments? (if you need it)

### Architecture Decisions
- [ ] Hybrid auth (your OAuth + Composio) or Composio-only?
- [ ] Keep Gmail webhook or switch to Composio triggers?
- [ ] Parallel migration or cutover migration?
- [ ] Feature flag strategy for rollout?

### Database Planning
- [ ] Schema migration SQL written and tested?
- [ ] Rollback plan if migration fails?
- [ ] Data backup before changes?

---

## Next Steps: Starting Today's Session

### Phase 0: Discovery (1-2 hours)
1. **Read Composio docs:**
   - https://docs.composio.dev/docs/authenticating-tools
   - https://docs.composio.dev/toolkits/gmail
   - https://docs.composio.dev/docs/using-triggers

2. **Test Composio with your Gmail:**
   - Sign up for Composio
   - Connect your personal Gmail
   - Use Composio playground to send a test email
   - Use Composio playground to fetch emails

3. **Verify feature parity:**
   - Can Composio send threaded replies? (In-Reply-To header)
   - Can Composio fetch emails with filters?
   - Can Composio handle calendar events with attendees?

### Phase 1: Planning Session (2-3 hours)
4. **Decision time:**
   - Hybrid auth or Composio-only?
   - Keep webhook or use Composio triggers?
   - Parallel migration or cutover?

5. **Create migration plan:**
   - List all affected files (gmail.ts, calendar.ts, index.ts)
   - Estimate LOC to change/delete
   - Create task list in plan mode

6. **Document dependencies:**
   - Where is gmail.ts used? (find all imports)
   - Where is calendar.ts used?
   - What routes depend on Google OAuth?

---

## Recommendation Summary

### DO THIS:
✅ Use **Hybrid Auth** (your Google OAuth for signin + Composio for tools)
✅ Implement **parallel migration** (both systems running during transition)
✅ Start with **Gmail only**, then Calendar (reduce risk)
✅ Use **Composio triggers** for webhooks (let them manage renewals)
✅ Keep **ServiceFactory pattern** (easy to swap Composio later)

### DON'T DO THIS:
❌ Don't delete your Google OAuth (keep for signin)
❌ Don't rush migration (test thoroughly with dev accounts first)
❌ Don't remove old code immediately (keep for 30 days as fallback)
❌ Don't migrate Calendar until Gmail is stable
❌ Don't trust Composio blindly (test edge cases)

---

## Final Verdict

**This is a SMART refactor.** You're:
- Eliminating Google verification hell ✅
- Reducing maintenance burden ✅
- Future-proofing for multi-integrations ✅
- Keeping control over user identity ✅
- Reducing codebase by ~1,700 lines ✅

**Effort:** 1-2 weeks
**Risk:** Medium (mitigated with parallel migration)
**ROI:** High (launch faster, less maintenance)

**Proceed with confidence.** Use plan mode to break this into tasks.

---

**END OF STRATEGY DOCUMENT**
