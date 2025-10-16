import mongoose, { Schema } from 'mongoose';

/**
 * Payment Model
 * Tracks all payment attempts, successes, and failures for course enrollments
 */

export type PaymentStatus =
  | 'initiated' // Payment intent created
  | 'pending' // Payment processing
  | 'succeeded' // Payment successful
  | 'failed' // Payment failed
  | 'cancelled' // Payment cancelled by user
  | 'refunded'; // Payment refunded

export type PaymentGateway = 'stripe' | 'razorpay';

export type PaymentType = 'course_enrollment' | 'subscription' | 'one_time';

export interface PaymentMetadata {
  // Gateway-specific IDs
  chargeId?: string;
  customerId?: string;
  subscriptionId?: string;

  // Payment details
  last4?: string; // Last 4 digits of card
  brand?: string; // Card brand (Visa, MasterCard, etc.)
  country?: string;

  // Error details (if failed)
  errorCode?: string;
  errorMessage?: string;
  declineCode?: string;

  // User context
  userAgent?: string;
  ipAddress?: string;

  // Additional metadata
  [key: string]: any;
}

export interface PaymentDocument {
  _id: string;
  userId: string;
  courseId?: string; // For course enrollments
  itemType: PaymentType;
  itemId: string; // Course ID or subscription ID

  // Payment details
  amount: number; // Amount in smallest currency unit (cents)
  currency: string; // USD, INR, etc.
  gateway: PaymentGateway;
  status: PaymentStatus;

  // Gateway references
  paymentIntentId: string; // Stripe PaymentIntent ID or Razorpay Order ID
  paymentMethodId?: string;

  // Timestamps
  initiatedAt: Date;
  completedAt?: Date;
  failedAt?: Date;
  refundedAt?: Date;

  // Additional context
  metadata?: PaymentMetadata;
}

const PaymentSchema = new Schema<PaymentDocument>(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    courseId: { type: String, index: true },
    itemType: {
      type: String,
      required: true,
      enum: ['course_enrollment', 'subscription', 'one_time'],
    },
    itemId: { type: String, required: true },

    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    gateway: {
      type: String,
      required: true,
      enum: ['stripe', 'razorpay'],
    },
    status: {
      type: String,
      required: true,
      enum: ['initiated', 'pending', 'succeeded', 'failed', 'cancelled', 'refunded'],
      index: true,
    },

    paymentIntentId: { type: String, required: true, unique: true, index: true },
    paymentMethodId: String,

    initiatedAt: { type: Date, required: true, index: true },
    completedAt: Date,
    failedAt: Date,
    refundedAt: Date,

    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
    collection: 'payments',
  }
);

// Compound indexes for common queries
PaymentSchema.index({ userId: 1, status: 1, initiatedAt: -1 });
PaymentSchema.index({ courseId: 1, status: 1, initiatedAt: -1 });
PaymentSchema.index({ status: 1, initiatedAt: -1 });

// Prevent model recompilation in development
export default mongoose.models.Payment || mongoose.model<PaymentDocument>('Payment', PaymentSchema);
