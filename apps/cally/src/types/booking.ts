/**
 * Booking Types for Cally
 * Configuration, time slots, and API request/response types
 */

/**
 * Day schedule - business hours for a single day
 */
export interface DaySchedule {
  enabled: boolean;
  startHour: number; // 0-23
  endHour: number; // 0-23
}

/**
 * Weekly business hours configuration
 * Keys are day-of-week indices (0=Sunday, 1=Monday, ..., 6=Saturday)
 */
export type WeeklySchedule = Record<number, DaySchedule>;

/**
 * Booking configuration stored on the tenant
 */
export interface BookingConfig {
  timezone: string;
  slotDurationMinutes: number;
  lookaheadDays: number;
  weeklySchedule: WeeklySchedule;
}

/**
 * A single time slot for display
 */
export interface TimeSlot {
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  available: boolean;
}

/**
 * API response for available slots
 */
export interface AvailableSlotsResponse {
  date: string; // YYYY-MM-DD
  timezone: string;
  slots: TimeSlot[];
}

/**
 * API request body for creating a booking
 */
export interface CreateBookingRequest {
  visitorName: string;
  visitorEmail: string;
  note?: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
}

/**
 * Default booking config: Mon-Fri 9am-5pm, 30-min slots, Sydney timezone, 30 days ahead
 */
export const DEFAULT_BOOKING_CONFIG: BookingConfig = {
  timezone: "Australia/Sydney",
  slotDurationMinutes: 30,
  lookaheadDays: 30,
  weeklySchedule: {
    0: { enabled: false, startHour: 9, endHour: 17 }, // Sunday
    1: { enabled: true, startHour: 9, endHour: 17 }, // Monday
    2: { enabled: true, startHour: 9, endHour: 17 }, // Tuesday
    3: { enabled: true, startHour: 9, endHour: 17 }, // Wednesday
    4: { enabled: true, startHour: 9, endHour: 17 }, // Thursday
    5: { enabled: true, startHour: 9, endHour: 17 }, // Friday
    6: { enabled: false, startHour: 9, endHour: 17 }, // Saturday
  },
};
