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
}
