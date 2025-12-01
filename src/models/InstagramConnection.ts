import mongoose, { Schema } from 'mongoose';
import type { InstagramConnection } from '@/types';

export interface InstagramConnectionDocument extends Omit<InstagramConnection, 'id'> {
  _id: string;
}

const InstagramConnectionSchema = new Schema<InstagramConnectionDocument>(
  {
    _id: { type: String, required: true },
    instagramUserId: { type: String, required: true, unique: true, index: true },
    instagramUsername: { type: String, required: true },
    facebookPageId: { type: String, required: true },
    facebookPageName: { type: String, required: true },
    accessToken: { type: String, required: true }, // Stored encrypted
    tokenExpiresAt: { type: String, required: true },
    connectedAt: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    profilePictureUrl: String,
    followersCount: Number,
    // Optional: link to expert when auth is available
    expertId: { type: String, index: true },
  },
  {
    timestamps: true,
    collection: 'instagram_connections',
  }
);

// Index for finding active connections
InstagramConnectionSchema.index({ isActive: 1 });

// Prevent model recompilation in development
export default mongoose.models.InstagramConnection ||
  mongoose.model<InstagramConnectionDocument>('InstagramConnection', InstagramConnectionSchema);
