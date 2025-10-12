import mongoose, { Schema } from 'mongoose';
import type { Lesson } from '@/types';

export interface LessonDocument extends Omit<Lesson, 'id'> {
  _id: string;
  courseId: string; // Reference to which course this lesson belongs to
}

const LessonSchema = new Schema<LessonDocument>(
  {
    _id: { type: String, required: true },
    courseId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    duration: { type: String, required: true },
    isFree: { type: Boolean, default: false },
    description: String,
    videoUrl: String,
    resources: [{ type: String }],
    completed: { type: Boolean, default: false },
    completedAt: String,
    notes: String,
    locked: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'lessons',
  }
);

// Index for faster queries by courseId
LessonSchema.index({ courseId: 1 });

// Prevent model recompilation in development
export default mongoose.models.Lesson || mongoose.model<LessonDocument>('Lesson', LessonSchema);
