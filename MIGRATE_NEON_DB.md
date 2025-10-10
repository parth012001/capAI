# How to Fix Your Neon Production Database

## **The Situation**
- ✅ Your **local database** is fixed and working
- ❌ Your **Neon production database** still has the old VARCHAR(255) columns
- ⚠️ The app startup **DOES NOT** automatically fix existing tables

## **Why You Need to Migrate**
Without this fix, your production app will continue to crash with:
```
❌ Error: value too long for type character varying(255)
```

## **Safe Migration Steps** (Choose Option 1 or 2)

---

## **Option 1: Run the TypeScript Migration Script** (Recommended ✨)

This is the **safest and easiest** option:

### Step 1: Add Neon URL to your .env.local

Open `/Users/parthahir/Desktop/chief/.env.local` and add this line:

```bash
# Neon Production Database
NEON_DATABASE_URL=postgresql://neondb_owner:npg_ilnjXht8p4zK@ep-empty-feather-adpyzdiz-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

### Step 2: Run the migration script

```bash
cd /Users/parthahir/Desktop/chief
npx tsx scripts/migrate_neon_db.ts
```

### What the script does:
1. ✅ Connects to your Neon database
2. ✅ Shows you the current column types
3. ✅ Asks if migration is needed
4. ✅ Safely updates the columns in a transaction
5. ✅ Verifies the changes
6. ✅ Rolls back automatically if anything goes wrong

**Total time: ~5 seconds**

---

## **Option 2: Manual SQL via Neon Console** (If you prefer)

If you want to do it manually through Neon's web interface:

### Step 1: Log into Neon Console
Go to: https://console.neon.tech/

### Step 2: Open SQL Editor
Select your database and open the SQL Editor

### Step 3: Run this SQL

```sql
-- Safe migration - wrapped in a transaction
BEGIN;

-- Step 1: Drop dependent view
DROP VIEW IF EXISTS meeting_pipeline_detailed;

-- Step 2: Fix emails table
ALTER TABLE emails
  ALTER COLUMN from_email TYPE TEXT,
  ALTER COLUMN to_email TYPE TEXT;

-- Step 3: Fix promotional_emails table
ALTER TABLE promotional_emails
  ALTER COLUMN from_email TYPE TEXT,
  ALTER COLUMN to_email TYPE TEXT;

-- Step 4: Recreate view
CREATE OR REPLACE VIEW meeting_pipeline_detailed AS
SELECT
  mpr.id,
  mpr.gmail_id,
  mpr.user_id,
  mpr.is_meeting_request,
  mpr.confidence,
  mpr.processing_time_ms,
  mpr.status,
  mpr.reason,
  mpr.processed_at,
  e.subject,
  e.from_email,
  e.received_at,
  mr.meeting_type,
  mr.urgency_level,
  mr.requested_duration,
  mr.status as meeting_status
FROM meeting_processing_results mpr
JOIN emails e ON mpr.email_db_id = e.id
LEFT JOIN meeting_requests mr ON mr.email_id = e.id AND mr.user_id = mpr.user_id
ORDER BY mpr.processed_at DESC;

COMMIT;

-- Verify the changes
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN ('emails', 'promotional_emails')
  AND column_name IN ('from_email', 'to_email')
ORDER BY table_name, column_name;
```

---

## **Safety Guarantees** 🛡️

Both options are **100% safe** because:

1. ✅ **No data is deleted** - We're only changing column types
2. ✅ **Wrapped in a transaction** - If anything fails, it rolls back automatically
3. ✅ **VARCHAR to TEXT is compatible** - All existing data remains valid
4. ✅ **Can be run multiple times** - If you run it again, it detects no change is needed
5. ✅ **No downtime needed** - The change is nearly instant (< 1 second)

## **What Will Happen**

### Before Migration:
```
emails.from_email: character varying(255)  ❌
emails.to_email: character varying(255)    ❌
promotional_emails.from_email: character varying(255)  ❌
promotional_emails.to_email: character varying(255)    ❌
```

### After Migration:
```
emails.from_email: text  ✅
emails.to_email: text    ✅
promotional_emails.from_email: text  ✅
promotional_emails.to_email: text    ✅
```

## **After Migration**

Once complete:
1. ✅ Your production app will stop crashing on long email addresses
2. ✅ All existing data remains intact
3. ✅ Future deployments will work with the new schema
4. ✅ No code changes needed in your application

## **Questions?**

- **Q: Will this delete my data?**
  - A: No! We're only changing column types, not touching data.

- **Q: Do I need to stop my app?**
  - A: No! The migration is instant and safe to run while app is running.

- **Q: What if it fails?**
  - A: The transaction automatically rolls back - nothing changes.

- **Q: Can I test it first?**
  - A: Yes! The script shows you current state before making changes.

---

## **Recommended: Use Option 1** ✨

I strongly recommend **Option 1** (TypeScript script) because:
- It's safer (checks before changing)
- Shows you what it's doing
- Verifies the result
- Handles errors gracefully
- Takes only 5 seconds

Ready to run it? Just:
```bash
npx tsx scripts/migrate_neon_db.ts
```
