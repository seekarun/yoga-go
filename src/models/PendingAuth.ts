/**
 * PendingAuth Model
 *
 * Temporarily stores role information during Auth0 OAuth flow.
 * Records are created when user initiates login and deleted after successful callback.
 */

import { Schema, model, models } from 'mongoose';
import { nanoid } from 'nanoid';
import type { UserRole } from '@/types';

export interface PendingAuthDocument {
  _id: string;
  role: UserRole[];
  createdAt: Date;
  expiresAt: Date;
}

const PendingAuthSchema = new Schema<PendingAuthDocument>(
  {
    _id: {
      type: String,
      default: () => nanoid(32),
    },
    role: {
      type: [String],
      enum: ['learner', 'expert', 'admin'],
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    collection: 'pending_auths',
  }
);

// TTL index to automatically delete expired records
PendingAuthSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PendingAuth =
  models.PendingAuth || model<PendingAuthDocument>('PendingAuth', PendingAuthSchema);
