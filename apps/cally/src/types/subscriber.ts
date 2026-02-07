/**
 * Tenant Subscriber Types
 * Visitors who sign up via booking emails or landing pages
 */

export type SubscriberSource = "booking_email" | "google" | "direct";

export interface TenantSubscriber {
  email: string;
  name: string;
  cognitoSub?: string;
  avatar?: string;
  subscribedAt: string;
  source: SubscriberSource;
}
