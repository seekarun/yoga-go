import mongoose, { Schema } from 'mongoose';
import type { Course, Instructor, Curriculum, CourseReview } from '@/types';

export interface CourseDocument extends Omit<Course, 'id'> {
  _id: string;
}

const InstructorSchema = new Schema<Instructor>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    title: String,
    avatar: String,
  },
  { _id: false }
);

const CourseReviewSchema = new Schema<CourseReview>(
  {
    id: { type: String, required: true },
    user: { type: String, required: true },
    userId: String,
    rating: { type: Number, required: true },
    date: { type: String, required: true },
    comment: { type: String, required: true },
    verified: { type: Boolean, default: false },
  },
  { _id: false }
);

// Curriculum with lesson references - actual lesson data comes from Lesson collection
const CurriculumSchema = new Schema(
  {
    week: { type: Number, required: true },
    title: { type: String, required: true },
    lessonIds: [{ type: String }], // Array of lesson IDs (references to Lesson collection)
  },
  { _id: false }
);

const CourseSchema = new Schema<CourseDocument>(
  {
    _id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    longDescription: String,
    instructor: { type: InstructorSchema, required: true },
    thumbnail: { type: String, required: true },
    promoVideo: String,
    level: { type: String, required: true },
    duration: { type: String, required: true },
    totalLessons: { type: Number, required: true },
    freeLessons: { type: Number, required: true },
    price: { type: Number, required: true },
    rating: { type: Number, required: true },
    totalRatings: Number,
    totalStudents: { type: Number, required: true },
    category: { type: String, required: true },
    tags: [{ type: String }],
    featured: { type: Boolean, default: false },
    isNew: { type: Boolean, default: false },
    requirements: [{ type: String }],
    whatYouWillLearn: [{ type: String }],
    curriculum: [CurriculumSchema],
    reviews: [CourseReviewSchema],
  },
  {
    timestamps: true,
    collection: 'course', // Using 'course' to match existing MongoDB collection
  }
);

// Indexes for common queries
CourseSchema.index({ featured: 1 });
CourseSchema.index({ category: 1 });
CourseSchema.index({ 'instructor.id': 1 });

// Prevent model recompilation in development
export default mongoose.models.Course || mongoose.model<CourseDocument>('Course', CourseSchema);
