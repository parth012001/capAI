import { relations } from "drizzle-orm/relations";
import { user_gmail_tokens, user_profiles, emails, extracted_entities, email_threads, sender_profiles, communication_patterns, meeting_requests, meeting_responses, calendar_events, calendar_feedback, auto_generated_drafts, meeting_processing_results, meeting_confirmations, drafts } from "./schema";

export const user_profilesRelations = relations(user_profiles, ({one}) => ({
	user_gmail_token: one(user_gmail_tokens, {
		fields: [user_profiles.user_id],
		references: [user_gmail_tokens.user_id]
	}),
}));

export const user_gmail_tokensRelations = relations(user_gmail_tokens, ({many}) => ({
	user_profiles: many(user_profiles),
}));

export const extracted_entitiesRelations = relations(extracted_entities, ({one}) => ({
	email: one(emails, {
		fields: [extracted_entities.email_id],
		references: [emails.id]
	}),
	email_thread: one(email_threads, {
		fields: [extracted_entities.thread_id],
		references: [email_threads.thread_id]
	}),
}));

export const emailsRelations = relations(emails, ({one, many}) => ({
	extracted_entities: many(extracted_entities),
	email_thread: one(email_threads, {
		fields: [emails.thread_context_id],
		references: [email_threads.id]
	}),
	sender_profile: one(sender_profiles, {
		fields: [emails.sender_profile_id],
		references: [sender_profiles.id]
	}),
	auto_generated_drafts: many(auto_generated_drafts),
	meeting_processing_results: many(meeting_processing_results),
	drafts: many(drafts),
	meeting_requests: many(meeting_requests),
}));

export const email_threadsRelations = relations(email_threads, ({many}) => ({
	extracted_entities: many(extracted_entities),
	emails: many(emails),
}));

export const communication_patternsRelations = relations(communication_patterns, ({one}) => ({
	sender_profile: one(sender_profiles, {
		fields: [communication_patterns.sender_email],
		references: [sender_profiles.email_address]
	}),
}));

export const sender_profilesRelations = relations(sender_profiles, ({many}) => ({
	communication_patterns: many(communication_patterns),
	emails: many(emails),
}));

export const meeting_responsesRelations = relations(meeting_responses, ({one, many}) => ({
	meeting_request: one(meeting_requests, {
		fields: [meeting_responses.meeting_request_id],
		references: [meeting_requests.id]
	}),
	calendar_event: one(calendar_events, {
		fields: [meeting_responses.calendar_event_id],
		references: [calendar_events.id]
	}),
	calendar_feedbacks: many(calendar_feedback),
}));

export const meeting_requestsRelations = relations(meeting_requests, ({one, many}) => ({
	meeting_responses: many(meeting_responses),
	meeting_confirmations: many(meeting_confirmations),
	email: one(emails, {
		fields: [meeting_requests.email_id],
		references: [emails.id]
	}),
}));

export const calendar_eventsRelations = relations(calendar_events, ({many}) => ({
	meeting_responses: many(meeting_responses),
}));

export const calendar_feedbackRelations = relations(calendar_feedback, ({one}) => ({
	meeting_response: one(meeting_responses, {
		fields: [calendar_feedback.meeting_response_id],
		references: [meeting_responses.id]
	}),
}));

export const auto_generated_draftsRelations = relations(auto_generated_drafts, ({one}) => ({
	email: one(emails, {
		fields: [auto_generated_drafts.original_email_id],
		references: [emails.id]
	}),
}));

export const meeting_processing_resultsRelations = relations(meeting_processing_results, ({one}) => ({
	email: one(emails, {
		fields: [meeting_processing_results.email_db_id],
		references: [emails.id]
	}),
}));

export const meeting_confirmationsRelations = relations(meeting_confirmations, ({one}) => ({
	meeting_request: one(meeting_requests, {
		fields: [meeting_confirmations.meeting_request_id],
		references: [meeting_requests.id]
	}),
}));

export const draftsRelations = relations(drafts, ({one}) => ({
	email: one(emails, {
		fields: [drafts.email_id],
		references: [emails.id]
	}),
}));