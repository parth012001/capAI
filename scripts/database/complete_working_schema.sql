-- SEQUENCES
CREATE SEQUENCE IF NOT EXISTS auth_tokens_id_seq;
CREATE SEQUENCE IF NOT EXISTS auto_generated_drafts_id_seq;
CREATE SEQUENCE IF NOT EXISTS auto_scheduling_preferences_id_seq;
CREATE SEQUENCE IF NOT EXISTS availability_cache_id_seq;
CREATE SEQUENCE IF NOT EXISTS calendar_events_id_seq;
CREATE SEQUENCE IF NOT EXISTS calendar_feedback_id_seq;
CREATE SEQUENCE IF NOT EXISTS calendar_holds_id_seq;
CREATE SEQUENCE IF NOT EXISTS calendar_preferences_id_seq;
CREATE SEQUENCE IF NOT EXISTS communication_patterns_id_seq;
CREATE SEQUENCE IF NOT EXISTS context_memories_id_seq;
CREATE SEQUENCE IF NOT EXISTS drafts_id_seq;
CREATE SEQUENCE IF NOT EXISTS edit_analyses_id_seq;
CREATE SEQUENCE IF NOT EXISTS email_threads_id_seq;
CREATE SEQUENCE IF NOT EXISTS emails_id_seq;
CREATE SEQUENCE IF NOT EXISTS extracted_entities_id_seq;
CREATE SEQUENCE IF NOT EXISTS feedback_patterns_id_seq;
CREATE SEQUENCE IF NOT EXISTS generated_responses_id_seq;
CREATE SEQUENCE IF NOT EXISTS learning_feedback_id_seq;
CREATE SEQUENCE IF NOT EXISTS learning_insights_id_seq;
CREATE SEQUENCE IF NOT EXISTS meeting_processing_results_id_seq;
CREATE SEQUENCE IF NOT EXISTS meeting_requests_id_seq;
CREATE SEQUENCE IF NOT EXISTS meeting_responses_id_seq;
CREATE SEQUENCE IF NOT EXISTS performance_metrics_id_seq;
CREATE SEQUENCE IF NOT EXISTS promotional_emails_id_seq;
CREATE SEQUENCE IF NOT EXISTS response_preferences_id_seq;
CREATE SEQUENCE IF NOT EXISTS response_stats_id_seq;
CREATE SEQUENCE IF NOT EXISTS response_templates_id_seq;
CREATE SEQUENCE IF NOT EXISTS scheduling_patterns_id_seq;
CREATE SEQUENCE IF NOT EXISTS scheduling_responses_id_seq;
CREATE SEQUENCE IF NOT EXISTS scheduling_workflows_id_seq;
CREATE SEQUENCE IF NOT EXISTS sender_profiles_id_seq;
CREATE SEQUENCE IF NOT EXISTS sent_emails_id_seq;
CREATE SEQUENCE IF NOT EXISTS tone_profile_adjustments_id_seq;
CREATE SEQUENCE IF NOT EXISTS tone_profiles_id_seq;
CREATE SEQUENCE IF NOT EXISTS user_preferences_id_seq;
CREATE SEQUENCE IF NOT EXISTS webhook_notifications_id_seq;
-- ===================================================================
-- COMPLETE SCHEMA EXPORT FROM LOCAL DATABASE
-- Generated: 2025-10-05T01:42:09.177Z
-- Tables: 39
-- Source: postgresql://localhost:5432/chief_ai
-- ===================================================================

-- Table: auth_tokens
CREATE TABLE IF NOT EXISTS auth_tokens (
    id INTEGER DEFAULT nextval('auth_tokens_id_seq'::regclass) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: auto_generated_drafts
CREATE TABLE IF NOT EXISTS auto_generated_drafts (
    id INTEGER DEFAULT nextval('auto_generated_drafts_id_seq'::regclass) NOT NULL,
    draft_id VARCHAR(50) NOT NULL,
    original_email_id INTEGER,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    tone VARCHAR(20),
    urgency_level VARCHAR(10),
    context_used JSONB,
    relationship_type VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pending'::character varying,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    reviewed_at TIMESTAMP WITHOUT TIME ZONE,
    sent_at TIMESTAMP WITHOUT TIME ZONE,
    user_edited BOOLEAN DEFAULT false,
    edit_count INTEGER DEFAULT 0,
    processing_time_ms INTEGER,
    user_id VARCHAR(255),
    approved_at TIMESTAMP WITHOUT TIME ZONE
);

-- Table: auto_scheduling_preferences
CREATE TABLE IF NOT EXISTS auto_scheduling_preferences (
    id INTEGER DEFAULT nextval('auto_scheduling_preferences_id_seq'::regclass) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    preference_type VARCHAR(100) NOT NULL,
    preference_value JSONB NOT NULL,
    priority INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: availability_cache
CREATE TABLE IF NOT EXISTS availability_cache (
    id INTEGER DEFAULT nextval('availability_cache_id_seq'::regclass) NOT NULL,
    date_key DATE NOT NULL,
    calendar_id VARCHAR(255) DEFAULT 'primary'::character varying,
    availability_data JSONB NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Table: calendar_events
CREATE TABLE IF NOT EXISTS calendar_events (
    id INTEGER DEFAULT nextval('calendar_events_id_seq'::regclass) NOT NULL,
    google_event_id VARCHAR(255) NOT NULL,
    calendar_id VARCHAR(255) DEFAULT 'primary'::character varying,
    summary TEXT NOT NULL,
    description TEXT,
    start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    timezone VARCHAR(100),
    location TEXT,
    status VARCHAR(50) DEFAULT 'confirmed'::character varying,
    attendees JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_synced TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: calendar_feedback
CREATE TABLE IF NOT EXISTS calendar_feedback (
    id INTEGER DEFAULT nextval('calendar_feedback_id_seq'::regclass) NOT NULL,
    meeting_response_id INTEGER,
    feedback_type VARCHAR(100) NOT NULL,
    original_data JSONB NOT NULL,
    modified_data JSONB NOT NULL,
    edit_percentage NUMERIC DEFAULT 0.0,
    user_satisfaction INTEGER,
    learning_insight TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: calendar_holds
CREATE TABLE IF NOT EXISTS calendar_holds (
    id INTEGER DEFAULT nextval('calendar_holds_id_seq'::regclass) NOT NULL,
    meeting_request_id INTEGER,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    holder_email VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active'::character varying,
    expiry_time TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    notes TEXT
);

-- Table: calendar_preferences
CREATE TABLE IF NOT EXISTS calendar_preferences (
    id INTEGER DEFAULT nextval('calendar_preferences_id_seq'::regclass) NOT NULL,
    user_id VARCHAR(100) DEFAULT 'default_user'::character varying,
    preference_type VARCHAR(100) NOT NULL,
    preference_value JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: communication_patterns
CREATE TABLE IF NOT EXISTS communication_patterns (
    id INTEGER DEFAULT nextval('communication_patterns_id_seq'::regclass) NOT NULL,
    sender_email VARCHAR(255),
    pattern_type VARCHAR(50),
    pattern_text TEXT,
    usage_frequency INTEGER DEFAULT 1,
    context_type VARCHAR(50),
    effectiveness_score INTEGER DEFAULT 50,
    last_used TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: context_memories
CREATE TABLE IF NOT EXISTS context_memories (
    id INTEGER DEFAULT nextval('context_memories_id_seq'::regclass) NOT NULL,
    memory_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    context_tags TEXT[],
    related_emails INT4[],
    related_threads TEXT[],
    related_entities INT4[],
    importance_score INTEGER DEFAULT 50,
    last_referenced TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reference_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: drafts
CREATE TABLE IF NOT EXISTS drafts (
    id INTEGER DEFAULT nextval('drafts_id_seq'::regclass) NOT NULL,
    email_id INTEGER,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    confidence_score INTEGER DEFAULT 70,
    quality_score INTEGER DEFAULT 70,
    status VARCHAR(20) DEFAULT 'pending'::character varying,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP WITHOUT TIME ZONE,
    sent_at TIMESTAMP WITHOUT TIME ZONE,
    type VARCHAR(50) DEFAULT 'regular'::character varying,
    meeting_context JSONB
);

-- Table: edit_analyses
CREATE TABLE IF NOT EXISTS edit_analyses (
    id INTEGER DEFAULT nextval('edit_analyses_id_seq'::regclass) NOT NULL,
    response_id VARCHAR(100) NOT NULL,
    original_text TEXT NOT NULL,
    edited_text TEXT NOT NULL,
    edit_type VARCHAR(20) NOT NULL,
    edit_percentage INTEGER DEFAULT 0,
    edit_description TEXT,
    success_score INTEGER DEFAULT 50,
    learning_insight TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(255),
    context_factors JSONB DEFAULT '{}'::jsonb,
    validation_score NUMERIC DEFAULT 1.0,
    time_window VARCHAR(20) DEFAULT 'week-0'::character varying,
    stability_factor NUMERIC DEFAULT 1.0
);

-- Table: email_threads
CREATE TABLE IF NOT EXISTS email_threads (
    id INTEGER DEFAULT nextval('email_threads_id_seq'::regclass) NOT NULL,
    thread_id VARCHAR(255) NOT NULL,
    subject_line TEXT,
    participants TEXT[],
    participant_count INTEGER DEFAULT 0,
    message_count INTEGER DEFAULT 0,
    first_message_date TIMESTAMP WITHOUT TIME ZONE,
    last_message_date TIMESTAMP WITHOUT TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    context_summary TEXT,
    key_decisions TEXT[],
    commitments TEXT[],
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: emails
CREATE TABLE IF NOT EXISTS emails (
    id INTEGER DEFAULT nextval('emails_id_seq'::regclass) PRIMARY KEY,
    gmail_id VARCHAR(255) NOT NULL,
    thread_id VARCHAR(255) NOT NULL,
    subject TEXT,
    from_email VARCHAR(255) NOT NULL,
    to_email VARCHAR(255) NOT NULL,
    body TEXT,
    received_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    category VARCHAR(50),
    has_draft BOOLEAN DEFAULT false,
    thread_context_id INTEGER,
    sender_profile_id INTEGER,
    context_analyzed BOOLEAN DEFAULT false,
    conversation_position INTEGER DEFAULT 1,
    urgency_level VARCHAR(20) DEFAULT 'medium'::character varying,
    requires_response BOOLEAN DEFAULT true,
    sentiment VARCHAR(20),
    key_topics TEXT[],
    webhook_processed BOOLEAN DEFAULT false,
    user_id VARCHAR(255),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    priority_score INTEGER DEFAULT 50,
    processing_status VARCHAR(50) DEFAULT 'pending'::character varying,
    UNIQUE (gmail_id, user_id)
);

-- Table: extracted_entities
CREATE TABLE IF NOT EXISTS extracted_entities (
    id INTEGER DEFAULT nextval('extracted_entities_id_seq'::regclass) NOT NULL,
    email_id INTEGER,
    thread_id VARCHAR(255),
    entity_type VARCHAR(50) NOT NULL,
    entity_value TEXT NOT NULL,
    entity_context TEXT,
    confidence_score INTEGER DEFAULT 70,
    extraction_method VARCHAR(50) DEFAULT 'ai'::character varying,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: feedback_patterns
CREATE TABLE IF NOT EXISTS feedback_patterns (
    id INTEGER DEFAULT nextval('feedback_patterns_id_seq'::regclass) NOT NULL,
    feedback_type VARCHAR(50) NOT NULL,
    context_factors TEXT,
    user_action VARCHAR(50) NOT NULL,
    satisfaction_score INTEGER,
    learning_weight NUMERIC DEFAULT 1.0,
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: generated_responses
CREATE TABLE IF NOT EXISTS generated_responses (
    id INTEGER DEFAULT nextval('generated_responses_id_seq'::regclass) NOT NULL,
    response_id VARCHAR(100) NOT NULL,
    email_id INTEGER,
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    tone VARCHAR(50) DEFAULT 'professional'::character varying,
    urgency_level VARCHAR(20) DEFAULT 'medium'::character varying,
    confidence INTEGER DEFAULT 50,
    relationship_type VARCHAR(50),
    user_edited BOOLEAN DEFAULT false,
    edit_percentage INTEGER,
    was_sent BOOLEAN DEFAULT false,
    user_rating INTEGER,
    generated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP WITHOUT TIME ZONE,
    edited_at TIMESTAMP WITHOUT TIME ZONE,
    rated_at TIMESTAMP WITHOUT TIME ZONE,
    context_used TEXT DEFAULT '[]'::text,
    user_id VARCHAR(255)
);

-- Table: learning_feedback
CREATE TABLE IF NOT EXISTS learning_feedback (
    id INTEGER DEFAULT nextval('learning_feedback_id_seq'::regclass) NOT NULL,
    response_id VARCHAR(255),
    feedback_type VARCHAR(100),
    original_text TEXT,
    edited_text TEXT,
    improvement_score INTEGER,
    feedback_notes TEXT,
    user_id VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: learning_insights
CREATE TABLE IF NOT EXISTS learning_insights (
    id INTEGER DEFAULT nextval('learning_insights_id_seq'::regclass) NOT NULL,
    pattern_type VARCHAR(50) NOT NULL,
    pattern_value VARCHAR(100) NOT NULL,
    frequency INTEGER DEFAULT 1,
    success_rate NUMERIC DEFAULT 50.0,
    recommendation TEXT NOT NULL,
    confidence INTEGER DEFAULT 50,
    last_updated TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sample_size INTEGER DEFAULT 0,
    time_span_days INTEGER DEFAULT 0,
    first_occurrence TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_applied TIMESTAMP WITHOUT TIME ZONE,
    threshold_met BOOLEAN DEFAULT false,
    stability_score NUMERIC DEFAULT 0.5,
    pattern_variance NUMERIC DEFAULT 0.0,
    weekly_success_rates NUMERIC[] DEFAULT '{}'::numeric[],
    stability_validated BOOLEAN DEFAULT false,
    pattern_drift_detected BOOLEAN DEFAULT false,
    user_id VARCHAR(255) NOT NULL
);

-- Table: meeting_confirmations
CREATE TABLE IF NOT EXISTS meeting_confirmations (
    id VARCHAR(255) NOT NULL,
    draft_id VARCHAR(255) NOT NULL,
    meeting_request_id INTEGER NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    selected_time_slot JSONB,
    status VARCHAR(50) DEFAULT 'pending'::character varying,
    calendar_event_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: meeting_processing_results
CREATE TABLE IF NOT EXISTS meeting_processing_results (
    id INTEGER DEFAULT nextval('meeting_processing_results_id_seq'::regclass) NOT NULL,
    email_db_id INTEGER NOT NULL,
    gmail_id VARCHAR(100) NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    is_meeting_request BOOLEAN NOT NULL,
    confidence INTEGER DEFAULT 0,
    processing_time_ms INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'processed'::character varying NOT NULL,
    reason TEXT,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: meeting_requests
CREATE TABLE IF NOT EXISTS meeting_requests (
    id INTEGER DEFAULT nextval('meeting_requests_id_seq'::regclass) NOT NULL,
    email_id INTEGER,
    sender_email VARCHAR(255) NOT NULL,
    subject TEXT,
    meeting_type VARCHAR(100),
    requested_duration INTEGER,
    preferred_dates JSONB,
    attendees JSONB DEFAULT '[]'::jsonb,
    location_preference TEXT,
    special_requirements TEXT,
    urgency_level VARCHAR(20) DEFAULT 'medium'::character varying,
    detection_confidence NUMERIC DEFAULT 0.0,
    status VARCHAR(50) DEFAULT 'pending'::character varying,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(100) DEFAULT 'default_user'::character varying NOT NULL
);

-- Table: meeting_responses
CREATE TABLE IF NOT EXISTS meeting_responses (
    id INTEGER DEFAULT nextval('meeting_responses_id_seq'::regclass) NOT NULL,
    meeting_request_id INTEGER,
    response_type VARCHAR(50) NOT NULL,
    suggested_times JSONB,
    response_body TEXT NOT NULL,
    calendar_event_id INTEGER,
    confidence NUMERIC DEFAULT 0.0,
    context_used JSONB DEFAULT '[]'::jsonb,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: performance_metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
    id INTEGER DEFAULT nextval('performance_metrics_id_seq'::regclass) NOT NULL,
    week_start DATE NOT NULL,
    total_responses INTEGER DEFAULT 0,
    no_edit_responses INTEGER DEFAULT 0,
    minor_edit_responses INTEGER DEFAULT 0,
    major_rewrite_responses INTEGER DEFAULT 0,
    deleted_responses INTEGER DEFAULT 0,
    overall_success_rate NUMERIC DEFAULT 50.0,
    avg_confidence NUMERIC DEFAULT 50.0,
    avg_user_rating NUMERIC,
    improvement_trend VARCHAR(20) DEFAULT 'stable'::character varying,
    key_insights TEXT[],
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: promotional_emails
CREATE TABLE IF NOT EXISTS promotional_emails (
    id INTEGER DEFAULT nextval('promotional_emails_id_seq'::regclass) PRIMARY KEY,
    gmail_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    thread_id VARCHAR(255),
    subject TEXT,
    from_email VARCHAR(255) NOT NULL,
    to_email VARCHAR(255),
    body TEXT,
    received_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    classification_reason VARCHAR(100) NOT NULL,
    is_read BOOLEAN DEFAULT false,
    webhook_processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    UNIQUE (gmail_id, user_id)
);

-- Table: response_preferences
CREATE TABLE IF NOT EXISTS response_preferences (
    id INTEGER DEFAULT nextval('response_preferences_id_seq'::regclass) NOT NULL,
    user_id VARCHAR(100) DEFAULT 'default_user'::character varying,
    preference_type VARCHAR(50) NOT NULL,
    preference_value TEXT NOT NULL,
    context_filters JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: response_stats
CREATE TABLE IF NOT EXISTS response_stats (
    id INTEGER DEFAULT nextval('response_stats_id_seq'::regclass) NOT NULL,
    stat_date DATE DEFAULT CURRENT_DATE,
    total_generated INTEGER DEFAULT 0,
    total_sent INTEGER DEFAULT 0,
    total_edited INTEGER DEFAULT 0,
    avg_confidence INTEGER DEFAULT 0,
    avg_edit_percentage INTEGER DEFAULT 0,
    context_usage_breakdown TEXT,
    relationship_breakdown TEXT,
    urgency_breakdown TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: response_templates
CREATE TABLE IF NOT EXISTS response_templates (
    id INTEGER DEFAULT nextval('response_templates_id_seq'::regclass) NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    template_type VARCHAR(50),
    relationship_context VARCHAR(50),
    urgency_context VARCHAR(20),
    template_content TEXT NOT NULL,
    usage_count INTEGER DEFAULT 0,
    success_rate INTEGER DEFAULT 50,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: scheduling_patterns
CREATE TABLE IF NOT EXISTS scheduling_patterns (
    id INTEGER DEFAULT nextval('scheduling_patterns_id_seq'::regclass) NOT NULL,
    pattern_type VARCHAR(100) NOT NULL,
    pattern_data JSONB NOT NULL,
    frequency INTEGER DEFAULT 1,
    success_rate NUMERIC DEFAULT 0.0,
    confidence NUMERIC DEFAULT 0.0,
    last_used TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: scheduling_responses
CREATE TABLE IF NOT EXISTS scheduling_responses (
    id INTEGER DEFAULT nextval('scheduling_responses_id_seq'::regclass) NOT NULL,
    meeting_request_id INTEGER,
    recipient_email VARCHAR(255) NOT NULL,
    response_type VARCHAR(50) NOT NULL,
    suggested_time_start TIMESTAMP WITH TIME ZONE,
    suggested_time_end TIMESTAMP WITH TIME ZONE,
    response_confidence NUMERIC DEFAULT 0.8,
    ai_analysis JSONB,
    email_content TEXT,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: scheduling_workflows
CREATE TABLE IF NOT EXISTS scheduling_workflows (
    id INTEGER DEFAULT nextval('scheduling_workflows_id_seq'::regclass) NOT NULL,
    meeting_request_id INTEGER,
    workflow_type VARCHAR(50) NOT NULL,
    current_step VARCHAR(100) NOT NULL,
    total_steps INTEGER DEFAULT 1,
    step_number INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'active'::character varying,
    context JSONB,
    next_action_time TIMESTAMP WITH TIME ZONE,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: sender_profiles
CREATE TABLE IF NOT EXISTS sender_profiles (
    id INTEGER DEFAULT nextval('sender_profiles_id_seq'::regclass) NOT NULL,
    email_address VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    company VARCHAR(255),
    job_title VARCHAR(255),
    relationship_type VARCHAR(50),
    relationship_strength VARCHAR(20),
    communication_frequency VARCHAR(20),
    formality_preference VARCHAR(20),
    response_time_expectation INTEGER,
    signature_pattern TEXT,
    timezone VARCHAR(50),
    email_count INTEGER DEFAULT 0,
    last_interaction TIMESTAMP WITHOUT TIME ZONE,
    first_interaction TIMESTAMP WITHOUT TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: sent_emails
CREATE TABLE IF NOT EXISTS sent_emails (
    id INTEGER DEFAULT nextval('sent_emails_id_seq'::regclass) NOT NULL,
    gmail_id VARCHAR(255) NOT NULL,
    subject TEXT,
    body TEXT,
    to_email VARCHAR(255) NOT NULL,
    sent_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    analyzed_for_tone BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: tone_profile_adjustments
CREATE TABLE IF NOT EXISTS tone_profile_adjustments (
    id INTEGER DEFAULT nextval('tone_profile_adjustments_id_seq'::regclass) NOT NULL,
    base_profile_id INTEGER,
    adjustment_reason TEXT NOT NULL,
    adjustments_applied TEXT NOT NULL,
    performance_before NUMERIC,
    performance_after NUMERIC,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table: tone_profiles
CREATE TABLE IF NOT EXISTS tone_profiles (
    id INTEGER DEFAULT nextval('tone_profiles_id_seq'::regclass) NOT NULL,
    profile_text TEXT NOT NULL,
    confidence_score INTEGER DEFAULT 0,
    email_samples_analyzed INTEGER DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    insights TEXT,
    is_real_data BOOLEAN DEFAULT false
);

-- Table: user_gmail_tokens
CREATE TABLE IF NOT EXISTS user_gmail_tokens (
    user_id VARCHAR(255) PRIMARY KEY,
    gmail_address VARCHAR(255) NOT NULL UNIQUE,
    refresh_token_encrypted TEXT NOT NULL,
    access_token_encrypted TEXT,
    access_token_expires_at TIMESTAMP WITHOUT TIME ZONE,
    webhook_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    webhook_expires_at TIMESTAMP WITHOUT TIME ZONE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    full_name VARCHAR(200),
    onboarding_completed BOOLEAN DEFAULT false,
    scheduling_link VARCHAR(500),
    scheduling_link_verified BOOLEAN DEFAULT false,
    scheduling_link_added_at TIMESTAMP WITHOUT TIME ZONE
);

-- Table: user_preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    id INTEGER DEFAULT nextval('user_preferences_id_seq'::regclass) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    preferred_salutation VARCHAR(100) DEFAULT 'Best regards'::character varying,
    signature_style VARCHAR(50) DEFAULT 'simple'::character varying,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
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
    last_active TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    full_name VARCHAR(200),
    company_name VARCHAR(200),
    job_title VARCHAR(100),
    preferred_signature TEXT DEFAULT 'Best regards'::text,
    signature_style VARCHAR(20) DEFAULT 'professional'::character varying
);

-- Table: webhook_notifications
CREATE TABLE IF NOT EXISTS webhook_notifications (
    id INTEGER DEFAULT nextval('webhook_notifications_id_seq'::regclass) NOT NULL,
    email_address VARCHAR(255) NOT NULL,
    history_id BIGINT NOT NULL,
    notification_type VARCHAR(50) DEFAULT 'email_received'::character varying,
    sender_info JSONB,
    subject_preview TEXT,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processing_status VARCHAR(20) DEFAULT 'received'::character varying,
    ai_analysis_triggered BOOLEAN DEFAULT false,
    response_generated BOOLEAN DEFAULT false,
    error_details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

