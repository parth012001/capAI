# Composio Integration Testing Guide

**Purpose:** Comprehensive end-to-end testing to verify Composio SDK v0.2.4 integration works correctly with real user data and ensures proper user isolation.

**Test User:** p.ahiir01@gmail.com (or your configured test account)

---

## 🎯 What This Tests

### 1. OAuth & Authentication ✅
- User authentication via JWT works correctly
- Backend extracts correct userId from JWT token
- ServiceFactory pattern prevents race conditions

### 2. Composio Gmail Integration ✅
- ✅ Fetch emails for authenticated user
- ✅ Send emails as authenticated user
- ✅ Reply to email threads

### 3. Composio Calendar Integration ✅
- ✅ List calendar events for authenticated user
- ✅ Create calendar events as authenticated user

### 4. User Isolation (CRITICAL) ✅
- ✅ No data leakage between users
- ✅ Database queries scoped to correct user
- ✅ ServiceFactory creates isolated instances
- ✅ Request-scoped dependency injection working

### 5. Database Operations ✅
- ✅ User ID correctly passed through all layers
- ✅ OAuth tokens retrieved for correct user
- ✅ Connected account ID matches authenticated user

---

## 🚀 Quick Start

### Step 1: Start Development Servers

**Terminal 1 - Backend:**
```bash
cd /Users/parthahir/Desktop/chief
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd /Users/parthahir/Desktop/chief/frontend
npm run dev
```

### Step 2: Sign In as Test User

1. Navigate to `http://localhost:5173`
2. Sign in as **p.ahiir01@gmail.com**
3. Complete OAuth if not already done

### Step 3: Connect Composio (If Not Already Connected)

1. Navigate to `http://localhost:5173/integrations`
2. Click "Connect Gmail via Composio"
3. Click "Connect Calendar via Composio"
4. Complete OAuth flows for both

### Step 4: Run Test Suite

1. Navigate to `http://localhost:5173/integrations/test`
2. Verify user info shows:
   - ✅ Email: p.ahiir01@gmail.com
   - ✅ Composio Connection: Connected
3. Click **"Run All Tests"**
4. Wait for all tests to complete

---

## 📊 Test Page Features

### User Information Card
Shows:
- Current logged-in email
- User ID from JWT token
- Composio connection status

### Test Controls
Individual test buttons:
- **Test User Isolation** - Verifies correct user scoping
- **Test Fetch Emails** - Fetches last 5 emails
- **Test Fetch Calendar** - Fetches events for next 7 days
- **Test Send Email** - Sends test email to yourself
- **Test Create Event** - Creates test calendar event

### Test Results
- Real-time status indicators (✅ success, ❌ error, 🔄 running)
- Detailed error messages
- Response data view (expandable)
- Execution time for each test
- Summary statistics

---

## ✅ Expected Results

### User Isolation Test
```json
{
  "verified": true,
  "entityId": "p.ahiir01@gmail.com",
  "message": "User isolation verified - backend correctly uses authenticated user ID"
}
```

**What This Verifies:**
- Backend extracts userId from JWT token
- Database queries use correct userId
- No possibility of data leakage

### Fetch Emails Test
```json
{
  "success": true,
  "emails": {
    "messages": [
      {
        "id": "18d1234567890abcd",
        "threadId": "18d1234567890abcd",
        "snippet": "Email preview text..."
      }
    ]
  }
}
```

**What This Verifies:**
- Composio SDK fetches emails using correct userId
- Only YOUR emails are returned
- Gmail API scopes are correctly configured

### Fetch Calendar Test
```json
{
  "success": true,
  "events": [
    {
      "id": "abc123",
      "summary": "Team Meeting",
      "start": { "dateTime": "2025-11-13T10:00:00-08:00" },
      "end": { "dateTime": "2025-11-13T11:00:00-08:00" }
    }
  ]
}
```

**What This Verifies:**
- Composio SDK fetches calendar events using correct userId
- Only YOUR events are returned
- Calendar API scopes are correctly configured

### Send Email Test
```json
{
  "success": true,
  "result": {
    "id": "18d1234567890abcd",
    "threadId": "18d1234567890abcd"
  }
}
```

**What This Verifies:**
- Composio SDK sends email as authenticated user
- Email appears in YOUR sent folder
- No impersonation of other users

### Create Calendar Event Test
```json
{
  "success": true,
  "result": {
    "id": "abc123",
    "htmlLink": "https://calendar.google.com/..."
  }
}
```

**What This Verifies:**
- Composio SDK creates events in YOUR calendar
- Event ownership is correct
- No calendar access to other users

---

## 🔒 User Isolation Verification

### How User Isolation Works

**1. JWT Authentication (Entry Point)**
```typescript
// src/middleware/auth.ts
const token = req.headers.authorization?.split(' ')[1];
const decoded = jwt.verify(token, JWT_SECRET);
req.userId = decoded.userId;  // ✅ User ID set on request
```

**2. ServiceFactory (Isolation Layer)**
```typescript
// src/utils/serviceFactory.ts
export class ServiceFactory {
  private userId: string;

  static createFromRequest(req: Request): ServiceFactory {
    return new ServiceFactory(req.userId!);  // ✅ Request-scoped instance
  }

  // Each request gets its own isolated service instances
  getComposioService() {
    return new ComposioService(this.userId);
  }
}
```

**3. Backend Routes (User Scoping)**
```typescript
// src/routes/composio.routes.ts
router.post('/test/fetch-emails', authMiddleware.authenticate, async (req, res) => {
  const userId = req.userId!;  // ✅ Extracted from JWT

  // All operations scoped to this user
  const emails = await composioService.fetchEmails(userId, { ... });

  res.json({ emails });  // ✅ Only this user's emails
});
```

**4. Database Queries (Final Layer)**
```typescript
// Backend always includes userId in queries
const result = await queryWithRetry(
  'SELECT * FROM user_gmail_tokens WHERE user_id = $1',
  [userId]  // ✅ User isolation at database level
);
```

### Why There's No Data Leakage

1. **Request Isolation:** Each HTTP request creates a new ServiceFactory instance
2. **User Scoping:** userId flows through all layers (JWT → Middleware → Routes → Services → Database)
3. **No Global State:** No shared service instances between requests
4. **Database Constraints:** All queries filter by user_id
5. **OAuth Token Isolation:** Each user's tokens stored separately in database

### Testing User Isolation

**Scenario 1: Concurrent Requests from Different Users**
```
User A (p.ahiir01@gmail.com) → Request 1 → ServiceFactory(userA) → Composio(userA) → Gmail API
User B (other@email.com)     → Request 2 → ServiceFactory(userB) → Composio(userB) → Gmail API
```

Result: ✅ Each user gets their own data, no mixing

**Scenario 2: Database Query Isolation**
```sql
-- User A's request
SELECT * FROM user_gmail_tokens WHERE user_id = 'userA'

-- User B's request
SELECT * FROM user_gmail_tokens WHERE user_id = 'userB'
```

Result: ✅ Database enforces user isolation via WHERE clause

**Scenario 3: Service Instance Isolation**
```typescript
// Request 1: User A
const servicesA = ServiceFactory.createFromRequest(reqA);  // New instance
const composioA = servicesA.getComposioService();  // Scoped to User A

// Request 2: User B (concurrent)
const servicesB = ServiceFactory.createFromRequest(reqB);  // Different instance
const composioB = servicesB.getComposioService();  // Scoped to User B
```

Result: ✅ No shared state, no race conditions

---

## 🧪 Manual Verification Steps

### Step 1: Verify JWT Token Contains Correct User ID

**In Browser Console:**
```javascript
const authData = JSON.parse(localStorage.getItem('chief_ai_auth_tokens'));
console.log('JWT Token:', authData.jwt_token);

// Decode JWT (manually at jwt.io or using a library)
// Verify 'userId' or 'sub' claim matches your user
```

### Step 2: Verify Backend Logs Show Correct User

**In Backend Terminal (after running test):**
```
Look for logs like:
✅ composio.test.fetch.request
   userId: "user_abc..." (should be YOUR user ID)
```

### Step 3: Verify Database Operations

**In psql or database GUI:**
```sql
-- Check your user's Composio connection
SELECT user_id, composio_entity_id, composio_connected_account_id
FROM user_gmail_tokens
WHERE user_id = 'YOUR_USER_ID';

-- Verify no cross-user data leakage
SELECT DISTINCT user_id FROM user_gmail_tokens;
-- Should only show users who actually exist
```

### Step 4: Test with Multiple Users (Advanced)

1. Sign in as User A (p.ahiir01@gmail.com)
2. Run test suite, note the emails fetched
3. Sign out
4. Sign in as User B (different account)
5. Run test suite, verify DIFFERENT emails fetched
6. Confirm no overlap in data

---

## ⚠️ Common Issues & Solutions

### Issue: "No Composio connection found"

**Symptoms:** Red error message on test page

**Solution:**
1. Navigate to `/integrations`
2. Click "Connect Gmail via Composio"
3. Complete OAuth flow
4. Return to test page

### Issue: "Toolkit version not specified"

**Symptoms:** Errors in console about version

**Status:** ✅ Fixed - code now uses `dangerouslySkipVersionCheck: true`

### Issue: "Failed to fetch emails"

**Possible Causes:**
1. OAuth connection expired → Re-authenticate at `/integrations`
2. Insufficient Gmail scopes → Check Composio dashboard for granted scopes
3. User not found in database → Verify user exists in `user_gmail_tokens` table

**Debug:**
```bash
# Check backend logs for detailed error
npm run dev
# Look for "composio.gmail.fetch.failed" logs
```

### Issue: Tests pass but data seems wrong

**Verification:**
1. Check browser's logged-in user (top right)
2. Check test page's "User Information" card
3. Verify userId matches expectations
4. Check database for correct user_id in tokens table

---

## 📝 Testing Checklist

Before declaring integration ready:

- [ ] User can sign in as p.ahiir01@gmail.com
- [ ] User can complete Composio OAuth for Gmail
- [ ] User can complete Composio OAuth for Calendar
- [ ] Test page loads without errors
- [ ] User Isolation test passes (✅ verified)
- [ ] Fetch Emails test passes with YOUR emails
- [ ] Fetch Calendar test passes with YOUR events
- [ ] Send Email test passes (email appears in YOUR sent folder)
- [ ] Create Event test passes (event appears in YOUR calendar)
- [ ] No errors in browser console
- [ ] No errors in backend logs
- [ ] Database queries show correct user_id
- [ ] Multiple concurrent users don't see each other's data

---

## 🎓 Understanding the Architecture

### Request Flow

```
User Browser (p.ahiir01@gmail.com)
  ↓ (JWT token in Authorization header)
Frontend: GET /api/integrations/test/fetch-emails
  ↓
Auth Middleware: Verify JWT → Extract userId → Set req.userId
  ↓ (userId = "user_abc123")
Route Handler: Create ServiceFactory(req.userId)
  ↓
ComposioService: tools.execute('GMAIL_FETCH_EMAILS', { userId })
  ↓
Composio SDK: Fetch user's OAuth tokens from database
  ↓
Database Query: SELECT * FROM user_gmail_tokens WHERE user_id = $1
  ↓ (Returns p.ahiir01@gmail.com's tokens)
Gmail API: Fetch emails using p.ahiir01@gmail.com's OAuth token
  ↓
Response: Only p.ahiir01@gmail.com's emails returned
  ↓
Frontend: Display emails to p.ahiir01@gmail.com
```

**Key Isolation Points:**
1. ✅ JWT token ties request to specific user
2. ✅ Middleware extracts userId from token (not from request body!)
3. ✅ ServiceFactory creates isolated instance per request
4. ✅ Database query filters by user_id
5. ✅ OAuth tokens are user-specific

### Why This Architecture is Secure

**Problem Prevented:** Race conditions with global singletons

**Bad Example (Don't Do This):**
```typescript
// ❌ WRONG - Global singleton
const gmailService = new GmailService();

app.get('/emails', async (req, res) => {
  gmailService.userId = req.userId;  // Race condition!
  const emails = await gmailService.fetchEmails();
  res.json(emails);
});
```

**What Happens:**
```
Time 0ms: User A's request → gmailService.userId = 'userA'
Time 1ms: User B's request → gmailService.userId = 'userB'  // OVERWRITES!
Time 2ms: User A's fetch executes → Uses 'userB'           // DATA LEAK!
```

**Good Example (Current Implementation):**
```typescript
// ✅ CORRECT - Request-scoped instance
app.get('/emails', async (req, res) => {
  const services = ServiceFactory.createFromRequest(req);  // New instance
  const gmail = await services.getComposioService();       // Isolated
  const emails = await gmail.fetchEmails(req.userId);
  res.json(emails);
});
```

**What Happens:**
```
Time 0ms: User A → ServiceFactory(userA) → ComposioService(userA)
Time 1ms: User B → ServiceFactory(userB) → ComposioService(userB)
Time 2ms: Both execute independently, no mixing
```

---

## 📊 Success Criteria

Integration is ready for production migration when:

1. ✅ All tests pass for p.ahiir01@gmail.com
2. ✅ User isolation test confirms correct user scoping
3. ✅ No TypeScript compilation errors
4. ✅ No console errors in browser
5. ✅ No backend errors in logs
6. ✅ Emails/calendar data matches authenticated user
7. ✅ Database queries show correct user_id filtering
8. ✅ Multiple concurrent users work without interference

---

## 🚀 Next Steps After Testing

Once all tests pass:

1. **Document findings** - Record test results
2. **Plan migration** - Gradual rollout strategy
3. **Monitor metrics** - Error rates, response times
4. **User feedback** - Collect user reports
5. **Rollback plan** - Quick revert if issues found

---

## 📞 Support

**Issues During Testing:**
- Check backend logs: `npm run dev` output
- Check browser console: F12 → Console tab
- Check network tab: F12 → Network tab
- Review COMPOSIO_API_FIX_SUMMARY.md for API changes
- Review CLAUDE.md for architecture patterns

**Critical Files:**
- Frontend test page: `frontend/src/pages/ComposioTestPage.tsx`
- Backend test routes: `src/routes/composio.routes.ts`
- Service implementation: `src/services/composio.ts`
- Auth middleware: `src/middleware/auth.ts`
- ServiceFactory: `src/utils/serviceFactory.ts`

---

**Testing Status:** ⏳ Ready for manual testing with p.ahiir01@gmail.com
