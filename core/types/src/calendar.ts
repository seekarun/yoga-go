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
export type CalendarEventStatus =
  | "pending"
  | "scheduled"
  | "cancelled"
  | "completed";

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
  // 100ms Video conferencing
  hasVideoConference?: boolean;
  hmsRoomId?: string;
  hmsTemplateId?: string;
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
  /** Override status. Defaults to "scheduled" when omitted. */
  status?: CalendarEventStatus;
  /** Override date (YYYY-MM-DD) for storage key. When omitted, derived from startTime UTC. */
  date?: string;
  webinarId?: string;
  sessionId?: string;
  meetingLink?: string;
  location?: string;
  isAllDay?: boolean;
  color?: string;
  notes?: string;
  // 100ms Video conferencing
  hasVideoConference?: boolean;
  hmsRoomId?: string;
  hmsTemplateId?: string;
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
    // 100ms Video conferencing
    hasVideoConference?: boolean;
    hmsRoomId?: string;
    hmsTemplateId?: string;
  };
}
