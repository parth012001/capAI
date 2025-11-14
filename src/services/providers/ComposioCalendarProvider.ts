/**
 * Composio Calendar Provider
 *
 * Implements ICalendarProvider using Composio SDK
 * Wraps Composio service methods with standard interface
 */

import {
  ICalendarProvider,
  ListEventsParams,
  CreateEventParams,
  CheckAvailabilityParams,
  ListEventsResponse,
  CreateEventResponse,
  CalendarEvent
} from './ICalendarProvider';
import { ComposioService } from '../composio';
import logger, { sanitizeUserId } from '../../utils/pino-logger';

export class ComposioCalendarProvider implements ICalendarProvider {
  private composioService: ComposioService;

  constructor(composioService: ComposioService) {
    this.composioService = composioService;
  }

  getProviderName(): string {
    return 'Composio';
  }

  async listEvents(
    userId: string,
    params: ListEventsParams
  ): Promise<ListEventsResponse> {
    try {
      logger.info({
        userId: sanitizeUserId(userId),
        provider: this.getProviderName(),
        timeMin: params.timeMin.toISOString(),
        timeMax: params.timeMax.toISOString()
      }, 'calendar.provider.list.start');

      // Call Composio service
      const events = await this.composioService.listCalendarEvents(userId, {
        timeMin: params.timeMin,
        timeMax: params.timeMax,
        maxResults: params.maxResults
      });

      logger.info({
        userId: sanitizeUserId(userId),
        provider: this.getProviderName(),
        eventCount: events.length
      }, 'calendar.provider.list.success');

      return {
        items: events
      };
    } catch (error) {
      logger.error({
        userId: sanitizeUserId(userId),
        provider: this.getProviderName(),
        error: error instanceof Error ? error.message : String(error)
      }, 'calendar.provider.list.failed');
      throw error;
    }
  }

  async createEvent(
    userId: string,
    params: CreateEventParams
  ): Promise<CreateEventResponse> {
    try {
      logger.info({
        userId: sanitizeUserId(userId),
        provider: this.getProviderName(),
        summary: params.summary,
        start: params.start.toISOString(),
        end: params.end.toISOString()
      }, 'calendar.provider.create.start');

      // Call Composio service
      const result = await this.composioService.createCalendarEvent(userId, {
        summary: params.summary,
        start: params.start,
        end: params.end,
        attendees: params.attendees,
        description: params.description,
        location: params.location
      });

      logger.info({
        userId: sanitizeUserId(userId),
        provider: this.getProviderName(),
        eventId: result.id,
        htmlLink: result.htmlLink
      }, 'calendar.provider.create.success');

      return {
        id: result.id,
        htmlLink: result.htmlLink,
        status: 'confirmed'
      };
    } catch (error) {
      logger.error({
        userId: sanitizeUserId(userId),
        provider: this.getProviderName(),
        error: error instanceof Error ? error.message : String(error)
      }, 'calendar.provider.create.failed');
      throw error;
    }
  }

  async checkAvailability(
    userId: string,
    params: CheckAvailabilityParams
  ): Promise<{ available: boolean; conflicts?: CalendarEvent[] }> {
    try {
      logger.info({
        userId: sanitizeUserId(userId),
        provider: this.getProviderName(),
        start: params.start.toISOString(),
        end: params.end.toISOString()
      }, 'calendar.provider.availability.check.start');

      // List events in the requested time range
      const events = await this.composioService.listCalendarEvents(userId, {
        timeMin: params.start,
        timeMax: params.end,
        maxResults: 50
      });

      // Check if any events conflict with the requested time
      const conflicts = events.filter((event: CalendarEvent) => {
        // Skip all-day events
        if (!event.start?.dateTime || !event.end?.dateTime) {
          return false;
        }

        const eventStart = new Date(event.start.dateTime);
        const eventEnd = new Date(event.end.dateTime);

        // Check if there's any overlap
        const hasOverlap =
          (eventStart < params.end && eventEnd > params.start);

        return hasOverlap;
      });

      const available = conflicts.length === 0;

      logger.info({
        userId: sanitizeUserId(userId),
        provider: this.getProviderName(),
        available,
        conflictCount: conflicts.length
      }, 'calendar.provider.availability.check.complete');

      return {
        available,
        conflicts: conflicts.length > 0 ? conflicts : undefined
      };
    } catch (error) {
      logger.error({
        userId: sanitizeUserId(userId),
        provider: this.getProviderName(),
        error: error instanceof Error ? error.message : String(error)
      }, 'calendar.provider.availability.check.failed');
      throw error;
    }
  }
}
