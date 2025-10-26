# Composio Migration Testing Checklist

**Date:** 2025-10-26
**Tester:** _________________
**Environment:** [ ] Development [ ] Staging [ ] Production

---

## Pre-Testing Setup

- [ ] Composio API key obtained and added to `.env`
- [ ] Database backup completed
- [ ] Migration script executed successfully
- [ ] Server starts without errors with `USE_COMPOSIO=false`
- [ ] Server starts without errors with `USE_COMPOSIO=true`

---

## Phase 1: OAuth Flow Testing

### 1.1 Signup Flow

- [ ] Navigate to `/auth/composio/signup`
- [ ] Receives valid OAuth URL
- [ ] OAuth URL contains Composio domain
- [ ] Clicking URL redirects to Composio/Google consent screen
- [ ] Can select Google account
- [ ] Permission screen shows Gmail and Calendar scopes
- [ ] Grants permissions successfully
- [ ] Redirects to `/auth/composio/callback`
- [ ] Callback processes without errors
- [ ] Redirects to frontend with JWT token
- [ ] JWT token is valid and can be decoded
- [ ] User record created in database
- [ ] `composio_entity_id` populated
- [ ] `auth_method` set to 'composio'
- [ ] `migration_status` set to 'completed'

**Notes:**
```
Entity ID: _____________________
User ID: _____________________
Any errors: _____________________
```

### 1.2 Signin Flow

- [ ] Navigate to `/auth/composio/signin`
- [ ] Receives valid OAuth URL
- [ ] Complete OAuth flow
- [ ] Existing user recognized
- [ ] JWT token returned
- [ ] Can authenticate with JWT token

**Notes:**
```
Existing user email: _____________________
JWT works: [ ] Yes [ ] No
```

### 1.3 Error Handling

- [ ] Invalid code parameter → Proper error message
- [ ] Missing code parameter → Redirects with error
- [ ] Composio API error → Handled gracefully
- [ ] Network timeout → Handled gracefully

---

## Phase 2: Gmail Functionality

### 2.1 Email Fetching

#### Test with authenticated JWT:

```bash
curl -H "Authorization: Bearer YOUR_JWT" \
  http://localhost:3000/emails/fetch
```

- [ ] Request succeeds (200 OK)
- [ ] Returns list of emails
- [ ] Emails contain correct structure (id, subject, from, etc.)
- [ ] Emails saved to database
- [ ] Can see emails in frontend
- [ ] Email count matches Gmail

**Test Results:**
```
Emails fetched: _____
Emails saved: _____
Time taken: _____ ms
Errors: _____________________
```

### 2.2 Email Sending

#### Test draft approval/sending:

- [ ] Create a draft via UI
- [ ] Draft appears in `/auto-drafts`
- [ ] Click "Approve & Send"
- [ ] Email sends successfully via Composio
- [ ] Recipient receives email
- [ ] Email appears in Gmail Sent folder
- [ ] Correct "From" address
- [ ] Subject and body preserved

**Test Results:**
```
Draft ID: _____________________
Send successful: [ ] Yes [ ] No
Recipient confirmed receipt: [ ] Yes [ ] No
Time to send: _____ seconds
```

### 2.3 Thread Operations

- [ ] Can fetch thread emails
- [ ] Reply to thread works
- [ ] Thread ID maintained correctly
- [ ] Conversation history preserved

---

## Phase 3: Calendar Functionality

### 3.1 Event Fetching

```bash
curl -H "Authorization: Bearer YOUR_JWT" \
  http://localhost:3000/meetings
```

- [ ] Returns calendar events
- [ ] Events match Google Calendar
- [ ] Timezone handling correct
- [ ] Attendee information preserved

### 3.2 Event Creation

- [ ] Can create calendar event
- [ ] Event appears in Google Calendar
- [ ] Start/end times correct
- [ ] Timezone applied correctly
- [ ] Attendees invited (if applicable)

**Test Event Details:**
```
Event summary: Test Meeting via Composio
Start: 2025-10-27T10:00:00
End: 2025-10-27T11:00:00
Created successfully: [ ] Yes [ ] No
Appears in Google Calendar: [ ] Yes [ ] No
```

### 3.3 Availability Checking

- [ ] Can check availability for time slot
- [ ] Returns accurate availability status
- [ ] Detects conflicts correctly
- [ ] Free slots identified correctly

---

## Phase 4: Webhook Testing

### 4.1 Webhook Reception

#### Send test email to authenticated user's Gmail:

- [ ] Webhook endpoint `/webhooks/composio` receives notification
- [ ] Webhook acknowledged with 200 OK
- [ ] Signature validation passes (if implemented)
- [ ] Trigger payload parsed correctly

**Webhook Test:**
```
Test email subject: Test Webhook - Composio
Sent at: _____________________
Webhook received at: _____________________
Delay: _____ seconds
```

### 4.2 Email Processing via Webhook

- [ ] New email processed within 60 seconds
- [ ] Email saved to database
- [ ] Email routed through intelligent router
- [ ] Email appears in frontend
- [ ] Draft generated (if applicable)

### 4.3 Duplicate Prevention

#### Send same test email twice:

- [ ] First webhook processes successfully
- [ ] Second webhook skipped (duplicate detected)
- [ ] Redis lock acquired/released correctly
- [ ] Only one email record in database

**Deduplication Test:**
```
Test email ID: _____________________
First webhook: [ ] Processed [ ] Skipped
Second webhook: [ ] Processed [ ] Skipped
Database records: _____
```

### 4.4 Webhook Statistics

```bash
curl http://localhost:3000/webhooks/composio/stats
```

- [ ] Returns webhook statistics
- [ ] `totalReceived` incrementing
- [ ] `totalProcessed` incrementing
- [ ] `lastReceived` timestamp accurate

---

## Phase 5: ServiceFactory & Feature Flag

### 5.1 Feature Flag Toggle

#### Test with USE_COMPOSIO=true:

- [ ] Server starts successfully
- [ ] Composio routes registered
- [ ] Composio webhook enabled
- [ ] `getGmailService()` returns `ComposioGmailService`
- [ ] `getCalendarService()` returns `ComposioCalendarService`
- [ ] All API endpoints work

#### Test with USE_COMPOSIO=false:

- [ ] Server starts successfully
- [ ] Legacy routes still work
- [ ] Composio webhook disabled
- [ ] `getGmailService()` returns legacy `GmailService`
- [ ] `getCalendarService()` returns legacy `CalendarService`
- [ ] All API endpoints work

#### Toggle Test:

- [ ] Switch from `true` → `false` → restart → works
- [ ] Switch from `false` → `true` → restart → works
- [ ] No errors during transition
- [ ] No data loss

**Feature Flag Test Results:**
```
Toggle 1 (true → false): [ ] Success [ ] Fail
Toggle 2 (false → true): [ ] Success [ ] Fail
Errors encountered: _____________________
```

### 5.2 Multi-User Isolation

#### Create two test users:

**User 1:**
- [ ] Authenticate via Composio
- [ ] Fetch emails
- [ ] Emails belong to User 1 only

**User 2:**
- [ ] Authenticate via Composio (different account)
- [ ] Fetch emails
- [ ] Emails belong to User 2 only

**Cross-User Test:**
- [ ] User 1 cannot see User 2's emails
- [ ] User 2 cannot see User 1's emails
- [ ] Service containers isolated correctly
- [ ] No data leakage

**Isolation Test Results:**
```
User 1 email count: _____
User 2 email count: _____
Any cross-contamination: [ ] Yes [ ] No
```

---

## Phase 6: Error Handling & Edge Cases

### 6.1 Invalid JWT Token

```bash
curl -H "Authorization: Bearer invalid_token" \
  http://localhost:3000/emails/fetch
```

- [ ] Returns 401 Unauthorized
- [ ] Error message clear
- [ ] No sensitive info leaked

### 6.2 Expired JWT Token

- [ ] Expired token rejected
- [ ] Returns appropriate error
- [ ] Frontend redirects to login

### 6.3 Composio API Errors

#### Simulate Composio downtime:

- [ ] Graceful error handling
- [ ] User-friendly error message
- [ ] Server doesn't crash
- [ ] Logs error details

### 6.4 Missing Entity ID

#### User from legacy OAuth tries to use Composio:

- [ ] Clear error message
- [ ] Prompts re-authentication
- [ ] No 500 errors

### 6.5 Database Connection Failure

- [ ] Retry logic kicks in
- [ ] Graceful degradation
- [ ] Error logged

---

## Phase 7: Performance Testing

### 7.1 Response Times

Measure and record:

```
GET /auth/composio/signup: _____ ms
GET /emails/fetch: _____ ms
POST /auto-drafts/:id/send: _____ ms
Webhook processing: _____ ms
```

**Acceptance Criteria:**
- OAuth URL generation: < 500ms
- Email fetching: < 2000ms
- Email sending: < 3000ms
- Webhook processing: < 1000ms

### 7.2 Concurrent Requests

#### Run 10 concurrent email fetches:

```bash
for i in {1..10}; do
  curl -H "Authorization: Bearer TOKEN" \
    http://localhost:3000/emails/fetch &
done
wait
```

- [ ] All requests succeed
- [ ] No 500 errors
- [ ] No race conditions
- [ ] ServiceFactory isolation maintained

### 7.3 Webhook Burst

#### Send 5 emails rapidly:

- [ ] All webhooks received
- [ ] All webhooks processed
- [ ] No missed notifications
- [ ] No duplicate processing

---

## Phase 8: Integration Testing

### 8.1 End-to-End Flow

**Complete User Journey:**

1. [ ] User signs up via `/auth/composio/signup`
2. [ ] Completes OAuth flow
3. [ ] JWT token received
4. [ ] Navigates to dashboard
5. [ ] Sees email list (fetched via Composio)
6. [ ] Opens email detail
7. [ ] AI draft generated
8. [ ] User edits draft
9. [ ] User approves and sends
10. [ ] Email sent via Composio
11. [ ] Send new email to user
12. [ ] Webhook processes new email within 60s
13. [ ] New email appears in dashboard
14. [ ] Cycle repeats

**E2E Test Result:**
```
All steps completed: [ ] Yes [ ] No
Failed at step: _____
Time for complete cycle: _____ minutes
```

### 8.2 Meeting Pipeline

- [ ] Receive meeting request email
- [ ] Meeting detected automatically
- [ ] Calendar availability checked
- [ ] Meeting proposal generated
- [ ] User approves meeting
- [ ] Calendar event created
- [ ] Response sent to requester

---

## Phase 9: Security Testing

### 9.1 OAuth Security

- [ ] State parameter validated
- [ ] CSRF protection active
- [ ] Tokens encrypted in database
- [ ] No tokens in logs

### 9.2 Webhook Security

- [ ] Signature validation (if enabled)
- [ ] Replay attack prevention
- [ ] Rate limiting applied
- [ ] No unauthenticated access

### 9.3 Data Privacy

- [ ] User IDs sanitized in logs
- [ ] Email content not logged
- [ ] PII properly masked
- [ ] GDPR compliance maintained

---

## Phase 10: Logging & Monitoring

### 10.1 Log Quality

- [ ] Composio actions logged with Pino
- [ ] Structured log format (JSON)
- [ ] Appropriate log levels used
- [ ] No console.log in production code
- [ ] User IDs sanitized

### 10.2 Error Tracking

- [ ] All errors logged with context
- [ ] Stack traces captured
- [ ] Error codes meaningful
- [ ] Alerts configured (if applicable)

### 10.3 Metrics

- [ ] Webhook latency tracked
- [ ] API response times tracked
- [ ] Success/failure rates tracked
- [ ] User migration count tracked

---

## Final Checklist

### Pre-Production

- [ ] All tests passed
- [ ] No critical bugs found
- [ ] Performance acceptable
- [ ] Security validated
- [ ] Rollback tested and working
- [ ] Documentation complete
- [ ] Team trained on rollback procedure
- [ ] Monitoring dashboards configured
- [ ] Backup strategy confirmed

### Production Readiness

- [ ] Feature flag set correctly (`USE_COMPOSIO=true` for prod)
- [ ] Composio API key for production configured
- [ ] Webhook URL set to production domain
- [ ] Database migration applied to production
- [ ] Redis configured and connected
- [ ] All environment variables set
- [ ] SSL certificates valid
- [ ] Load balancer configured (if applicable)

### Post-Deployment

- [ ] Monitor logs for 1 hour post-deployment
- [ ] Check webhook processing
- [ ] Verify no errors
- [ ] User signup/signin working
- [ ] Email fetching working
- [ ] Email sending working
- [ ] Customer support briefed
- [ ] Rollback plan ready

---

## Sign-Off

**Tested By:** _____________________
**Date:** _____________________
**Test Duration:** _____ hours
**Total Tests:** _____
**Passed:** _____
**Failed:** _____
**Pass Rate:** _____%

**Recommendation:**
[ ] Approve for Production
[ ] Needs Fixes - Retest Required
[ ] Reject - Major Issues

**Notes:**
```
_____________________________________________________
_____________________________________________________
_____________________________________________________
```

---

**Next Steps:**
1. Address any failed tests
2. Retest after fixes
3. Get stakeholder approval
4. Deploy to production
5. Monitor for 24 hours
6. Celebrate! 🎉
