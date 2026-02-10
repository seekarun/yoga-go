/**
 * Google Calendar integration types
 */

export interface GoogleCalendarConfig {
  accessToken: string;
  refreshToken: string;
  tokenExpiry: string; // ISO 8601
  email: string; // Google account email
  calendarId: string; // "primary" by default
  blockBookingSlots: boolean; // default true
  autoAddMeetLink: boolean; // default false
  connectedAt: string; // ISO 8601
}
