import mongoose, { Schema } from 'mongoose';
import type { LiveSessionParticipant } from '@/types';

export interface LiveSessionParticipantDocument extends Omit<LiveSessionParticipant, 'id'> {
  _id: string;
}

const LiveSessionParticipantSchema = new Schema<LiveSessionParticipantDocument>(
  {
    _id: { type: String, required: true },
    sessionId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    userAvatar: String,

    enrolledAt: { type: String, required: true },
    attended: { type: Boolean, default: false },
    joinedAt: String,
    leftAt: String,
    watchTime: { type: Number, default: 0 },

    paid: { type: Boolean, default: false },
    paymentId: String,
    paymentGateway: {
      type: String,
      enum: ['stripe', 'razorpay'],
    },
    amountPaid: Number,

    chatMessages: { type: Number, default: 0 },
    feedbackRating: Number,
    feedbackComment: String,
  },
  {
    timestamps: true,
    collection: 'live_session_participants',
  }
);

// Compound indexes for common queries
LiveSessionParticipantSchema.index({ sessionId: 1, userId: 1 }, { unique: true });
LiveSessionParticipantSchema.index({ userId: 1, enrolledAt: -1 });
LiveSessionParticipantSchema.index({ sessionId: 1, attended: 1 });

// Prevent model recompilation in development
export default mongoose.models.LiveSessionParticipant ||
  mongoose.model<LiveSessionParticipantDocument>(
    'LiveSessionParticipant',
    LiveSessionParticipantSchema
  );
