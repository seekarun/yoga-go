/**
 * Subscription Types for CallyGo Platform Billing
 * Separate from Stripe Connect (booking payments) — this handles tenant subscriptions
 */

export type SubscriptionTier = "starter" | "professional" | "business";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

export interface SubscriptionConfig {
  customerId: string; // Stripe Customer ID (cus_xxx)
  subscriptionId: string; // Stripe Subscription ID (sub_xxx)
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodStart: string; // ISO 8601
  currentPeriodEnd: string; // ISO 8601
  trialEnd?: string; // ISO 8601 — present when trialing
  cancelAtPeriodEnd: boolean;
  subscribedAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
