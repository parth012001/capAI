-- Missing Tables Schema Export (Fixed with sequences)

-- Sequences
CREATE SEQUENCE IF NOT EXISTS learning_feedback_id_seq;
CREATE SEQUENCE IF NOT EXISTS user_preferences_id_seq;
CREATE SEQUENCE IF NOT EXISTS webhook_notifications_id_seq;

-- Table: learning_feedback
CREATE TABLE IF NOT EXISTS learning_feedback (
  id INTEGER DEFAULT nextval('learning_feedback_id_seq'::regclass) NOT NULL PRIMARY KEY,
  response_id VARCHAR(255),
  feedback_type VARCHAR(255),
  original_text TEXT,
  edited_text TEXT,
  improvement_score INTEGER,
  feedback_notes TEXT,
  user_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table: user_preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  id INTEGER DEFAULT nextval('user_preferences_id_seq'::regclass) NOT NULL PRIMARY KEY,
  user_email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  preferred_salutation VARCHAR(255) DEFAULT 'Best regards',
  signature_style VARCHAR(255) DEFAULT 'simple',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Table: user_profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id VARCHAR(255) NOT NULL PRIMARY KEY,
  display_name VARCHAR(255) NOT NULL,
  profile_picture_url TEXT,
  usage_current INTEGER DEFAULT 0,
  usage_limit INTEGER DEFAULT 50,
  usage_reset_date DATE DEFAULT CURRENT_DATE,
  is_new_user BOOLEAN DEFAULT true,
  last_active TIMESTAMP DEFAULT now(),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  full_name VARCHAR(255),
  company_name VARCHAR(255),
  job_title VARCHAR(255),
  preferred_signature TEXT DEFAULT 'Best regards',
  signature_style VARCHAR(255) DEFAULT 'professional'
);

-- Table: webhook_notifications
CREATE TABLE IF NOT EXISTS webhook_notifications (
  id INTEGER DEFAULT nextval('webhook_notifications_id_seq'::regclass) NOT NULL PRIMARY KEY,
  email_address VARCHAR(255) NOT NULL,
  history_id BIGINT NOT NULL,
  notification_type VARCHAR(255) DEFAULT 'email_received',
  sender_info JSONB,
  subject_preview TEXT,
  processed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  processing_status VARCHAR(255) DEFAULT 'received',
  ai_analysis_triggered BOOLEAN DEFAULT false,
  response_generated BOOLEAN DEFAULT false,
  error_details TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webhook_notifications_email ON webhook_notifications(email_address);
CREATE INDEX IF NOT EXISTS idx_webhook_notifications_history ON webhook_notifications(history_id);
CREATE INDEX IF NOT EXISTS idx_learning_feedback_user ON learning_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_email ON user_preferences(user_email);
