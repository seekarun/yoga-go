import mongoose, { Schema } from 'mongoose';
import type { Discussion } from '@/types';

export interface DiscussionDocument extends Omit<Discussion, 'id'> {
  _id: string;
}

const DiscussionSchema = new Schema<DiscussionDocument>(
  {
    _id: { type: String, required: true },
    courseId: { type: String, required: true, index: true },
    lessonId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    userRole: {
      type: String,
      enum: ['learner', 'expert'],
      required: true,
    },
    userName: { type: String, required: true },
    userAvatar: String,
    content: { type: String, required: true },
    parentId: { type: String, index: true }, // null for top-level discussions
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 },
    isPinned: { type: Boolean, default: false },
    isResolved: { type: Boolean, default: false },
    isHidden: { type: Boolean, default: false },
    editedAt: String,
    deletedAt: String,
  },
  {
    timestamps: true,
    collection: 'discussions',
  }
);

// Compound indexes for efficient queries
DiscussionSchema.index({ courseId: 1, lessonId: 1 });
DiscussionSchema.index({ courseId: 1, createdAt: -1 });
DiscussionSchema.index({ parentId: 1, createdAt: 1 });

// Prevent model recompilation in development
export default mongoose.models.Discussion ||
  mongoose.model<DiscussionDocument>('Discussion', DiscussionSchema);
