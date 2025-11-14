/**
 * Calendar Provider Interface
 *
 * Defines the contract for calendar operations that can be implemented
 * by different providers (Composio, Google OAuth, etc.)
 */

export interface ListEventsParams {
  timeMin: Date;
  timeMax: Date;
  maxResults?: number;
  pageToken?: string;
  timeZone?: string;
}

export interface CreateEventParams {
  summary: string;
  start: Date;
  end: Date;
  attendees?: string[];
  description?: string;
  location?: string;
  timeZone?: string;
}

export interface CheckAvailabilityParams {
  start: Date;
  end: Date;
  timeZone?: string;
}

export interface CalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    responseStatus?: string;
    organizer?: boolean;
  }>;
  htmlLink?: string;
  status?: string;
}

export interface ListEventsResponse {
  items: CalendarEvent[];
  nextPageToken?: string;
}

export interface CreateEventResponse {
  id: string;
  htmlLink: string;
  status?: string;
}

export interface AvailabilitySlot {
  start: Date;
  end: Date;
  available: boolean;
}

/**
 * ICalendarProvider Interface
 *
 * All calendar provider implementations must implement this interface
 */
export interface ICalendarProvider {
  /**
   * List calendar events within a time range
   *
   * @param userId - User identifier
   * @param params - List parameters (timeMin, timeMax, etc.)
   * @returns Promise with calendar events
   */
  listEvents(
    userId: string,
    params: ListEventsParams
  ): Promise<ListEventsResponse>;

  /**
   * Create a calendar event
   *
   * @param userId - User identifier
   * @param params - Event parameters (summary, start, end, etc.)
   * @returns Promise with created event details
   */
  createEvent(
    userId: string,
    params: CreateEventParams
  ): Promise<CreateEventResponse>;

  /**
   * Check user's availability during a time slot
   *
   * @param userId - User identifier
   * @param params - Availability check parameters
   * @returns Promise with availability status
   */
  checkAvailability(
    userId: string,
    params: CheckAvailabilityParams
  ): Promise<{ available: boolean; conflicts?: CalendarEvent[] }>;

  /**
   * Get provider name (for logging/debugging)
   */
  getProviderName(): string;
}
