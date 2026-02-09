/**
 * Phone Calling Types for Cally
 * Types for AI phone calling, morning briefings, and Twilio integration
 */

/**
 * OpenAI TTS Voice options
 * @see https://platform.openai.com/docs/guides/text-to-speech
 */
export type TtsVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

/**
 * Days of the week (0 = Sunday, 6 = Saturday)
 */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Phone configuration stored per tenant
 */
export interface PhoneConfig {
  // Phone number settings
  phoneNumber?: string; // E.164 format: +61412345678
  phoneNumberVerified?: boolean;
  phoneNumberVerifiedAt?: string;

  // Morning briefing settings
  morningBriefingEnabled: boolean;
  morningBriefingTime?: string; // HH:MM in tenant timezone (e.g., "07:30")
  morningBriefingTimezone?: string; // IANA timezone (e.g., "Australia/Sydney")
  morningBriefingDays?: DayOfWeek[]; // Days to run (default: weekdays 1-5)

  // Voice preferences
  voiceId?: TtsVoice; // OpenAI TTS voice (default: "nova")

  // Briefing content preferences
  includeCalendarEvents?: boolean; // Include calendar events in briefing
  includeUnreadEmails?: boolean; // Include email summary in briefing

  // Call history tracking
  lastBriefingCallAt?: string;
  lastBriefingCallStatus?: CallStatus;
  lastBriefingCallSid?: string; // Twilio Call SID
}

/**
 * Twilio call status
 * @see https://www.twilio.com/docs/voice/api/call-resource#status-values
 */
export type CallStatus =
  | "queued"
  | "ringing"
  | "in-progress"
  | "completed"
  | "busy"
  | "failed"
  | "no-answer"
  | "canceled";

/**
 * Call record stored in DynamoDB
 */
export interface CallRecord {
  id: string;
  tenantId: string;
  callSid: string; // Twilio Call SID
  callType: "briefing" | "custom";
  phoneNumber: string;
  status: CallStatus;
  duration?: number; // seconds
  customMessage?: string; // For custom calls
  briefingContent?: string; // For briefing calls
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

/**
 * Phone verification status
 */
export interface VerificationStatus {
  phoneNumber: string;
  status: "pending" | "approved" | "canceled" | "expired";
  verificationSid?: string;
}

/**
 * Initiate verification request
 */
export interface InitiateVerificationRequest {
  phoneNumber: string; // E.164 format
}

/**
 * Confirm verification request
 */
export interface ConfirmVerificationRequest {
  phoneNumber: string;
  code: string; // 6-digit SMS code
}

/**
 * Phone settings update request
 */
export interface UpdatePhoneSettingsRequest {
  phoneNumber?: string;
  morningBriefingEnabled?: boolean;
  morningBriefingTime?: string;
  morningBriefingTimezone?: string;
  morningBriefingDays?: DayOfWeek[];
  voiceId?: TtsVoice;
  includeCalendarEvents?: boolean;
  includeUnreadEmails?: boolean;
}

/**
 * Custom call request
 */
export interface CustomCallRequest {
  message: string;
  enhanceWithAi?: boolean; // Optionally polish message with AI
}

/**
 * Briefing content structure
 */
export interface BriefingContent {
  greeting: string;
  calendarSummary?: string;
  emailSummary?: string;
  closing: string;
  fullScript: string;
}

/**
 * Calendar event for briefing
 */
export interface BriefingCalendarEvent {
  title: string;
  startTime: string; // HH:MM format
  endTime?: string;
  location?: string;
}

/**
 * Email summary for briefing
 */
export interface BriefingEmailSummary {
  from: string;
  subject: string;
  preview?: string;
}

/**
 * Default phone configuration
 */
export const DEFAULT_PHONE_CONFIG: PhoneConfig = {
  morningBriefingEnabled: false,
  morningBriefingTime: "07:30",
  morningBriefingTimezone: "Australia/Sydney",
  morningBriefingDays: [1, 2, 3, 4, 5], // Mon-Fri
  voiceId: "nova",
  includeCalendarEvents: true,
  includeUnreadEmails: true,
};

/**
 * Re-export shared timezone list for backward compatibility
 */
export { SUPPORTED_TIMEZONES } from "@/lib/timezones";

/**
 * Day names for UI
 */
export const DAY_NAMES: Record<DayOfWeek, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

/**
 * Voice descriptions for UI
 */
export const VOICE_OPTIONS: Array<{
  id: TtsVoice;
  name: string;
  description: string;
}> = [
  { id: "nova", name: "Nova", description: "Warm and friendly female voice" },
  { id: "alloy", name: "Alloy", description: "Neutral and balanced voice" },
  { id: "echo", name: "Echo", description: "Clear male voice" },
  { id: "fable", name: "Fable", description: "Expressive British accent" },
  { id: "onyx", name: "Onyx", description: "Deep male voice" },
  { id: "shimmer", name: "Shimmer", description: "Gentle female voice" },
];
