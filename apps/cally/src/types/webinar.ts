/**
 * Webinar Types for CallyGo
 */

import type { RecurrenceRule } from "@core/types";

/**
 * Webinar schedule configuration — stored on the Product entity
 */
export interface WebinarSchedule {
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm (in tenant's timezone)
  endTime: string; // HH:mm (in tenant's timezone)
  recurrenceRule?: RecurrenceRule; // reuse existing type
  sessionCount: number; // total number of sessions
}

/**
 * Payment status for a webinar signup
 */
export type WebinarSignupPaymentStatus = "free" | "pending_payment" | "paid";

/**
 * Webinar signup entity — tracks a visitor enrolled in a webinar
 */
export interface WebinarSignup {
  productId: string;
  visitorName: string;
  visitorEmail: string;
  signedUpAt: string; // ISO 8601
  paymentStatus: WebinarSignupPaymentStatus;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  cancelledAt?: string; // ISO 8601
  cancelledBy?: "visitor" | "tenant";
  refundAmountCents?: number;
  stripeRefundId?: string;
}

/**
 * Status for a webinar waitlist entry
 */
export type WebinarWaitlistStatus =
  | "waiting"
  | "notified"
  | "booked"
  | "expired";

/**
 * Webinar waitlist entry — tracks a visitor waiting for a spot in a webinar
 */
export interface WebinarWaitlistEntry {
  id: string;
  tenantId: string;
  productId: string;
  visitorName: string;
  visitorEmail: string;
  status: WebinarWaitlistStatus;
  position: number;
  createdAt: string; // ISO 8601
  notifiedAt?: string; // ISO 8601
  expiresAt?: string; // ISO 8601
  bookedAt?: string; // ISO 8601
}
