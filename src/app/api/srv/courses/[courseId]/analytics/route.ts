import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import CourseAnalyticsEvent from '@/models/CourseAnalyticsEvent';
import Payment from '@/models/Payment';
import CourseProgress from '@/models/CourseProgress';
import type { ApiResponse } from '@/types';

/**
 * GET /api/srv/courses/{courseId}/analytics
 * Get analytics for a specific course
 *
 * Query params:
 * - period: '7d' | '30d' | '90d' | 'all' (default: '30d')
 */
export async function GET(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  console.log('[DBG][srv/analytics] GET request for course:', courseId);

  try {
    // Parse query params
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || '30d';

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        startDate = new Date(0); // Beginning of time
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Connect to database
    await connectToDatabase();

    // Aggregate analytics events
    const [
      totalViews,
      uniqueViewers,
      subscriptionClicks,
      paymentModalOpens,
      enrollmentCompletes,
      videoProgress,
    ] = await Promise.all([
      // Total course views
      CourseAnalyticsEvent.countDocuments({
        courseId,
        eventType: 'course_view',
        timestamp: { $gte: startDate },
      }),

      // Unique viewers (distinct userId + sessionId)
      CourseAnalyticsEvent.aggregate([
        {
          $match: {
            courseId,
            eventType: 'course_view',
            timestamp: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              userId: '$userId',
              sessionId: '$sessionId',
            },
          },
        },
        { $count: 'count' },
      ]),

      // Subscription button clicks
      CourseAnalyticsEvent.countDocuments({
        courseId,
        eventType: 'subscription_click',
        timestamp: { $gte: startDate },
      }),

      // Payment modal opens
      CourseAnalyticsEvent.countDocuments({
        courseId,
        eventType: 'payment_modal_open',
        timestamp: { $gte: startDate },
      }),

      // Enrollment completes
      CourseAnalyticsEvent.countDocuments({
        courseId,
        eventType: 'enrollment_complete',
        timestamp: { $gte: startDate },
      }),

      // Video watch time
      CourseAnalyticsEvent.aggregate([
        {
          $match: {
            courseId,
            eventType: 'video_progress',
            timestamp: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: null,
            totalWatchTime: { $sum: '$metadata.watchTime' },
          },
        },
      ]),
    ]);

    // Get payment data
    const [payments, successfulPayments] = await Promise.all([
      Payment.find({
        courseId,
        status: { $in: ['initiated', 'pending', 'succeeded'] },
        initiatedAt: { $gte: startDate },
      }),

      Payment.find({
        courseId,
        status: 'succeeded',
        initiatedAt: { $gte: startDate },
      }),
    ]);

    const totalPaymentInitiated = payments.length;
    const totalEnrollments = successfulPayments.length;
    const totalRevenue = successfulPayments.reduce((sum, p) => sum + p.amount, 0);

    // Calculate conversion rates
    const clickToPaymentRate =
      subscriptionClicks > 0 ? (totalPaymentInitiated / subscriptionClicks) * 100 : 0;
    const conversionRate =
      subscriptionClicks > 0 ? (totalEnrollments / subscriptionClicks) * 100 : 0;
    const paymentSuccessRate =
      totalPaymentInitiated > 0 ? (totalEnrollments / totalPaymentInitiated) * 100 : 0;

    // Get engagement data from CourseProgress
    const courseProgressData = await CourseProgress.find({
      courseId,
      enrolledAt: { $gte: startDate },
    });

    const totalWatchTimeMinutes =
      videoProgress.length > 0 && videoProgress[0].totalWatchTime
        ? Math.round(videoProgress[0].totalWatchTime / 60)
        : 0;

    const avgWatchTimePerStudent =
      totalEnrollments > 0
        ? Math.round(
            courseProgressData.reduce((sum, p) => sum + p.totalTimeSpent, 0) / totalEnrollments
          )
        : 0;

    const completedCourses = courseProgressData.filter(p => p.percentComplete === 100).length;
    const completionRate = totalEnrollments > 0 ? (completedCourses / totalEnrollments) * 100 : 0;

    // Get daily breakdown
    const dailyBreakdown = await CourseAnalyticsEvent.aggregate([
      {
        $match: {
          courseId,
          timestamp: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$timestamp',
              },
            },
            eventType: '$eventType',
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.date',
          events: {
            $push: {
              type: '$_id.eventType',
              count: '$count',
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Get lesson-level engagement
    const lessonEngagement = await CourseAnalyticsEvent.aggregate([
      {
        $match: {
          courseId,
          eventType: { $in: ['lesson_view', 'lesson_complete'] },
          timestamp: { $gte: startDate },
          lessonId: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: {
            lessonId: '$lessonId',
            eventType: '$eventType',
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.lessonId',
          views: {
            $sum: {
              $cond: [{ $eq: ['$_id.eventType', 'lesson_view'] }, '$count', 0],
            },
          },
          completions: {
            $sum: {
              $cond: [{ $eq: ['$_id.eventType', 'lesson_complete'] }, '$count', 0],
            },
          },
        },
      },
      {
        $project: {
          lessonId: '$_id',
          views: 1,
          completions: 1,
          completionRate: {
            $cond: [
              { $gt: ['$views', 0] },
              { $multiply: [{ $divide: ['$completions', '$views'] }, 100] },
              0,
            ],
          },
        },
      },
      { $sort: { views: -1 } },
    ]);

    const analytics = {
      courseId,
      period,
      dateRange: {
        start: startDate.toISOString(),
        end: now.toISOString(),
      },
      overview: {
        totalViews,
        uniqueViewers: uniqueViewers[0]?.count || 0,
        subscriptionClicks,
        paymentModalOpens,
        totalPaymentInitiated,
        totalEnrollments,
        totalRevenue,
        currency: 'USD',
      },
      conversion: {
        clickToPaymentRate: Math.round(clickToPaymentRate * 100) / 100,
        conversionRate: Math.round(conversionRate * 100) / 100,
        paymentSuccessRate: Math.round(paymentSuccessRate * 100) / 100,
      },
      engagement: {
        totalWatchTimeMinutes,
        avgWatchTimePerStudent,
        completionRate: Math.round(completionRate * 100) / 100,
        completedCourses,
      },
      dailyBreakdown,
      lessonEngagement,
    };

    const response: ApiResponse<typeof analytics> = {
      success: true,
      data: analytics,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][srv/analytics] Error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch analytics',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
