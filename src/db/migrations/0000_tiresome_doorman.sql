-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE IF NOT EXISTS "auth_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "promotional_emails" (
	"id" serial PRIMARY KEY NOT NULL,
	"gmail_id" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"thread_id" varchar(255),
	"subject" text,
	"from_email" text NOT NULL,
	"to_email" text,
	"body" text,
	"received_at" timestamp DEFAULT now(),
	"classification_reason" varchar(100) NOT NULL,
	"is_read" boolean DEFAULT false,
	"webhook_processed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "promotional_emails_gmail_id_user_id_key" UNIQUE("gmail_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "validated_learning_insights" (
	"id" integer,
	"pattern_type" varchar(50),
	"pattern_value" varchar(100),
	"frequency" integer,
	"success_rate" numeric(5, 2),
	"recommendation" text,
	"confidence" integer,
	"sample_size" integer,
	"time_span_days" integer,
	"threshold_met" boolean,
	"validation_status" text,
	"created_at" timestamp,
	"last_updated" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learning_insights" (
	"id" serial PRIMARY KEY NOT NULL,
	"pattern_type" varchar(50) NOT NULL,
	"pattern_value" varchar(100) NOT NULL,
	"frequency" integer DEFAULT 1,
	"success_rate" numeric(5, 2) DEFAULT 50.0,
	"recommendation" text NOT NULL,
	"confidence" integer DEFAULT 50,
	"last_updated" timestamp DEFAULT CURRENT_TIMESTAMP,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"sample_size" integer DEFAULT 0,
	"time_span_days" integer DEFAULT 0,
	"first_occurrence" timestamp DEFAULT CURRENT_TIMESTAMP,
	"last_applied" timestamp,
	"threshold_met" boolean DEFAULT false,
	"stability_score" numeric(5, 3) DEFAULT 0.5,
	"pattern_variance" numeric(8, 3) DEFAULT 0.0,
	"weekly_success_rates" numeric(5, 2)[] DEFAULT '{}'::numeric[],
	"stability_validated" boolean DEFAULT false,
	"pattern_drift_detected" boolean DEFAULT false,
	"user_id" varchar(255) NOT NULL,
	CONSTRAINT "unique_pattern_insight" UNIQUE("pattern_type","pattern_value"),
	CONSTRAINT "unique_user_pattern_insight" UNIQUE("pattern_type","pattern_value","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_profiles" (
	"user_id" varchar(255) PRIMARY KEY NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"profile_picture_url" text,
	"usage_current" integer DEFAULT 0,
	"usage_limit" integer DEFAULT 50,
	"usage_reset_date" date DEFAULT CURRENT_DATE,
	"is_new_user" boolean DEFAULT true,
	"last_active" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"first_name" varchar(100),
	"last_name" varchar(100),
	"full_name" varchar(200),
	"company_name" varchar(200),
	"job_title" varchar(100),
	"preferred_signature" text DEFAULT 'Best regards',
	"signature_style" varchar(20) DEFAULT 'professional'::character varying,
	"timezone" varchar(100) DEFAULT 'America/Los_Angeles'::character varying
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tone_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_text" text NOT NULL,
	"confidence_score" integer DEFAULT 0,
	"email_samples_analyzed" integer DEFAULT 0,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"insights" text,
	"is_real_data" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sent_emails" (
	"id" serial PRIMARY KEY NOT NULL,
	"gmail_id" varchar(255) NOT NULL,
	"subject" text,
	"body" text,
	"to_email" varchar(255) NOT NULL,
	"sent_at" timestamp NOT NULL,
	"analyzed_for_tone" boolean DEFAULT false,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "sent_emails_gmail_id_key" UNIQUE("gmail_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "extracted_entities" (
	"id" serial PRIMARY KEY NOT NULL,
	"email_id" integer,
	"thread_id" varchar(255),
	"entity_type" varchar(50) NOT NULL,
	"entity_value" text NOT NULL,
	"entity_context" text,
	"confidence_score" integer DEFAULT 70,
	"extraction_method" varchar(50) DEFAULT 'ai'::character varying,
	"is_verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_threads" (
	"id" serial PRIMARY KEY NOT NULL,
	"thread_id" varchar(255) NOT NULL,
	"subject_line" text,
	"participants" text[],
	"participant_count" integer DEFAULT 0,
	"message_count" integer DEFAULT 0,
	"first_message_date" timestamp,
	"last_message_date" timestamp,
	"is_active" boolean DEFAULT true,
	"context_summary" text,
	"key_decisions" text[],
	"commitments" text[],
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "email_threads_thread_id_key" UNIQUE("thread_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "webhook_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"email_address" varchar(255) NOT NULL,
	"history_id" bigint NOT NULL,
	"notification_type" varchar(50) DEFAULT 'email_received'::character varying,
	"sender_info" jsonb,
	"subject_preview" text,
	"processed_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"processing_status" varchar(20) DEFAULT 'received'::character varying,
	"ai_analysis_triggered" boolean DEFAULT false,
	"response_generated" boolean DEFAULT false,
	"error_details" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "response_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"stat_date" date DEFAULT CURRENT_DATE,
	"total_generated" integer DEFAULT 0,
	"total_sent" integer DEFAULT 0,
	"total_edited" integer DEFAULT 0,
	"avg_confidence" integer DEFAULT 0,
	"avg_edit_percentage" integer DEFAULT 0,
	"context_usage_breakdown" text,
	"relationship_breakdown" text,
	"urgency_breakdown" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "response_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_name" varchar(100) NOT NULL,
	"template_type" varchar(50),
	"relationship_context" varchar(50),
	"urgency_context" varchar(20),
	"template_content" text NOT NULL,
	"usage_count" integer DEFAULT 0,
	"success_rate" integer DEFAULT 50,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "generated_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"response_id" varchar(100) NOT NULL,
	"email_id" integer,
	"recipient_email" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"tone" varchar(50) DEFAULT 'professional'::character varying,
	"urgency_level" varchar(20) DEFAULT 'medium'::character varying,
	"confidence" integer DEFAULT 50,
	"relationship_type" varchar(50),
	"user_edited" boolean DEFAULT false,
	"edit_percentage" integer,
	"was_sent" boolean DEFAULT false,
	"user_rating" integer,
	"generated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"sent_at" timestamp,
	"edited_at" timestamp,
	"rated_at" timestamp,
	"context_used" text DEFAULT '[]',
	"user_id" varchar(255),
	CONSTRAINT "generated_responses_response_id_key" UNIQUE("response_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tone_profile_adjustments" (
	"id" serial PRIMARY KEY NOT NULL,
	"base_profile_id" integer,
	"adjustment_reason" text NOT NULL,
	"adjustments_applied" text NOT NULL,
	"performance_before" numeric(5, 2),
	"performance_after" numeric(5, 2),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sender_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"email_address" varchar(255) NOT NULL,
	"display_name" varchar(255),
	"company" varchar(255),
	"job_title" varchar(255),
	"relationship_type" varchar(50),
	"relationship_strength" varchar(20),
	"communication_frequency" varchar(20),
	"formality_preference" varchar(20),
	"response_time_expectation" integer,
	"signature_pattern" text,
	"timezone" varchar(50),
	"email_count" integer DEFAULT 0,
	"last_interaction" timestamp,
	"first_interaction" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "sender_profiles_email_address_key" UNIQUE("email_address")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communication_patterns" (
	"id" serial PRIMARY KEY NOT NULL,
	"sender_email" varchar(255),
	"pattern_type" varchar(50),
	"pattern_text" text,
	"usage_frequency" integer DEFAULT 1,
	"context_type" varchar(50),
	"effectiveness_score" integer DEFAULT 50,
	"last_used" timestamp DEFAULT CURRENT_TIMESTAMP,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "context_memories" (
	"id" serial PRIMARY KEY NOT NULL,
	"memory_type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"context_tags" text[],
	"related_emails" integer[],
	"related_threads" text[],
	"related_entities" integer[],
	"importance_score" integer DEFAULT 50,
	"last_referenced" timestamp DEFAULT CURRENT_TIMESTAMP,
	"reference_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "response_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(100) DEFAULT 'default_user'::character varying,
	"preference_type" varchar(50) NOT NULL,
	"preference_value" text NOT NULL,
	"context_filters" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"full_name" varchar(255),
	"preferred_salutation" varchar(100) DEFAULT 'Best regards'::character varying,
	"signature_style" varchar(50) DEFAULT 'simple'::character varying,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_preferences_user_email_key" UNIQUE("user_email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "edit_analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"response_id" varchar(100) NOT NULL,
	"original_text" text NOT NULL,
	"edited_text" text NOT NULL,
	"edit_type" varchar(20) NOT NULL,
	"edit_percentage" integer DEFAULT 0,
	"edit_description" text,
	"success_score" integer DEFAULT 50,
	"learning_insight" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"user_id" varchar(255),
	"context_factors" jsonb DEFAULT '{}'::jsonb,
	"validation_score" numeric(3, 2) DEFAULT 1.0,
	"time_window" varchar(20) DEFAULT 'week-0'::character varying,
	"stability_factor" numeric(3, 2) DEFAULT 1.0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "emails" (
	"id" serial PRIMARY KEY NOT NULL,
	"gmail_id" varchar(255) NOT NULL,
	"thread_id" varchar(255) NOT NULL,
	"subject" text,
	"from_email" text NOT NULL,
	"to_email" text NOT NULL,
	"body" text,
	"received_at" timestamp NOT NULL,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"category" varchar(50),
	"has_draft" boolean DEFAULT false,
	"thread_context_id" integer,
	"sender_profile_id" integer,
	"context_analyzed" boolean DEFAULT false,
	"conversation_position" integer DEFAULT 1,
	"urgency_level" varchar(20) DEFAULT 'medium'::character varying,
	"requires_response" boolean DEFAULT true,
	"sentiment" varchar(20),
	"key_topics" text[],
	"webhook_processed" boolean DEFAULT false,
	"user_id" varchar(255),
	"updated_at" timestamp DEFAULT now(),
	"priority_score" integer DEFAULT 50,
	"processing_status" varchar(50) DEFAULT 'pending'::character varying,
	CONSTRAINT "emails_gmail_id_user_id_key" UNIQUE("gmail_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "performance_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"week_start" date NOT NULL,
	"total_responses" integer DEFAULT 0,
	"no_edit_responses" integer DEFAULT 0,
	"minor_edit_responses" integer DEFAULT 0,
	"major_rewrite_responses" integer DEFAULT 0,
	"deleted_responses" integer DEFAULT 0,
	"overall_success_rate" numeric(5, 2) DEFAULT 50.0,
	"avg_confidence" numeric(5, 2) DEFAULT 50.0,
	"avg_user_rating" numeric(3, 2),
	"improvement_trend" varchar(20) DEFAULT 'stable'::character varying,
	"key_insights" text[],
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "unique_week_metrics" UNIQUE("week_start")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feedback_patterns" (
	"id" serial PRIMARY KEY NOT NULL,
	"feedback_type" varchar(50) NOT NULL,
	"context_factors" text,
	"user_action" varchar(50) NOT NULL,
	"satisfaction_score" integer,
	"learning_weight" numeric(3, 2) DEFAULT 1.0,
	"notes" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "calendar_holds" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_request_id" integer,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"holder_email" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'active'::character varying,
	"expiry_time" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scheduling_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_request_id" integer,
	"recipient_email" varchar(255) NOT NULL,
	"response_type" varchar(50) NOT NULL,
	"suggested_time_start" timestamp with time zone,
	"suggested_time_end" timestamp with time zone,
	"response_confidence" numeric(3, 2) DEFAULT 0.8,
	"ai_analysis" jsonb,
	"email_content" text,
	"processed_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auto_scheduling_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"preference_type" varchar(100) NOT NULL,
	"preference_value" jsonb NOT NULL,
	"priority" integer DEFAULT 5,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "auto_scheduling_preferences_user_email_preference_type_key" UNIQUE("user_email","preference_type")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "calendar_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(100) DEFAULT 'default_user'::character varying,
	"preference_type" varchar(100) NOT NULL,
	"preference_value" jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scheduling_patterns" (
	"id" serial PRIMARY KEY NOT NULL,
	"pattern_type" varchar(100) NOT NULL,
	"pattern_data" jsonb NOT NULL,
	"frequency" integer DEFAULT 1,
	"success_rate" numeric(5, 2) DEFAULT 0.0,
	"confidence" numeric(5, 2) DEFAULT 0.0,
	"last_used" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "calendar_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"google_event_id" varchar(255) NOT NULL,
	"calendar_id" varchar(255) DEFAULT 'primary'::character varying,
	"summary" text NOT NULL,
	"description" text,
	"start_datetime" timestamp with time zone NOT NULL,
	"end_datetime" timestamp with time zone NOT NULL,
	"timezone" varchar(100),
	"location" text,
	"status" varchar(50) DEFAULT 'confirmed'::character varying,
	"attendees" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"last_synced" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"event_timezone" varchar(100),
	CONSTRAINT "calendar_events_google_event_id_key" UNIQUE("google_event_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meeting_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_request_id" integer,
	"response_type" varchar(50) NOT NULL,
	"suggested_times" jsonb,
	"response_body" text NOT NULL,
	"calendar_event_id" integer,
	"confidence" numeric(5, 2) DEFAULT 0.0,
	"context_used" jsonb DEFAULT '[]'::jsonb,
	"generated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "availability_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"date_key" date NOT NULL,
	"calendar_id" varchar(255) DEFAULT 'primary'::character varying,
	"availability_data" jsonb NOT NULL,
	"last_updated" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"expires_at" timestamp with time zone,
	CONSTRAINT "availability_cache_date_key_calendar_id_key" UNIQUE("date_key","calendar_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "calendar_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_response_id" integer,
	"feedback_type" varchar(100) NOT NULL,
	"original_data" jsonb NOT NULL,
	"modified_data" jsonb NOT NULL,
	"edit_percentage" numeric(5, 2) DEFAULT 0.0,
	"user_satisfaction" integer,
	"learning_insight" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_gmail_tokens" (
	"user_id" varchar(255) PRIMARY KEY NOT NULL,
	"gmail_address" varchar(255) NOT NULL,
	"refresh_token_encrypted" text NOT NULL,
	"access_token_encrypted" text,
	"access_token_expires_at" timestamp,
	"webhook_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"webhook_expires_at" timestamp,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"full_name" varchar(200),
	"onboarding_completed" boolean DEFAULT false,
	"scheduling_link" varchar(500),
	"scheduling_link_verified" boolean DEFAULT false,
	"scheduling_link_added_at" timestamp,
	"timezone" varchar(100) DEFAULT 'America/Los_Angeles'::character varying,
	"timezone_updated_at" timestamp DEFAULT now(),
	"timezone_source" varchar(50) DEFAULT 'google_calendar'::character varying,
	CONSTRAINT "user_gmail_tokens_gmail_address_key" UNIQUE("gmail_address")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scheduling_workflows" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_request_id" integer,
	"workflow_type" varchar(50) NOT NULL,
	"current_step" varchar(100) NOT NULL,
	"total_steps" integer DEFAULT 1,
	"step_number" integer DEFAULT 1,
	"status" varchar(50) DEFAULT 'active'::character varying,
	"context" jsonb,
	"next_action_time" timestamp with time zone,
	"retry_count" integer DEFAULT 0,
	"max_retries" integer DEFAULT 3,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "active_webhook_users" (
	"user_id" varchar(255),
	"gmail_address" varchar(255),
	"refresh_token_encrypted" text,
	"access_token_encrypted" text,
	"access_token_expires_at" timestamp,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "available_time_slots" (
	"date" timestamp,
	"availability_status" text,
	"meeting_count" bigint,
	"existing_meetings" jsonb[]
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meeting_patterns_analysis" (
	"pattern_type" varchar(100),
	"frequency" integer,
	"success_rate" numeric(5, 2),
	"confidence" numeric(5, 2),
	"pattern_data" jsonb,
	"recommendation_level" text,
	"last_used" timestamp with time zone,
	"created_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auto_generated_drafts" (
	"id" serial PRIMARY KEY NOT NULL,
	"draft_id" varchar(50) NOT NULL,
	"original_email_id" integer,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"tone" varchar(20),
	"urgency_level" varchar(10),
	"context_used" jsonb,
	"relationship_type" varchar(20),
	"status" varchar(20) DEFAULT 'pending'::character varying,
	"created_at" timestamp DEFAULT now(),
	"reviewed_at" timestamp,
	"sent_at" timestamp,
	"user_edited" boolean DEFAULT false,
	"edit_count" integer DEFAULT 0,
	"processing_time_ms" integer,
	"user_id" varchar(255),
	"approved_at" timestamp,
	CONSTRAINT "auto_generated_drafts_draft_id_key" UNIQUE("draft_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "validated_learning_insights_with_stability" (
	"id" integer,
	"pattern_type" varchar(50),
	"pattern_value" varchar(100),
	"frequency" integer,
	"success_rate" numeric(5, 2),
	"recommendation" text,
	"confidence" integer,
	"sample_size" integer,
	"time_span_days" integer,
	"threshold_met" boolean,
	"stability_score" numeric(5, 3),
	"pattern_variance" numeric(8, 3),
	"stability_validated" boolean,
	"pattern_drift_detected" boolean,
	"validation_status" text,
	"created_at" timestamp,
	"last_updated" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_learning_insights" (
	"user_id" varchar(255),
	"pattern_type" varchar(50),
	"pattern_value" varchar(100),
	"frequency" integer,
	"success_rate" numeric(5, 2),
	"recommendation" text,
	"confidence" integer,
	"last_updated" timestamp,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meeting_processing_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"email_db_id" integer NOT NULL,
	"gmail_id" varchar(100) NOT NULL,
	"user_id" varchar(100) NOT NULL,
	"is_meeting_request" boolean NOT NULL,
	"confidence" integer DEFAULT 0,
	"processing_time_ms" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'processed'::character varying NOT NULL,
	"reason" text,
	"processed_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "meeting_processing_results_email_db_id_user_id_key" UNIQUE("email_db_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meeting_pipeline_analytics" (
	"user_id" varchar(100),
	"processing_date" date,
	"emails_processed" bigint,
	"meetings_detected" bigint,
	"detection_rate" numeric,
	"avg_processing_time" numeric,
	"error_count" bigint,
	"skipped_count" bigint
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meeting_confirmations" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"draft_id" varchar(255) NOT NULL,
	"meeting_request_id" integer NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"selected_time_slot" jsonb,
	"status" varchar(50) DEFAULT 'pending'::character varying,
	"calendar_event_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"confirmed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pending_meeting_confirmations" (
	"id" varchar(255),
	"draft_id" varchar(255),
	"meeting_request_id" integer,
	"user_id" varchar(255),
	"selected_time_slot" jsonb,
	"status" varchar(50),
	"created_at" timestamp with time zone,
	"subject" text,
	"sender_email" varchar(255),
	"preferred_dates" jsonb,
	"requested_duration" integer,
	"location_preference" text,
	"special_requirements" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learning_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"response_id" varchar(255),
	"feedback_type" varchar(100),
	"original_text" text,
	"edited_text" text,
	"improvement_score" integer,
	"feedback_notes" text,
	"user_id" varchar(255),
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "drafts" (
	"id" serial PRIMARY KEY NOT NULL,
	"email_id" integer,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"category" varchar(50) NOT NULL,
	"confidence_score" integer DEFAULT 70,
	"quality_score" integer DEFAULT 70,
	"status" varchar(20) DEFAULT 'pending'::character varying,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"approved_at" timestamp,
	"sent_at" timestamp,
	"type" varchar(50) DEFAULT 'regular'::character varying,
	"meeting_context" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "timezone_change_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"old_timezone" varchar(100),
	"new_timezone" varchar(100) NOT NULL,
	"source" varchar(50) NOT NULL,
	"changed_at" timestamp DEFAULT now(),
	"changed_by" varchar(50) DEFAULT 'system'::character varying
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meeting_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"email_id" integer,
	"sender_email" varchar(255) NOT NULL,
	"subject" text,
	"meeting_type" varchar(100),
	"requested_duration" integer,
	"preferred_dates" jsonb,
	"attendees" jsonb DEFAULT '[]'::jsonb,
	"location_preference" text,
	"special_requirements" text,
	"urgency_level" varchar(20) DEFAULT 'medium'::character varying,
	"detection_confidence" numeric(5, 2) DEFAULT 0.0,
	"status" varchar(50) DEFAULT 'pending'::character varying,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"user_id" varchar(100) DEFAULT 'default_user'::character varying NOT NULL,
	"requester_timezone" varchar(100),
	"preferred_timezone" varchar(100),
	CONSTRAINT "meeting_requests_email_user_unique" UNIQUE("email_id","user_id"),
	CONSTRAINT "meeting_requests_email_id_user_id_key" UNIQUE("email_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meeting_pipeline_detailed" (
	"id" integer,
	"gmail_id" varchar(100),
	"user_id" varchar(100),
	"is_meeting_request" boolean,
	"confidence" integer,
	"processing_time_ms" integer,
	"status" varchar(20),
	"reason" text,
	"processed_at" timestamp with time zone,
	"subject" text,
	"from_email" text,
	"received_at" timestamp,
	"meeting_type" varchar(100),
	"urgency_level" varchar(20),
	"requested_duration" integer,
	"meeting_status" varchar(50)
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_gmail_tokens"("user_id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extracted_entities" ADD CONSTRAINT "extracted_entities_email_id_fkey" FOREIGN KEY ("email_id") REFERENCES "public"."emails"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "extracted_entities" ADD CONSTRAINT "extracted_entities_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."email_threads"("thread_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "communication_patterns" ADD CONSTRAINT "communication_patterns_sender_email_fkey" FOREIGN KEY ("sender_email") REFERENCES "public"."sender_profiles"("email_address") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "emails" ADD CONSTRAINT "emails_thread_context_id_fkey" FOREIGN KEY ("thread_context_id") REFERENCES "public"."email_threads"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "emails" ADD CONSTRAINT "emails_sender_profile_id_fkey" FOREIGN KEY ("sender_profile_id") REFERENCES "public"."sender_profiles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meeting_responses" ADD CONSTRAINT "meeting_responses_meeting_request_id_fkey" FOREIGN KEY ("meeting_request_id") REFERENCES "public"."meeting_requests"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meeting_responses" ADD CONSTRAINT "meeting_responses_calendar_event_id_fkey" FOREIGN KEY ("calendar_event_id") REFERENCES "public"."calendar_events"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "calendar_feedback" ADD CONSTRAINT "calendar_feedback_meeting_response_id_fkey" FOREIGN KEY ("meeting_response_id") REFERENCES "public"."meeting_responses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "auto_generated_drafts" ADD CONSTRAINT "auto_generated_drafts_original_email_id_fkey" FOREIGN KEY ("original_email_id") REFERENCES "public"."emails"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meeting_processing_results" ADD CONSTRAINT "meeting_processing_results_email_db_id_fkey" FOREIGN KEY ("email_db_id") REFERENCES "public"."emails"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meeting_confirmations" ADD CONSTRAINT "meeting_confirmations_meeting_request_id_fkey" FOREIGN KEY ("meeting_request_id") REFERENCES "public"."meeting_requests"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "drafts" ADD CONSTRAINT "drafts_email_id_fkey" FOREIGN KEY ("email_id") REFERENCES "public"."emails"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meeting_requests" ADD CONSTRAINT "meeting_requests_email_id_fkey" FOREIGN KEY ("email_id") REFERENCES "public"."emails"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_promotional_emails_user_id" ON "promotional_emails" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_promotional_emails_received_at" ON "promotional_emails" ("received_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_promotional_emails_is_read" ON "promotional_emails" ("is_read");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_promotional_emails_classification" ON "promotional_emails" ("classification_reason");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_learning_insights_pattern" ON "learning_insights" ("pattern_type","pattern_value");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_learning_insights_success_rate" ON "learning_insights" ("success_rate");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_learning_insights_updated" ON "learning_insights" ("last_updated");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_learning_insights_threshold_met" ON "learning_insights" ("sample_size","threshold_met");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_learning_insights_time_span" ON "learning_insights" ("time_span_days");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_learning_insights_drift" ON "learning_insights" ("last_updated","pattern_drift_detected");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_learning_insights_stability" ON "learning_insights" ("stability_score","stability_validated");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_learning_insights_user_id" ON "learning_insights" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_learning_insights_user_pattern" ON "learning_insights" ("pattern_type","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_learning_insights_user_confidence" ON "learning_insights" ("confidence","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_profiles_user_id" ON "user_profiles" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_profiles_usage_reset" ON "user_profiles" ("usage_reset_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_profiles_timezone" ON "user_profiles" ("timezone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sent_emails_gmail_id" ON "sent_emails" ("gmail_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sent_emails_analyzed" ON "sent_emails" ("analyzed_for_tone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_extracted_entities_email_id" ON "extracted_entities" ("email_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_extracted_entities_type" ON "extracted_entities" ("entity_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_email_threads_thread_id" ON "email_threads" ("thread_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_email_threads_last_message" ON "email_threads" ("last_message_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_webhook_notifications_processed_at" ON "webhook_notifications" ("processed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_webhook_notifications_history_id" ON "webhook_notifications" ("history_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_response_stats_date" ON "response_stats" ("stat_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_response_templates_type" ON "response_templates" ("template_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_response_templates_relationship" ON "response_templates" ("relationship_context");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_generated_responses_recipient" ON "generated_responses" ("recipient_email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_generated_responses_generated_at" ON "generated_responses" ("generated_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_generated_responses_confidence" ON "generated_responses" ("confidence");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_generated_responses_urgency" ON "generated_responses" ("urgency_level");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_generated_responses_relationship" ON "generated_responses" ("relationship_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_generated_responses_user_id" ON "generated_responses" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tone_adjustments_active" ON "tone_profile_adjustments" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tone_adjustments_created" ON "tone_profile_adjustments" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sender_profiles_email" ON "sender_profiles" ("email_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sender_profiles_relationship" ON "sender_profiles" ("relationship_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_communication_patterns_sender" ON "communication_patterns" ("sender_email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_context_memories_type" ON "context_memories" ("memory_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_context_memories_importance" ON "context_memories" ("importance_score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_context_memories_tags" ON "context_memories" ("context_tags");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_response_preferences_type" ON "response_preferences" ("preference_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_preferences_email" ON "user_preferences" ("user_email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_edit_analyses_response_id" ON "edit_analyses" ("response_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_edit_analyses_edit_type" ON "edit_analyses" ("edit_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_edit_analyses_success_score" ON "edit_analyses" ("success_score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_edit_analyses_created_at" ON "edit_analyses" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_edit_analyses_user_id" ON "edit_analyses" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_edit_analyses_validation" ON "edit_analyses" ("created_at","validation_score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_edit_analyses_time_window" ON "edit_analyses" ("edit_type","created_at","time_window");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_emails_gmail_id" ON "emails" ("gmail_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_emails_thread_id" ON "emails" ("thread_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_emails_received_at" ON "emails" ("received_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_emails_category" ON "emails" ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_emails_thread_context" ON "emails" ("thread_context_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_emails_sender_profile" ON "emails" ("sender_profile_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_emails_urgency" ON "emails" ("urgency_level");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_emails_webhook_processed" ON "emails" ("webhook_processed");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_emails_user_id" ON "emails" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_emails_priority" ON "emails" ("priority_score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_performance_metrics_week" ON "performance_metrics" ("week_start");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_performance_metrics_success_rate" ON "performance_metrics" ("overall_success_rate");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_feedback_patterns_type" ON "feedback_patterns" ("feedback_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_feedback_patterns_created" ON "feedback_patterns" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_calendar_holds_meeting_request" ON "calendar_holds" ("meeting_request_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_calendar_holds_status_expiry" ON "calendar_holds" ("status","expiry_time");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_calendar_holds_time_range" ON "calendar_holds" ("start_time","end_time");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scheduling_responses_meeting_request" ON "scheduling_responses" ("meeting_request_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scheduling_responses_recipient" ON "scheduling_responses" ("recipient_email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scheduling_responses_type" ON "scheduling_responses" ("response_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_auto_scheduling_preferences_user" ON "auto_scheduling_preferences" ("user_email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_auto_scheduling_preferences_type" ON "auto_scheduling_preferences" ("preference_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scheduling_patterns_type" ON "scheduling_patterns" ("pattern_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_calendar_events_datetime" ON "calendar_events" ("start_datetime","end_datetime");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_calendar_events_google_id" ON "calendar_events" ("google_event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_availability_cache_date" ON "availability_cache" ("date_key","calendar_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_calendar_feedback_type" ON "calendar_feedback" ("feedback_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_gmail_tokens_gmail_address" ON "user_gmail_tokens" ("gmail_address");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_gmail_tokens_webhook_active" ON "user_gmail_tokens" ("webhook_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_gmail_tokens_onboarding_completed" ON "user_gmail_tokens" ("onboarding_completed");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_gmail_tokens_scheduling_link" ON "user_gmail_tokens" ("scheduling_link");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_gmail_tokens_timezone" ON "user_gmail_tokens" ("timezone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scheduling_workflows_meeting_request" ON "scheduling_workflows" ("meeting_request_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scheduling_workflows_status" ON "scheduling_workflows" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scheduling_workflows_next_action" ON "scheduling_workflows" ("next_action_time");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_auto_drafts_status" ON "auto_generated_drafts" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_auto_drafts_created" ON "auto_generated_drafts" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_auto_drafts_original_email" ON "auto_generated_drafts" ("original_email_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_auto_generated_drafts_user_id" ON "auto_generated_drafts" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_auto_generated_drafts_status" ON "auto_generated_drafts" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_meeting_processing_email_db" ON "meeting_processing_results" ("email_db_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_meeting_processing_gmail" ON "meeting_processing_results" ("gmail_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_meeting_processing_user" ON "meeting_processing_results" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_meeting_processing_status" ON "meeting_processing_results" ("is_meeting_request","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_meeting_processing_time" ON "meeting_processing_results" ("processed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_meeting_processing_results_user_id" ON "meeting_processing_results" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_meeting_confirmations_user_id" ON "meeting_confirmations" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_meeting_confirmations_status" ON "meeting_confirmations" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_meeting_confirmations_meeting_request_id" ON "meeting_confirmations" ("meeting_request_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_meeting_confirmations_draft_id" ON "meeting_confirmations" ("draft_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_meeting_confirmations_user_status" ON "meeting_confirmations" ("user_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_learning_feedback_response" ON "learning_feedback" ("response_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_drafts_email_id" ON "drafts" ("email_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_drafts_status" ON "drafts" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_drafts_created_at" ON "drafts" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_drafts_type" ON "drafts" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_drafts_status_type" ON "drafts" ("status","type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_timezone_change_log_user_id" ON "timezone_change_log" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_timezone_change_log_changed_at" ON "timezone_change_log" ("changed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_meeting_requests_email" ON "meeting_requests" ("email_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_meeting_requests_sender" ON "meeting_requests" ("sender_email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_meeting_requests_status" ON "meeting_requests" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_meeting_requests_user" ON "meeting_requests" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_meeting_requests_user_status" ON "meeting_requests" ("status","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_meeting_requests_user_id" ON "meeting_requests" ("user_id");
*/