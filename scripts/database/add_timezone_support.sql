-- ===================================================================
-- TIMEZONE SUPPORT MIGRATION
-- Adds timezone tracking for proper multi-timezone meeting scheduling
-- Production-ready enterprise solution
-- ===================================================================

-- Step 1: Add timezone column to user_gmail_tokens table
ALTER TABLE user_gmail_tokens
ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'America/Los_Angeles';

-- Step 2: Add timezone metadata columns for audit/tracking
ALTER TABLE user_gmail_tokens
ADD COLUMN IF NOT EXISTS timezone_updated_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS timezone_source VARCHAR(50) DEFAULT 'google_calendar';

-- Step 3: Create index for timezone queries (performance optimization)
CREATE INDEX IF NOT EXISTS idx_user_gmail_tokens_timezone
ON user_gmail_tokens(timezone)
WHERE timezone IS NOT NULL;

-- Step 4: Add timezone to user_profiles table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        ALTER TABLE user_profiles
        ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'America/Los_Angeles';

        CREATE INDEX IF NOT EXISTS idx_user_profiles_timezone
        ON user_profiles(timezone)
        WHERE timezone IS NOT NULL;
    END IF;
END $$;

-- Step 5: Create timezone change audit log table (enterprise feature)
CREATE TABLE IF NOT EXISTS timezone_change_log (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    old_timezone VARCHAR(100),
    new_timezone VARCHAR(100) NOT NULL,
    source VARCHAR(50) NOT NULL, -- 'google_calendar', 'manual_override', 'auto_detected'
    changed_at TIMESTAMP DEFAULT NOW(),
    changed_by VARCHAR(50) DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_timezone_change_log_user_id
ON timezone_change_log(user_id);

CREATE INDEX IF NOT EXISTS idx_timezone_change_log_changed_at
ON timezone_change_log(changed_at DESC);

-- Step 6: Add timezone to calendar_events table for historical accuracy
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS event_timezone VARCHAR(100);

-- Step 7: Add timezone to meeting_requests table
ALTER TABLE meeting_requests
ADD COLUMN IF NOT EXISTS requester_timezone VARCHAR(100),
ADD COLUMN IF NOT EXISTS preferred_timezone VARCHAR(100);

-- Step 8: Create function to validate timezone strings
CREATE OR REPLACE FUNCTION is_valid_timezone(tz VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    -- Basic validation - check if timezone follows IANA format
    -- Full validation would require timezone database lookup
    RETURN tz ~ '^[A-Za-z]+/[A-Za-z_]+$' OR tz ~ '^UTC[+-]?\d{0,2}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 9: Add check constraint for timezone format
ALTER TABLE user_gmail_tokens
DROP CONSTRAINT IF EXISTS check_timezone_format;

ALTER TABLE user_gmail_tokens
ADD CONSTRAINT check_timezone_format
CHECK (timezone IS NULL OR is_valid_timezone(timezone));

-- Step 10: Log completion
DO $$
BEGIN
    RAISE NOTICE '✅ Timezone support migration completed successfully';
    RAISE NOTICE '📊 Added timezone columns to user_gmail_tokens, calendar_events, meeting_requests';
    RAISE NOTICE '📝 Created timezone_change_log audit table';
    RAISE NOTICE '🔍 Created performance indexes for timezone queries';
    RAISE NOTICE '✔️  Added timezone validation constraints';
END $$;
