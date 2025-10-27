import mongoose, { Schema } from 'mongoose';
import type {
  BillingInterval,
  SubscriptionStatus,
  PaymentGateway,
  PlanType,
} from '@/config/payment';

/**
 * Subscription Model
 * Tracks user subscriptions with recurring billing
 */

export interface PaymentMethod {
  last4: string; // Last 4 digits of card/account
  brand: string; // Visa, MasterCard, UPI, etc.
  expiryMonth?: number;
  expiryYear?: number;
  type: 'card' | 'upi' | 'netbanking' | 'wallet';
}

export interface SubscriptionDocument {
  _id: string;
  userId: string;

  // Plan details
  planType: PlanType; // 'curious' | 'committed'
  billingInterval: BillingInterval; // 'monthly' | 'yearly'

  // Status and lifecycle
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: Date;
  cancelReason?: string;

  // Billing
  amount: number; // Amount in smallest currency unit (paise/cents)
  currency: string; // 'INR' | 'USD'
  nextBillingDate?: Date;
  lastBillingDate?: Date;

  // Payment gateway details
  gateway: PaymentGateway; // 'stripe' | 'razorpay'
  gatewaySubscriptionId: string; // Stripe subscription ID or Razorpay subscription ID
  gatewayCustomerId: string; // Stripe customer ID or Razorpay customer ID
  paymentMethod?: PaymentMethod;

  // Trial (if applicable)
  trialStart?: Date;
  trialEnd?: Date;

  // Failed payment tracking
  failedPaymentCount: number;
  lastFailedPaymentAt?: Date;

  // Metadata
  metadata?: Record<string, any>;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const PaymentMethodSchema = new Schema<PaymentMethod>(
  {
    last4: { type: String, required: true },
    brand: { type: String, required: true },
    expiryMonth: Number,
    expiryYear: Number,
    type: {
      type: String,
      required: true,
      enum: ['card', 'upi', 'netbanking', 'wallet'],
    },
  },
  { _id: false }
);

const SubscriptionSchema = new Schema<SubscriptionDocument>(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },

    planType: {
      type: String,
      required: true,
      enum: ['curious', 'committed'],
      index: true,
    },
    billingInterval: {
      type: String,
      required: true,
      enum: ['monthly', 'yearly'],
    },

    status: {
      type: String,
      required: true,
      enum: ['active', 'cancelled', 'expired', 'past_due', 'incomplete', 'trialing'],
      index: true,
    },
    currentPeriodStart: { type: Date, required: true },
    currentPeriodEnd: { type: Date, required: true, index: true },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    cancelledAt: Date,
    cancelReason: String,

    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    nextBillingDate: Date,
    lastBillingDate: Date,

    gateway: {
      type: String,
      required: true,
      enum: ['stripe', 'razorpay'],
    },
    gatewaySubscriptionId: { type: String, required: true, unique: true, index: true },
    gatewayCustomerId: { type: String, required: true, index: true },
    paymentMethod: PaymentMethodSchema,

    trialStart: Date,
    trialEnd: Date,

    failedPaymentCount: { type: Number, default: 0 },
    lastFailedPaymentAt: Date,

    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
    collection: 'subscriptions',
  }
);

// Compound indexes for common queries
SubscriptionSchema.index({ userId: 1, status: 1 });
SubscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });
SubscriptionSchema.index({ userId: 1, planType: 1, status: 1 });
SubscriptionSchema.index({ gateway: 1, gatewaySubscriptionId: 1 });

// Prevent model recompilation in development
export default mongoose.models.Subscription ||
  mongoose.model<SubscriptionDocument>('Subscription', SubscriptionSchema);
