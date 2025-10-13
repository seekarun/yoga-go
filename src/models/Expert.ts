import mongoose, { Schema } from 'mongoose';
import type { Expert, ExpertCourse, SocialLinks } from '@/types';

export interface ExpertDocument extends Omit<Expert, 'id'> {
  _id: string;
}

const ExpertCourseSchema = new Schema<ExpertCourse>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    level: { type: String, required: true },
    duration: { type: String, required: true },
    students: { type: Number, required: true },
  },
  { _id: false }
);

const SocialLinksSchema = new Schema<SocialLinks>(
  {
    instagram: String,
    youtube: String,
    facebook: String,
    twitter: String,
    website: String,
  },
  { _id: false }
);

const ExpertSchema = new Schema<ExpertDocument>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    title: { type: String, required: true },
    bio: { type: String, required: true },
    avatar: { type: String, required: true },
    rating: { type: Number, required: true },
    totalCourses: { type: Number, required: true },
    totalStudents: { type: Number, required: true },
    specializations: [{ type: String }],
    featured: { type: Boolean, default: false },
    certifications: [{ type: String }],
    experience: String,
    courses: [ExpertCourseSchema],
    socialLinks: SocialLinksSchema,
  },
  {
    timestamps: true,
    collection: 'experts',
  }
);

// Prevent model recompilation in development
export default mongoose.models.Expert || mongoose.model<ExpertDocument>('Expert', ExpertSchema);
