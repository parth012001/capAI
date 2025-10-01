-- Phase 1A: Meeting Draft Enhancement Schema
-- Extends existing drafts table for meeting response popup system

-- Add new fields to existing drafts table
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'regular';
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS meeting_context JSONB;

-- Update status enum to include new meeting states
-- Note: PostgreSQL doesn't have ENUM modification in older versions,
-- so we use VARCHAR constraint instead for flexibility
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'drafts_status_check') THEN
        ALTER TABLE drafts ADD CONSTRAINT drafts_status_check
            CHECK (status IN ('pending', 'approved', 'sent', 'declined', 'pending_user_action'));
    END IF;
END
$$;

-- Add constraint for draft type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'drafts_type_check') THEN
        ALTER TABLE drafts ADD CONSTRAINT drafts_type_check
            CHECK (type IN ('regular', 'meeting_response', 'promotional'));
    END IF;
END
$$;

-- Create indexes for the new fields
CREATE INDEX IF NOT EXISTS idx_drafts_type ON drafts(type);
CREATE INDEX IF NOT EXISTS idx_drafts_status_type ON drafts(status, type);

-- Add comments for documentation
COMMENT ON COLUMN drafts.type IS 'Draft type: regular, meeting_response, or promotional';
COMMENT ON COLUMN drafts.meeting_context IS 'JSON context for meeting drafts: {meetingType, originalRequest, proposedTime, hasConflict, etc}';
COMMENT ON COLUMN drafts.status IS 'Draft status: pending, approved, sent, declined, or pending_user_action (for meeting popups)';

-- Example meeting_context structure (for reference):
-- {
--   "meetingType": "accept",
--   "originalRequest": "Let's meet at 2pm tomorrow",
--   "proposedTime": "2024-12-30T14:00:00Z",
--   "hasConflict": false,
--   "schedulingLink": "https://calendly.com/user/30min",
--   "suggestedTimes": [
--     {
--       "start": "2024-12-30T15:00:00Z",
--       "end": "2024-12-30T16:00:00Z",
--       "formatted": "Tomorrow at 3:00 PM",
--       "confidence": 85
--     }
--   ]
-- }