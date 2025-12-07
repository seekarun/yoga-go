/**
 * Calel Types - Shared type definitions for Calendar & Scheduling
 *
 * These types are used by:
 * - apps/calel (the scheduling service)
 * - packages/calel-ui (React components)
 * - Consumer apps like yoga-go
 */

// ============================================
// Tenant - Service account (org/business)
// ============================================

export interface CalendarTenant {
  id: string;
  name: string;
  slug: string;
  apiKey: string; // Hashed
  apiKeyPrefix: string; // For lookup (first 8 chars)
  settings: TenantSettings;
  status: TenantStatus;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface TenantSettings {
  defaultTimezone: string;
  brandingColor?: string;
  logoUrl?: string;
  allowPublicBooking: boolean;
  requireEmailVerification: boolean;
}

export type TenantStatus = 'active' | 'suspended' | 'pending';

// ============================================
// Host - Person with calendar
// ============================================

export interface CalendarHost {
  id: string;
  tenantId: string;
  externalUserId?: string; // Link to external system (e.g., yoga-go user)
  email: string;
  name: string;
  timezone: string;
  slug: string;
  avatarUrl?: string;
  bio?: string;
  settings: HostSettings;
  integrations?: HostIntegrations;
  status: HostStatus;
  createdAt: string;
  updatedAt: string;
}

export interface HostSettings {
  bufferBefore?: number; // Minutes before meeting
  bufferAfter?: number; // Minutes after meeting
  minimumNotice?: number; // Hours before booking allowed
  maximumAdvance?: number; // Days in advance booking allowed
  defaultEventDuration?: number; // Default event duration in minutes
}

export interface HostIntegrations {
  zoomUserId?: string;
  zoomAccessToken?: string;
  zoomRefreshToken?: string;
  zoomTokenExpiry?: string;
  googleCalendarId?: string;
  googleAccessToken?: string;
  googleRefreshToken?: string;
  googleTokenExpiry?: string;
}

export type HostStatus = 'active' | 'inactive' | 'pending';

// ============================================
// Availability - Weekly recurring schedule
// ============================================

export interface Availability {
  id: string;
  hostId: string;
  name: string; // e.g., "Working Hours", "Weekend Hours"
  isDefault: boolean;
  timezone: string;
  schedule: WeeklySchedule;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklySchedule {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
}

export interface TimeSlot {
  start: string; // HH:mm format
  end: string; // HH:mm format
}

// ============================================
// DateOverride - Single day overrides
// ============================================

export interface DateOverride {
  hostId: string;
  date: string; // YYYY-MM-DD format
  type: OverrideType;
  slots?: TimeSlot[]; // Only for 'custom' type
  reason?: string;
  createdAt: string;
}

export type OverrideType = 'unavailable' | 'custom';

// ============================================
// EventType - Bookable event types
// ============================================

export interface EventType {
  id: string;
  hostId: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  duration: number; // Minutes
  type: EventTypeKind;
  maxAttendees?: number; // For group events
  location: EventLocation;
  color?: string; // For calendar display
  questions?: BookingQuestion[];
  isActive: boolean;
  isPublic: boolean;
  price?: EventPrice;
  createdAt: string;
  updatedAt: string;
}

export type EventTypeKind = 'one-on-one' | 'group';

export interface EventLocation {
  type: LocationType;
  details?: string; // Address for in-person, custom URL, etc.
}

export type LocationType = 'zoom' | 'google-meet' | 'in-person' | 'phone' | 'custom';

export interface BookingQuestion {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  options?: string[]; // For 'select' type
  placeholder?: string;
}

export type QuestionType = 'text' | 'textarea' | 'select' | 'email' | 'phone';

export interface EventPrice {
  amount: number; // In smallest currency unit (cents)
  currency: string; // ISO 4217 (USD, AUD, etc.)
}

// ============================================
// Booking - Scheduled appointments
// ============================================

export interface Booking {
  id: string;
  tenantId: string;
  hostId: string;
  eventTypeId: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  timezone: string;
  status: BookingStatus;
  attendee: BookingAttendee;
  meetingLink?: string;
  meetingPlatform?: LocationType;
  meetingId?: string; // External meeting ID (Zoom, etc.)
  notes?: string;
  cancelReason?: string;
  rescheduleToken?: string; // For attendee self-service
  confirmationToken?: string; // For email confirmation
  remindersSent: string[]; // ISO timestamps of sent reminders
  createdAt: string;
  updatedAt: string;
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

export interface BookingAttendee {
  name: string;
  email: string;
  phone?: string;
  timezone?: string;
  responses?: Record<string, string>; // Question ID -> Answer
}

// ============================================
// Webhook - Event subscriptions
// ============================================

export interface Webhook {
  id: string;
  tenantId: string;
  url: string;
  events: WebhookEvent[];
  secret: string; // For signature verification
  isActive: boolean;
  failureCount: number;
  lastFailure?: string; // ISO timestamp
  createdAt: string;
  updatedAt: string;
}

export type WebhookEvent =
  | 'booking.created'
  | 'booking.confirmed'
  | 'booking.cancelled'
  | 'booking.rescheduled'
  | 'booking.completed'
  | 'host.created'
  | 'host.updated';

export interface WebhookPayload<T = unknown> {
  id: string;
  event: WebhookEvent;
  timestamp: string;
  data: T;
}

// ============================================
// API Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string>;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextToken?: string;
  total?: number;
}

// ============================================
// Availability Query Types
// ============================================

export interface AvailabilityQuery {
  hostSlug: string;
  eventTypeSlug: string;
  date: string; // YYYY-MM-DD
  timezone: string;
}

export interface AvailableSlot {
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  available: boolean;
}

export interface AvailabilityResponse {
  date: string;
  timezone: string;
  slots: AvailableSlot[];
}

// ============================================
// Booking Request Types
// ============================================

export interface CreateBookingRequest {
  hostSlug: string;
  eventTypeSlug: string;
  startTime: string; // ISO 8601
  timezone: string;
  attendee: {
    name: string;
    email: string;
    phone?: string;
    responses?: Record<string, string>;
  };
}

export interface RescheduleBookingRequest {
  bookingId: string;
  token: string;
  newStartTime: string;
  timezone: string;
}

export interface CancelBookingRequest {
  bookingId: string;
  token: string;
  reason?: string;
}

// ============================================
// Admin API Types
// ============================================

export interface CreateHostRequest {
  email: string;
  name: string;
  timezone: string;
  slug?: string; // Auto-generated if not provided
  externalUserId?: string;
  settings?: Partial<HostSettings>;
}

export interface UpdateHostRequest {
  name?: string;
  timezone?: string;
  slug?: string;
  bio?: string;
  avatarUrl?: string;
  settings?: Partial<HostSettings>;
  status?: HostStatus;
}

export interface CreateEventTypeRequest {
  name: string;
  slug?: string;
  description?: string;
  duration: number;
  type?: EventTypeKind;
  maxAttendees?: number;
  location: EventLocation;
  color?: string;
  questions?: BookingQuestion[];
  isPublic?: boolean;
  price?: EventPrice;
}

export interface UpdateEventTypeRequest {
  name?: string;
  slug?: string;
  description?: string;
  duration?: number;
  maxAttendees?: number;
  location?: EventLocation;
  color?: string;
  questions?: BookingQuestion[];
  isActive?: boolean;
  isPublic?: boolean;
  price?: EventPrice;
}

// ============================================
// Widget Configuration Types
// ============================================

export interface BookingWidgetConfig {
  apiUrl: string;
  hostSlug: string;
  eventTypeSlug?: string; // If not provided, shows all event types
  theme?: WidgetTheme;
  locale?: string;
  onBookingComplete?: (booking: Booking) => void;
  onError?: (error: ApiError) => void;
}

export interface WidgetTheme {
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: string;
  fontFamily?: string;
}

// ============================================
// Notification Types
// ============================================

export interface NotificationPayload {
  type: NotificationType;
  bookingId: string;
  recipientEmail: string;
  recipientName: string;
  data: Record<string, string>;
}

export type NotificationType =
  | 'booking_confirmation'
  | 'booking_cancelled'
  | 'booking_rescheduled'
  | 'reminder_24h'
  | 'reminder_1h'
  | 'host_new_booking'
  | 'host_booking_cancelled';
