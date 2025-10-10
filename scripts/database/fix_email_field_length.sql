-- Fix email field length issues
-- The from_email and to_email fields can exceed 255 characters when:
-- 1. Multiple recipients are included (comma-separated list)
-- 2. Display names are included with email addresses
-- 3. Very long email addresses or domain names
--
-- Solution: Change VARCHAR(255) to TEXT for email-related fields

-- Step 1: Drop the view that depends on from_email column
DROP VIEW IF EXISTS meeting_pipeline_detailed;

-- Step 2: Fix emails table
ALTER TABLE emails
  ALTER COLUMN from_email TYPE TEXT,
  ALTER COLUMN to_email TYPE TEXT;

-- Step 3: Fix promotional_emails table
ALTER TABLE promotional_emails
  ALTER COLUMN from_email TYPE TEXT,
  ALTER COLUMN to_email TYPE TEXT;

-- Step 4: Recreate the meeting_pipeline_detailed view
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

-- Verify the changes
SELECT
    table_name,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name IN ('emails', 'promotional_emails')
  AND column_name IN ('from_email', 'to_email')
ORDER BY table_name, column_name;
