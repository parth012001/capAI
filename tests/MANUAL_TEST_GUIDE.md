# 🧪 MANUAL TESTING GUIDE - TIMEZONE IMPLEMENTATION

## Overview
This guide helps you manually test the timezone implementation with real Google accounts and meeting requests.

---

## Prerequisites

- ✅ Backend server running locally (`npm run dev`)
- ✅ Frontend running locally on port 5173
- ✅ Ngrok tunnel active for webhook testing
- ✅ At least one Google account connected

---

## Test Plan

### **Test 1: PST User - Basic Meeting Request**

**Scenario:** Test if PST user gets correct meeting time

**Steps:**
1. Login as a user whose Google Calendar timezone is set to PST
2. Send yourself an email: "Can we meet tomorrow at 2pm?"
3. System should generate draft accepting the meeting
4. **Verify:** Draft mentions "2pm" (not 6am or any other time)
5. Approve and send draft
6. **Verify:** Calendar event created at 2pm PST

**Expected Logs:**
```
🌍 [TIMEZONE] User timezone for availability check: America/Los_Angeles
📅 [TIMEZONE] Parsed "tomorrow at 2pm" in America/Los_Angeles:
   → UTC: 2024-10-07T21:00:00.000Z (or similar)
   → Local: Sunday, October 7, 2024 at 2:00 PM PDT
✅ [CALENDAR] Creating event in timezone: America/Los_Angeles
📅 [CALENDAR] Start: 2024-10-07T14:00:00 (America/Los_Angeles)
```

**Success Criteria:**
- ✅ Email draft says "2pm"
- ✅ Calendar event shows 2pm in your local calendar
- ✅ Logs show "America/Los_Angeles" timezone
- ✅ Event has explicit timeZone in Google Calendar

---

### **Test 2: Availability Check with Conflict**

**Scenario:** Test if system correctly detects conflicts in user's timezone

**Setup:**
1. Create a calendar event for tomorrow at 3pm PST
2. Send email: "Can we meet tomorrow at 3pm?"

**Expected Behavior:**
- ❌ System should detect conflict
- 📧 Draft should suggest alternative times or Calendly link
- **NOT** accept the meeting

**Expected Logs:**
```
🌍 [TIMEZONE] User timezone for availability check: America/Los_Angeles
📅 Availability check: ❌ Conflict found for tomorrow at 3pm (America/Los_Angeles)
```

**Success Criteria:**
- ✅ System detects conflict (not "available")
- ✅ Draft doesn't accept meeting at 3pm
- ✅ Suggests alternatives or scheduling link

---

### **Test 3: EST User (if you have access to EST account)**

**Scenario:** Test different timezone user

**Steps:**
1. Login with account whose Google Calendar is set to EST
2. Send email: "Meeting Friday at 10am?"
3. System should parse as 10am EST (not 10am PST or UTC!)

**Expected Logs:**
```
🌍 [TIMEZONE] User timezone: America/New_York
📅 [TIMEZONE] Parsed "Friday at 10am" in America/New_York:
   → Local: Friday, October 11, 2024 at 10:00 AM EDT
```

**Success Criteria:**
- ✅ Calendar event at 10am EST (not 10am PST)
- ✅ Logs show "America/New_York"

---

### **Test 4: Server Timezone Independence**

**Scenario:** Verify server timezone doesn't affect results

**Current Server Timezone:**
```bash
# Check your server timezone
date +%Z
# Should show PST or PDT since you're on Mac
```

**Test:**
1. Make meeting request for "2pm tomorrow"
2. **Critical:** Event should be at 2pm *in user's Google Calendar timezone*
3. Not 2pm in server's timezone (your Mac's timezone)

**How to Verify:**
- Check logs for: `🌍 [TIMEZONE] User timezone for availability check:`
- Should show user's Google Calendar timezone
- NOT your Mac's timezone

---

### **Test 5: Database Timezone Storage**

**Scenario:** Verify timezone is stored in database

**Steps:**
1. After logging in and making a meeting request
2. Check database:
   ```sql
   SELECT gmail_address, timezone, timezone_updated_at, timezone_source
   FROM user_gmail_tokens
   WHERE timezone IS NOT NULL;
   ```

**Expected Result:**
```
gmail_address     | timezone              | timezone_updated_at | timezone_source
------------------|-----------------------|---------------------|----------------
you@gmail.com     | America/Los_Angeles   | 2024-10-06 ...      | google_calendar
```

**Success Criteria:**
- ✅ Timezone column populated
- ✅ Shows correct IANA timezone
- ✅ timezone_source is 'google_calendar'

---

### **Test 6: Cross-Timezone Meeting (Advanced)**

**Scenario:** PST user schedules meeting, EST user views it

**Setup:** (Requires two Google accounts in different timezones)
1. PST user creates meeting at "2pm PST"
2. EST user receives calendar invite

**Expected:**
- PST user sees: 2:00 PM PDT
- EST user sees: 5:00 PM EDT (same absolute time)

**How to Test:**
1. Create meeting from PST account
2. Check calendar event JSON:
   ```json
   {
     "start": {
       "dateTime": "2024-10-07T14:00:00",
       "timeZone": "America/Los_Angeles"
     }
   }
   ```
3. timeZone should be explicit, not missing!

---

## Debugging Tips

### Check Logs for These Key Messages:

**Good Signs (✅):**
```
🌍 [TIMEZONE] Initializing calendar service with user timezone...
✅ [CALENDAR] User timezone loaded: America/Los_Angeles
🌍 [TIMEZONE] User timezone for availability check: America/Los_Angeles
✅ [CALENDAR] Creating event in timezone: America/Los_Angeles
```

**Bad Signs (❌):**
```
⚠️ [TIMEZONE] Using fallback timezone: America/Los_Angeles
❌ No explicit timeZone in calendar event
```

### Database Queries for Debugging:

**Check timezone data:**
```sql
-- All users with timezone
SELECT user_id, gmail_address, timezone, timezone_updated_at
FROM user_gmail_tokens;

-- Timezone change history
SELECT * FROM timezone_change_log
ORDER BY changed_at DESC
LIMIT 10;

-- Calendar events with timezone
SELECT summary, event_timezone, start_time, end_time
FROM calendar_events
WHERE event_timezone IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

---

## Success Checklist

Before deploying to production, verify:

- [ ] ✅ Unit tests pass (`npm run test:timezone`)
- [ ] ✅ Integration tests pass
- [ ] ✅ Manual Test 1 (PST user basic meeting) passes
- [ ] ✅ Manual Test 2 (Availability check) passes
- [ ] ✅ Database has timezone column populated
- [ ] ✅ Logs show correct timezone being used
- [ ] ✅ Calendar events have explicit timeZone field
- [ ] ✅ No "wrong time" meetings created
- [ ] ✅ Server timezone doesn't affect user meetings

---

## Common Issues & Solutions

### Issue: "timezone column not found"
**Solution:** Run migration:
```bash
psql -U parthahir -d chief_ai -f scripts/database/add_timezone_support.sql
```

### Issue: Calendar event at wrong time
**Solution:** Check logs for:
- Is user timezone detected correctly?
- Is TimezoneService being used?
- Look for `🌍 [TIMEZONE]` log messages

### Issue: Availability check wrong
**Solution:** Verify:
- `buildResponseContext` uses TimezoneService
- Logs show timezone-aware parsing
- Look for `📅 [TIMEZONE] Parsed ... in America/Los_Angeles`

---

## Production Deployment Verification

After deploying to Railway:

1. **Check Railway Logs:**
   ```
   🌍 Applying timezone support migration...
   ✅ Timezone support migration applied successfully
   ```

2. **Test with Real User:**
   - Send meeting request email
   - Verify correct time in calendar
   - Check database for timezone data

3. **Monitor for 24 hours:**
   - Watch for any "wrong time" complaints
   - Check timezone_change_log table
   - Verify no errors in Railway logs

---

## Emergency Rollback

If something goes wrong in production:

1. **Rollback is SAFE** (backwards compatible)
2. Old code will use default timezone
3. No data loss (timezone column is optional)

---

**Questions?**
Refer to `TIMEZONE_IMPLEMENTATION_GUIDE.md` for technical details.
