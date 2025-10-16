import mongoose, { Schema } from 'mongoose';

/**
 * CourseAnalyticsEvent Model
 * Tracks individual analytics events for courses, lessons, and user engagement
 */

export type EventType =
  | 'course_view' // User views course detail page
  | 'course_preview' // User watches promo video
  | 'lesson_view' // User views/starts a lesson
  | 'lesson_complete' // User marks lesson as complete
  | 'video_play' // Video playback started
  | 'video_pause' // Video playback paused
  | 'video_complete' // Video watched to end
  | 'video_progress' // Video progress update (for watch time)
  | 'subscription_click' // User clicks subscribe/enroll button
  | 'payment_modal_open' // Payment modal opened
  | 'enrollment_complete'; // User successfully enrolled

export interface EventMetadata {
  // Video-specific
  videoId?: string;
  videoDuration?: number; // in seconds
  watchTime?: number; // in seconds
  progressPercent?: number;

  // User context
  userAgent?: string;
  deviceType?: 'mobile' | 'tablet' | 'desktop';
  referrer?: string;

  // Payment context
  paymentGateway?: 'stripe' | 'razorpay';
  paymentId?: string;
  amount?: number;
  currency?: string;

  // Additional context
  [key: string]: any;
}

export interface CourseAnalyticsEventDocument {
  _id: string;
  eventType: EventType;

  // What (course/lesson being tracked)
  courseId: string;
  lessonId?: string;

  // Who (user or anonymous session)
  userId?: string; // Authenticated users
  sessionId?: string; // Anonymous users (could use a cookie/fingerprint)

  // When
  timestamp: Date;

  // Additional context
  metadata?: EventMetadata;
}

const CourseAnalyticsEventSchema = new Schema<CourseAnalyticsEventDocument>(
  {
    _id: { type: String, required: true },
    eventType: {
      type: String,
      required: true,
      enum: [
        'course_view',
        'course_preview',
        'lesson_view',
        'lesson_complete',
        'video_play',
        'video_pause',
        'video_complete',
        'video_progress',
        'subscription_click',
        'payment_modal_open',
        'enrollment_complete',
      ],
      index: true,
    },
    courseId: { type: String, required: true, index: true },
    lessonId: { type: String, index: true },
    userId: { type: String, index: true },
    sessionId: { type: String, index: true },
    timestamp: { type: Date, required: true, index: true },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
    collection: 'course_analytics_events',
  }
);

// Compound indexes for common queries
CourseAnalyticsEventSchema.index({ courseId: 1, eventType: 1, timestamp: -1 });
CourseAnalyticsEventSchema.index({ userId: 1, eventType: 1, timestamp: -1 });
CourseAnalyticsEventSchema.index({ courseId: 1, timestamp: -1 });

// TTL index to automatically delete events older than 90 days (optional, for data retention)
// Uncomment if you want automatic cleanup:
// CourseAnalyticsEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Prevent model recompilation in development
export default mongoose.models.CourseAnalyticsEvent ||
  mongoose.model<CourseAnalyticsEventDocument>('CourseAnalyticsEvent', CourseAnalyticsEventSchema);
