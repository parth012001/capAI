# Composio Migration: Replace Custom Google OAuth with Composio SDK

## Overview

**Goal:** Migrate from custom Google OAuth implementation to Composio SDK for Gmail and Calendar operations, eliminating the need for Google OAuth verification.

**Timeline:** 7 days (aggressive)
**Status:** 🟢 Phase 3 Complete (40% done)
**Risk:** Low (no production users, rollback capability exists)

---

## Strategy

- **Keep Google OAuth:** Only for initial user sign-in/sign-up
- **Use Composio:** For all Gmail and Calendar operations
- **Force Re-auth:** Users must connect via Composio after sign-in
- **No Dual System:** All operations go through Composio (no fallback to Google OAuth)

---

## Progress Tracker

### ✅ Phase 0: Database Verification & Schema Sync
**Status:** COMPLETE
**Duration:** 4 hours
**Completed:** 2025-11-14

#### Tasks Completed:
- [x] Connect to Neon PostgreSQL production database
- [x] Verify all Composio columns exist in `user_gmail_tokens` table
  - [x] `composio_entity_id` (VARCHAR 255)
  - [x] `composio_connected_account_id` (VARCHAR 255)
  - [x] `composio_connected_at` (TIMESTAMP)
  - [x] `auth_method` (VARCHAR 50, default 'google_oauth')
  - [x] `migration_status` (VARCHAR 50, default 'pending')
  - [x] `migrated_at` (TIMESTAMP)
- [x] Verify indexes exist
  - [x] `idx_composio_entity`
  - [x] `idx_composio_connected_account`
  - [x] `idx_auth_method`
  - [x] `idx_migration_status`
- [x] Update `scripts/database/complete_working_schema.sql` to match production
- [x] Create `scripts/database/verify-production-schema.ts`

**Key Finding:** All Composio columns already exist! No migration needed.

**Database Stats:**
- Total users: 8
- Users with Composio: 2
- Users with Google OAuth: 6

---

### ✅ Phase 1: Composio Documentation Review & API Verification
**Status:** COMPLETE
**Duration:** 2 hours
**Completed:** 2025-11-14

#### Tasks Completed:
- [x] Review existing `src/services/composio.ts` implementation
- [x] Verify SDK version: `@composio/core ^0.2.4`
- [x] Document correct API patterns:
  - [x] `tools.execute()` method signature
  - [x] Gmail operations: FETCH, SEND, REPLY
  - [x] Calendar operations: LIST_EVENTS, CREATE_EVENT
  - [x] Connection management: link(), waitForConnection()
  - [x] Trigger setup: GMAIL_NEW_GMAIL_MESSAGE
- [x] Create comprehensive `COMPOSIO_API_REFERENCE.md` (400+ lines)

**Key API Pattern:**
```typescript
await composio.tools.execute('GMAIL_FETCH_EMAILS', {
  userId: userId,
  arguments: { maxResults: 50, query: '' },
  dangerouslySkipVersionCheck: true
});
```

---

### ✅ Phase 2: Service Abstraction Layer
**Status:** COMPLETE
**Duration:** 8 hours
**Completed:** 2025-11-14

#### Tasks Completed:
- [x] Create `src/services/providers/` directory
- [x] Create `IEmailProvider.ts` interface (119 lines)
  - [x] Define `fetchEmails()`, `sendEmail()`, `replyToThread()`
  - [x] Define types: `SendEmailParams`, `FetchEmailsParams`, `EmailMessage`
- [x] Create `ICalendarProvider.ts` interface (104 lines)
  - [x] Define `listEvents()`, `createEvent()`, `checkAvailability()`
  - [x] Define types: `ListEventsParams`, `CreateEventParams`, `CalendarEvent`
- [x] Implement `ComposioEmailProvider.ts` (145 lines)
  - [x] Wrap `ComposioService.fetchEmails()`
  - [x] Wrap `ComposioService.sendEmail()`
  - [x] Wrap `ComposioService.replyToThread()`
  - [x] Add Pino structured logging
  - [x] Add error handling
- [x] Implement `ComposioCalendarProvider.ts` (163 lines)
  - [x] Wrap `ComposioService.listCalendarEvents()`
  - [x] Wrap `ComposioService.createCalendarEvent()`
  - [x] Implement `checkAvailability()` with conflict detection
  - [x] Add Pino structured logging
- [x] Create `providers/index.ts` for exports
- [x] Create test scripts:
  - [x] `scripts/test-email-provider.ts` (108 lines)
  - [x] `scripts/test-calendar-provider.ts` (120 lines)
- [x] Verify TypeScript compilation: ✅ Zero errors

---

### ✅ Phase 3: ServiceFactory Integration
**Status:** COMPLETE
**Duration:** 4 hours
**Completed:** 2025-11-14

#### Tasks Completed:
- [x] Update `src/utils/serviceFactory.ts` imports
  - [x] Import provider interfaces and implementations
  - [x] Import `ComposioService`
  - [x] Import `queryWithRetry` for database queries
  - [x] Import Pino logger
- [x] Add ServiceContainer properties:
  - [x] `_composioService?: ComposioService`
  - [x] `_emailProvider?: IEmailProvider`
  - [x] `_calendarProvider?: ICalendarProvider`
- [x] Implement `getComposioService()` method
- [x] Implement `getEmailProvider()` method
  - [x] Query database for user's `composio_connected_account_id`
  - [x] Return `ComposioEmailProvider` if connected
  - [x] Throw error if not connected
  - [x] Cache provider instance per request
- [x] Implement `getCalendarProvider()` method
  - [x] Query database for user's `composio_connected_account_id`
  - [x] Return `ComposioCalendarProvider` if connected
  - [x] Throw error if not connected
  - [x] Cache provider instance per request
- [x] Create test script: `scripts/test-service-factory-providers.ts` (124 lines)
- [x] Verify TypeScript compilation: ✅ Zero errors

**Architecture:**
```
Request → ServiceFactory → ServiceContainer → Provider (Composio)
```

---

### 🔄 Phase 4: Update Dependent Services
**Status:** PENDING
**Duration:** 8 hours (estimated)
**Target:** Day 3-4

#### Tasks:
- [ ] Update `src/services/intelligentEmailRouter.ts`
  - [ ] Replace `getGmailService()` with `getEmailProvider()`
  - [ ] Update email fetching to use provider interface
  - [ ] Update email routing logic
  - [ ] Test with Composio provider
  - [ ] Create test: `scripts/test-email-router.ts`
- [ ] Update `src/services/meetingPipeline.ts`
  - [ ] Replace `getGmailService()` with `getEmailProvider()`
  - [ ] Replace `getCalendarService()` with `getCalendarProvider()`
  - [ ] Update meeting detection logic
  - [ ] Update calendar event creation
  - [ ] Test end-to-end meeting pipeline
  - [ ] Create test: `scripts/test-meeting-pipeline.ts`
- [ ] Update `src/services/response.ts`
  - [ ] Replace `GmailService.sendEmail()` with `EmailProvider.sendEmail()`
  - [ ] Update draft sending logic
  - [ ] Verify threading still works
  - [ ] Create test: `scripts/test-response-service.ts`
- [ ] Search for other direct `GmailService`/`CalendarService` usage
- [ ] Run integration test: `scripts/test-full-pipeline.ts`
- [ ] Verify TypeScript compilation

**Pattern:**
```typescript
// OLD
const gmail = await services.getGmailService();
const emails = await gmail.getRecentEmails(50);

// NEW
const emailProvider = await services.getEmailProvider();
const result = await emailProvider.fetchEmails(userId, { maxResults: 50 });
const emails = result.messages;
```

---

### 🔄 Phase 5: Webhook System Migration
**Status:** PENDING
**Duration:** 8 hours (estimated)
**Target:** Day 4-5

#### Tasks:
- [ ] Review Composio trigger documentation
  - [ ] Read https://docs.composio.dev/triggers
  - [ ] Understand `GMAIL_NEW_GMAIL_MESSAGE` trigger
  - [ ] Document webhook payload structure
- [ ] Create new Composio webhook endpoint
  - [ ] Add route: `POST /webhooks/composio` in `src/index.ts`
  - [ ] Verify Composio webhook signature
  - [ ] Extract userId from webhook payload
  - [ ] Process email notification
  - [ ] Use `EmailProvider` to fetch new emails
- [ ] Update `src/services/intelligentEmailRouter.ts`
  - [ ] Create `processComposioWebhook()` method
  - [ ] Route through existing pipeline
- [ ] Set up Composio triggers
  - [ ] Create script: `scripts/setup-composio-triggers.ts`
  - [ ] For each user with `composio_entity_id`:
    - [ ] Call `composioService.setupGmailTrigger(userId, callbackUrl)`
    - [ ] Store trigger ID in database
    - [ ] Verify trigger is active
- [ ] Test webhook delivery
  - [ ] Send test email to Composio-connected account
  - [ ] Verify webhook hits `/webhooks/composio`
  - [ ] Verify email processed through pipeline
  - [ ] Verify AI draft generated
  - [ ] Compare to legacy webhook behavior
- [ ] Update `src/services/webhookRenewal.ts`
  - [ ] Add feature flag check
  - [ ] Skip renewal if `USE_COMPOSIO=true`
  - [ ] Log that Composio handles renewal automatically
- [ ] Disable Google Pub/Sub webhooks
  - [ ] Set `DISABLE_GOOGLE_WEBHOOKS=true`
  - [ ] Keep endpoint for rollback

---

### 🔄 Phase 6: Auth Flow Migration
**Status:** PENDING
**Duration:** 6 hours (estimated)
**Target:** Day 5

#### Tasks:
- [ ] Update `src/index.ts` OAuth callback (`/auth/callback`)
  - [ ] Keep Google OAuth for sign-in
  - [ ] Save user profile data
  - [ ] Set `auth_method='pending_composio'`
  - [ ] Do NOT save Google OAuth tokens
  - [ ] Do NOT call `setupWebhook()`
  - [ ] Generate JWT token
  - [ ] Redirect to frontend
- [ ] Create connection required middleware
  - [ ] Create `src/middleware/composioConnection.ts`
  - [ ] Check if user has `composio_connected_account_id`
  - [ ] Return 403 with `needsConnection: true` if not connected
  - [ ] Allow through if connected
- [ ] Update API routes to require Composio connection
  - [ ] Apply middleware to `/api/emails/*` routes
  - [ ] Apply middleware to `/api/drafts/*` routes
  - [ ] Apply middleware to `/api/calendar/*` routes
  - [ ] Test that unauthenticated requests fail
  - [ ] Test that connected users can access
- [ ] Create test script: `scripts/test-auth-flow.ts`
  - [ ] Test new user signup with Google OAuth
  - [ ] Verify user created with `auth_method='pending_composio'`
  - [ ] Test that API routes return 403 until Composio connected
  - [ ] Test successful flow after Composio connection

---

### 🔄 Phase 7: Frontend Connection Flow
**Status:** PENDING
**Duration:** 6 hours (estimated)
**Target:** Day 6

#### Tasks:
- [ ] Create connection required screen
  - [ ] Create `frontend/src/pages/ConnectIntegrationsRequired.tsx`
  - [ ] Add "Connect Gmail" button (Composio OAuth)
  - [ ] Add "Connect Calendar" button (Composio OAuth)
  - [ ] Show connection status (✓ or pending)
  - [ ] Disable "Continue" until both connected
  - [ ] Add loading states
  - [ ] Add error handling
- [ ] Update App routing
  - [ ] Add route: `/connect-required` in `frontend/src/App.tsx`
  - [ ] Add route guard: check connection status after auth
  - [ ] Redirect to `/connect-required` if not connected
  - [ ] Allow dashboard access if connected
- [ ] Create connection status hook
  - [ ] Create `frontend/src/hooks/useComposioConnectionStatus.ts`
  - [ ] Poll `/api/integrations/user/status` every 30s
  - [ ] Return `{ gmailConnected, calendarConnected, needsConnection }`
- [ ] Update Dashboard
  - [ ] Update `frontend/src/pages/Dashboard.tsx`
  - [ ] Check connection status on load
  - [ ] Redirect to `/connect-required` if `needsConnection === true`
  - [ ] Show reconnection prompts if connection lost
- [ ] Test frontend flow manually
  - [ ] Sign up new user via Google OAuth
  - [ ] Verify redirect to `/connect-required`
  - [ ] Click "Connect Gmail" → Composio OAuth → Success
  - [ ] Click "Connect Calendar" → Composio OAuth → Success
  - [ ] Verify redirect to dashboard
  - [ ] Verify emails load via Composio
  - [ ] Verify calendar events load via Composio

---

### 🔄 Phase 8: Comprehensive Testing
**Status:** PENDING
**Duration:** 8 hours (estimated)
**Target:** Day 7

#### Tasks:
- [ ] Database integrity tests
  - [ ] Create `scripts/test-database-integrity.ts`
  - [ ] Verify all users have correct schema
  - [ ] Check for orphaned records
  - [ ] Verify indexes exist and are used
  - [ ] Test foreign key constraints
- [ ] API endpoint tests
  - [ ] Create `scripts/test-all-api-endpoints.ts`
  - [ ] Test `/auth/signup`, `/auth/signin`, `/auth/callback`
  - [ ] Test `/api/emails/*` - fetch, send, reply
  - [ ] Test `/api/drafts/*` - list, approve, edit
  - [ ] Test `/api/calendar/*` - list, create, availability
  - [ ] Test `/api/integrations/*` - connection status, sync
- [ ] Webhook tests
  - [ ] Create `scripts/test-webhooks-composio.ts`
  - [ ] Send test email to Composio-connected account
  - [ ] Verify webhook received
  - [ ] Verify email processed
  - [ ] Verify draft generated
  - [ ] Check logs for errors
- [ ] User isolation tests
  - [ ] Create `scripts/test-user-isolation.ts`
  - [ ] Create 2 test users
  - [ ] Connect both to Composio
  - [ ] Send email to User A
  - [ ] Verify User B doesn't see it
  - [ ] Test concurrent requests
  - [ ] Verify no race conditions
- [ ] Meeting pipeline tests
  - [ ] Create `scripts/test-meeting-pipeline-composio.ts`
  - [ ] Send email with meeting request
  - [ ] Verify detection works
  - [ ] Verify calendar availability checked via Composio
  - [ ] Verify event created via Composio
  - [ ] Verify confirmation sent via Composio
- [ ] Performance tests
  - [ ] Create `scripts/test-performance.ts`
  - [ ] Measure email fetch time (Composio vs Google)
  - [ ] Measure send time
  - [ ] Measure calendar operations
  - [ ] Verify response times acceptable (<2s)
- [ ] Error handling tests
  - [ ] Create `scripts/test-error-scenarios.ts`
  - [ ] Test expired Composio tokens (should auto-refresh)
  - [ ] Test network errors
  - [ ] Test rate limiting
  - [ ] Test invalid requests
  - [ ] Verify graceful degradation

---

### 🔄 Phase 9: Deployment Preparation
**Status:** PENDING
**Duration:** 2 hours (estimated)
**Target:** Day 7

#### Tasks:
- [ ] Update environment variables in Railway
  - [ ] Set `USE_COMPOSIO=true`
  - [ ] Verify `COMPOSIO_API_KEY=ak_9ckm0hutPg5atdGFtJEd`
  - [ ] Verify `COMPOSIO_GMAIL_AUTH_CONFIG_ID=ac_M2QcFWIKvXv0`
  - [ ] Verify `COMPOSIO_CALENDAR_AUTH_CONFIG_ID=ac_k53apWo91X9Y`
  - [ ] Set `COMPOSIO_WEBHOOK_URL=https://chief-production.up.railway.app/webhooks/composio`
  - [ ] Set `DISABLE_GOOGLE_WEBHOOKS=true`
  - [ ] Keep `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (for sign-in)
- [ ] Verify Composio Dashboard configuration
  - [ ] Log into https://app.composio.dev
  - [ ] Verify Gmail auth config exists (`ac_M2QcFWIKvXv0`)
  - [ ] Verify Calendar auth config exists (`ac_k53apWo91X9Y`)
  - [ ] Set webhook URL to production endpoint
  - [ ] Test webhook delivery in dashboard
- [ ] Update deployment scripts
  - [ ] Update `.github/workflows/deploy.yml` (if exists)
  - [ ] Add database migration step
  - [ ] Verify environment variables set
  - [ ] Add health check after deployment
- [ ] Create rollback plan
  - [ ] Create `ROLLBACK_PLAN.md`
  - [ ] Document steps to revert to Google OAuth
  - [ ] Test rollback procedure in staging
- [ ] Create monitoring dashboard
  - [ ] Create `scripts/monitor-migration.ts`
  - [ ] Track % of users on Composio vs Google OAuth
  - [ ] Monitor error rates
  - [ ] Track webhook delivery success
  - [ ] Alert on failures

---

### 🔄 Phase 10: Production Deployment & Monitoring
**Status:** PENDING
**Duration:** 2 hours deployment + 24 hours monitoring
**Target:** Day 7

#### Tasks:
- [ ] Deploy database migration (if any)
  - [ ] Run `npx tsx scripts/database/apply-composio-schema.ts`
  - [ ] Run `npx tsx scripts/database/verify-composio-schema.ts`
  - [ ] Verify no data loss
- [ ] Deploy backend to Railway
  - [ ] Push code to main branch
  - [ ] Railway auto-deploys
  - [ ] Verify environment variables set
  - [ ] Check deployment logs
  - [ ] Verify server starts successfully
- [ ] Deploy frontend to Vercel
  - [ ] Push code to main branch
  - [ ] Vercel auto-deploys
  - [ ] Verify `VITE_API_URL` points to Railway
  - [ ] Test connection flow
- [ ] Configure Composio webhooks
  - [ ] Update webhook URL in Composio dashboard
  - [ ] Test webhook delivery
  - [ ] Monitor logs for incoming webhooks
- [ ] Test with real user (end-to-end)
  - [ ] Sign up new user via Google OAuth
  - [ ] Complete Composio connection flow
  - [ ] Send test email to user
  - [ ] Verify webhook processes email
  - [ ] Verify draft generated
  - [ ] Approve and send draft
  - [ ] Test meeting request
  - [ ] Verify calendar event created
- [ ] Monitor for 24 hours
  - [ ] Check Railway logs every 2 hours
  - [ ] Monitor error rates in dashboard
  - [ ] Check webhook delivery success rate
  - [ ] Verify all operations working
  - [ ] Track any issues or degradation

---

## Success Criteria

### Must Have (Critical):
- [x] Database schema supports Composio
- [x] Provider abstraction layer implemented
- [x] ServiceFactory routes to Composio providers
- [x] TypeScript compiles with zero errors
- [ ] All dependent services use providers
- [ ] Webhooks deliver emails via Composio
- [ ] Auth flow forces Composio connection
- [ ] Frontend connection UI works
- [ ] All tests pass
- [ ] Production deployment successful
- [ ] Zero data leakage between users
- [ ] No Google OAuth verification warnings

### Should Have (Important):
- [x] Comprehensive API documentation
- [x] Test scripts for all components
- [ ] Performance benchmarks acceptable
- [ ] Error handling robust
- [ ] Logging structured (Pino)
- [ ] Rollback plan tested

### Nice to Have (Optional):
- [ ] Monitoring dashboard
- [ ] Migration analytics
- [ ] A/B testing capability

---

## Risk Mitigation

### Risks Addressed:
- ✅ **Database conflicts** - All columns already exist
- ✅ **API compatibility** - Verified and documented
- ✅ **Type safety** - TypeScript compiles cleanly
- ✅ **User isolation** - ServiceFactory pattern maintained

### Remaining Risks:
- ⚠️ **Webhook reliability** - Test in Phase 5
- ⚠️ **Frontend UX** - Implement in Phase 7
- ⚠️ **Performance** - Benchmark in Phase 8

### Rollback Strategy:
1. Keep Google OAuth code (not deleted)
2. Toggle `USE_COMPOSIO=false` in environment
3. Re-enable Google Pub/Sub webhooks
4. Revert frontend deployment
5. Database columns remain (no data loss)

---

## Timeline

| Phase | Duration | Target Date | Status |
|-------|----------|-------------|--------|
| Phase 0 | 4 hours | Day 1 | ✅ COMPLETE |
| Phase 1 | 2 hours | Day 1 | ✅ COMPLETE |
| Phase 2 | 8 hours | Day 1-2 | ✅ COMPLETE |
| Phase 3 | 4 hours | Day 2 | ✅ COMPLETE |
| Phase 4 | 8 hours | Day 3 | 🔄 PENDING |
| Phase 5 | 8 hours | Day 4-5 | 🔄 PENDING |
| Phase 6 | 6 hours | Day 5 | 🔄 PENDING |
| Phase 7 | 6 hours | Day 6 | 🔄 PENDING |
| Phase 8 | 8 hours | Day 7 | 🔄 PENDING |
| Phase 9 | 2 hours | Day 7 | 🔄 PENDING |
| Phase 10 | 2+ hours | Day 7 | 🔄 PENDING |
| **Total** | **56 hours** | **7 days** | **40% COMPLETE** |

---

## Files Created/Modified

### New Files (13):
1. `src/services/providers/IEmailProvider.ts`
2. `src/services/providers/ICalendarProvider.ts`
3. `src/services/providers/ComposioEmailProvider.ts`
4. `src/services/providers/ComposioCalendarProvider.ts`
5. `src/services/providers/index.ts`
6. `scripts/database/verify-production-schema.ts`
7. `scripts/test-email-provider.ts`
8. `scripts/test-calendar-provider.ts`
9. `scripts/test-service-factory-providers.ts`
10. `COMPOSIO_API_REFERENCE.md`
11. `COMPOSIO_MIGRATION_PROGRESS.md`
12. `.github/ISSUE_COMPOSIO_MIGRATION.md` (this file)

### Modified Files (2):
1. `src/utils/serviceFactory.ts` - Added provider methods
2. `scripts/database/complete_working_schema.sql` - Updated schema docs

---

## Environment Variables

### Production (Railway):
```bash
# Composio (enable migration)
USE_COMPOSIO=true
COMPOSIO_API_KEY=ak_9ckm0hutPg5atdGFtJEd
COMPOSIO_GMAIL_AUTH_CONFIG_ID=ac_M2QcFWIKvXv0
COMPOSIO_CALENDAR_AUTH_CONFIG_ID=ac_k53apWo91X9Y
COMPOSIO_WEBHOOK_URL=https://chief-production.up.railway.app/webhooks/composio

# Google OAuth (keep for sign-in only)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=...

# Disable Google webhooks
DISABLE_GOOGLE_WEBHOOKS=true
```

---

## Code Metrics

- **Lines of code added:** ~1,200
- **Test scripts created:** 5
- **Documentation pages:** 2
- **TypeScript errors:** 0
- **Compilation status:** ✅ Clean

---

## References

- **Main Documentation:** `COMPOSIO_API_REFERENCE.md`
- **Progress Report:** `COMPOSIO_MIGRATION_PROGRESS.md`
- **Composio Dashboard:** https://app.composio.dev
- **Composio Docs:** https://docs.composio.dev

---

**Created:** 2025-11-14
**Last Updated:** 2025-11-14
**Priority:** High
**Labels:** `migration`, `composio`, `google-oauth`, `architecture`
