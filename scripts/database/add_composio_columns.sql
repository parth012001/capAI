-- Migration: Add Composio integration columns to users table
-- Date: 2025-11-12
-- Purpose: Support Composio-based Gmail and Calendar connections

-- Add Composio entity ID (maps user to Composio entity)
ALTER TABLE users ADD COLUMN IF NOT EXISTS composio_entity_id VARCHAR(255);

-- Add connection status flags
ALTER TABLE users ADD COLUMN IF NOT EXISTS gmail_connected BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS calendar_connected BOOLEAN DEFAULT FALSE;

-- Add timestamps for connection tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS gmail_connected_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS calendar_connected_at TIMESTAMP;

-- Add index for faster lookups by Composio entity ID
CREATE INDEX IF NOT EXISTS idx_users_composio_entity ON users(composio_entity_id) WHERE composio_entity_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.composio_entity_id IS 'Composio entity ID for managing OAuth connections';
COMMENT ON COLUMN users.gmail_connected IS 'Whether user has connected Gmail via Composio';
COMMENT ON COLUMN users.calendar_connected IS 'Whether user has connected Google Calendar via Composio';

-- Verify the migration
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('composio_entity_id', 'gmail_connected', 'calendar_connected', 'gmail_connected_at', 'calendar_connected_at')
ORDER BY column_name;
