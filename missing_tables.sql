-- Missing Tables Schema Export

-- Table: learning_feedback
CREATE TABLE IF NOT EXISTS learning_feedback (
  id INTEGER DEFAULT nextval('learning_feedback_id_seq'::regclass) NOT NULL,
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
  id INTEGER DEFAULT nextval('user_preferences_id_seq'::regclass) NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  preferred_salutation VARCHAR(255) DEFAULT 'Best regards'::character varying,
  signature_style VARCHAR(255) DEFAULT 'simple'::character varying,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Table: user_profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id VARCHAR(255) NOT NULL,
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
  preferred_signature TEXT DEFAULT 'Best regards'::text,
  signature_style VARCHAR(255) DEFAULT 'professional'::character varying
);

-- Table: webhook_notifications
CREATE TABLE IF NOT EXISTS webhook_notifications (
  id INTEGER DEFAULT nextval('webhook_notifications_id_seq'::regclass) NOT NULL,
  email_address VARCHAR(255) NOT NULL,
  history_id BIGINT NOT NULL,
  notification_type VARCHAR(255) DEFAULT 'email_received'::character varying,
  sender_info JSONB,
  subject_preview TEXT,
  processed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  processing_status VARCHAR(255) DEFAULT 'received'::character varying,
  ai_analysis_triggered BOOLEAN DEFAULT false,
  response_generated BOOLEAN DEFAULT false,
  error_details TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

