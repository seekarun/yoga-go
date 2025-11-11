import mongoose, { Schema } from 'mongoose';
import { nanoid } from 'nanoid';

export interface TeachingLeadDocument {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  bio: string;
  reasonForTeaching: string;
  submittedAt: Date;
  status: 'pending' | 'contacted' | 'approved' | 'rejected';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TeachingLeadSchema = new Schema<TeachingLeadDocument>(
  {
    _id: {
      type: String,
      default: () => nanoid(),
    },
    name: { type: String, required: true },
    email: { type: String, required: true, index: true },
    phone: { type: String },
    bio: { type: String, required: true },
    reasonForTeaching: { type: String, required: true },
    submittedAt: { type: Date, default: Date.now, required: true },
    status: {
      type: String,
      enum: ['pending', 'contacted', 'approved', 'rejected'],
      default: 'pending',
      required: true,
    },
    notes: { type: String },
  },
  {
    timestamps: true,
    collection: 'teaching_leads',
  }
);

// Indexes for common queries
TeachingLeadSchema.index({ status: 1, submittedAt: -1 });
TeachingLeadSchema.index({ email: 1 });

// Prevent model recompilation in development
export default mongoose.models.TeachingLead ||
  mongoose.model<TeachingLeadDocument>('TeachingLead', TeachingLeadSchema);
