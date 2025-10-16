import mongoose, { Schema } from 'mongoose';

/**
 * CourseStats Model
 * Pre-aggregated statistics per course for performance
 * Updated periodically via cron job or on-demand
 */

export interface DailyStats {
  date: string; // YYYY-MM-DD
  views: number;
  uniqueViewers: number;
  subscriptionClicks: number;
  enrollments: number;
  revenue: number;
  totalWatchTime: number; // in minutes
}

export interface LessonEngagement {
  lessonId: string;
  views: number;
  completions: number;
  avgWatchTime: number; // in minutes
  completionRate: number; // percentage
}

export interface CourseStatsDocument {
  _id: string; // courseId
  courseId: string;
  expertId: string; // Instructor ID for easy querying

  // Overall totals
  totalViews: number;
  uniqueViewers: number; // Distinct users/sessions
  totalSubscriptionClicks: number;
  totalPaymentInitiated: number;
  totalEnrollments: number;
  totalRevenue: number; // In smallest currency unit
  currency: string;

  // Engagement metrics
  totalWatchTime: number; // Total minutes watched across all users
  avgWatchTimePerStudent: number; // Average minutes per enrolled student
  completionRate: number; // % of enrolled students who completed course

  // Conversion metrics
  clickToPaymentRate: number; // (payments initiated / subscription clicks) * 100
  conversionRate: number; // (enrollments / subscription clicks) * 100
  paymentSuccessRate: number; // (enrollments / payments initiated) * 100

  // Time series data (last 90 days)
  dailyStats: DailyStats[];

  // Per-lesson engagement
  lessonEngagement: LessonEngagement[];

  // Last updated timestamp
  lastUpdated: Date;
  lastCalculatedAt: Date;
}

const DailyStatsSchema = new Schema<DailyStats>(
  {
    date: { type: String, required: true },
    views: { type: Number, default: 0 },
    uniqueViewers: { type: Number, default: 0 },
    subscriptionClicks: { type: Number, default: 0 },
    enrollments: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    totalWatchTime: { type: Number, default: 0 },
  },
  { _id: false }
);

const LessonEngagementSchema = new Schema<LessonEngagement>(
  {
    lessonId: { type: String, required: true },
    views: { type: Number, default: 0 },
    completions: { type: Number, default: 0 },
    avgWatchTime: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 },
  },
  { _id: false }
);

const CourseStatsSchema = new Schema<CourseStatsDocument>(
  {
    _id: { type: String, required: true }, // courseId
    courseId: { type: String, required: true, unique: true, index: true },
    expertId: { type: String, required: true, index: true },

    totalViews: { type: Number, default: 0 },
    uniqueViewers: { type: Number, default: 0 },
    totalSubscriptionClicks: { type: Number, default: 0 },
    totalPaymentInitiated: { type: Number, default: 0 },
    totalEnrollments: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },

    totalWatchTime: { type: Number, default: 0 },
    avgWatchTimePerStudent: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 },

    clickToPaymentRate: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    paymentSuccessRate: { type: Number, default: 0 },

    dailyStats: [DailyStatsSchema],
    lessonEngagement: [LessonEngagementSchema],

    lastUpdated: { type: Date, required: true },
    lastCalculatedAt: { type: Date, required: true },
  },
  {
    timestamps: true,
    collection: 'course_stats',
  }
);

// Indexes for common queries
CourseStatsSchema.index({ expertId: 1 });
CourseStatsSchema.index({ lastUpdated: -1 });

// Prevent model recompilation in development
export default mongoose.models.CourseStats ||
  mongoose.model<CourseStatsDocument>('CourseStats', CourseStatsSchema);
