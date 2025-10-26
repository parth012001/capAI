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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_composio_entity
  ON user_gmail_tokens(composio_entity_id);

CREATE INDEX IF NOT EXISTS idx_auth_method
  ON user_gmail_tokens(auth_method);

CREATE INDEX IF NOT EXISTS idx_migration_status
  ON user_gmail_tokens(migration_status);

-- Add check constraint for auth_method
ALTER TABLE user_gmail_tokens
  ADD CONSTRAINT chk_auth_method
  CHECK (auth_method IN ('google_oauth', 'composio', 'pending_composio_migration'));

-- Add check constraint for migration_status
ALTER TABLE user_gmail_tokens
  ADD CONSTRAINT chk_migration_status
  CHECK (migration_status IN ('pending', 'in_progress', 'completed', 'failed'));

-- Add comments for documentation
COMMENT ON COLUMN user_gmail_tokens.composio_entity_id IS 'Composio entity ID for users authenticated via Composio';
COMMENT ON COLUMN user_gmail_tokens.auth_method IS 'Authentication method: google_oauth (legacy) or composio';
COMMENT ON COLUMN user_gmail_tokens.migration_status IS 'Migration status for transition to Composio';
COMMENT ON COLUMN user_gmail_tokens.migrated_at IS 'Timestamp when user was migrated to Composio';

-- Log migration execution
DO $$
BEGIN
  RAISE NOTICE 'Composio fields migration completed successfully';
  RAISE NOTICE 'Affected table: user_gmail_tokens';
  RAISE NOTICE 'New columns: composio_entity_id, auth_method, migration_status, migrated_at';
  RAISE NOTICE 'New indexes: idx_composio_entity, idx_auth_method, idx_migration_status';
END $$;
