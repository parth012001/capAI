-- Scheduling Link Schema Extension
-- Add scheduling link support to user profiles

-- Add scheduling link column to existing user_gmail_tokens table
ALTER TABLE user_gmail_tokens
ADD COLUMN IF NOT EXISTS scheduling_link VARCHAR(500),
ADD COLUMN IF NOT EXISTS scheduling_link_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS scheduling_link_added_at TIMESTAMP DEFAULT NULL;

-- Create index for scheduling link queries
CREATE INDEX IF NOT EXISTS idx_user_gmail_tokens_scheduling_link
ON user_gmail_tokens(scheduling_link) WHERE scheduling_link IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN user_gmail_tokens.scheduling_link IS 'User scheduling link (Calendly, Cal.com, etc.) for meeting requests without specific times';
COMMENT ON COLUMN user_gmail_tokens.scheduling_link_verified IS 'Whether the scheduling link has been validated';
COMMENT ON COLUMN user_gmail_tokens.scheduling_link_added_at IS 'When the scheduling link was first added by user';