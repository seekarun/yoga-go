// Calendar Types - Calendar event types

import type { BaseEntity } from "./base";
import type { WebinarStatus } from "./video";

/**
 * Calendar event type
 */
export type CalendarEventType = "general" | "live_session";

/**
 * Calendar event status
 */
export type CalendarEventStatus = "scheduled" | "cancelled" | "completed";

/**
 * Calendar event entity
 */
export interface CalendarEvent extends BaseEntity {
  expertId: string;
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  type: CalendarEventType;
  status: CalendarEventStatus;
  webinarId?: string;
  sessionId?: string;
  meetingLink?: string;
  location?: string;
  isAllDay?: boolean;
  color?: string;
  notes?: string;
}

/**
 * Input type for creating calendar events
 */
export interface CreateCalendarEventInput {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  type: CalendarEventType;
  webinarId?: string;
  sessionId?: string;
  meetingLink?: string;
  location?: string;
  isAllDay?: boolean;
  color?: string;
  notes?: string;
}

/**
 * Combined calendar item for FullCalendar display
 */
export interface CalendarItem {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  type: "event" | "live_session";
  color?: string;
  extendedProps: {
    description?: string;
    webinarId?: string;
    sessionId?: string;
    meetingLink?: string;
    location?: string;
    status?: CalendarEventStatus | WebinarStatus;
  };
}
