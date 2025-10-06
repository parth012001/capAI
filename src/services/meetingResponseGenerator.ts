import { ParsedEmail } from '../types';
import { MeetingRequest } from './meetingDetection';
import { CalendarService, AvailabilityCheck } from './calendar';
import { GmailService } from './gmail';
import { SmartAvailabilityService } from './smartAvailability';
import { pool } from '../database/connection';
import { safeParseDate, safeParseDateWithValidation } from '../utils/dateParser';
import { UserProfileService } from './userProfile';
import { MeetingAIContentService, AIContentRequest } from './meetingAIContent';
import { AIService } from './ai';
import { TimezoneService } from './timezone';

export interface MeetingTimeSlot {
  start: string;
  end: string;
  formatted: string;
  confidence: number;
  reason?: string;
}

export interface MeetingResponseContext {
  senderRelationship: 'stranger' | 'new_contact' | 'known_contact';
  isAvailable: boolean;
  suggestedTimes?: MeetingTimeSlot[];
  userTone: 'professional' | 'casual' | 'friendly';
  meetingType: string;
  urgencyLevel: string;
}

export interface MeetingResponse {
  shouldRespond: boolean;
  responseText: string;
  actionTaken: 'accepted' | 'declined' | 'suggested_alternatives' | 'requested_more_info' | 'suggested_scheduling_link_conflict' | 'suggested_scheduling_link_vague';
  calendarEventCreated?: boolean;
  calendarEventId?: string | null;
  confidenceScore: number;
  bookingDetails?: {
    autoBooked: boolean;
    eventId: string | null;
    eventStatus: 'tentative' | 'confirmed' | 'not_created' | 'pending_user_approval';
    timeSlot: string;
    duration: number;
    attendeeEmail: string;
  };
}

export class MeetingResponseGeneratorService {
  private calendarService: CalendarService;
  private gmailService: GmailService;
  private smartAvailabilityService: SmartAvailabilityService;
  private userProfileService: UserProfileService;
  private aiContentService: MeetingAIContentService;
  private aiService: AIService;

  constructor() {
    this.calendarService = new CalendarService();
    this.gmailService = new GmailService();
    this.smartAvailabilityService = new SmartAvailabilityService(this.calendarService);
    this.userProfileService = new UserProfileService(pool);
    this.aiService = new AIService();
    this.aiContentService = new MeetingAIContentService(this.aiService);
  }

  /**
   * Generate an intelligent response to a meeting request
   */
  async generateMeetingResponse(
    email: ParsedEmail,
    meetingRequest: MeetingRequest,
    userId: string,
    testMode: boolean = false
  ): Promise<MeetingResponse> {
    try {
      console.log(`🤖 [RESPONSE GENERATOR] Generating response for meeting: ${meetingRequest.subject}`);

      if (testMode) {
        // Simulate response generation in test mode without requiring OAuth
        return this.generateMockResponse(email, meetingRequest, userId);
      }

      // Initialize services for the user
      await this.initializeServicesForUser(userId);

      // Build response context
      const context = await this.buildResponseContext(email, meetingRequest, userId);
      console.log(`📊 Response context: ${context.senderRelationship} relationship, ${context.isAvailable ? 'available' : 'conflicts found'}`);

      // Generate appropriate response
      const response = await this.generateResponse(email, meetingRequest, context, userId);
      
      console.log(`✅ [RESPONSE GENERATOR] Response generated: ${response.actionTaken} (confidence: ${response.confidenceScore}%)`);
      return response;

    } catch (error) {
      console.error('❌ [RESPONSE GENERATOR] Error generating response:', error);
      return {
        shouldRespond: false,
        responseText: '',
        actionTaken: 'requested_more_info',
        confidenceScore: 0
      };
    }
  }

  /**
   * Generate mock response for testing without OAuth tokens
   */
  private async generateMockResponse(
    email: ParsedEmail,
    meetingRequest: MeetingRequest,
    userId: string
  ): Promise<MeetingResponse> {
    console.log(`🎭 [TEST MODE] Generating mock response for: ${meetingRequest.subject}`);
    
    // Simulate different response types based on meeting content
    const emailBody = email.body.toLowerCase();
    const hasSpecificTime = /\d{1,2}:\d{2}|\d{1,2}\s*(am|pm)/.test(emailBody);
    const isUrgent = meetingRequest.urgencyLevel === 'high' || emailBody.includes('urgent');
    const isFlexible = emailBody.includes('flexible') || emailBody.includes('when are you free');
    
    let actionTaken: 'accepted' | 'declined' | 'suggested_alternatives' | 'requested_more_info';
    let responseText: string;
    let confidenceScore: number;
    let shouldRespond = true;

    if (hasSpecificTime && !isUrgent) {
      // Accept meetings with specific times (simulate availability)
      actionTaken = 'accepted';
      confidenceScore = 90;
      responseText = `Hello,

That sounds great! I'm available at the time you suggested and look forward to our meeting.

Please let me know if you need me to send a calendar invite or if there are any location details to discuss.

Looking forward to speaking with you!`;
      
    } else if (hasSpecificTime && isUrgent) {
      // Suggest alternatives for urgent meetings with conflicts
      actionTaken = 'suggested_alternatives';
      confidenceScore = 85;
      responseText = `Hello,

Unfortunately, I have a conflict at the time you suggested. However, I'd be happy to meet at one of these alternative times:

1. Tomorrow at 10:00 AM EST
2. Tomorrow at 3:00 PM EST  
3. Friday at 2:00 PM EST

Please let me know which option works best for you.

Looking forward to speaking with you!`;
      
    } else if (isFlexible) {
      // Request more info for flexible meetings
      actionTaken = 'requested_more_info';
      confidenceScore = 80;
      responseText = `Hello,

I'd be happy to meet with you to discuss potential collaboration opportunities.

Could you please provide a few preferred time options? I'm generally available during business hours and can accommodate meetings of 45 minutes.

Looking forward to speaking with you!`;
      
    } else {
      // Default response for unclear meetings
      actionTaken = 'requested_more_info';
      confidenceScore = 75;
      responseText = `Hello,

I'd be happy to meet with you to discuss our meeting.

Could you please provide a few preferred time options? I'm generally available during business hours and can accommodate meetings of ${meetingRequest.requestedDuration || 60} minutes.

Looking forward to speaking with you!`;
    }

    const response: MeetingResponse = {
      shouldRespond,
      responseText,
      actionTaken,
      calendarEventCreated: actionTaken === 'accepted',
      confidenceScore
    };

    console.log(`🎭 [TEST MODE] Mock response: ${actionTaken} (confidence: ${confidenceScore}%)`);
    return response;
  }

  /**
   * Build comprehensive context for response generation
   */
  private async buildResponseContext(
    email: ParsedEmail,
    meetingRequest: MeetingRequest,
    userId: string
  ): Promise<MeetingResponseContext> {
    try {
      // Get sender relationship context
      const senderHistory = await this.gmailService.getSenderRelationshipHistory(meetingRequest.senderEmail);
      
      // Get user communication tone from database
      const userTone = await this.getUserCommunicationTone(userId);
      
      // Check calendar availability first, then generate alternatives only if needed
      let isAvailable = false;
      let suggestedTimes: MeetingTimeSlot[] = [];

      const duration = meetingRequest.requestedDuration || 60;
      const preferredDate = meetingRequest.preferredDates?.[0];

      // CRITICAL: Check availability using USER'S timezone, not server's timezone!
      if (preferredDate) {
        try {
          // Get user's timezone from calendar service (already initialized)
          const userTimezone = this.calendarService.getUserTimezone();
          console.log(`🌍 [TIMEZONE] User timezone for availability check: ${userTimezone}`);

          // Parse date in USER'S timezone (THE FIX!)
          const timezoneAwareDate = TimezoneService.parseDateInUserTimezone(
            preferredDate,
            userTimezone
          );

          if (!timezoneAwareDate || !timezoneAwareDate.utcDate) {
            console.warn(`⚠️ [TIMEZONE] Could not parse date "${preferredDate}" in timezone ${userTimezone}`);
            isAvailable = false;
          } else {
            console.log(`📅 [TIMEZONE] Parsed "${preferredDate}" in ${userTimezone}:`);
            console.log(`   → UTC: ${timezoneAwareDate.utcDate.toISOString()}`);
            console.log(`   → Local: ${timezoneAwareDate.formatted}`);

            const endTime = new Date(timezoneAwareDate.utcDate.getTime() + (duration * 60 * 1000));

            // Check availability with timezone-aware dates
            const availability = await this.calendarService.checkAvailability(
              timezoneAwareDate.utcDate.toISOString(),
              endTime.toISOString()
            );
            isAvailable = availability.isAvailable;
            console.log(`📅 Availability check: ${isAvailable ? '✅ Available' : '❌ Conflict found'} for ${preferredDate} (${userTimezone})`);
          }
        } catch (availabilityError) {
          console.error('❌ Error checking availability:', availabilityError);
          isAvailable = false; // Treat availability check errors as unavailable
        }
      }

      // Don't generate alternative time suggestions in context - let response generator handle it
      // This prevents conflicts from being routed to alternative times instead of Calendly link
      console.log(`📅 Context building: ${!isAvailable && preferredDate ? 'Conflict detected' : 'Available or no specific time'} - delegating to response generator`);
      suggestedTimes = []; // Always empty - response generator will handle alternatives if needed

      return {
        senderRelationship: senderHistory.classification,
        isAvailable,
        suggestedTimes,
        userTone,
        meetingType: meetingRequest.meetingType,
        urgencyLevel: meetingRequest.urgencyLevel
      };

    } catch (error) {
      console.error('❌ Error building response context:', error);
      // Return default context on error
      return {
        senderRelationship: 'new_contact',
        isAvailable: false,
        userTone: 'professional',
        meetingType: meetingRequest.meetingType,
        urgencyLevel: meetingRequest.urgencyLevel
      };
    }
  }

  /**
   * Generate appropriate response based on context
   */
  private async generateResponse(
    email: ParsedEmail,
    meetingRequest: MeetingRequest,
    context: MeetingResponseContext,
    userId: string
  ): Promise<MeetingResponse> {
    try {
      console.log(`🔍 [RESPONSE DEBUG] context.isAvailable: ${context.isAvailable}`);
      console.log(`🔍 [RESPONSE DEBUG] meetingRequest.preferredDates: ${JSON.stringify(meetingRequest.preferredDates)}`);
      console.log(`🔍 [RESPONSE DEBUG] context.suggestedTimes: ${JSON.stringify(context.suggestedTimes)}`);

      // Check for specific times first
      if (context.isAvailable && meetingRequest.preferredDates && meetingRequest.preferredDates.length > 0) {
        console.log(`🔍 [RESPONSE DEBUG] Taking path: generateAcceptanceResponse`);
        // Accept the meeting with specific time
        return await this.generateAcceptanceResponse(email, meetingRequest, context, userId);
      } else if (!context.isAvailable && meetingRequest.preferredDates && meetingRequest.preferredDates.length > 0) {
        console.log(`🔍 [RESPONSE DEBUG] Taking path: generateConflictResponse (CALENDLY for conflicts)`);
        // Conflict with specific time - use scheduling link instead of alternatives
        return await this.generateConflictResponse(email, meetingRequest, context, userId);
      } else if (!meetingRequest.preferredDates || meetingRequest.preferredDates.length === 0) {
        console.log(`🔍 [RESPONSE DEBUG] Taking path: generateVagueTimeResponse (CALENDLY for vague)`);
        // No specific time mentioned - check for scheduling link
        return await this.generateVagueTimeResponse(email, meetingRequest, context, userId);
      } else {
        console.log(`🔍 [RESPONSE DEBUG] Taking path: generateMoreInfoResponse (fallback)`);
        // Request more information as final fallback
        return await this.generateMoreInfoResponse(email, meetingRequest, context);
      }
    } catch (error) {
      console.error('❌ Error generating response:', error);
      return {
        shouldRespond: false,
        responseText: '',
        actionTaken: 'requested_more_info',
        confidenceScore: 0
      };
    }
  }

  /**
   * Generate acceptance response and create calendar event
   */
  private async generateAcceptanceResponse(
    email: ParsedEmail,
    meetingRequest: MeetingRequest,
    context: MeetingResponseContext,
    userId: string
  ): Promise<MeetingResponse> {
    try {
      const requestedTime = meetingRequest.preferredDates![0];
      const duration = meetingRequest.requestedDuration || 60;

      // CRITICAL: Parse date in USER'S timezone for meeting acceptance
      const userTimezone = this.calendarService.getUserTimezone();
      console.log(`🌍 [TIMEZONE] Accepting meeting in user timezone: ${userTimezone}`);

      const timezoneAwareDate = TimezoneService.parseDateInUserTimezone(
        requestedTime,
        userTimezone
      );

      if (!timezoneAwareDate || !timezoneAwareDate.utcDate) {
        throw new Error(`Cannot accept meeting - could not parse date "${requestedTime}" in timezone ${userTimezone}`);
      }

      console.log(`📅 [TIMEZONE] Accepting meeting for: ${timezoneAwareDate.formatted}`);

      const requestedDate = timezoneAwareDate.utcDate;
      const endTime = new Date(requestedDate.getTime() + (duration * 60 * 1000));

      // Format time for response (uses user's timezone)
      const timeFormatted = timezoneAwareDate.formatted;
      
      // Generate personalized response text (no calendar booking yet - user approval required)
      let responseText = await this.generateAcceptanceText(meetingRequest, context, timeFormatted, false, email);

      // PHASE 1C: NO AUTO-BOOKING - Calendar event will be created only on user approval
      let calendarEventId: string | null = null;
      let calendarEventCreated = false;

      console.log(`⏸️ [NO AUTO-BOOKING] Draft-first approach: calendar event will be created on user approval`);
      console.log(`📝 [NO AUTO-BOOKING] Meeting proposal for: ${timeFormatted} with ${meetingRequest.senderEmail}`);
      console.log(`⏳ [NO AUTO-BOOKING] Awaiting user approval to proceed with booking`);

      // Response text remains the same (no calendar event created yet)
      // The frontend will handle calendar booking after user approves the draft

      return {
        shouldRespond: true,
        responseText,
        actionTaken: 'accepted',
        calendarEventCreated,
        calendarEventId,
        confidenceScore: 95,
        // PHASE 1C: Updated booking details - no auto-booking, awaiting user approval
        bookingDetails: {
          autoBooked: false, // Always false in draft-first approach
          eventId: null, // No event created yet
          eventStatus: 'pending_user_approval', // NEW status indicating user approval needed
          timeSlot: timeFormatted,
          duration: duration,
          attendeeEmail: meetingRequest.senderEmail
        }
      };

    } catch (error) {
      console.error('❌ Error generating acceptance response:', error);
      throw error;
    }
  }

  /**
   * Generate alternative times response
   */
  private async generateAlternativeTimesResponse(
    email: ParsedEmail,
    meetingRequest: MeetingRequest,
    context: MeetingResponseContext
  ): Promise<MeetingResponse> {
    // Use AI-enhanced alternative times response
    const responseText = await this.generateAlternativeTimesResponseText(
      meetingRequest,
      context,
      email
    );

    return {
      shouldRespond: true,
      responseText,
      actionTaken: 'suggested_alternatives',
      calendarEventCreated: false,
      confidenceScore: 85
    };
  }

  /**
   * Generate response for scheduling conflicts (specific time unavailable)
   */
  private async generateConflictResponse(
    email: ParsedEmail,
    meetingRequest: MeetingRequest,
    context: MeetingResponseContext,
    userId: string
  ): Promise<MeetingResponse> {
    try {
      const userProfileService = this.userProfileService;
      const schedulingLink = await userProfileService.getSchedulingLink(userId);

      if (schedulingLink) {
        // User has scheduling link - use AI-enhanced response
        // CRITICAL: Parse date in USER'S timezone for conflict response
        const userTimezone = this.calendarService.getUserTimezone();
        const timezoneAwareDate = TimezoneService.parseDateInUserTimezone(
          meetingRequest.preferredDates![0],
          userTimezone
        );

        if (!timezoneAwareDate || !timezoneAwareDate.utcDate) {
          console.error(`❌ Cannot format time for conflict response - could not parse date in timezone ${userTimezone}`);
          // Fallback to more info request if we can't parse the date
          return await this.generateMoreInfoResponse(email, meetingRequest, context);
        }

        const timeFormatted = timezoneAwareDate.formatted;

        // Generate AI-enhanced conflict response with scheduling link
        const responseText = await this.generateConflictResponseText(
          meetingRequest,
          context,
          schedulingLink,
          timeFormatted,
          email
        );

        return {
          shouldRespond: true,
          responseText,
          actionTaken: 'suggested_scheduling_link_conflict',
          confidenceScore: 90,
          calendarEventCreated: false
        };
      } else {
        // No scheduling link - generate alternative time suggestions
        console.log(`⚠️ No scheduling link found, generating alternative times for conflict`);

        // Generate alternative times since we don't have scheduling link
        const duration = meetingRequest.requestedDuration || 60;
        const preferredDate = meetingRequest.preferredDates![0];

        try {
          console.log(`🔄 Generating alternative time suggestions due to conflict (no scheduling link)`);
          const smartSuggestions = await this.smartAvailabilityService.generateTimeSlotSuggestions(
            {
              duration: duration,
              preferredDate: preferredDate,
              maxSuggestions: 3,
              excludeWeekends: true
            },
            userId
          );

          // Convert smart suggestions to our format and add to context
          const suggestedTimes = smartSuggestions.map(slot => ({
            start: slot.start,
            end: slot.end,
            formatted: this.smartAvailabilityService.formatTimeSlot(slot),
            confidence: slot.confidence,
            reason: slot.reason
          }));

          console.log(`📅 Generated ${suggestedTimes.length} alternative time suggestions for conflict fallback`);

          // Update context with generated suggestions
          const updatedContext = { ...context, suggestedTimes };
          return await this.generateAlternativeTimesResponse(email, meetingRequest, updatedContext);

        } catch (error) {
          console.error('❌ Error generating alternative time suggestions for conflict:', error);
          // Fall back to more info request if we can't generate alternatives
          return await this.generateMoreInfoResponse(email, meetingRequest, context);
        }
      }
    } catch (error) {
      console.error('❌ Error generating conflict response:', error);
      // Fall back to more info request on error
      return await this.generateMoreInfoResponse(email, meetingRequest, context);
    }
  }

  /**
   * Generate response for vague time requests (e.g., "quick chat", "catch up")
   */
  private async generateVagueTimeResponse(
    email: ParsedEmail,
    meetingRequest: MeetingRequest,
    context: MeetingResponseContext,
    userId: string
  ): Promise<MeetingResponse> {
    console.log(`📅 [VAGUE TIME] Handling vague meeting request from ${meetingRequest.senderEmail}`);

    // Check if user has a scheduling link
    const schedulingLink = await this.userProfileService.getSchedulingLink(userId);

    if (schedulingLink) {
      console.log(`🔗 [SCHEDULING LINK] Found scheduling link for user, using link response`);
      const responseText = await this.generateSchedulingLinkText(meetingRequest, context, schedulingLink, email);
      return {
        shouldRespond: true,
        responseText,
        actionTaken: 'suggested_scheduling_link_vague',
        calendarEventCreated: false,
        confidenceScore: 90
      };
    } else {
      console.log(`⏰ [TIME REQUEST] No scheduling link, requesting specific times`);
      const responseText = this.generateTimeRequestText(meetingRequest, context);
      return {
        shouldRespond: true,
        responseText,
        actionTaken: 'requested_more_info',
        calendarEventCreated: false,
        confidenceScore: 85
      };
    }
  }

  /**
   * Generate more info request response
   */
  private async generateMoreInfoResponse(
    email: ParsedEmail,
    meetingRequest: MeetingRequest,
    context: MeetingResponseContext
  ): Promise<MeetingResponse> {
    const responseText = this.generateMoreInfoText(meetingRequest, context);

    return {
      shouldRespond: true,
      responseText,
      actionTaken: 'requested_more_info',
      calendarEventCreated: false,
      confidenceScore: 75
    };
  }

  /**
   * Generate alternative time slots
   */
  private async generateAlternativeTimes(
    originalTime: string,
    duration: number
  ): Promise<MeetingTimeSlot[]> {
    try {
      // Robust date parsing for alternative time generation
      const dateParseResult = safeParseDateWithValidation(originalTime);
      if (!dateParseResult.isValid || !dateParseResult.date) {
        console.warn(`⚠️ Cannot generate alternatives for invalid date: "${originalTime}" - ${dateParseResult.errorMessage}`);
        return []; // Return empty array if date is invalid
      }
      
      const originalDate = dateParseResult.date;
      const dateStr = originalDate.toISOString().split('T')[0];
      
      // Get suggestions for the same day first
      const suggestions = await this.calendarService.suggestTimeSlots(duration, dateStr);
      
      return suggestions.slice(0, 3).map(suggestion => ({
        start: suggestion.start,
        end: suggestion.end,
        formatted: this.formatDateTime(safeParseDate(suggestion.start) || new Date()),
        confidence: suggestion.confidence
      }));

    } catch (error) {
      console.error('❌ Error generating alternative times:', error);
      return [];
    }
  }

  /**
   * Generate acceptance response text based on context
   * PHASE 1: Now runs AI generation in parallel for testing
   */
  private async generateAcceptanceText(
    meetingRequest: MeetingRequest,
    context: MeetingResponseContext,
    timeFormatted: string,
    calendarEventCreated: boolean = false,
    email?: ParsedEmail
  ): Promise<string> {
    // PHASE 1: Generate both template and AI responses in parallel for testing
    const templateResponsePromise = this.generateTemplateAcceptanceText(
      meetingRequest, context, timeFormatted, calendarEventCreated
    );

    // Generate AI response in parallel if email is provided
    const aiResponsePromise = email ? this.generateAIAcceptanceText(
      meetingRequest, context, timeFormatted, email
    ) : Promise.resolve(null);

    const [templateResponse, aiResponse] = await Promise.all([
      templateResponsePromise,
      aiResponsePromise
    ]);

    // PHASE 2: Use AI response when successful, fallback to template for safety
    if (aiResponse && !aiResponse.fallbackUsed && aiResponse.aiGenerated) {
      console.log('🚀 [PHASE 2 PRODUCTION] Using AI-generated acceptance response');
      console.log('🤖 AI Response Length:', aiResponse.responseText.length, 'characters');
      console.log('✨ AI Confidence:', aiResponse.confidence + '%');
      console.log('💾 Template fallback available if needed');

      return aiResponse.responseText;
    } else {
      console.log('📝 [PHASE 2 FALLBACK] Using template response');
      if (aiResponse && aiResponse.fallbackUsed) {
        console.log('⚠️ Reason: AI generation failed, using safe template');
      } else {
        console.log('ℹ️ Reason: No email provided for AI generation');
      }

      return templateResponse;
    }
  }

  /**
   * PHASE 1: Original template-based acceptance text generation (extracted for comparison)
   */
  private generateTemplateAcceptanceText(
    meetingRequest: MeetingRequest,
    context: MeetingResponseContext,
    timeFormatted: string,
    calendarEventCreated: boolean = false
  ): string {
    const greeting = this.getGreeting(context.senderRelationship, context.userTone);
    const confirmation = this.getConfirmation(context.userTone, timeFormatted, calendarEventCreated);
    const closing = this.getClosing(context.userTone);

    // Only include additional time suggestions if they exist (they shouldn't for clean acceptance)
    let timeSuggestions = '';
    if (context.suggestedTimes && context.suggestedTimes.length > 0) {
      timeSuggestions = `

I also have these additional time slots available if you prefer:
${context.suggestedTimes.map((time, index) => `${index + 1}. ${time.formatted}`).join('\n')}`;
    }

    return `${greeting}

${confirmation}${timeSuggestions}

${meetingRequest.locationPreference ? `I'll meet you at ${meetingRequest.locationPreference}.` : 'Please let me know if you need me to send a calendar invite or if there are any location details to discuss.'}

${closing}`;
  }

  /**
   * PHASE 1: AI-powered acceptance text generation (for testing)
   */
  private async generateAIAcceptanceText(
    meetingRequest: MeetingRequest,
    context: MeetingResponseContext,
    timeFormatted: string,
    email: ParsedEmail
  ) {
    try {
      const aiRequest: AIContentRequest = {
        action: 'accept',
        meetingRequest,
        email,
        context,
        timeFormatted
      };

      return await this.aiContentService.generateEnhancedContent(aiRequest);
    } catch (error) {
      console.error('❌ [PHASE 1] AI acceptance generation failed:', error);
      return { responseText: '', confidence: 0, aiGenerated: false, fallbackUsed: true };
    }
  }

  /**
   * Generate AI-enhanced alternative times response text
   * Uses AI generation with template fallback for conflict scenarios without scheduling link
   */
  private async generateAlternativeTimesResponseText(
    meetingRequest: MeetingRequest,
    context: MeetingResponseContext,
    email?: ParsedEmail
  ): Promise<string> {
    // Generate both template and AI responses in parallel
    const templateResponsePromise = this.generateTemplateAlternativeTimesText(
      meetingRequest, context
    );

    // Generate AI response in parallel if email is provided
    const aiResponsePromise = email ? this.generateAIAlternativeTimesText(
      meetingRequest, context, email
    ) : Promise.resolve(null);

    const [templateResponse, aiResponse] = await Promise.all([
      templateResponsePromise,
      aiResponsePromise
    ]);

    // Use AI response when successful, fallback to template for safety
    if (aiResponse && !aiResponse.fallbackUsed && aiResponse.aiGenerated) {
      console.log('🚀 [AI ALTERNATIVES] Using AI-generated alternative times response');
      console.log('🤖 AI Response Length:', aiResponse.responseText.length, 'characters');
      console.log('✨ AI Confidence:', aiResponse.confidence + '%');
      console.log('📅 Alternative times suggested:', context.suggestedTimes?.length || 0);

      return aiResponse.responseText;
    } else {
      console.log('📝 [ALTERNATIVES FALLBACK] Using template alternative times response');
      if (aiResponse && aiResponse.fallbackUsed) {
        console.log('⚠️ Reason: AI generation failed, using safe template');
      } else {
        console.log('ℹ️ Reason: No email provided for AI generation');
      }

      return templateResponse;
    }
  }

  /**
   * AI-powered alternative times response text generation
   */
  private async generateAIAlternativeTimesText(
    meetingRequest: MeetingRequest,
    context: MeetingResponseContext,
    email: ParsedEmail
  ) {
    try {
      const aiRequest: AIContentRequest = {
        action: 'alternatives',
        meetingRequest,
        email,
        context,
        suggestedTimes: context.suggestedTimes
      };

      return await this.aiContentService.generateEnhancedContent(aiRequest);
    } catch (error) {
      console.error('❌ [AI ALTERNATIVES] AI alternative times generation failed:', error);
      return { responseText: '', confidence: 0, aiGenerated: false, fallbackUsed: true };
    }
  }

  /**
   * Template-based alternative times response text generation (extracted for fallback)
   */
  private generateTemplateAlternativeTimesText(
    meetingRequest: MeetingRequest,
    context: MeetingResponseContext
  ): string {
    const greeting = this.getGreeting(context.senderRelationship, context.userTone);
    const alternatives = context.suggestedTimes!
      .map((time, index) => `${index + 1}. ${time.formatted}`)
      .join('\n');
    const closing = this.getClosing(context.userTone);

    return `${greeting}

Unfortunately, I have a conflict at the time you suggested. However, I'd be happy to meet at one of these alternative times during my business hours (9 AM - 5 PM PST, Monday-Friday):

${alternatives}

Please let me know which option works best for you, and I'll send over a calendar invite.

${closing}`;
  }

  /**
   * Generate scheduling link response text
   * PHASE 2: Now AI-enhanced with template fallback
   */
  private async generateSchedulingLinkText(
    meetingRequest: MeetingRequest,
    context: MeetingResponseContext,
    schedulingLink: string,
    email?: ParsedEmail
  ): Promise<string> {
    // PHASE 2: Generate both template and AI responses, prefer AI
    const templateResponsePromise = this.generateTemplateSchedulingLinkText(
      meetingRequest, context, schedulingLink
    );

    const aiResponsePromise = email ? this.generateAISchedulingLinkText(
      meetingRequest, context, schedulingLink, email
    ) : Promise.resolve(null);

    const [templateResponse, aiResponse] = await Promise.all([
      templateResponsePromise,
      aiResponsePromise
    ]);

    // PHASE 2: Use AI response when successful, fallback to template
    if (aiResponse && !aiResponse.fallbackUsed && aiResponse.aiGenerated) {
      console.log('🚀 [PHASE 2 PRODUCTION] Using AI-generated scheduling link response');
      console.log('🤖 AI Response Length:', aiResponse.responseText.length, 'characters');
      console.log('✨ AI Confidence:', aiResponse.confidence + '%');

      return aiResponse.responseText;
    } else {
      console.log('📝 [PHASE 2 FALLBACK] Using template scheduling link response');
      return templateResponse;
    }
  }

  /**
   * PHASE 2: Original template-based scheduling link text generation
   */
  private generateTemplateSchedulingLinkText(
    meetingRequest: MeetingRequest,
    context: MeetingResponseContext,
    schedulingLink: string
  ): string {
    const greeting = this.getGreeting(context.senderRelationship, context.userTone);
    const closing = this.getClosing(context.userTone);

    const meetingPurpose = (meetingRequest.subject || 'our meeting')
      .toLowerCase()
      .replace(/^(re:|fwd:|meeting request:?)/i, '')
      .trim();

    if (context.userTone === 'casual') {
      return `${greeting}

I'd love to ${meetingPurpose === 'our meeting' ? 'catch up' : meetingPurpose}! Feel free to book a time that works for you:

${schedulingLink}

${closing}`;
    } else if (context.userTone === 'friendly') {
      return `${greeting}

I'd be happy to meet regarding ${meetingPurpose}! Please feel free to schedule a time that's convenient for you:

${schedulingLink}

${closing}`;
    } else {
      return `${greeting}

Thank you for reaching out regarding ${meetingPurpose}. Please schedule a meeting at your convenience using the following link:

${schedulingLink}

${closing}`;
    }
  }

  /**
   * PHASE 2: AI-powered scheduling link text generation
   */
  private async generateAISchedulingLinkText(
    meetingRequest: MeetingRequest,
    context: MeetingResponseContext,
    schedulingLink: string,
    email: ParsedEmail
  ) {
    try {
      const aiRequest: AIContentRequest = {
        action: 'vague_calendly', // or 'conflict_calendly' based on context
        meetingRequest,
        email,
        context,
        schedulingLink
      };

      return await this.aiContentService.generateEnhancedContent(aiRequest);
    } catch (error) {
      console.error('❌ [PHASE 2] AI scheduling link generation failed:', error);
      return { responseText: '', confidence: 0, aiGenerated: false, fallbackUsed: true };
    }
  }

  /**
   * Generate AI-enhanced conflict response text with scheduling link
   * Uses AI generation with template fallback, similar to acceptance responses
   */
  private async generateConflictResponseText(
    meetingRequest: MeetingRequest,
    context: MeetingResponseContext,
    schedulingLink: string,
    timeFormatted: string,
    email?: ParsedEmail
  ): Promise<string> {
    // Generate both template and AI responses in parallel for comparison/fallback
    const templateResponsePromise = this.generateTemplateConflictResponseText(
      meetingRequest, context, schedulingLink, timeFormatted
    );

    // Generate AI response in parallel if email is provided
    const aiResponsePromise = email ? this.generateAIConflictResponseText(
      meetingRequest, context, schedulingLink, timeFormatted, email
    ) : Promise.resolve(null);

    const [templateResponse, aiResponse] = await Promise.all([
      templateResponsePromise,
      aiResponsePromise
    ]);

    // Use AI response when successful, fallback to template for safety
    if (aiResponse && !aiResponse.fallbackUsed && aiResponse.aiGenerated) {
      console.log('🚀 [AI CONFLICT] Using AI-generated conflict response with scheduling link');
      console.log('🤖 AI Response Length:', aiResponse.responseText.length, 'characters');
      console.log('✨ AI Confidence:', aiResponse.confidence + '%');
      console.log('📅 Conflicting time:', timeFormatted);
      console.log('🔗 Calendly link provided');

      return aiResponse.responseText;
    } else {
      console.log('📝 [CONFLICT FALLBACK] Using template conflict response');
      if (aiResponse && aiResponse.fallbackUsed) {
        console.log('⚠️ Reason: AI generation failed, using safe template');
      } else {
        console.log('ℹ️ Reason: No email provided for AI generation');
      }

      return templateResponse;
    }
  }

  /**
   * Template-based conflict response text generation (extracted for fallback)
   */
  private generateTemplateConflictResponseText(
    meetingRequest: MeetingRequest,
    context: MeetingResponseContext,
    schedulingLink: string,
    timeFormatted: string
  ): string {
    const greeting = this.getGreeting(context.senderRelationship, context.userTone);
    const closing = this.getClosing(context.userTone);

    return `${greeting}

Thank you for reaching out! Unfortunately, I have a conflict at ${timeFormatted}.

However, I'd be happy to meet with you! Please feel free to book a time that works for both of us using my scheduling link:

${schedulingLink}

${closing}`;
  }

  /**
   * AI-powered conflict response text generation
   */
  private async generateAIConflictResponseText(
    meetingRequest: MeetingRequest,
    context: MeetingResponseContext,
    schedulingLink: string,
    timeFormatted: string,
    email: ParsedEmail
  ) {
    try {
      const aiRequest: AIContentRequest = {
        action: 'conflict_calendly',
        meetingRequest,
        email,
        context,
        timeFormatted,
        schedulingLink
      };

      return await this.aiContentService.generateEnhancedContent(aiRequest);
    } catch (error) {
      console.error('❌ [AI CONFLICT] AI conflict generation failed:', error);
      return { responseText: '', confidence: 0, aiGenerated: false, fallbackUsed: true };
    }
  }

  /**
   * Generate time request response text (when no scheduling link available)
   */
  private generateTimeRequestText(
    meetingRequest: MeetingRequest,
    context: MeetingResponseContext
  ): string {
    const greeting = this.getGreeting(context.senderRelationship, context.userTone);
    const closing = this.getClosing(context.userTone);

    const meetingPurpose = (meetingRequest.subject || 'our meeting')
      .toLowerCase()
      .replace(/^(re:|fwd:|meeting request:?)/i, '')
      .trim();

    if (context.userTone === 'casual') {
      return `${greeting}

I'd love to ${meetingPurpose === 'our meeting' ? 'catch up' : meetingPurpose}! What times work best for you? I'm generally available during business hours and can do ${meetingRequest.requestedDuration || 30} minutes.

${closing}`;
    } else if (context.userTone === 'friendly') {
      return `${greeting}

I'd be happy to meet regarding ${meetingPurpose}! Could you suggest a few time options that work for you? I'm available during business hours and can accommodate ${meetingRequest.requestedDuration || 30} minutes.

${closing}`;
    } else {
      return `${greeting}

Thank you for your interest in meeting regarding ${meetingPurpose}. Could you please provide a few preferred time options? I am generally available during business hours and can accommodate meetings of ${meetingRequest.requestedDuration || 60} minutes.

${closing}`;
    }
  }

  /**
   * Generate more info request text
   */
  private generateMoreInfoText(
    meetingRequest: MeetingRequest,
    context: MeetingResponseContext
  ): string {
    const greeting = this.getGreeting(context.senderRelationship, context.userTone);
    const closing = this.getClosing(context.userTone);

    return `${greeting}

I'd be happy to meet with you to discuss ${(meetingRequest.subject || 'our meeting').toLowerCase().replace(/^(re:|fwd:|meeting request:?)/i, '').trim()}.

Could you please provide a few preferred time options? I'm generally available during business hours and can accommodate meetings of ${meetingRequest.requestedDuration || 60} minutes.

${closing}`;
  }

  /**
   * Get appropriate greeting based on relationship and tone
   */
  private getGreeting(relationship: string, tone: string): string {
    if (tone === 'casual') {
      return relationship === 'known_contact' ? 'Hi!' : 'Hello!';
    } else if (tone === 'friendly') {
      return relationship === 'known_contact' ? 'Hi there!' : 'Hello!';
    } else {
      return 'Hello,';
    }
  }

  /**
   * Get confirmation text based on tone and calendar event creation success
   */
  private getConfirmation(tone: string, timeFormatted: string, calendarEventCreated: boolean = false): string {
    if (tone === 'casual') {
      const calendarText = calendarEventCreated
        ? "I've created a calendar event for our meeting."
        : "I'll send you calendar details shortly.";
      return `Perfect! I'm available at ${timeFormatted} and would love to meet. ${calendarText}`;
    } else if (tone === 'friendly') {
      const calendarText = calendarEventCreated
        ? "I've added this to my calendar."
        : "I will follow up with calendar details.";
      return `That sounds great! I'm available at ${timeFormatted} and look forward to our meeting. ${calendarText}`;
    } else {
      const calendarText = calendarEventCreated
        ? "I have created a calendar event for our meeting."
        : "I will follow up with calendar details.";
      return `Thank you for reaching out. I confirm my availability for ${timeFormatted}. ${calendarText}`;
    }
  }

  /**
   * Get appropriate closing based on tone
   */
  private getClosing(tone: string): string {
    if (tone === 'casual') {
      return 'Looking forward to it!';
    } else if (tone === 'friendly') {
      return 'Looking forward to speaking with you!';
    } else {
      return 'Best regards';
    }
  }

  /**
   * Format datetime for human-readable display
   */
  private formatDateTime(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    };
    
    return date.toLocaleDateString('en-US', options);
  }

  /**
   * Get user communication tone from database or infer from past emails
   */
  private async getUserCommunicationTone(userId: string): Promise<'professional' | 'casual' | 'friendly'> {
    try {
      // Check if we have tone analysis results from learning insights for this specific user
      const result = await pool.query(`
        SELECT pattern_value, recommendation 
        FROM learning_insights 
        WHERE pattern_type = 'tone' 
        AND user_id = $1
        AND confidence > 60
        ORDER BY success_rate DESC, created_at DESC 
        LIMIT 1
      `, [userId]);

      if (result.rows.length > 0) {
        const toneData = result.rows[0];
        const patternValue = toneData.pattern_value?.toLowerCase() || '';
        const recommendation = toneData.recommendation?.toLowerCase() || '';
        
        // Parse tone analysis and return dominant tone
        if (patternValue.includes('casual') || recommendation.includes('casual')) return 'casual';
        if (patternValue.includes('friendly') || recommendation.includes('friendly')) return 'friendly';
        if (patternValue.includes('professional') || recommendation.includes('professional')) return 'professional';
      }

      // Default to professional if no analysis available for this user
      return 'professional';
    } catch (error) {
      console.error('❌ Error getting user tone:', error);
      return 'professional';
    }
  }

  /**
   * Initialize Gmail and Calendar services for user
   * UPDATED: Now includes timezone initialization
   */
  private async initializeServicesForUser(userId: string): Promise<void> {
    try {
      // Initialize Gmail service first
      await this.gmailService.initializeForUser(userId);

      // Get user credentials for calendar service with proper validation
      const credentials = await this.gmailService.tokenStorageService.getDecryptedCredentials(userId);

      if (!credentials) {
        throw new Error(`No OAuth credentials found for user ${userId}. User needs to authenticate first.`);
      }

      if (!credentials.accessToken) {
        throw new Error(`No access token found for user ${userId}. User needs to re-authenticate.`);
      }

      // Check if tokens appear to be expired (basic validation)
      if (credentials.accessToken && this.isTokenLikelyExpired(credentials)) {
        console.log(`⚠️ OAuth tokens may be expired for user ${userId}, attempting refresh...`);

        try{
          // Attempt to refresh tokens using the calendar service
          await this.calendarService.setStoredTokens(credentials.accessToken, credentials.refreshToken);
          
          // Test the connection to verify tokens work
          await this.testCalendarConnection();
          
        } catch (refreshError) {
          throw new Error(`OAuth tokens expired and refresh failed for user ${userId}. User needs to re-authenticate. Error: ${refreshError instanceof Error ? refreshError.message : 'Unknown refresh error'}`);
        }
      } else {
        // Tokens appear valid, set them up
        await this.calendarService.setStoredTokens(credentials.accessToken, credentials.refreshToken);

        // Test the connection to make sure everything works
        try {
          await this.testCalendarConnection();
        } catch (connectionError) {
          throw new Error(`OAuth tokens invalid for user ${userId}. Calendar connection failed. User needs to re-authenticate. Error: ${connectionError instanceof Error ? connectionError.message : 'Connection test failed'}`);
        }
      }

      // CRITICAL: Initialize calendar service with user timezone
      // This ensures all date parsing and event creation uses the correct timezone
      console.log(`🌍 [TIMEZONE] Initializing calendar service with user timezone...`);
      await this.calendarService.initializeForUser(userId);

      console.log(`✅ OAuth services initialized successfully for user ${userId}`);
      
    } catch (error) {
      console.error(`❌ Error initializing OAuth services for user ${userId}:`, error);
      
      // Provide helpful error messages for different OAuth failure scenarios
      if (error instanceof Error) {
        if (error.message.includes('No OAuth credentials')) {
          console.error('💡 Solution: User needs to go through OAuth flow first');
        } else if (error.message.includes('expired') || error.message.includes('invalid')) {
          console.error('💡 Solution: User needs to re-authenticate (tokens expired/invalid)');
        } else if (error.message.includes('refresh failed')) {
          console.error('💡 Solution: User needs to complete OAuth flow again');
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Basic check to see if tokens might be expired based on timestamp
   */
  private isTokenLikelyExpired(credentials: any): boolean {
    try {
      // If we have an expiry date, check it
      if (credentials.expiry_date) {
        const now = Date.now();
        const expiry = typeof credentials.expiry_date === 'number' 
          ? credentials.expiry_date 
          : parseInt(credentials.expiry_date);
        
        // Consider tokens expired if they expire within the next 5 minutes
        return (expiry - now) < (5 * 60 * 1000);
      }
      
      // If no expiry info, assume tokens might need refresh if they're old
      // This is a heuristic - not perfect but better than no check
      return false;
    } catch {
      // If we can't determine expiry, assume they might be expired
      return true;
    }
  }
  
  /**
   * Test calendar connection to validate OAuth tokens
   */
  private async testCalendarConnection(): Promise<void> {
    try {
      // Simple test: try to check calendar health (minimal API call)
      await this.calendarService.checkCalendarHealth();
    } catch (error) {
      throw new Error(`Calendar connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Health check for response generator service
   */
  async healthCheck(): Promise<{
    status: string;
    calendarReady: boolean;
    gmailReady: boolean;
    responseCapacity: string;
  }> {
    try {
      // Test calendar service
      const calendarHealth = await this.calendarService.checkCalendarHealth();
      
      // Test database connection
      await pool.query('SELECT 1');
      
      return {
        status: 'healthy',
        calendarReady: calendarHealth.status === 'healthy',
        gmailReady: true, // Gmail is initialized per-user
        responseCapacity: 'ready'
      };
    } catch (error) {
      return {
        status: 'error',
        calendarReady: false,
        gmailReady: false,
        responseCapacity: 'limited'
      };
    }
  }
}