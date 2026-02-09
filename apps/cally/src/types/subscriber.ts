/**
 * Tenant Subscriber Types
 * Visitors who sign up via booking emails or landing pages
 */

import type { VisitorInfo } from "@core/types";

export type SubscriberSource = "booking_email" | "google" | "direct";

export interface TenantSubscriber {
  email: string;
  name: string;
  cognitoSub?: string;
  avatar?: string;
  subscribedAt: string;
  source: SubscriberSource;
}

export type UserType = "registered" | "visitor" | "contact";

export interface CallyUser {
  email: string;
  name: string;
  userType: UserType;
  cognitoSub?: string;
  avatar?: string;
  subscribedAt?: string;
  source?: SubscriberSource;
  lastBookingDate?: string;
  lastBookingStatus?: string;
  totalBookings?: number;
  lastContactDate?: string;
  totalContacts?: number;
  anonymous?: boolean;
  visitorInfo?: VisitorInfo;
}
