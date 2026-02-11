/**
 * Outlook Calendar integration types
 */

export interface OutlookCalendarConfig {
  accessToken: string;
  refreshToken: string;
  tokenExpiry: string; // ISO 8601
  email: string; // Microsoft account email
  calendarId: string; // "primary" or specific calendar ID
  blockBookingSlots: boolean; // default true
  pushEvents: boolean; // default true — push Cally events to Outlook Calendar
  connectedAt: string; // ISO 8601
}
