import mongoose, { Schema } from 'mongoose';
import type { DiscussionVote } from '@/types';

export interface DiscussionVoteDocument extends Omit<DiscussionVote, 'id'> {
  _id: string;
}

const DiscussionVoteSchema = new Schema<DiscussionVoteDocument>(
  {
    _id: { type: String, required: true },
    discussionId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    voteType: {
      type: String,
      enum: ['up', 'down'],
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'discussion_votes',
  }
);

// Compound unique index - one vote per user per discussion
DiscussionVoteSchema.index({ discussionId: 1, userId: 1 }, { unique: true });

// Prevent model recompilation in development
export default mongoose.models.DiscussionVote ||
  mongoose.model<DiscussionVoteDocument>('DiscussionVote', DiscussionVoteSchema);
