import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { CalendarEvent, TimeSlotSuggestion } from '../types';
import { TimezoneService } from './timezone';

export interface AvailabilityCheck {
  start: string;
  end: string;
  isAvailable: boolean;
  conflictingEvents?: CalendarEvent[];
}

export class CalendarService {
  private oauth2Client: OAuth2Client;
  private calendar: any;
  private userTimezone: string | null = null;  // Cache user timezone
  private userId: string | null = null;  // Track which user this service is initialized for

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  // Set OAuth credentials (shared with Gmail service)
  async setStoredTokens(accessToken: string, refreshToken: string) {
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }

  /**
   * Initialize calendar service for a specific user and fetch their timezone
   * This should be called after setting tokens
   */
  async initializeForUser(userId: string): Promise<void> {
    try {
      console.log(`🌍 [CALENDAR] Initializing calendar service for user: ${userId}`);
      this.userId = userId;

      // Fetch and cache user timezone
      this.userTimezone = await TimezoneService.getUserTimezone(userId, this.oauth2Client);
      console.log(`✅ [CALENDAR] User timezone loaded: ${this.userTimezone}`);

    } catch (error) {
      console.error(`❌ [CALENDAR] Error initializing calendar service:`, error);
      // Use fallback timezone
      this.userTimezone = 'America/Los_Angeles';
    }
  }

  /**
   * Get the current user's timezone
   */
  getUserTimezone(): string {
    return this.userTimezone || 'America/Los_Angeles';
  }

  // Just-in-time availability checking
  async checkAvailability(
    startTime: string, 
    endTime: string, 
    calendarId: string = 'primary'
  ): Promise<AvailabilityCheck> {
    try {
      console.log(`📅 Checking availability from ${startTime} to ${endTime}...`);

      const response = await this.calendar.events.list({
        calendarId: calendarId,
        timeMin: startTime,
        timeMax: endTime,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];
      const conflictingEvents = events
        .filter((event: any) => event.start?.dateTime && event.end?.dateTime)
        .map((event: any) => this.parseCalendarEvent(event));

      const isAvailable = conflictingEvents.length === 0;

      console.log(`📅 Availability check: ${isAvailable ? '✅ Available' : '❌ Conflicts found'} (${conflictingEvents.length} conflicts)`);

      return {
        start: startTime,
        end: endTime,
        isAvailable,
        conflictingEvents: isAvailable ? undefined : conflictingEvents
      };

    } catch (error) {
      console.error('❌ Error checking calendar availability:', error);
      throw error;
    }
  }

  // Get calendar events for a time range
  async getCalendarEvents(
    startTime: string, 
    endTime: string,
    maxResults: number = 50,
    calendarId: string = 'primary'
  ): Promise<CalendarEvent[]> {
    try {
      console.log(`📅 Fetching calendar events from ${startTime} to ${endTime}...`);

      const response = await this.calendar.events.list({
        calendarId: calendarId,
        timeMin: startTime,
        timeMax: endTime,
        maxResults: maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];
      const parsedEvents = events.map((event: any) => this.parseCalendarEvent(event));

      console.log(`📅 Retrieved ${parsedEvents.length} calendar events`);
      return parsedEvents;

    } catch (error) {
      console.error('❌ Error fetching calendar events:', error);
      throw error;
    }
  }

  // Smart time slot suggestions (just-in-time)
  async suggestTimeSlots(
    duration: number, // duration in minutes
    preferredDate: string, // YYYY-MM-DD format
    workingHours: { start: string, end: string } = { start: '09:00', end: '17:00' },
    maxSuggestions: number = 3
  ): Promise<TimeSlotSuggestion[]> {
    try {
      console.log(`🎯 Suggesting ${maxSuggestions} time slots for ${duration} minutes on ${preferredDate}...`);

      const startOfDay = new Date(`${preferredDate}T${workingHours.start}:00`);
      const endOfDay = new Date(`${preferredDate}T${workingHours.end}:00`);

      // Check availability for the entire day
      const availability = await this.checkAvailability(
        startOfDay.toISOString(),
        endOfDay.toISOString()
      );

      const suggestions: TimeSlotSuggestion[] = [];
      
      if (availability.isAvailable) {
        // If completely free, suggest optimal times
        suggestions.push({
          start: new Date(`${preferredDate}T10:00:00`).toISOString(),
          end: new Date(`${preferredDate}T10:00:00`).getTime() + (duration * 60000) < endOfDay.getTime() 
            ? new Date(new Date(`${preferredDate}T10:00:00`).getTime() + (duration * 60000)).toISOString()
            : endOfDay.toISOString(),
          confidence: 95,
          reason: 'Optimal morning time slot with no conflicts'
        });
        
        suggestions.push({
          start: new Date(`${preferredDate}T14:00:00`).toISOString(),
          end: new Date(`${preferredDate}T14:00:00`).getTime() + (duration * 60000) < endOfDay.getTime()
            ? new Date(new Date(`${preferredDate}T14:00:00`).getTime() + (duration * 60000)).toISOString()
            : endOfDay.toISOString(),
          confidence: 90,
          reason: 'Good afternoon time slot with no conflicts'
        });
      } else {
        // If conflicts exist, find gaps between meetings
        const conflicts = availability.conflictingEvents || [];
        const gaps = this.findGapsBetweenMeetings(conflicts, startOfDay, endOfDay, duration);
        
        gaps.slice(0, maxSuggestions).forEach((gap, index) => {
          suggestions.push({
            start: gap.start,
            end: gap.end,
            confidence: Math.max(70 - (index * 10), 50),
            reason: `Available time slot between existing meetings`
          });
        });
      }

      console.log(`✅ Generated ${suggestions.length} time slot suggestions`);
      return suggestions.slice(0, maxSuggestions);

    } catch (error) {
      console.error('❌ Error generating time slot suggestions:', error);
      throw error;
    }
  }

  // Create calendar event (UPDATED: Now timezone-aware!)
  async createCalendarEvent(event: CalendarEvent, calendarId: string = 'primary'): Promise<CalendarEvent> {
    try {
      console.log(`📅 Creating calendar event: ${event.summary}`);

      // Ensure event has explicit timezone (CRITICAL FIX!)
      const userTz = this.getUserTimezone();

      const startWithTz = event.start?.timeZone
        ? event.start
        : { ...event.start, timeZone: userTz };

      const endWithTz = event.end?.timeZone
        ? event.end
        : { ...event.end, timeZone: userTz };

      console.log(`🌍 [CALENDAR] Creating event in timezone: ${userTz}`);
      console.log(`📅 [CALENDAR] Start: ${startWithTz.dateTime} (${startWithTz.timeZone})`);
      console.log(`📅 [CALENDAR] End: ${endWithTz.dateTime} (${endWithTz.timeZone})`);

      const response = await this.calendar.events.insert({
        calendarId: calendarId,
        requestBody: {
          summary: event.summary,
          description: event.description,
          start: startWithTz,
          end: endWithTz,
          attendees: event.attendees,
          location: event.location,
        },
      });

      const createdEvent = this.parseCalendarEvent(response.data);
      console.log(`✅ Calendar event created: ${createdEvent.id}`);

      return createdEvent;

    } catch (error) {
      console.error('❌ Error creating calendar event:', error);
      throw error;
    }
  }

  /**
   * NEW: Create calendar event with explicit date objects and timezone
   * This is a helper method that handles timezone conversion automatically
   */
  async createCalendarEventWithDates(
    summary: string,
    startDate: Date,
    endDate: Date,
    description?: string,
    location?: string,
    attendees?: Array<{ email: string }>,
    calendarId: string = 'primary'
  ): Promise<CalendarEvent> {
    const userTz = this.getUserTimezone();

    // Use TimezoneService to create properly formatted event times
    const start = TimezoneService.createCalendarEventTime(startDate, userTz);
    const end = TimezoneService.createCalendarEventTime(endDate, userTz);

    console.log(`🌍 [CALENDAR] Creating event with dates in timezone: ${userTz}`);
    console.log(`📅 [CALENDAR] Start: ${start.dateTime} (${start.timeZone})`);
    console.log(`📅 [CALENDAR] End: ${end.dateTime} (${end.timeZone})`);

    return this.createCalendarEvent({
      summary,
      description,
      start,
      end,
      location,
      attendees
    }, calendarId);
  }

  // Helper method to parse Google Calendar event
  private parseCalendarEvent(event: any): CalendarEvent {
    return {
      id: event.id,
      summary: event.summary || 'No title',
      description: event.description,
      start: {
        dateTime: event.start?.dateTime || event.start?.date,
        timeZone: event.start?.timeZone,
      },
      end: {
        dateTime: event.end?.dateTime || event.end?.date,
        timeZone: event.end?.timeZone,
      },
      attendees: event.attendees?.map((attendee: any) => ({
        email: attendee.email,
        responseStatus: attendee.responseStatus,
      })),
      location: event.location,
      status: event.status,
      created: event.created,
      updated: event.updated,
    };
  }

  // Helper method to find gaps between meetings
  private findGapsBetweenMeetings(
    conflicts: CalendarEvent[], 
    dayStart: Date, 
    dayEnd: Date, 
    requiredDuration: number
  ): Array<{ start: string, end: string }> {
    const gaps: Array<{ start: string, end: string }> = [];
    const sortedConflicts = conflicts
      .sort((a, b) => new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime());

    let currentTime = dayStart;

    for (const conflict of sortedConflicts) {
      const conflictStart = new Date(conflict.start.dateTime);
      const timeDiff = conflictStart.getTime() - currentTime.getTime();
      
      // If gap is long enough for the meeting
      if (timeDiff >= requiredDuration * 60000) {
        gaps.push({
          start: currentTime.toISOString(),
          end: new Date(currentTime.getTime() + (requiredDuration * 60000)).toISOString()
        });
      }
      
      currentTime = new Date(conflict.end.dateTime);
    }

    // Check gap after last meeting
    const remainingTime = dayEnd.getTime() - currentTime.getTime();
    if (remainingTime >= requiredDuration * 60000) {
      gaps.push({
        start: currentTime.toISOString(),
        end: new Date(currentTime.getTime() + (requiredDuration * 60000)).toISOString()
      });
    }

    return gaps;
  }

  // Calendar health check
  async checkCalendarHealth(): Promise<{ status: string, calendars: number, upcomingEvents: number }> {
    try {
      console.log('🏥 Checking calendar service health...');

      // Get calendar list
      const calendarList = await this.calendar.calendarList.list();
      const calendars = calendarList.data.items || [];

      // Get upcoming events (next 7 days)
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const upcomingEvents = await this.getCalendarEvents(
        new Date().toISOString(),
        nextWeek.toISOString(),
        100
      );

      console.log(`✅ Calendar health: ${calendars.length} calendars, ${upcomingEvents.length} upcoming events`);

      return {
        status: 'healthy',
        calendars: calendars.length,
        upcomingEvents: upcomingEvents.length
      };

    } catch (error) {
      console.error('❌ Calendar health check failed:', error);
      return {
        status: 'error',
        calendars: 0,
        upcomingEvents: 0
      };
    }
  }
}