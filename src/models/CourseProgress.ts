import mongoose, { Schema } from 'mongoose';

/**
 * CourseProgress Model
 * Tracks user progress through a course including lesson completion,
 * time spent, streaks, notes, and achievements
 */

export interface LessonProgressDocument {
  lessonId: string;
  completed: boolean;
  completedAt?: string;
  timeSpent?: number; // in minutes
  notes?: string;
}

export interface SessionHistoryDocument {
  date: string;
  lessonsCompleted: string[];
  duration: number; // in minutes
  notes?: string;
}

export interface ProgressNoteDocument {
  lessonId: string;
  note: string;
  timestamp: string;
  isPrivate?: boolean;
}

export interface CourseProgressDocument {
  _id: string; // Format: {userId}_{courseId}
  userId: string;
  courseId: string;
  enrolledAt: string;
  lastAccessed: string;
  completedAt?: string;

  // Progress tracking
  totalLessons: number;
  completedLessons: string[]; // Array of completed lesson IDs
  percentComplete: number;

  // Current position
  currentLessonId?: string;

  // Time tracking
  totalTimeSpent: number; // in minutes
  averageSessionTime: number; // in minutes

  // Streak tracking
  streak: number;
  longestStreak: number;
  lastPracticeDate?: string;

  // Detailed tracking
  lessonProgress: LessonProgressDocument[];
  sessions: SessionHistoryDocument[];
  notes: ProgressNoteDocument[];

  // Achievements unlocked for this course
  achievementIds: string[];
}

const LessonProgressSchema = new Schema<LessonProgressDocument>(
  {
    lessonId: { type: String, required: true },
    completed: { type: Boolean, default: false },
    completedAt: String,
    timeSpent: Number,
    notes: String,
  },
  { _id: false }
);

const SessionHistorySchema = new Schema<SessionHistoryDocument>(
  {
    date: { type: String, required: true },
    lessonsCompleted: [{ type: String }],
    duration: { type: Number, required: true },
    notes: String,
  },
  { _id: false }
);

const ProgressNoteSchema = new Schema<ProgressNoteDocument>(
  {
    lessonId: { type: String, required: true },
    note: { type: String, required: true },
    timestamp: { type: String, required: true },
    isPrivate: { type: Boolean, default: false },
  },
  { _id: false }
);

const CourseProgressSchema = new Schema<CourseProgressDocument>(
  {
    _id: { type: String, required: true }, // {userId}_{courseId}
    userId: { type: String, required: true, index: true },
    courseId: { type: String, required: true, index: true },
    enrolledAt: { type: String, required: true },
    lastAccessed: { type: String, required: true },
    completedAt: String,

    totalLessons: { type: Number, required: true },
    completedLessons: [{ type: String }],
    percentComplete: { type: Number, default: 0 },

    currentLessonId: String,

    totalTimeSpent: { type: Number, default: 0 },
    averageSessionTime: { type: Number, default: 0 },

    streak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastPracticeDate: String,

    lessonProgress: [LessonProgressSchema],
    sessions: [SessionHistorySchema],
    notes: [ProgressNoteSchema],

    achievementIds: [{ type: String }],
  },
  {
    timestamps: true,
    collection: 'course_progress',
  }
);

// Indexes for common queries
CourseProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });
CourseProgressSchema.index({ userId: 1 });
CourseProgressSchema.index({ courseId: 1 });
CourseProgressSchema.index({ percentComplete: 1 });

// Prevent model recompilation in development
export default mongoose.models.CourseProgress ||
  mongoose.model<CourseProgressDocument>('CourseProgress', CourseProgressSchema);
