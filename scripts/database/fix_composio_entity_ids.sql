-- ================================================================
-- Fix Composio Entity IDs Migration
-- Purpose: Fix incorrectly stored connectedAccountIds in composio_entity_id column
-- Date: 2025-10-28
-- ================================================================

-- BACKGROUND:
-- During initial testing, we stored connectedAccountId (ca_xxx) in the composio_entity_id column
-- This migration fixes that by:
-- 1. Moving ca_xxx values to composio_connected_account_id column
-- 2. Setting proper permanent entity IDs (user_{user_id}) in composio_entity_id column

-- Step 1: Fix any users with ca_ prefix in composio_entity_id (these are actually connectedAccountIds)
UPDATE user_gmail_tokens
SET
  composio_connected_account_id = composio_entity_id,  -- Move to correct column
  composio_entity_id = 'user_' || user_id              -- Set permanent entity ID
WHERE
  auth_method = 'composio'
  AND composio_entity_id LIKE 'ca_%'
  AND composio_connected_account_id IS NULL;

-- Step 2: Ensure all Composio users have permanent entity IDs
UPDATE user_gmail_tokens
SET composio_entity_id = 'user_' || user_id
WHERE
  auth_method = 'composio'
  AND (composio_entity_id IS NULL OR composio_entity_id LIKE 'temp_%');

-- Step 3: Create index on connected_account_id for performance
CREATE INDEX IF NOT EXISTS idx_composio_connected_account
  ON user_gmail_tokens(composio_connected_account_id);

-- Update column comments
COMMENT ON COLUMN user_gmail_tokens.composio_entity_id IS 'Permanent Composio entity ID (format: user_{user_id}) - used for all Composio SDK API calls';
COMMENT ON COLUMN user_gmail_tokens.composio_connected_account_id IS 'Composio connected account ID (format: ca_xxx) - identifies specific Gmail connection for multi-account support';

-- Log migration execution
DO $$
DECLARE
  fixed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fixed_count
  FROM user_gmail_tokens
  WHERE auth_method = 'composio'
    AND composio_entity_id LIKE 'user_%';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Composio Entity ID Fix Completed';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Fixed Composio users: %', fixed_count;
  RAISE NOTICE 'Entity ID format: user_{user_id} (permanent)';
  RAISE NOTICE 'Connected Account ID: ca_xxx (from Composio)';
  RAISE NOTICE '========================================';
END $$;
