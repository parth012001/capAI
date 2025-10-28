-- ================================================================
-- Composio Integration Migration
-- Purpose: Add Composio-specific fields to support dual authentication
-- Date: 2025-10-26
-- ================================================================

-- Add Composio entity ID and migration tracking fields
ALTER TABLE user_gmail_tokens
  ADD COLUMN IF NOT EXISTS composio_entity_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS auth_method VARCHAR(20) DEFAULT 'google_oauth',
  ADD COLUMN IF NOT EXISTS migration_status VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS migrated_at TIMESTAMP;

-- CRITICAL: Update existing rows BEFORE adding constraints
-- All existing users are Google OAuth users
UPDATE user_gmail_tokens
SET auth_method = 'google_oauth'
WHERE auth_method IS NULL;

UPDATE user_gmail_tokens
SET migration_status = 'completed'
WHERE migration_status IS NULL;

-- Make refresh_token_encrypted nullable to support Composio users
-- Composio manages tokens internally, so we don't store them
ALTER TABLE user_gmail_tokens
  ALTER COLUMN refresh_token_encrypted DROP NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_composio_entity
  ON user_gmail_tokens(composio_entity_id);

CREATE INDEX IF NOT EXISTS idx_auth_method
  ON user_gmail_tokens(auth_method);

CREATE INDEX IF NOT EXISTS idx_migration_status
  ON user_gmail_tokens(migration_status);

-- Add check constraint for auth_method (safe now after UPDATE)
ALTER TABLE user_gmail_tokens
  DROP CONSTRAINT IF EXISTS chk_auth_method;

ALTER TABLE user_gmail_tokens
  ADD CONSTRAINT chk_auth_method
  CHECK (auth_method IN ('google_oauth', 'composio', 'pending_composio_migration'));

-- Add check constraint for migration_status (safe now after UPDATE)
ALTER TABLE user_gmail_tokens
  DROP CONSTRAINT IF EXISTS chk_migration_status;

ALTER TABLE user_gmail_tokens
  ADD CONSTRAINT chk_migration_status
  CHECK (migration_status IN ('pending', 'in_progress', 'completed', 'failed'));

-- Add comments for documentation
COMMENT ON COLUMN user_gmail_tokens.composio_entity_id IS 'Composio entity ID for users authenticated via Composio';
COMMENT ON COLUMN user_gmail_tokens.auth_method IS 'Authentication method: google_oauth (legacy) or composio';
COMMENT ON COLUMN user_gmail_tokens.migration_status IS 'Migration status for transition to Composio';
COMMENT ON COLUMN user_gmail_tokens.migrated_at IS 'Timestamp when user was migrated to Composio';
COMMENT ON COLUMN user_gmail_tokens.refresh_token_encrypted IS 'OAuth refresh token (NULL for Composio users - they manage tokens)';

-- Log migration execution
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Composio Migration Completed Successfully';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Table: user_gmail_tokens';
  RAISE NOTICE 'New columns: composio_entity_id, auth_method, migration_status, migrated_at';
  RAISE NOTICE 'Modified columns: refresh_token_encrypted (now nullable)';
  RAISE NOTICE 'New indexes: idx_composio_entity, idx_auth_method, idx_migration_status';
  RAISE NOTICE 'New constraints: chk_auth_method, chk_migration_status';
  RAISE NOTICE 'Existing users: Updated to auth_method=google_oauth';
  RAISE NOTICE '========================================';
END $$;
