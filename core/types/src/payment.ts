// Payment Types - Payment processing types

import type { BaseEntity } from "./base";

/**
 * Payment status
 */
export type PaymentStatus =
  | "initiated"
  | "pending"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "refunded";

/**
 * Payment gateway
 */
export type PaymentGateway = "stripe" | "razorpay";

/**
 * Payment type
 */
export type PaymentType =
  | "course_enrollment"
  | "webinar_registration"
  | "one_time"
  | "boost_campaign";

/**
 * Payment metadata
 */
export interface PaymentMetadata {
  chargeId?: string;
  customerId?: string;
  last4?: string;
  brand?: string;
  country?: string;
  errorCode?: string;
  errorMessage?: string;
  declineCode?: string;
  userAgent?: string;
  ipAddress?: string;
  [key: string]: unknown;
}

/**
 * Payment transaction record
 */
export interface PaymentTransaction extends BaseEntity {
  userId: string;
  courseId?: string;
  webinarId?: string;
  itemType: PaymentType;
  itemId: string;
  amount: number;
  currency: string;
  gateway: PaymentGateway;
  status: PaymentStatus;
  paymentIntentId: string;
  paymentMethodId?: string;
  initiatedAt: string;
  completedAt?: string;
  failedAt?: string;
  refundedAt?: string;
  metadata?: PaymentMetadata;
}

/**
 * Wallet transaction types
 */
export type WalletTransactionType =
  | "deposit"
  | "boost_spend"
  | "refund"
  | "adjustment";

export type WalletTransactionStatus = "pending" | "completed" | "failed";

/**
 * Wallet transaction record
 */
export interface WalletTransaction extends BaseEntity {
  expertId: string;
  type: WalletTransactionType;
  amount: number;
  currency: string;
  status: WalletTransactionStatus;
  paymentIntentId?: string;
  boostId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Expert wallet balance
 */
export interface ExpertWallet extends BaseEntity {
  expertId: string;
  balance: number;
  currency: string;
  totalDeposited: number;
  totalSpent: number;
  lastTransactionAt?: string;
}
