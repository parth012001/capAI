-- ===================================================================
-- ADD MISSING USER_ID COLUMNS
-- Fixes schema mismatch between local and Neon databases
-- Based on actual comparison: Local has these columns, Neon doesn't
-- ===================================================================

-- Fix 1: Add user_id to generated_responses
-- This is the CRITICAL fix - causes metrics endpoint to crash
ALTER TABLE generated_responses
ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_generated_responses_user_id
ON generated_responses(user_id);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_generated_responses_user_generated
ON generated_responses(user_id, generated_at DESC);

-- Fix 2: Add user_id to edit_analyses
-- This affects learning system
ALTER TABLE edit_analyses
ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_edit_analyses_user_id
ON edit_analyses(user_id);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_edit_analyses_user_created
ON edit_analyses(user_id, created_at DESC);

-- Verification query (run this after to confirm)
-- SELECT
--   'generated_responses' as table_name,
--   COUNT(*) FILTER (WHERE column_name = 'user_id') as has_user_id
-- FROM information_schema.columns
-- WHERE table_name = 'generated_responses'
-- UNION ALL
-- SELECT
--   'edit_analyses',
--   COUNT(*) FILTER (WHERE column_name = 'user_id')
-- FROM information_schema.columns
-- WHERE table_name = 'edit_analyses';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Schema fix completed successfully';
    RAISE NOTICE 'Added user_id to: generated_responses, edit_analyses';
    RAISE NOTICE 'Added 4 indexes for performance';
END $$;
