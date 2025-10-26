# Composio Migration Guide

**Status:** ✅ Implementation Complete - Ready for Testing
**Date:** 2025-10-26
**Estimated Testing Time:** 4-6 hours

---

## Table of Contents

1. [Overview](#overview)
2. [What Changed](#what-changed)
3. [Pre-Migration Checklist](#pre-migration-checklist)
4. [Migration Steps](#migration-steps)
5. [Testing Guide](#testing-guide)
6. [Rollback Procedure](#rollback-procedure)
7. [Troubleshooting](#troubleshooting)

---

## Overview

### What is This Migration?

We're migrating from **direct Google OAuth** to **Composio-managed OAuth** to bypass Google's verification requirements for sensitive scopes.

### Key Benefits

✅ **No Google verification needed** - Launch immediately
✅ **Verified app badge** - Users see Composio's verified app
✅ **Automatic token management** - No manual refresh logic
✅ **Real-time triggers** - 1-minute polling for new emails
✅ **Feature-flag controlled** - Instant rollback capability

### Architecture Change

**Before (Direct OAuth):**
```
User → Your Google OAuth → Gmail/Calendar API (requires verification)
```

**After (Composio):**
```
User → Composio OAuth (verified) → Composio API → Gmail/Calendar
```

---

## What Changed

### New Files Created

```
src/services/composio/
├── client.ts           # Composio SDK wrapper
├── gmail.ts            # Composio Gmail service
├── calendar.ts         # Composio Calendar service
├── triggers.ts         # Webhook trigger handler
└── auth.ts             # OAuth flow management

src/routes/
└── composio-webhooks.ts  # Webhook endpoint

scripts/database/
├── add_composio_fields.sql           # DB migration SQL
└── apply-composio-migration.ts       # Migration script

.env.example            # Updated with Composio vars
COMPOSIO_MIGRATION_GUIDE.md  # This file
```

### Modified Files

```
src/config/environment.ts       # Added COMPOSIO_API_KEY, USE_COMPOSIO
src/utils/serviceFactory.ts    # Feature flag logic
src/services/tokenStorage.ts   # Composio entity methods
src/index.ts                    # New OAuth routes + webhook
```

### Legacy Files (Backup)

```
src/services/gmail.legacy.ts      # Original Gmail service
src/services/calendar.legacy.ts   # Original Calendar service
```

---

## Pre-Migration Checklist

### 1. Get Composio API Key

1. Sign up at [https://app.composio.dev](https://app.composio.dev)
2. Navigate to Settings → API Keys
3. Generate new API key
4. Save it securely (you'll need it for `.env`)

### 2. Configure Composio Integrations

1. In Composio dashboard, go to Integrations
2. Enable **Gmail** integration
3. Enable **Google Calendar** integration
4. Configure webhook URL: `https://your-domain.com/webhooks/composio`

### 3. Backup Database

```bash
# Backup your Neon database
pg_dump $DATABASE_URL > backup_before_composio_$(date +%Y%m%d).sql
```

### 4. Update Environment Variables

Add to your `.env` file:

```bash
# Composio Configuration
COMPOSIO_API_KEY=your_composio_api_key_here
USE_COMPOSIO=false  # Start with false for testing

# Keep existing Google OAuth (for rollback)
GOOGLE_CLIENT_ID=...  # Keep this
GOOGLE_CLIENT_SECRET=...  # Keep this
```

---

## Migration Steps

### Step 1: Run Database Migration

```bash
# Apply Composio fields to database
npx tsx scripts/database/apply-composio-migration.ts
```

**Expected Output:**
```
🚀 Starting Composio Migration
📡 Testing database connection...
✅ Database connection successful
📄 Reading migration file...
✅ Migration file loaded
🔍 Checking if migration already applied...
✅ Migration not applied yet. Proceeding...
🔧 Applying migration...
   - Transaction started
   - Migration SQL executed
   - Transaction committed
✅ Migration applied successfully
🔍 Verifying migration...
   Added columns:
   - composio_entity_id (character varying)
   - auth_method (character varying)
   - migration_status (character varying)
   - migrated_at (timestamp without time zone)

   Added indexes:
   - idx_composio_entity
   - idx_auth_method
   - idx_migration_status

✅ Migration verification successful
```

### Step 2: Test with Feature Flag OFF (Sanity Check)

```bash
# Ensure USE_COMPOSIO=false in .env
npm run dev
```

**Verify:**
- Server starts without errors
- Existing auth flow still works
- No Composio routes registered

**Expected logs:**
```
✅ Environment configuration loaded successfully:
   - Composio: DISABLED
```

### Step 3: Enable Composio

Update `.env`:
```bash
USE_COMPOSIO=true
```

Restart server:
```bash
npm run dev
```

**Expected logs:**
```
✅ Environment configuration loaded successfully:
   - Composio: ENABLED
   - Composio API Key: comp_abc...
✅ Composio webhook routes enabled
```

### Step 4: Test OAuth Flow

#### Test Signup Flow:

```bash
curl http://localhost:3000/auth/composio/signup
```

**Expected Response:**
```json
{
  "authUrl": "https://composio.dev/oauth/authorize?...",
  "intent": "signup",
  "provider": "composio"
}
```

1. Visit the `authUrl` in browser
2. Sign in with Google
3. Grant permissions
4. You'll be redirected to `/auth/composio/callback`
5. Then redirected to frontend with JWT token

#### Test Signin Flow:

```bash
curl http://localhost:3000/auth/composio/signin
```

Same process as signup.

### Step 5: Verify Database

```sql
-- Check new user was created with Composio
SELECT user_id, gmail_address, composio_entity_id, auth_method, migration_status
FROM user_gmail_tokens
WHERE auth_method = 'composio';
```

**Expected:**
- `composio_entity_id`: populated
- `auth_method`: 'composio'
- `migration_status`: 'completed'

### Step 6: Test Email Fetching

```bash
# Get JWT token from OAuth flow, then:
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/emails/fetch
```

**Expected:**
- Emails are fetched via Composio
- No errors
- Emails saved to database

---

## Testing Guide

### Test Checklist

#### ✅ OAuth Flow Testing

- [ ] **Signup flow works**
  - Visit `/auth/composio/signup`
  - Complete Google OAuth via Composio
  - User created in database
  - JWT token returned

- [ ] **Signin flow works**
  - Visit `/auth/composio/signin`
  - Complete Google OAuth via Composio
  - Existing user logged in
  - JWT token returned

- [ ] **Callback handling**
  - OAuth callback processes correctly
  - Entity ID saved to database
  - Trigger setup initiated

#### ✅ Service Functionality

- [ ] **Email fetching**
  - `GET /emails/fetch` works
  - Emails retrieved via Composio
  - Emails saved to database

- [ ] **Email sending**
  - `POST /auto-drafts/:id/send` works
  - Email sent via Composio
  - Sent email appears in Gmail

- [ ] **Calendar operations**
  - Calendar events can be created
  - Events appear in Google Calendar
  - Availability checking works

#### ✅ Webhook Testing

- [ ] **Webhook receives triggers**
  - Send test email to authenticated user
  - Webhook endpoint `/webhooks/composio` receives notification
  - Email processed within ~1 minute

- [ ] **Duplicate prevention**
  - Redis deduplication works
  - Same email not processed twice

#### ✅ ServiceFactory Testing

- [ ] **Feature flag switching**
  - Set `USE_COMPOSIO=true` → Uses Composio services
  - Set `USE_COMPOSIO=false` → Uses legacy services
  - No errors during switching

- [ ] **Multi-user isolation**
  - Two users authenticated simultaneously
  - Each gets isolated service container
  - No data leakage between users

### Manual Testing Script

```bash
#!/bin/bash

echo "🧪 Composio Migration Test Suite"
echo "================================"

# Test 1: Health check
echo "\n📊 Test 1: Health Check"
curl http://localhost:3000/health

# Test 2: Get Composio signup URL
echo "\n📊 Test 2: Composio Signup URL"
curl http://localhost:3000/auth/composio/signup

# Test 3: Check webhook stats
echo "\n📊 Test 3: Webhook Stats"
curl http://localhost:3000/webhooks/composio/stats

echo "\n✅ Automated tests complete"
echo "Continue with manual OAuth flow testing in browser"
```

---

## Rollback Procedure

### If Something Goes Wrong

**Quick Rollback (No Code Changes):**

1. Update `.env`:
   ```bash
   USE_COMPOSIO=false
   ```

2. Restart server:
   ```bash
   npm run dev
   ```

3. System immediately reverts to legacy Google OAuth

**Complete Rollback (Remove Composio Code):**

1. Restore legacy services:
   ```bash
   cp src/services/gmail.legacy.ts src/services/gmail.ts
   cp src/services/calendar.legacy.ts src/services/calendar.ts
   ```

2. Remove Composio imports from `index.ts`

3. Revert `serviceFactory.ts` changes

4. Remove Composio routes

5. Restart server

**Database Rollback:**

```sql
-- Remove Composio fields (if needed)
ALTER TABLE user_gmail_tokens
  DROP COLUMN IF EXISTS composio_entity_id,
  DROP COLUMN IF EXISTS auth_method,
  DROP COLUMN IF EXISTS migration_status,
  DROP COLUMN IF EXISTS migrated_at;
```

---

## Troubleshooting

### Common Issues

#### 1. "COMPOSIO_API_KEY is required"

**Cause:** Missing or invalid Composio API key

**Fix:**
```bash
# Add to .env
COMPOSIO_API_KEY=your_key_here
```

#### 2. "Composio entity ID required when USE_COMPOSIO=true"

**Cause:** User authenticated with legacy OAuth, now using Composio

**Fix:** User needs to re-authenticate via `/auth/composio/signup`

#### 3. Webhooks not being received

**Causes:**
- Webhook URL not configured in Composio dashboard
- Trigger not set up for user
- Network/firewall blocking webhooks

**Debug:**
```bash
# Check webhook stats
curl http://localhost:3000/webhooks/composio/stats

# Check Composio dashboard for trigger status
# Verify ngrok/Railway URL is correct
```

#### 4. "User not found" in webhook processing

**Cause:** Entity ID → User ID mapping missing

**Fix:**
```sql
-- Check user's Composio entity ID
SELECT user_id, gmail_address, composio_entity_id
FROM user_gmail_tokens
WHERE auth_method = 'composio';
```

#### 5. ServiceFactory returns wrong service type

**Cause:** Feature flag mismatch or missing entity ID

**Debug:**
```typescript
// Add logging in serviceFactory.ts
console.log('USE_COMPOSIO:', features.useComposio);
console.log('Entity ID:', this.composioEntityId);
```

### Getting Help

1. **Check logs:**
   ```bash
   # Search for Composio errors
   grep -i "composio" logs/*.log
   ```

2. **Enable debug logging:**
   ```bash
   LOG_LEVEL=debug npm run dev
   ```

3. **Check Composio dashboard:**
   - View connected accounts
   - Check trigger status
   - Review webhook logs

---

## Success Criteria

Migration is successful when:

✅ Users can sign up/sign in via Composio
✅ Emails are fetched and displayed correctly
✅ Email sending works
✅ Calendar integration works
✅ Webhooks process new emails within 1 minute
✅ No errors in production logs
✅ Feature flag toggle works instantly
✅ Multi-user testing shows no data leakage

---

## Post-Migration

### Monitor These Metrics

- Composio API usage (check dashboard)
- Webhook processing latency
- OAuth success rate
- User migration count

### Next Steps (Future)

1. **Deprecate legacy OAuth routes** (after 2 weeks of stability)
2. **Remove `.legacy.ts` files** (after 1 month)
3. **Add Hyperspell integration** (Phase 2)

---

## Questions?

- Review `CLAUDE.md` for architecture details
- Check Composio docs: https://docs.composio.dev
- Contact: [Your support channel]

---

**Last Updated:** 2025-10-26
**Version:** 1.0.0
**Status:** Ready for Production Testing
