# 🚀 Quick Test Guide for Composio Integration

**Test Account:** p.ahiir01@gmail.com
**Test Page:** http://localhost:5173/integrations/test
**Time Required:** 5-10 minutes

---

## ⚡ Quick Start (3 Steps)

### 1. Start Servers
```bash
# Terminal 1 - Backend
cd /Users/parthahir/Desktop/chief
npm run dev

# Terminal 2 - Frontend
cd /Users/parthahir/Desktop/chief/frontend
npm run dev
```

### 2. Navigate & Sign In
1. Go to http://localhost:5173
2. Sign in as: **p.ahiir01@gmail.com**
3. If not connected, go to http://localhost:5173/integrations and connect Gmail + Calendar

### 3. Run Tests
1. Go to http://localhost:5173/integrations/test
2. Click **"Run All Tests"**
3. Wait ~30 seconds
4. Verify all tests show ✅

---

## ✅ What Success Looks Like

```
Test Results Summary:
✅ Passed:   6
❌ Failed:   0
⚠️  Skipped:  0

Tests:
✅ User Isolation Verification      (verified user scoping)
✅ Fetch Emails                     (5 emails fetched)
✅ Fetch Email Thread               (thread found)
✅ Fetch Calendar Events            (10 events found)
✅ Send Test Email                  (email sent successfully)
✅ Create Calendar Event            (event created successfully)
```

---

## ❌ If Something Fails

### "No Composio connection found"
→ Go to /integrations → Click "Connect Gmail" + "Connect Calendar"

### "Failed to fetch emails"
→ Check backend logs for detailed error
→ Verify OAuth tokens in database: `SELECT * FROM user_gmail_tokens WHERE user_id = 'YOUR_USER_ID';`

### "Toolkit version not specified"
→ Already fixed in code, restart servers if you see this

---

## 🔍 Quick Verification Checklist

- [ ] User info card shows: p.ahiir01@gmail.com ✅
- [ ] Composio Connection shows: Connected ✅
- [ ] User Isolation test passes ✅
- [ ] Fetch Emails returns YOUR emails (not someone else's) ✅
- [ ] Send Email appears in YOUR sent folder ✅
- [ ] Create Event appears in YOUR calendar ✅
- [ ] No errors in browser console ✅
- [ ] No errors in backend terminal ✅

---

## 🎯 Key Things to Verify

### 1. User Isolation (MOST IMPORTANT)
- Test page shows YOUR email (p.ahiir01@gmail.com)
- Emails fetched are YOURS (check subjects/senders)
- Calendar events are YOURS (check event titles)
- **Critical:** No data from other users appears

### 2. Architecture Correctness
- Backend logs show correct userId in all operations
- Database queries filter by correct user_id
- No race conditions (run tests multiple times)

### 3. Composio Integration
- Gmail fetch works
- Gmail send works
- Calendar list works
- Calendar create works

---

## 📊 Understanding Test Results

### User Isolation Test
**What it tests:** Backend uses correct userId from JWT token

**Success looks like:**
```json
{
  "verified": true,
  "entityId": "p.ahiir01@gmail.com",
  "message": "User isolation verified"
}
```

### Fetch Emails Test
**What it tests:** Composio fetches YOUR emails only

**Success looks like:**
```json
{
  "emails": {
    "messages": [
      { "id": "...", "snippet": "Re: Your meeting..." }
    ]
  }
}
```

### Send Email Test
**What it tests:** Composio sends email as YOU

**Success looks like:**
```json
{
  "result": {
    "id": "18d123...",
    "threadId": "18d123..."
  }
}
```

---

## 🔧 Debug Commands

### Check Backend Health
```bash
curl http://localhost:3000/health
```

### Check User Status
```bash
curl http://localhost:3000/api/integrations/user/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Check Database
```sql
-- Check your Composio connection
SELECT * FROM user_gmail_tokens WHERE user_id = 'YOUR_USER_ID';

-- Should show composio_entity_id and composio_connected_account_id
```

---

## 📞 Need Help?

**Read Full Guide:** `COMPOSIO_TESTING_GUIDE.md`
**Architecture Details:** `COMPOSIO_API_FIX_SUMMARY.md`
**Project Overview:** `CLAUDE.md`

---

**Status:** ✅ Ready for testing with p.ahiir01@gmail.com
