import mongoose, { Schema } from 'mongoose';
import type { LiveSession, LiveSessionMetadata, LiveSessionHMSDetails } from '@/types';

export interface LiveSessionDocument extends Omit<LiveSession, 'id'> {
  _id: string;
}

const LiveSessionMetadataSchema = new Schema<LiveSessionMetadata>(
  {
    tags: [{ type: String }],
    difficulty: String,
    equipment: [{ type: String }],
    category: String,
  },
  { _id: false }
);

const LiveSessionHMSDetailsSchema = new Schema<LiveSessionHMSDetails>(
  {
    roomId: { type: String, required: true },
    roomCode: { type: String, required: true },
    sessionId: String, // Optional - populated when first person joins
    recordingId: String,
  },
  { _id: false }
);

const LiveSessionSchema = new Schema<LiveSessionDocument>(
  {
    _id: { type: String, required: true },
    expertId: { type: String, required: true, index: true },
    expertName: { type: String, required: true },
    expertAvatar: String,

    title: { type: String, required: true },
    description: { type: String, required: true },
    thumbnail: String,

    sessionType: {
      type: String,
      enum: ['1-on-1', 'group', 'workshop', 'instant'],
      required: true,
    },
    instantMeetingCode: String, // Shareable code for instant meetings
    scheduledStartTime: { type: String, required: true, index: true },
    scheduledEndTime: { type: String, required: true },
    actualStartTime: String,
    actualEndTime: String,

    maxParticipants: Number,
    currentViewers: { type: Number, default: 0 },

    price: { type: Number, required: true, default: 0 },
    currency: { type: String, default: 'INR' },

    hmsDetails: LiveSessionHMSDetailsSchema,

    status: {
      type: String,
      enum: ['scheduled', 'live', 'ended', 'cancelled'],
      default: 'scheduled',
      index: true,
    },

    recordingS3Key: String,
    recordedLessonId: String,
    recordingAvailable: { type: Boolean, default: false },

    enrolledCount: { type: Number, default: 0 },
    attendedCount: { type: Number, default: 0 },

    metadata: LiveSessionMetadataSchema,

    featured: { type: Boolean, default: false },
    isFree: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: 'live_sessions',
  }
);

// Indexes for common queries
LiveSessionSchema.index({ status: 1, scheduledStartTime: 1 });
LiveSessionSchema.index({ expertId: 1, status: 1 });
LiveSessionSchema.index({ featured: 1, scheduledStartTime: 1 });
LiveSessionSchema.index({ 'metadata.category': 1 });

// Pre-save hook to set isFree flag
LiveSessionSchema.pre('save', function (next) {
  this.isFree = this.price === 0;
  next();
});

// Prevent model recompilation in development
export default mongoose.models.LiveSession ||
  mongoose.model<LiveSessionDocument>('LiveSession', LiveSessionSchema);
