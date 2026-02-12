// Calendar Types - Calendar event types

import type { BaseEntity } from "./base";
import type { WebinarStatus } from "./video";
import type { VisitorInfo } from "./visitor";

/**
 * Calendar event type
 */
export type CalendarEventType = "general" | "live_session";

/**
 * Recurrence frequency options
 */
export type RecurrenceFrequency =
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "weekday";

/**
 * Monthly recurrence mode
 */
export type MonthlyMode = "dayOfMonth" | "dayOfWeek";

/**
 * Recurrence rule for recurring events
 */
export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;
  daysOfWeek?: number[]; // 0=Sun..6=Sat, for weekly
  monthlyMode?: MonthlyMode;
  end: {
    afterOccurrences?: number;
    onDate?: string; // YYYY-MM-DD
  };
}

/**
 * Event attendee
 */
export interface EventAttendee {
  email: string;
  name: string;
}

/**
 * Calendar event status
 */
export type CalendarEventStatus =
  | "pending"
  | "pending_payment"
  | "scheduled"
  | "cancelled"
  | "completed"
  | "no_show";

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
  // Spam detection
  flaggedAsSpam?: boolean;
  // Visitor geolocation metadata
  visitorInfo?: VisitorInfo;
  // Google Calendar sync
  googleCalendarEventId?: string;
  // Outlook Calendar sync
  outlookCalendarEventId?: string;
  // Recurrence
  recurrenceGroupId?: string;
  recurrenceRule?: RecurrenceRule;
  // Attendees
  attendees?: EventAttendee[];
  // Product link (for booking events)
  productId?: string;
  // Stripe payment
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  // Reminder tracking (internal — set by cron, not by user)
  reminder24hSentAt?: string;
  reminder10mSentAt?: string;
  // Cancellation tracking
  cancelledBy?: "tenant" | "visitor";
  cancelledAt?: string;
  refundAmountCents?: number;
  stripeRefundId?: string;
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
  // Spam detection
  flaggedAsSpam?: boolean;
  // Visitor geolocation metadata
  visitorInfo?: VisitorInfo;
  // Google Calendar sync
  googleCalendarEventId?: string;
  // Outlook Calendar sync
  outlookCalendarEventId?: string;
  // Recurrence
  recurrenceGroupId?: string;
  recurrenceRule?: RecurrenceRule;
  // Product link (for booking events)
  productId?: string;
  // Stripe payment
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  // Attendees
  attendees?: EventAttendee[];
  // Cancellation tracking
  cancelledBy?: "tenant" | "visitor";
  cancelledAt?: string;
  refundAmountCents?: number;
  stripeRefundId?: string;
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
    meetingLink?: string;
    webinarId?: string;
    sessionId?: string;
    location?: string;
    status?: CalendarEventStatus | WebinarStatus;
    // 100ms Video conferencing
    hasVideoConference?: boolean;
    hmsRoomId?: string;
    hmsTemplateId?: string;
    // Event source
    source?: string;
    // Recurrence
    recurrenceGroupId?: string;
    // Attendees
    attendees?: EventAttendee[];
    // Cancellation / refund info
    cancelledBy?: "tenant" | "visitor";
    stripeRefundId?: string;
    refundAmountCents?: number;
    stripePaymentIntentId?: string;
  };
}
