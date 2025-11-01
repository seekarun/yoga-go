import mongoose, { Schema } from 'mongoose';
import type { ExpertAvailability } from '@/types';

export interface ExpertAvailabilityDocument extends Omit<ExpertAvailability, 'id'> {
  _id: string;
}

const ExpertAvailabilitySchema = new Schema<ExpertAvailabilityDocument>(
  {
    _id: { type: String, required: true },
    expertId: { type: String, required: true, index: true },
    dayOfWeek: { type: Number, min: 0, max: 6 }, // 0=Sunday, 6=Saturday
    date: String, // ISO date string for one-time slots
    startTime: { type: String, required: true }, // "09:00"
    endTime: { type: String, required: true }, // "17:00"
    isRecurring: { type: Boolean, required: true, default: true },
    isActive: { type: Boolean, required: true, default: true, index: true },
  },
  {
    timestamps: true,
    collection: 'expert_availability',
  }
);

// Indexes for common queries
ExpertAvailabilitySchema.index({ expertId: 1, isActive: 1 });
ExpertAvailabilitySchema.index({ expertId: 1, dayOfWeek: 1, isActive: 1 });
ExpertAvailabilitySchema.index({ expertId: 1, date: 1, isActive: 1 });

// Validation: either dayOfWeek (recurring) or date (one-time) must be set
ExpertAvailabilitySchema.pre('save', function (next) {
  if (this.isRecurring && this.dayOfWeek === undefined) {
    return next(new Error('Recurring availability must have dayOfWeek set'));
  }
  if (!this.isRecurring && !this.date) {
    return next(new Error('One-time availability must have date set'));
  }
  next();
});

// Prevent model recompilation in development
export default mongoose.models.ExpertAvailability ||
  mongoose.model<ExpertAvailabilityDocument>('ExpertAvailability', ExpertAvailabilitySchema);
