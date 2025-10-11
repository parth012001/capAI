import { pgTable, serial, text, timestamp, index, unique, varchar, boolean, integer, numeric, foreignKey, date, bigint, jsonb } from "drizzle-orm/pg-core"
  import { sql } from "drizzle-orm"



export const auth_tokens = pgTable("auth_tokens", {
	id: serial("id").primaryKey().notNull(),
	access_token: text("access_token").notNull(),
	refresh_token: text("refresh_token").notNull(),
	expires_at: timestamp("expires_at", { mode: 'string' }).notNull(),
	created_at: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const promotional_emails = pgTable("promotional_emails", {
	id: serial("id").primaryKey().notNull(),
	gmail_id: varchar("gmail_id", { length: 255 }).notNull(),
	user_id: varchar("user_id", { length: 255 }).notNull(),
	thread_id: varchar("thread_id", { length: 255 }),
	subject: text("subject"),
	from_email: text("from_email").notNull(),
	to_email: text("to_email"),
	body: text("body"),
	received_at: timestamp("received_at", { mode: 'string' }).defaultNow(),
	classification_reason: varchar("classification_reason", { length: 100 }).notNull(),
	is_read: boolean("is_read").default(false),
	webhook_processed: boolean("webhook_processed").default(false),
	created_at: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_promotional_emails_user_id: index("idx_promotional_emails_user_id").on(table.user_id),
		idx_promotional_emails_received_at: index("idx_promotional_emails_received_at").on(table.received_at),
		idx_promotional_emails_is_read: index("idx_promotional_emails_is_read").on(table.is_read),
		idx_promotional_emails_classification: index("idx_promotional_emails_classification").on(table.classification_reason),
		promotional_emails_gmail_id_user_id_key: unique("promotional_emails_gmail_id_user_id_key").on(table.gmail_id, table.user_id),
	}
});

export const validated_learning_insights = pgTable("validated_learning_insights", {
	id: integer("id"),
	pattern_type: varchar("pattern_type", { length: 50 }),
	pattern_value: varchar("pattern_value", { length: 100 }),
	frequency: integer("frequency"),
	success_rate: numeric("success_rate", { precision: 5, scale:  2 }),
	recommendation: text("recommendation"),
	confidence: integer("confidence"),
	sample_size: integer("sample_size"),
	time_span_days: integer("time_span_days"),
	threshold_met: boolean("threshold_met"),
	validation_status: text("validation_status"),
	created_at: timestamp("created_at", { mode: 'string' }),
	last_updated: timestamp("last_updated", { mode: 'string' }),
});

export const learning_insights = pgTable("learning_insights", {
	id: serial("id").primaryKey().notNull(),
	pattern_type: varchar("pattern_type", { length: 50 }).notNull(),
	pattern_value: varchar("pattern_value", { length: 100 }).notNull(),
	frequency: integer("frequency").default(1),
	success_rate: numeric("success_rate", { precision: 5, scale:  2 }).default('50.0'),
	recommendation: text("recommendation").notNull(),
	confidence: integer("confidence").default(50),
	last_updated: timestamp("last_updated", { mode: 'string' }).defaultNow(),
	created_at: timestamp("created_at", { mode: 'string' }).defaultNow(),
	sample_size: integer("sample_size").default(0),
	time_span_days: integer("time_span_days").default(0),
	first_occurrence: timestamp("first_occurrence", { mode: 'string' }).defaultNow(),
	last_applied: timestamp("last_applied", { mode: 'string' }),
	threshold_met: boolean("threshold_met").default(false),
	stability_score: numeric("stability_score", { precision: 5, scale:  3 }).default('0.5'),
	pattern_variance: numeric("pattern_variance", { precision: 8, scale:  3 }).default('0.0'),
	weekly_success_rates: numeric("weekly_success_rates", { precision: 5, scale: 2 }).array().default(sql`'{}'::numeric[]`),
	stability_validated: boolean("stability_validated").default(false),
	pattern_drift_detected: boolean("pattern_drift_detected").default(false),
	user_id: varchar("user_id", { length: 255 }).notNull(),
},
(table) => {
	return {
		idx_learning_insights_pattern: index("idx_learning_insights_pattern").on(table.pattern_type, table.pattern_value),
		idx_learning_insights_success_rate: index("idx_learning_insights_success_rate").on(table.success_rate),
		idx_learning_insights_updated: index("idx_learning_insights_updated").on(table.last_updated),
		idx_learning_insights_threshold_met: index("idx_learning_insights_threshold_met").on(table.sample_size, table.threshold_met),
		idx_learning_insights_time_span: index("idx_learning_insights_time_span").on(table.time_span_days),
		idx_learning_insights_drift: index("idx_learning_insights_drift").on(table.last_updated, table.pattern_drift_detected),
		idx_learning_insights_stability: index("idx_learning_insights_stability").on(table.stability_score, table.stability_validated),
		idx_learning_insights_user_id: index("idx_learning_insights_user_id").on(table.user_id),
		idx_learning_insights_user_pattern: index("idx_learning_insights_user_pattern").on(table.pattern_type, table.user_id),
		idx_learning_insights_user_confidence: index("idx_learning_insights_user_confidence").on(table.confidence, table.user_id),
		unique_pattern_insight: unique("unique_pattern_insight").on(table.pattern_type, table.pattern_value),
		unique_user_pattern_insight: unique("unique_user_pattern_insight").on(table.pattern_type, table.pattern_value, table.user_id),
	}
});

export const user_profiles = pgTable("user_profiles", {
	user_id: varchar("user_id", { length: 255 }).primaryKey().notNull().references(() => user_gmail_tokens.user_id, { onDelete: "cascade" } ),
	display_name: varchar("display_name", { length: 255 }).notNull(),
	profile_picture_url: text("profile_picture_url"),
	usage_current: integer("usage_current").default(0),
	usage_limit: integer("usage_limit").default(50),
	usage_reset_date: date("usage_reset_date").default(sql`CURRENT_DATE`),
	is_new_user: boolean("is_new_user").default(true),
	last_active: timestamp("last_active", { mode: 'string' }).defaultNow(),
	created_at: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	first_name: varchar("first_name", { length: 100 }),
	last_name: varchar("last_name", { length: 100 }),
	full_name: varchar("full_name", { length: 200 }),
	company_name: varchar("company_name", { length: 200 }),
	job_title: varchar("job_title", { length: 100 }),
	preferred_signature: text("preferred_signature").default('Best regards'),
	signature_style: varchar("signature_style", { length: 20 }).default('professional'),
	timezone: varchar("timezone", { length: 100 }).default('America/Los_Angeles'),
},
(table) => {
	return {
		idx_user_profiles_user_id: index("idx_user_profiles_user_id").on(table.user_id),
		idx_user_profiles_usage_reset: index("idx_user_profiles_usage_reset").on(table.usage_reset_date),
		idx_user_profiles_timezone: index("idx_user_profiles_timezone").on(table.timezone),
	}
});

export const tone_profiles = pgTable("tone_profiles", {
	id: serial("id").primaryKey().notNull(),
	profile_text: text("profile_text").notNull(),
	confidence_score: integer("confidence_score").default(0),
	email_samples_analyzed: integer("email_samples_analyzed").default(0),
	created_at: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	insights: text("insights"),
	is_real_data: boolean("is_real_data").default(false),
});

export const sent_emails = pgTable("sent_emails", {
	id: serial("id").primaryKey().notNull(),
	gmail_id: varchar("gmail_id", { length: 255 }).notNull(),
	subject: text("subject"),
	body: text("body"),
	to_email: varchar("to_email", { length: 255 }).notNull(),
	sent_at: timestamp("sent_at", { mode: 'string' }).notNull(),
	analyzed_for_tone: boolean("analyzed_for_tone").default(false),
	created_at: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_sent_emails_gmail_id: index("idx_sent_emails_gmail_id").on(table.gmail_id),
		idx_sent_emails_analyzed: index("idx_sent_emails_analyzed").on(table.analyzed_for_tone),
		sent_emails_gmail_id_key: unique("sent_emails_gmail_id_key").on(table.gmail_id),
	}
});

export const extracted_entities = pgTable("extracted_entities", {
	id: serial("id").primaryKey().notNull(),
	email_id: integer("email_id").references(() => emails.id, { onDelete: "cascade" } ),
	thread_id: varchar("thread_id", { length: 255 }).references(() => email_threads.thread_id),
	entity_type: varchar("entity_type", { length: 50 }).notNull(),
	entity_value: text("entity_value").notNull(),
	entity_context: text("entity_context"),
	confidence_score: integer("confidence_score").default(70),
	extraction_method: varchar("extraction_method", { length: 50 }).default('ai'),
	is_verified: boolean("is_verified").default(false),
	created_at: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_extracted_entities_email_id: index("idx_extracted_entities_email_id").on(table.email_id),
		idx_extracted_entities_type: index("idx_extracted_entities_type").on(table.entity_type),
	}
});

export const email_threads = pgTable("email_threads", {
	id: serial("id").primaryKey().notNull(),
	thread_id: varchar("thread_id", { length: 255 }).notNull(),
	subject_line: text("subject_line"),
	participants: text("participants").array(),
	participant_count: integer("participant_count").default(0),
	message_count: integer("message_count").default(0),
	first_message_date: timestamp("first_message_date", { mode: 'string' }),
	last_message_date: timestamp("last_message_date", { mode: 'string' }),
	is_active: boolean("is_active").default(true),
	context_summary: text("context_summary"),
	key_decisions: text("key_decisions").array(),
	commitments: text("commitments").array(),
	created_at: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_email_threads_thread_id: index("idx_email_threads_thread_id").on(table.thread_id),
		idx_email_threads_last_message: index("idx_email_threads_last_message").on(table.last_message_date),
		email_threads_thread_id_key: unique("email_threads_thread_id_key").on(table.thread_id),
	}
});

export const webhook_notifications = pgTable("webhook_notifications", {
	id: serial("id").primaryKey().notNull(),
	email_address: varchar("email_address", { length: 255 }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	history_id: bigint("history_id", { mode: "number" }).notNull(),
	notification_type: varchar("notification_type", { length: 50 }).default('email_received'),
	sender_info: jsonb("sender_info"),
	subject_preview: text("subject_preview"),
	processed_at: timestamp("processed_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	processing_status: varchar("processing_status", { length: 20 }).default('received'),
	ai_analysis_triggered: boolean("ai_analysis_triggered").default(false),
	response_generated: boolean("response_generated").default(false),
	error_details: text("error_details"),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_webhook_notifications_processed_at: index("idx_webhook_notifications_processed_at").on(table.processed_at),
		idx_webhook_notifications_history_id: index("idx_webhook_notifications_history_id").on(table.history_id),
	}
});

export const response_stats = pgTable("response_stats", {
	id: serial("id").primaryKey().notNull(),
	stat_date: date("stat_date").default(sql`CURRENT_DATE`),
	total_generated: integer("total_generated").default(0),
	total_sent: integer("total_sent").default(0),
	total_edited: integer("total_edited").default(0),
	avg_confidence: integer("avg_confidence").default(0),
	avg_edit_percentage: integer("avg_edit_percentage").default(0),
	context_usage_breakdown: text("context_usage_breakdown"),
	relationship_breakdown: text("relationship_breakdown"),
	urgency_breakdown: text("urgency_breakdown"),
	created_at: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_response_stats_date: index("idx_response_stats_date").on(table.stat_date),
	}
});

export const response_templates = pgTable("response_templates", {
	id: serial("id").primaryKey().notNull(),
	template_name: varchar("template_name", { length: 100 }).notNull(),
	template_type: varchar("template_type", { length: 50 }),
	relationship_context: varchar("relationship_context", { length: 50 }),
	urgency_context: varchar("urgency_context", { length: 20 }),
	template_content: text("template_content").notNull(),
	usage_count: integer("usage_count").default(0),
	success_rate: integer("success_rate").default(50),
	is_active: boolean("is_active").default(true),
	created_at: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_response_templates_type: index("idx_response_templates_type").on(table.template_type),
		idx_response_templates_relationship: index("idx_response_templates_relationship").on(table.relationship_context),
	}
});

export const generated_responses = pgTable("generated_responses", {
	id: serial("id").primaryKey().notNull(),
	response_id: varchar("response_id", { length: 100 }).notNull(),
	email_id: integer("email_id"),
	recipient_email: text("recipient_email").notNull(),
	subject: text("subject").notNull(),
	body: text("body").notNull(),
	tone: varchar("tone", { length: 50 }).default('professional'),
	urgency_level: varchar("urgency_level", { length: 20 }).default('medium'),
	confidence: integer("confidence").default(50),
	relationship_type: varchar("relationship_type", { length: 50 }),
	user_edited: boolean("user_edited").default(false),
	edit_percentage: integer("edit_percentage"),
	was_sent: boolean("was_sent").default(false),
	user_rating: integer("user_rating"),
	generated_at: timestamp("generated_at", { mode: 'string' }).defaultNow(),
	sent_at: timestamp("sent_at", { mode: 'string' }),
	edited_at: timestamp("edited_at", { mode: 'string' }),
	rated_at: timestamp("rated_at", { mode: 'string' }),
	context_used: text("context_used").default('[]'),
	user_id: varchar("user_id", { length: 255 }),
},
(table) => {
	return {
		idx_generated_responses_recipient: index("idx_generated_responses_recipient").on(table.recipient_email),
		idx_generated_responses_generated_at: index("idx_generated_responses_generated_at").on(table.generated_at),
		idx_generated_responses_confidence: index("idx_generated_responses_confidence").on(table.confidence),
		idx_generated_responses_urgency: index("idx_generated_responses_urgency").on(table.urgency_level),
		idx_generated_responses_relationship: index("idx_generated_responses_relationship").on(table.relationship_type),
		idx_generated_responses_user_id: index("idx_generated_responses_user_id").on(table.user_id),
		generated_responses_response_id_key: unique("generated_responses_response_id_key").on(table.response_id),
	}
});

export const tone_profile_adjustments = pgTable("tone_profile_adjustments", {
	id: serial("id").primaryKey().notNull(),
	base_profile_id: integer("base_profile_id"),
	adjustment_reason: text("adjustment_reason").notNull(),
	adjustments_applied: text("adjustments_applied").notNull(),
	performance_before: numeric("performance_before", { precision: 5, scale:  2 }),
	performance_after: numeric("performance_after", { precision: 5, scale:  2 }),
	is_active: boolean("is_active").default(true),
	created_at: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_tone_adjustments_active: index("idx_tone_adjustments_active").on(table.is_active),
		idx_tone_adjustments_created: index("idx_tone_adjustments_created").on(table.created_at),
	}
});

export const sender_profiles = pgTable("sender_profiles", {
	id: serial("id").primaryKey().notNull(),
	email_address: varchar("email_address", { length: 255 }).notNull(),
	display_name: varchar("display_name", { length: 255 }),
	company: varchar("company", { length: 255 }),
	job_title: varchar("job_title", { length: 255 }),
	relationship_type: varchar("relationship_type", { length: 50 }),
	relationship_strength: varchar("relationship_strength", { length: 20 }),
	communication_frequency: varchar("communication_frequency", { length: 20 }),
	formality_preference: varchar("formality_preference", { length: 20 }),
	response_time_expectation: integer("response_time_expectation"),
	signature_pattern: text("signature_pattern"),
	timezone: varchar("timezone", { length: 50 }),
	email_count: integer("email_count").default(0),
	last_interaction: timestamp("last_interaction", { mode: 'string' }),
	first_interaction: timestamp("first_interaction", { mode: 'string' }),
	notes: text("notes"),
	created_at: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_sender_profiles_email: index("idx_sender_profiles_email").on(table.email_address),
		idx_sender_profiles_relationship: index("idx_sender_profiles_relationship").on(table.relationship_type),
		sender_profiles_email_address_key: unique("sender_profiles_email_address_key").on(table.email_address),
	}
});

export const communication_patterns = pgTable("communication_patterns", {
	id: serial("id").primaryKey().notNull(),
	sender_email: varchar("sender_email", { length: 255 }).references(() => sender_profiles.email_address),
	pattern_type: varchar("pattern_type", { length: 50 }),
	pattern_text: text("pattern_text"),
	usage_frequency: integer("usage_frequency").default(1),
	context_type: varchar("context_type", { length: 50 }),
	effectiveness_score: integer("effectiveness_score").default(50),
	last_used: timestamp("last_used", { mode: 'string' }).defaultNow(),
	created_at: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_communication_patterns_sender: index("idx_communication_patterns_sender").on(table.sender_email),
	}
});

export const context_memories = pgTable("context_memories", {
	id: serial("id").primaryKey().notNull(),
	memory_type: varchar("memory_type", { length: 50 }).notNull(),
	title: varchar("title", { length: 255 }).notNull(),
	content: text("content").notNull(),
	context_tags: text("context_tags").array(),
	related_emails: integer("related_emails").array(),
	related_threads: text("related_threads").array(),
	related_entities: integer("related_entities").array(),
	importance_score: integer("importance_score").default(50),
	last_referenced: timestamp("last_referenced", { mode: 'string' }).defaultNow(),
	reference_count: integer("reference_count").default(0),
	created_at: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_context_memories_type: index("idx_context_memories_type").on(table.memory_type),
		idx_context_memories_importance: index("idx_context_memories_importance").on(table.importance_score),
		idx_context_memories_tags: index("idx_context_memories_tags").on(table.context_tags),
	}
});

export const response_preferences = pgTable("response_preferences", {
	id: serial("id").primaryKey().notNull(),
	user_id: varchar("user_id", { length: 100 }).default('default_user'),
	preference_type: varchar("preference_type", { length: 50 }).notNull(),
	preference_value: text("preference_value").notNull(),
	context_filters: jsonb("context_filters"),
	is_active: boolean("is_active").default(true),
	created_at: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_response_preferences_type: index("idx_response_preferences_type").on(table.preference_type),
	}
});

export const user_preferences = pgTable("user_preferences", {
	id: serial("id").primaryKey().notNull(),
	user_email: varchar("user_email", { length: 255 }).notNull(),
	full_name: varchar("full_name", { length: 255 }),
	preferred_salutation: varchar("preferred_salutation", { length: 100 }).default('Best regards'),
	signature_style: varchar("signature_style", { length: 50 }).default('simple'),
	created_at: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_user_preferences_email: index("idx_user_preferences_email").on(table.user_email),
		user_preferences_user_email_key: unique("user_preferences_user_email_key").on(table.user_email),
	}
});

export const edit_analyses = pgTable("edit_analyses", {
	id: serial("id").primaryKey().notNull(),
	response_id: varchar("response_id", { length: 100 }).notNull(),
	original_text: text("original_text").notNull(),
	edited_text: text("edited_text").notNull(),
	edit_type: varchar("edit_type", { length: 20 }).notNull(),
	edit_percentage: integer("edit_percentage").default(0),
	edit_description: text("edit_description"),
	success_score: integer("success_score").default(50),
	learning_insight: text("learning_insight"),
	created_at: timestamp("created_at", { mode: 'string' }).defaultNow(),
	user_id: varchar("user_id", { length: 255 }),
	context_factors: jsonb("context_factors").default({}),
	validation_score: numeric("validation_score", { precision: 3, scale:  2 }).default('1.0'),
	time_window: varchar("time_window", { length: 20 }).default('week-0'),
	stability_factor: numeric("stability_factor", { precision: 3, scale:  2 }).default('1.0'),
},
(table) => {
	return {
		idx_edit_analyses_response_id: index("idx_edit_analyses_response_id").on(table.response_id),
		idx_edit_analyses_edit_type: index("idx_edit_analyses_edit_type").on(table.edit_type),
		idx_edit_analyses_success_score: index("idx_edit_analyses_success_score").on(table.success_score),
		idx_edit_analyses_created_at: index("idx_edit_analyses_created_at").on(table.created_at),
		idx_edit_analyses_user_id: index("idx_edit_analyses_user_id").on(table.user_id),
		idx_edit_analyses_validation: index("idx_edit_analyses_validation").on(table.created_at, table.validation_score),
		idx_edit_analyses_time_window: index("idx_edit_analyses_time_window").on(table.edit_type, table.created_at, table.time_window),
	}
});

export const emails = pgTable("emails", {
	id: serial("id").primaryKey().notNull(),
	gmail_id: varchar("gmail_id", { length: 255 }).notNull(),
	thread_id: varchar("thread_id", { length: 255 }).notNull(),
	subject: text("subject"),
	from_email: text("from_email").notNull(),
	to_email: text("to_email").notNull(),
	body: text("body"),
	received_at: timestamp("received_at", { mode: 'string' }).notNull(),
	is_read: boolean("is_read").default(false),
	created_at: timestamp("created_at", { mode: 'string' }).defaultNow(),
	category: varchar("category", { length: 50 }),
	has_draft: boolean("has_draft").default(false),
	thread_context_id: integer("thread_context_id").references(() => email_threads.id),
	sender_profile_id: integer("sender_profile_id").references(() => sender_profiles.id),
	context_analyzed: boolean("context_analyzed").default(false),
	conversation_position: integer("conversation_position").default(1),
	urgency_level: varchar("urgency_level", { length: 20 }).default('medium'),
	requires_response: boolean("requires_response").default(true),
	sentiment: varchar("sentiment", { length: 20 }),
	key_topics: text("key_topics").array(),
	webhook_processed: boolean("webhook_processed").default(false),
	user_id: varchar("user_id", { length: 255 }),
	updated_at: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	priority_score: integer("priority_score").default(50),
	processing_status: varchar("processing_status", { length: 50 }).default('pending'),
},
(table) => {
	return {
		idx_emails_gmail_id: index("idx_emails_gmail_id").on(table.gmail_id),
		idx_emails_thread_id: index("idx_emails_thread_id").on(table.thread_id),
		idx_emails_received_at: index("idx_emails_received_at").on(table.received_at),
		idx_emails_category: index("idx_emails_category").on(table.category),
		idx_emails_thread_context: index("idx_emails_thread_context").on(table.thread_context_id),
		idx_emails_sender_profile: index("idx_emails_sender_profile").on(table.sender_profile_id),
		idx_emails_urgency: index("idx_emails_urgency").on(table.urgency_level),
		idx_emails_webhook_processed: index("idx_emails_webhook_processed").on(table.webhook_processed),
		idx_emails_user_id: index("idx_emails_user_id").on(table.user_id),
		idx_emails_priority: index("idx_emails_priority").on(table.priority_score),
		emails_gmail_id_user_id_key: unique("emails_gmail_id_user_id_key").on(table.gmail_id, table.user_id),
	}
});

export const performance_metrics = pgTable("performance_metrics", {
	id: serial("id").primaryKey().notNull(),
	week_start: date("week_start").notNull(),
	total_responses: integer("total_responses").default(0),
	no_edit_responses: integer("no_edit_responses").default(0),
	minor_edit_responses: integer("minor_edit_responses").default(0),
	major_rewrite_responses: integer("major_rewrite_responses").default(0),
	deleted_responses: integer("deleted_responses").default(0),
	overall_success_rate: numeric("overall_success_rate", { precision: 5, scale:  2 }).default('50.0'),
	avg_confidence: numeric("avg_confidence", { precision: 5, scale:  2 }).default('50.0'),
	avg_user_rating: numeric("avg_user_rating", { precision: 3, scale:  2 }),
	improvement_trend: varchar("improvement_trend", { length: 20 }).default('stable'),
	key_insights: text("key_insights").array(),
	created_at: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_performance_metrics_week: index("idx_performance_metrics_week").on(table.week_start),
		idx_performance_metrics_success_rate: index("idx_performance_metrics_success_rate").on(table.overall_success_rate),
		unique_week_metrics: unique("unique_week_metrics").on(table.week_start),
	}
});

export const feedback_patterns = pgTable("feedback_patterns", {
	id: serial("id").primaryKey().notNull(),
	feedback_type: varchar("feedback_type", { length: 50 }).notNull(),
	context_factors: text("context_factors"),
	user_action: varchar("user_action", { length: 50 }).notNull(),
	satisfaction_score: integer("satisfaction_score"),
	learning_weight: numeric("learning_weight", { precision: 3, scale:  2 }).default('1.0'),
	notes: text("notes"),
	created_at: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_feedback_patterns_type: index("idx_feedback_patterns_type").on(table.feedback_type),
		idx_feedback_patterns_created: index("idx_feedback_patterns_created").on(table.created_at),
	}
});

export const calendar_holds = pgTable("calendar_holds", {
	id: serial("id").primaryKey().notNull(),
	meeting_request_id: integer("meeting_request_id"),
	start_time: timestamp("start_time", { withTimezone: true, mode: 'string' }).notNull(),
	end_time: timestamp("end_time", { withTimezone: true, mode: 'string' }).notNull(),
	holder_email: varchar("holder_email", { length: 255 }).notNull(),
	status: varchar("status", { length: 50 }).default('active'),
	expiry_time: timestamp("expiry_time", { withTimezone: true, mode: 'string' }).notNull(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	notes: text("notes"),
},
(table) => {
	return {
		idx_calendar_holds_meeting_request: index("idx_calendar_holds_meeting_request").on(table.meeting_request_id),
		idx_calendar_holds_status_expiry: index("idx_calendar_holds_status_expiry").on(table.status, table.expiry_time),
		idx_calendar_holds_time_range: index("idx_calendar_holds_time_range").on(table.start_time, table.end_time),
	}
});

export const scheduling_responses = pgTable("scheduling_responses", {
	id: serial("id").primaryKey().notNull(),
	meeting_request_id: integer("meeting_request_id"),
	recipient_email: varchar("recipient_email", { length: 255 }).notNull(),
	response_type: varchar("response_type", { length: 50 }).notNull(),
	suggested_time_start: timestamp("suggested_time_start", { withTimezone: true, mode: 'string' }),
	suggested_time_end: timestamp("suggested_time_end", { withTimezone: true, mode: 'string' }),
	response_confidence: numeric("response_confidence", { precision: 3, scale:  2 }).default('0.8'),
	ai_analysis: jsonb("ai_analysis"),
	email_content: text("email_content"),
	processed_at: timestamp("processed_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_scheduling_responses_meeting_request: index("idx_scheduling_responses_meeting_request").on(table.meeting_request_id),
		idx_scheduling_responses_recipient: index("idx_scheduling_responses_recipient").on(table.recipient_email),
		idx_scheduling_responses_type: index("idx_scheduling_responses_type").on(table.response_type),
	}
});

export const auto_scheduling_preferences = pgTable("auto_scheduling_preferences", {
	id: serial("id").primaryKey().notNull(),
	user_email: varchar("user_email", { length: 255 }).notNull(),
	preference_type: varchar("preference_type", { length: 100 }).notNull(),
	preference_value: jsonb("preference_value").notNull(),
	priority: integer("priority").default(5),
	is_active: boolean("is_active").default(true),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_auto_scheduling_preferences_user: index("idx_auto_scheduling_preferences_user").on(table.user_email),
		idx_auto_scheduling_preferences_type: index("idx_auto_scheduling_preferences_type").on(table.preference_type),
		auto_scheduling_preferences_user_email_preference_type_key: unique("auto_scheduling_preferences_user_email_preference_type_key").on(table.user_email, table.preference_type),
	}
});

export const calendar_preferences = pgTable("calendar_preferences", {
	id: serial("id").primaryKey().notNull(),
	user_id: varchar("user_id", { length: 100 }).default('default_user'),
	preference_type: varchar("preference_type", { length: 100 }).notNull(),
	preference_value: jsonb("preference_value").notNull(),
	is_active: boolean("is_active").default(true),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const scheduling_patterns = pgTable("scheduling_patterns", {
	id: serial("id").primaryKey().notNull(),
	pattern_type: varchar("pattern_type", { length: 100 }).notNull(),
	pattern_data: jsonb("pattern_data").notNull(),
	frequency: integer("frequency").default(1),
	success_rate: numeric("success_rate", { precision: 5, scale:  2 }).default('0.0'),
	confidence: numeric("confidence", { precision: 5, scale:  2 }).default('0.0'),
	last_used: timestamp("last_used", { withTimezone: true, mode: 'string' }),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_scheduling_patterns_type: index("idx_scheduling_patterns_type").on(table.pattern_type),
	}
});

export const calendar_events = pgTable("calendar_events", {
	id: serial("id").primaryKey().notNull(),
	google_event_id: varchar("google_event_id", { length: 255 }).notNull(),
	calendar_id: varchar("calendar_id", { length: 255 }).default('primary'),
	summary: text("summary").notNull(),
	description: text("description"),
	start_datetime: timestamp("start_datetime", { withTimezone: true, mode: 'string' }).notNull(),
	end_datetime: timestamp("end_datetime", { withTimezone: true, mode: 'string' }).notNull(),
	timezone: varchar("timezone", { length: 100 }),
	location: text("location"),
	status: varchar("status", { length: 50 }).default('confirmed'),
	attendees: jsonb("attendees").default([]),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	last_synced: timestamp("last_synced", { withTimezone: true, mode: 'string' }).defaultNow(),
	event_timezone: varchar("event_timezone", { length: 100 }),
},
(table) => {
	return {
		idx_calendar_events_datetime: index("idx_calendar_events_datetime").on(table.start_datetime, table.end_datetime),
		idx_calendar_events_google_id: index("idx_calendar_events_google_id").on(table.google_event_id),
		calendar_events_google_event_id_key: unique("calendar_events_google_event_id_key").on(table.google_event_id),
	}
});

export const meeting_responses = pgTable("meeting_responses", {
	id: serial("id").primaryKey().notNull(),
	meeting_request_id: integer("meeting_request_id").references(() => meeting_requests.id),
	response_type: varchar("response_type", { length: 50 }).notNull(),
	suggested_times: jsonb("suggested_times"),
	response_body: text("response_body").notNull(),
	calendar_event_id: integer("calendar_event_id").references(() => calendar_events.id),
	confidence: numeric("confidence", { precision: 5, scale:  2 }).default('0.0'),
	context_used: jsonb("context_used").default([]),
	generated_at: timestamp("generated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const availability_cache = pgTable("availability_cache", {
	id: serial("id").primaryKey().notNull(),
	date_key: date("date_key").notNull(),
	calendar_id: varchar("calendar_id", { length: 255 }).default('primary'),
	availability_data: jsonb("availability_data").notNull(),
	last_updated: timestamp("last_updated", { withTimezone: true, mode: 'string' }).defaultNow(),
	expires_at: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
},
(table) => {
	return {
		idx_availability_cache_date: index("idx_availability_cache_date").on(table.date_key, table.calendar_id),
		availability_cache_date_key_calendar_id_key: unique("availability_cache_date_key_calendar_id_key").on(table.date_key, table.calendar_id),
	}
});

export const calendar_feedback = pgTable("calendar_feedback", {
	id: serial("id").primaryKey().notNull(),
	meeting_response_id: integer("meeting_response_id").references(() => meeting_responses.id),
	feedback_type: varchar("feedback_type", { length: 100 }).notNull(),
	original_data: jsonb("original_data").notNull(),
	modified_data: jsonb("modified_data").notNull(),
	edit_percentage: numeric("edit_percentage", { precision: 5, scale:  2 }).default('0.0'),
	user_satisfaction: integer("user_satisfaction"),
	learning_insight: text("learning_insight"),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_calendar_feedback_type: index("idx_calendar_feedback_type").on(table.feedback_type),
	}
});

export const user_gmail_tokens = pgTable("user_gmail_tokens", {
	user_id: varchar("user_id", { length: 255 }).primaryKey().notNull(),
	gmail_address: varchar("gmail_address", { length: 255 }).notNull(),
	refresh_token_encrypted: text("refresh_token_encrypted").notNull(),
	access_token_encrypted: text("access_token_encrypted"),
	access_token_expires_at: timestamp("access_token_expires_at", { mode: 'string' }),
	webhook_active: boolean("webhook_active").default(true),
	created_at: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	webhook_expires_at: timestamp("webhook_expires_at", { mode: 'string' }),
	first_name: varchar("first_name", { length: 100 }),
	last_name: varchar("last_name", { length: 100 }),
	full_name: varchar("full_name", { length: 200 }),
	onboarding_completed: boolean("onboarding_completed").default(false),
	scheduling_link: varchar("scheduling_link", { length: 500 }),
	scheduling_link_verified: boolean("scheduling_link_verified").default(false),
	scheduling_link_added_at: timestamp("scheduling_link_added_at", { mode: 'string' }),
	timezone: varchar("timezone", { length: 100 }).default('America/Los_Angeles'),
	timezone_updated_at: timestamp("timezone_updated_at", { mode: 'string' }).defaultNow(),
	timezone_source: varchar("timezone_source", { length: 50 }).default('google_calendar'),
},
(table) => {
	return {
		idx_user_gmail_tokens_gmail_address: index("idx_user_gmail_tokens_gmail_address").on(table.gmail_address),
		idx_user_gmail_tokens_webhook_active: index("idx_user_gmail_tokens_webhook_active").on(table.webhook_active),
		idx_user_gmail_tokens_onboarding_completed: index("idx_user_gmail_tokens_onboarding_completed").on(table.onboarding_completed),
		idx_user_gmail_tokens_scheduling_link: index("idx_user_gmail_tokens_scheduling_link").on(table.scheduling_link),
		idx_user_gmail_tokens_timezone: index("idx_user_gmail_tokens_timezone").on(table.timezone),
		user_gmail_tokens_gmail_address_key: unique("user_gmail_tokens_gmail_address_key").on(table.gmail_address),
	}
});

export const scheduling_workflows = pgTable("scheduling_workflows", {
	id: serial("id").primaryKey().notNull(),
	meeting_request_id: integer("meeting_request_id"),
	workflow_type: varchar("workflow_type", { length: 50 }).notNull(),
	current_step: varchar("current_step", { length: 100 }).notNull(),
	total_steps: integer("total_steps").default(1),
	step_number: integer("step_number").default(1),
	status: varchar("status", { length: 50 }).default('active'),
	context: jsonb("context"),
	next_action_time: timestamp("next_action_time", { withTimezone: true, mode: 'string' }),
	retry_count: integer("retry_count").default(0),
	max_retries: integer("max_retries").default(3),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_scheduling_workflows_meeting_request: index("idx_scheduling_workflows_meeting_request").on(table.meeting_request_id),
		idx_scheduling_workflows_status: index("idx_scheduling_workflows_status").on(table.status),
		idx_scheduling_workflows_next_action: index("idx_scheduling_workflows_next_action").on(table.next_action_time),
	}
});

export const active_webhook_users = pgTable("active_webhook_users", {
	user_id: varchar("user_id", { length: 255 }),
	gmail_address: varchar("gmail_address", { length: 255 }),
	refresh_token_encrypted: text("refresh_token_encrypted"),
	access_token_encrypted: text("access_token_encrypted"),
	access_token_expires_at: timestamp("access_token_expires_at", { mode: 'string' }),
	created_at: timestamp("created_at", { mode: 'string' }),
	updated_at: timestamp("updated_at", { mode: 'string' }),
});

export const available_time_slots = pgTable("available_time_slots", {
	date: timestamp("date", { mode: 'string' }),
	availability_status: text("availability_status"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	meeting_count: bigint("meeting_count", { mode: "number" }),
	// JSONB array - Drizzle introspection couldn't parse jsonb[], using jsonb().array()
	existing_meetings: jsonb("existing_meetings").array(),
});

export const meeting_patterns_analysis = pgTable("meeting_patterns_analysis", {
	pattern_type: varchar("pattern_type", { length: 100 }),
	frequency: integer("frequency"),
	success_rate: numeric("success_rate", { precision: 5, scale:  2 }),
	confidence: numeric("confidence", { precision: 5, scale:  2 }),
	pattern_data: jsonb("pattern_data"),
	recommendation_level: text("recommendation_level"),
	last_used: timestamp("last_used", { withTimezone: true, mode: 'string' }),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }),
});

export const auto_generated_drafts = pgTable("auto_generated_drafts", {
	id: serial("id").primaryKey().notNull(),
	draft_id: varchar("draft_id", { length: 50 }).notNull(),
	original_email_id: integer("original_email_id").references(() => emails.id, { onDelete: "cascade" } ),
	subject: text("subject").notNull(),
	body: text("body").notNull(),
	tone: varchar("tone", { length: 20 }),
	urgency_level: varchar("urgency_level", { length: 10 }),
	context_used: jsonb("context_used"),
	relationship_type: varchar("relationship_type", { length: 20 }),
	status: varchar("status", { length: 20 }).default('pending'),
	created_at: timestamp("created_at", { mode: 'string' }).defaultNow(),
	reviewed_at: timestamp("reviewed_at", { mode: 'string' }),
	sent_at: timestamp("sent_at", { mode: 'string' }),
	user_edited: boolean("user_edited").default(false),
	edit_count: integer("edit_count").default(0),
	processing_time_ms: integer("processing_time_ms"),
	user_id: varchar("user_id", { length: 255 }),
	approved_at: timestamp("approved_at", { mode: 'string' }),
},
(table) => {
	return {
		idx_auto_drafts_status: index("idx_auto_drafts_status").on(table.status),
		idx_auto_drafts_created: index("idx_auto_drafts_created").on(table.created_at),
		idx_auto_drafts_original_email: index("idx_auto_drafts_original_email").on(table.original_email_id),
		idx_auto_generated_drafts_user_id: index("idx_auto_generated_drafts_user_id").on(table.user_id),
		idx_auto_generated_drafts_status: index("idx_auto_generated_drafts_status").on(table.status),
		auto_generated_drafts_draft_id_key: unique("auto_generated_drafts_draft_id_key").on(table.draft_id),
	}
});

export const validated_learning_insights_with_stability = pgTable("validated_learning_insights_with_stability", {
	id: integer("id"),
	pattern_type: varchar("pattern_type", { length: 50 }),
	pattern_value: varchar("pattern_value", { length: 100 }),
	frequency: integer("frequency"),
	success_rate: numeric("success_rate", { precision: 5, scale:  2 }),
	recommendation: text("recommendation"),
	confidence: integer("confidence"),
	sample_size: integer("sample_size"),
	time_span_days: integer("time_span_days"),
	threshold_met: boolean("threshold_met"),
	stability_score: numeric("stability_score", { precision: 5, scale:  3 }),
	pattern_variance: numeric("pattern_variance", { precision: 8, scale:  3 }),
	stability_validated: boolean("stability_validated"),
	pattern_drift_detected: boolean("pattern_drift_detected"),
	validation_status: text("validation_status"),
	created_at: timestamp("created_at", { mode: 'string' }),
	last_updated: timestamp("last_updated", { mode: 'string' }),
});

export const user_learning_insights = pgTable("user_learning_insights", {
	user_id: varchar("user_id", { length: 255 }),
	pattern_type: varchar("pattern_type", { length: 50 }),
	pattern_value: varchar("pattern_value", { length: 100 }),
	frequency: integer("frequency"),
	success_rate: numeric("success_rate", { precision: 5, scale:  2 }),
	recommendation: text("recommendation"),
	confidence: integer("confidence"),
	last_updated: timestamp("last_updated", { mode: 'string' }),
	created_at: timestamp("created_at", { mode: 'string' }),
});

export const meeting_processing_results = pgTable("meeting_processing_results", {
	id: serial("id").primaryKey().notNull(),
	email_db_id: integer("email_db_id").notNull().references(() => emails.id, { onDelete: "cascade" } ),
	gmail_id: varchar("gmail_id", { length: 100 }).notNull(),
	user_id: varchar("user_id", { length: 100 }).notNull(),
	is_meeting_request: boolean("is_meeting_request").notNull(),
	confidence: integer("confidence").default(0),
	processing_time_ms: integer("processing_time_ms").default(0),
	status: varchar("status", { length: 20 }).default('processed').notNull(),
	reason: text("reason"),
	processed_at: timestamp("processed_at", { withTimezone: true, mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_meeting_processing_email_db: index("idx_meeting_processing_email_db").on(table.email_db_id),
		idx_meeting_processing_gmail: index("idx_meeting_processing_gmail").on(table.gmail_id),
		idx_meeting_processing_user: index("idx_meeting_processing_user").on(table.user_id),
		idx_meeting_processing_status: index("idx_meeting_processing_status").on(table.is_meeting_request, table.status),
		idx_meeting_processing_time: index("idx_meeting_processing_time").on(table.processed_at),
		idx_meeting_processing_results_user_id: index("idx_meeting_processing_results_user_id").on(table.user_id),
		meeting_processing_results_email_db_id_user_id_key: unique("meeting_processing_results_email_db_id_user_id_key").on(table.email_db_id, table.user_id),
	}
});

export const meeting_pipeline_analytics = pgTable("meeting_pipeline_analytics", {
	user_id: varchar("user_id", { length: 100 }),
	processing_date: date("processing_date"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	emails_processed: bigint("emails_processed", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	meetings_detected: bigint("meetings_detected", { mode: "number" }),
	detection_rate: numeric("detection_rate"),
	avg_processing_time: numeric("avg_processing_time"),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	error_count: bigint("error_count", { mode: "number" }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	skipped_count: bigint("skipped_count", { mode: "number" }),
});

export const meeting_confirmations = pgTable("meeting_confirmations", {
	id: varchar("id", { length: 255 }).primaryKey().notNull(),
	draft_id: varchar("draft_id", { length: 255 }).notNull(),
	meeting_request_id: integer("meeting_request_id").notNull().references(() => meeting_requests.id),
	user_id: varchar("user_id", { length: 255 }).notNull(),
	selected_time_slot: jsonb("selected_time_slot"),
	status: varchar("status", { length: 50 }).default('pending'),
	calendar_event_id: varchar("calendar_event_id", { length: 255 }),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	confirmed_at: timestamp("confirmed_at", { withTimezone: true, mode: 'string' }),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_meeting_confirmations_user_id: index("idx_meeting_confirmations_user_id").on(table.user_id),
		idx_meeting_confirmations_status: index("idx_meeting_confirmations_status").on(table.status),
		idx_meeting_confirmations_meeting_request_id: index("idx_meeting_confirmations_meeting_request_id").on(table.meeting_request_id),
		idx_meeting_confirmations_draft_id: index("idx_meeting_confirmations_draft_id").on(table.draft_id),
		idx_meeting_confirmations_user_status: index("idx_meeting_confirmations_user_status").on(table.user_id, table.status),
	}
});

export const pending_meeting_confirmations = pgTable("pending_meeting_confirmations", {
	id: varchar("id", { length: 255 }),
	draft_id: varchar("draft_id", { length: 255 }),
	meeting_request_id: integer("meeting_request_id"),
	user_id: varchar("user_id", { length: 255 }),
	selected_time_slot: jsonb("selected_time_slot"),
	status: varchar("status", { length: 50 }),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	subject: text("subject"),
	sender_email: varchar("sender_email", { length: 255 }),
	preferred_dates: jsonb("preferred_dates"),
	requested_duration: integer("requested_duration"),
	location_preference: text("location_preference"),
	special_requirements: text("special_requirements"),
});

export const learning_feedback = pgTable("learning_feedback", {
	id: serial("id").primaryKey().notNull(),
	response_id: varchar("response_id", { length: 255 }),
	feedback_type: varchar("feedback_type", { length: 100 }),
	original_text: text("original_text"),
	edited_text: text("edited_text"),
	improvement_score: integer("improvement_score"),
	feedback_notes: text("feedback_notes"),
	user_id: varchar("user_id", { length: 255 }),
	created_at: timestamp("created_at", { mode: 'string' }).defaultNow(),
},
(table) => {
	return {
		idx_learning_feedback_response: index("idx_learning_feedback_response").on(table.response_id),
	}
});

export const drafts = pgTable("drafts", {
	id: serial("id").primaryKey().notNull(),
	email_id: integer("email_id").references(() => emails.id, { onDelete: "cascade" } ),
	subject: text("subject").notNull(),
	body: text("body").notNull(),
	category: varchar("category", { length: 50 }).notNull(),
	confidence_score: integer("confidence_score").default(70),
	quality_score: integer("quality_score").default(70),
	status: varchar("status", { length: 20 }).default('pending'),
	created_at: timestamp("created_at", { mode: 'string' }).defaultNow(),
	approved_at: timestamp("approved_at", { mode: 'string' }),
	sent_at: timestamp("sent_at", { mode: 'string' }),
	type: varchar("type", { length: 50 }).default('regular'),
	meeting_context: jsonb("meeting_context"),
},
(table) => {
	return {
		idx_drafts_email_id: index("idx_drafts_email_id").on(table.email_id),
		idx_drafts_status: index("idx_drafts_status").on(table.status),
		idx_drafts_created_at: index("idx_drafts_created_at").on(table.created_at),
		idx_drafts_type: index("idx_drafts_type").on(table.type),
		idx_drafts_status_type: index("idx_drafts_status_type").on(table.status, table.type),
	}
});

export const timezone_change_log = pgTable("timezone_change_log", {
	id: serial("id").primaryKey().notNull(),
	user_id: varchar("user_id", { length: 255 }).notNull(),
	old_timezone: varchar("old_timezone", { length: 100 }),
	new_timezone: varchar("new_timezone", { length: 100 }).notNull(),
	source: varchar("source", { length: 50 }).notNull(),
	changed_at: timestamp("changed_at", { mode: 'string' }).defaultNow(),
	changed_by: varchar("changed_by", { length: 50 }).default('system'),
},
(table) => {
	return {
		idx_timezone_change_log_user_id: index("idx_timezone_change_log_user_id").on(table.user_id),
		idx_timezone_change_log_changed_at: index("idx_timezone_change_log_changed_at").on(table.changed_at),
	}
});

export const meeting_requests = pgTable("meeting_requests", {
	id: serial("id").primaryKey().notNull(),
	email_id: integer("email_id").references(() => emails.id),
	sender_email: varchar("sender_email", { length: 255 }).notNull(),
	subject: text("subject"),
	meeting_type: varchar("meeting_type", { length: 100 }),
	requested_duration: integer("requested_duration"),
	preferred_dates: jsonb("preferred_dates"),
	attendees: jsonb("attendees").default([]),
	location_preference: text("location_preference"),
	special_requirements: text("special_requirements"),
	urgency_level: varchar("urgency_level", { length: 20 }).default('medium'),
	detection_confidence: numeric("detection_confidence", { precision: 5, scale:  2 }).default('0.0'),
	status: varchar("status", { length: 50 }).default('pending'),
	created_at: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	user_id: varchar("user_id", { length: 100 }).default('default_user').notNull(),
	requester_timezone: varchar("requester_timezone", { length: 100 }),
	preferred_timezone: varchar("preferred_timezone", { length: 100 }),
},
(table) => {
	return {
		idx_meeting_requests_email: index("idx_meeting_requests_email").on(table.email_id),
		idx_meeting_requests_sender: index("idx_meeting_requests_sender").on(table.sender_email),
		idx_meeting_requests_status: index("idx_meeting_requests_status").on(table.status),
		idx_meeting_requests_user: index("idx_meeting_requests_user").on(table.user_id),
		idx_meeting_requests_user_status: index("idx_meeting_requests_user_status").on(table.status, table.user_id),
		idx_meeting_requests_user_id: index("idx_meeting_requests_user_id").on(table.user_id),
		meeting_requests_email_user_unique: unique("meeting_requests_email_user_unique").on(table.email_id, table.user_id),
		meeting_requests_email_id_user_id_key: unique("meeting_requests_email_id_user_id_key").on(table.email_id, table.user_id),
	}
});

export const meeting_pipeline_detailed = pgTable("meeting_pipeline_detailed", {
	id: integer("id"),
	gmail_id: varchar("gmail_id", { length: 100 }),
	user_id: varchar("user_id", { length: 100 }),
	is_meeting_request: boolean("is_meeting_request"),
	confidence: integer("confidence"),
	processing_time_ms: integer("processing_time_ms"),
	status: varchar("status", { length: 20 }),
	reason: text("reason"),
	processed_at: timestamp("processed_at", { withTimezone: true, mode: 'string' }),
	subject: text("subject"),
	from_email: text("from_email"),
	received_at: timestamp("received_at", { mode: 'string' }),
	meeting_type: varchar("meeting_type", { length: 100 }),
	urgency_level: varchar("urgency_level", { length: 20 }),
	requested_duration: integer("requested_duration"),
	meeting_status: varchar("meeting_status", { length: 50 }),
});