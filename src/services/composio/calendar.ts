/**
 * Composio Calendar Service
 *
 * Wrapper around Composio's Google Calendar actions that maintains the same interface
 * as the original CalendarService for seamless migration.
 */

import { ComposioClient } from './client';
import { CalendarEvent, TimeSlotSuggestion } from '../../types';
import { TimezoneService } from '../timezone';
import { logger, sanitizeUserId } from '../../utils/pino-logger';

export interface AvailabilityCheck {
  start: string;
  end: string;
  isAvailable: boolean;
  conflictingEvents?: CalendarEvent[];
}

export class ComposioCalendarService {
  private entityId: string;
  private userId: string;
  private userTimezone: string | null = null;

  constructor(entityId: string, userId: string) {
    this.entityId = entityId;
    this.userId = userId;
  }

  /**
   * Initialize calendar service and fetch user timezone
   */
  async initializeForUser(userId: string): Promise<void> {
    try {
      this.userId = userId;
      // Fetch user timezone from database or use default
      this.userTimezone = await TimezoneService.getUserTimezone(userId);
      logger.info({
        userId: sanitizeUserId(userId),
        timezone: this.userTimezone
      }, 'composio.calendar.initialized');
    } catch (error) {
      logger.error({
        userId: sanitizeUserId(userId),
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.calendar.init.failed');
      this.userTimezone = 'America/Los_Angeles'; // Fallback
    }
  }

  /**
   * Get user's timezone
   */
  getUserTimezone(): string {
    return this.userTimezone || 'America/Los_Angeles';
  }

  /**
   * Check availability for a time slot
   * Uses GOOGLECALENDAR_LIST_EVENTS to check for conflicts
   */
  async checkAvailability(
    startTime: string,
    endTime: string,
    calendarId: string = 'primary'
  ): Promise<AvailabilityCheck> {
    try {
      logger.debug({
        userId: sanitizeUserId(this.userId),
        startTime,
        endTime
      }, 'composio.calendar.availability.check.start');

      const result = await ComposioClient.executeAction(
        this.entityId,
        'GOOGLECALENDAR_LIST_EVENTS',
        {
          calendarId,
          timeMin: startTime,
          timeMax: endTime,
          singleEvents: true,
          orderBy: 'startTime'
        }
      );

      const events = result.items || [];
      const conflictingEvents = events
        .filter((event: any) => event.start?.dateTime && event.end?.dateTime)
        .map((event: any) => this.parseCalendarEvent(event));

      const isAvailable = conflictingEvents.length === 0;

      logger.info({
        userId: sanitizeUserId(this.userId),
        isAvailable,
        conflictCount: conflictingEvents.length
      }, 'composio.calendar.availability.checked');

      return {
        start: startTime,
        end: endTime,
        isAvailable,
        conflictingEvents: isAvailable ? undefined : conflictingEvents
      };
    } catch (error) {
      logger.error({
        userId: sanitizeUserId(this.userId),
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.calendar.availability.failed');
      throw error;
    }
  }

  /**
   * Get calendar events for a time range
   */
  async getCalendarEvents(
    startTime: string,
    endTime: string,
    maxResults: number = 50,
    calendarId: string = 'primary'
  ): Promise<CalendarEvent[]> {
    try {
      const result = await ComposioClient.executeAction(
        this.entityId,
        'GOOGLECALENDAR_LIST_EVENTS',
        {
          calendarId,
          timeMin: startTime,
          timeMax: endTime,
          maxResults,
          singleEvents: true,
          orderBy: 'startTime'
        }
      );

      const events = (result.items || []).map((event: any) => this.parseCalendarEvent(event));

      logger.info({
        userId: sanitizeUserId(this.userId),
        eventCount: events.length
      }, 'composio.calendar.events.fetched');

      return events;
    } catch (error) {
      logger.error({
        userId: sanitizeUserId(this.userId),
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.calendar.events.failed');
      throw error;
    }
  }

  /**
   * Create calendar event
   * Uses GOOGLECALENDAR_CREATE_EVENT action
   */
  async createCalendarEvent(
    event: CalendarEvent,
    calendarId: string = 'primary'
  ): Promise<CalendarEvent> {
    try {
      const userTz = this.getUserTimezone();

      // Ensure event has explicit timezone
      const startWithTz = event.start?.timeZone ? event.start : { ...event.start, timeZone: userTz };
      const endWithTz = event.end?.timeZone ? event.end : { ...event.end, timeZone: userTz };

      logger.debug({
        userId: sanitizeUserId(this.userId),
        summary: event.summary,
        timezone: userTz
      }, 'composio.calendar.event.create.start');

      const result = await ComposioClient.executeAction(
        this.entityId,
        'GOOGLECALENDAR_CREATE_EVENT',
        {
          calendarId,
          summary: event.summary,
          description: event.description,
          location: event.location,
          start: startWithTz,
          end: endWithTz,
          attendees: event.attendees
        }
      );

      const createdEvent = this.parseCalendarEvent(result);

      logger.info({
        userId: sanitizeUserId(this.userId),
        eventId: createdEvent.id,
        summary: createdEvent.summary
      }, 'composio.calendar.event.created');

      return createdEvent;
    } catch (error) {
      logger.error({
        userId: sanitizeUserId(this.userId),
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.calendar.event.create.failed');
      throw error;
    }
  }

  /**
   * Create calendar event with explicit Date objects and timezone
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

    const start = TimezoneService.createCalendarEventTime(startDate, userTz);
    const end = TimezoneService.createCalendarEventTime(endDate, userTz);

    return this.createCalendarEvent(
      {
        summary,
        description,
        start,
        end,
        location,
        attendees
      },
      calendarId
    );
  }

  /**
   * Suggest time slots for a meeting
   * Uses GOOGLECALENDAR_FIND_FREE_SLOTS if available, or manual logic
   */
  async suggestTimeSlots(
    duration: number,
    preferredDate: string,
    workingHours: { start: string; end: string } = { start: '09:00', end: '17:00' },
    maxSuggestions: number = 3
  ): Promise<TimeSlotSuggestion[]> {
    try {
      // Check if GOOGLECALENDAR_FIND_FREE_SLOTS action exists
      // If not, fall back to manual availability checking
      const startOfDay = new Date(`${preferredDate}T${workingHours.start}:00`);
      const endOfDay = new Date(`${preferredDate}T${workingHours.end}:00`);

      const availability = await this.checkAvailability(
        startOfDay.toISOString(),
        endOfDay.toISOString()
      );

      const suggestions: TimeSlotSuggestion[] = [];

      if (availability.isAvailable) {
        // Suggest optimal times
        suggestions.push({
          start: new Date(`${preferredDate}T10:00:00`).toISOString(),
          end: new Date(new Date(`${preferredDate}T10:00:00`).getTime() + duration * 60000).toISOString(),
          confidence: 95,
          reason: 'Optimal morning time slot with no conflicts'
        });

        suggestions.push({
          start: new Date(`${preferredDate}T14:00:00`).toISOString(),
          end: new Date(new Date(`${preferredDate}T14:00:00`).getTime() + duration * 60000).toISOString(),
          confidence: 90,
          reason: 'Good afternoon time slot with no conflicts'
        });
      } else {
        // Find gaps between meetings
        const conflicts = availability.conflictingEvents || [];
        const gaps = this.findGapsBetweenMeetings(conflicts, startOfDay, endOfDay, duration);

        gaps.slice(0, maxSuggestions).forEach((gap, index) => {
          suggestions.push({
            start: gap.start,
            end: gap.end,
            confidence: Math.max(70 - index * 10, 50),
            reason: 'Available time slot between existing meetings'
          });
        });
      }

      return suggestions.slice(0, maxSuggestions);
    } catch (error) {
      logger.error({
        userId: sanitizeUserId(this.userId),
        error: error instanceof Error ? error.message : String(error)
      }, 'composio.calendar.suggest.failed');
      throw error;
    }
  }

  /**
   * Calendar health check
   */
  async checkCalendarHealth(): Promise<{ status: string; calendars: number; upcomingEvents: number }> {
    try {
      // Get upcoming events for next 7 days
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const upcomingEvents = await this.getCalendarEvents(
        new Date().toISOString(),
        nextWeek.toISOString(),
        100
      );

      return {
        status: 'healthy',
        calendars: 1, // Composio typically works with primary calendar
        upcomingEvents: upcomingEvents.length
      };
    } catch (error) {
      return {
        status: 'error',
        calendars: 0,
        upcomingEvents: 0
      };
    }
  }

  /**
   * Parse Google Calendar event to CalendarEvent format
   */
  private parseCalendarEvent(event: any): CalendarEvent {
    return {
      id: event.id,
      summary: event.summary || 'No title',
      description: event.description,
      start: {
        dateTime: event.start?.dateTime || event.start?.date,
        timeZone: event.start?.timeZone
      },
      end: {
        dateTime: event.end?.dateTime || event.end?.date,
        timeZone: event.end?.timeZone
      },
      attendees: event.attendees?.map((attendee: any) => ({
        email: attendee.email,
        responseStatus: attendee.responseStatus
      })),
      location: event.location,
      status: event.status,
      created: event.created,
      updated: event.updated
    };
  }

  /**
   * Find gaps between meetings (helper method)
   */
  private findGapsBetweenMeetings(
    conflicts: CalendarEvent[],
    dayStart: Date,
    dayEnd: Date,
    requiredDuration: number
  ): Array<{ start: string; end: string }> {
    const gaps: Array<{ start: string; end: string }> = [];
    const sortedConflicts = conflicts.sort(
      (a, b) => new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime()
    );

    let currentTime = dayStart;

    for (const conflict of sortedConflicts) {
      const conflictStart = new Date(conflict.start.dateTime);
      const timeDiff = conflictStart.getTime() - currentTime.getTime();

      if (timeDiff >= requiredDuration * 60000) {
        gaps.push({
          start: currentTime.toISOString(),
          end: new Date(currentTime.getTime() + requiredDuration * 60000).toISOString()
        });
      }

      currentTime = new Date(conflict.end.dateTime);
    }

    // Check gap after last meeting
    const remainingTime = dayEnd.getTime() - currentTime.getTime();
    if (remainingTime >= requiredDuration * 60000) {
      gaps.push({
        start: currentTime.toISOString(),
        end: new Date(currentTime.getTime() + requiredDuration * 60000).toISOString()
      });
    }

    return gaps;
  }
}
