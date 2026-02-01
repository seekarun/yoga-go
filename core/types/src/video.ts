// Video Types - Webinar, recording, and video conference types

import type { BaseEntity } from "./base";
import type { SupportedCurrency } from "./currency";
import type { ReviewStatus } from "./content";

/**
 * Webinar status
 */
export type WebinarStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "LIVE"
  | "COMPLETED"
  | "CANCELLED";

/**
 * Video platform for webinar sessions
 */
export type VideoPlatform = "google_meet" | "zoom" | "100ms" | "none";

/**
 * Recording status
 */
export type RecordingStatus =
  | "pending"
  | "uploading"
  | "processing"
  | "ready"
  | "error";

/**
 * Webinar session
 */
export interface WebinarSession {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  duration: number;
  googleMeetLink?: string;
  googleEventId?: string;
  zoomMeetingId?: string;
  zoomMeetingLink?: string;
  zoomJoinUrl?: string;
  zoomStartUrl?: string;
  zoomPassword?: string;
  recordingCloudflareId?: string;
  recordingStatus?: RecordingStatus;
  hmsRoomId?: string;
  hmsTemplateId?: string;
}

/**
 * Webinar feedback
 */
export interface WebinarFeedback {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  createdAt: string;
  status: ReviewStatus;
}

/**
 * Main Webinar entity - parameterized for vertical-specific categories and levels
 */
export interface Webinar<
  TCategory extends string = string,
  TLevel extends string = string,
  TCurrency extends string = SupportedCurrency,
> extends BaseEntity {
  expertId: string;
  title: string;
  description: string;
  thumbnail?: string;
  coverImage?: string;
  promoVideoCloudflareId?: string;
  promoVideoStatus?: "uploading" | "processing" | "ready" | "error";
  price: number;
  currency: TCurrency;
  maxParticipants?: number;
  status: WebinarStatus;
  videoPlatform?: VideoPlatform;
  sessions: WebinarSession[];
  totalRegistrations: number;
  rating?: number;
  totalRatings?: number;
  tags?: string[];
  category?: TCategory;
  level?: TLevel;
  requirements?: string[];
  whatYouWillLearn?: string[];
  feedback?: WebinarFeedback[];
  isOpen?: boolean;
}

/**
 * Webinar registration status
 */
export type WebinarRegistrationStatus =
  | "registered"
  | "cancelled"
  | "attended"
  | "no_show";

/**
 * Webinar reminders sent tracking
 */
export interface WebinarRemindersSent {
  dayBefore?: boolean;
  hourBefore?: boolean;
}

/**
 * Webinar registration record
 */
export interface WebinarRegistration extends BaseEntity {
  webinarId: string;
  userId: string;
  expertId: string;
  userName?: string;
  userEmail?: string;
  registeredAt: string;
  paymentId?: string;
  status: WebinarRegistrationStatus;
  remindersSent: WebinarRemindersSent;
  attendedSessions?: string[];
  feedbackSubmitted?: boolean;
}

/**
 * Expert's Google OAuth tokens
 */
export interface ExpertGoogleAuth extends BaseEntity {
  expertId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  email: string;
  scope: string;
}

/**
 * Expert's Zoom OAuth tokens
 */
export interface ExpertZoomAuth extends BaseEntity {
  expertId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  email: string;
  accountId: string;
  userId: string;
  scope: string;
}

/**
 * Recording source
 */
export type RecordingSource = "zoom" | "google_meet" | "upload" | "live";

/**
 * Recording import status
 */
export type RecordingImportStatus =
  | "pending"
  | "downloading"
  | "uploading"
  | "processing"
  | "ready"
  | "failed";

/**
 * Recording entity
 */
export interface Recording extends BaseEntity {
  expertId: string;
  source: RecordingSource;
  sourceId: string;
  sourceMeetingTopic?: string;
  title: string;
  description?: string;
  duration: number;
  fileSize: number;
  cloudflareStreamId?: string;
  cloudflarePlaybackUrl?: string;
  thumbnailUrl?: string;
  status: RecordingImportStatus;
  statusMessage?: string;
  downloadUrl?: string;
  webinarId?: string;
  sessionId?: string;
  courseId?: string;
  lessonId?: string;
  recordedAt?: string;
  importedAt?: string;
  processedAt?: string;
  hmsAssetId?: string;
  hmsRoomId?: string;
  hmsSessionId?: string;
}

/**
 * Recording list result
 */
export interface RecordingListResult {
  recordings: Recording[];
  totalCount: number;
  lastKey?: string;
}

/**
 * Recording filters
 */
export interface RecordingFilters {
  source?: RecordingSource;
  status?: RecordingImportStatus;
  webinarId?: string;
  search?: string;
  limit?: number;
  lastKey?: string;
}
