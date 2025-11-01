import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { requireExpertOwnership } from '@/lib/auth';
import Course from '@/models/Course';
import CourseAnalyticsEvent from '@/models/CourseAnalyticsEvent';
import Payment from '@/models/Payment';
import CourseProgress from '@/models/CourseProgress';
import type { ApiResponse } from '@/types';

/**
 * GET /api/srv/experts/{expertId}/analytics
 * Get aggregated analytics across all courses for an expert
 *
 * Query params:
 * - period: '7d' | '30d' | '90d' | 'all' (default: '30d')
 */
export async function GET(request: Request, { params }: { params: Promise<{ expertId: string }> }) {
  const { expertId } = await params;
  console.log('[DBG][srv/expert-analytics] GET request for expert:', expertId);

  try {
    // Verify expert ownership
    await requireExpertOwnership(expertId);

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
        startDate = new Date(0);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Connect to database
    await connectToDatabase();

    // Get all courses for this expert
    const courses = await Course.find({ 'instructor.id': expertId });
    const courseIds = courses.map(c => c._id);

    if (courseIds.length === 0) {
      // No courses found for this expert
      return NextResponse.json({
        success: true,
        data: {
          expertId,
          period,
          overview: {
            totalCourses: 0,
            totalViews: 0,
            uniqueViewers: 0,
            subscriptionClicks: 0,
            totalEnrollments: 0,
            totalRevenue: 0,
            currency: 'USD',
          },
          conversion: {
            avgConversionRate: 0,
            avgClickToPaymentRate: 0,
            avgPaymentSuccessRate: 0,
          },
          engagement: {
            totalWatchTimeMinutes: 0,
            avgCompletionRate: 0,
          },
          topPerformingCourses: [],
          dailyTrends: [],
        },
      });
    }

    // Aggregate analytics across all courses
    const [
      totalViews,
      uniqueViewers,
      subscriptionClicks,
      paymentModalOpens,
      videoProgress,
      payments,
      successfulPayments,
    ] = await Promise.all([
      // Total views across all courses
      CourseAnalyticsEvent.countDocuments({
        courseId: { $in: courseIds },
        eventType: 'course_view',
        timestamp: { $gte: startDate },
      }),

      // Unique viewers
      CourseAnalyticsEvent.aggregate([
        {
          $match: {
            courseId: { $in: courseIds },
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

      // Subscription clicks
      CourseAnalyticsEvent.countDocuments({
        courseId: { $in: courseIds },
        eventType: 'subscription_click',
        timestamp: { $gte: startDate },
      }),

      // Payment modal opens
      CourseAnalyticsEvent.countDocuments({
        courseId: { $in: courseIds },
        eventType: 'payment_modal_open',
        timestamp: { $gte: startDate },
      }),

      // Video watch time
      CourseAnalyticsEvent.aggregate([
        {
          $match: {
            courseId: { $in: courseIds },
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

      // All payments
      Payment.find({
        courseId: { $in: courseIds },
        status: { $in: ['initiated', 'pending', 'succeeded'] },
        initiatedAt: { $gte: startDate },
      }),

      // Successful payments
      Payment.find({
        courseId: { $in: courseIds },
        status: 'succeeded',
        initiatedAt: { $gte: startDate },
      }),
    ]);

    const totalPaymentInitiated = payments.length;
    const totalEnrollments = successfulPayments.length;
    const totalRevenue = successfulPayments.reduce((sum, p) => sum + p.amount, 0);

    // Calculate conversion rates
    const avgClickToPaymentRate =
      subscriptionClicks > 0 ? (totalPaymentInitiated / subscriptionClicks) * 100 : 0;
    const avgConversionRate =
      subscriptionClicks > 0 ? (totalEnrollments / subscriptionClicks) * 100 : 0;
    const avgPaymentSuccessRate =
      totalPaymentInitiated > 0 ? (totalEnrollments / totalPaymentInitiated) * 100 : 0;

    // Get engagement data
    const courseProgressData = await CourseProgress.find({
      courseId: { $in: courseIds },
      enrolledAt: { $gte: startDate },
    });

    const totalWatchTimeMinutes =
      videoProgress.length > 0 && videoProgress[0].totalWatchTime
        ? Math.round(videoProgress[0].totalWatchTime / 60)
        : 0;

    const completedCourses = courseProgressData.filter(p => p.percentComplete === 100).length;
    const avgCompletionRate =
      totalEnrollments > 0 ? (completedCourses / totalEnrollments) * 100 : 0;

    // Get per-course performance for ranking
    const coursePerformance = await CourseAnalyticsEvent.aggregate([
      {
        $match: {
          courseId: { $in: courseIds },
          timestamp: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            courseId: '$courseId',
            eventType: '$eventType',
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.courseId',
          events: {
            $push: {
              type: '$_id.eventType',
              count: '$count',
            },
          },
        },
      },
    ]);

    // Enrich with course details and payment data
    const topPerformingCourses = await Promise.all(
      coursePerformance.map(async cp => {
        const course = courses.find(c => c._id === cp._id);
        const coursePayments = successfulPayments.filter(p => p.courseId === cp._id);
        const courseRevenue = coursePayments.reduce((sum, p) => sum + p.amount, 0);

        const views =
          cp.events.find((e: { type: string; count: number }) => e.type === 'course_view')?.count ||
          0;
        const subscriptionClicks =
          cp.events.find((e: { type: string; count: number }) => e.type === 'subscription_click')
            ?.count || 0;

        return {
          courseId: cp._id,
          title: course?.title || 'Unknown',
          views,
          subscriptionClicks,
          enrollments: coursePayments.length,
          revenue: courseRevenue,
        };
      })
    );

    // Sort by revenue and take top 5
    topPerformingCourses.sort((a, b) => b.revenue - a.revenue);
    const top5Courses = topPerformingCourses.slice(0, 5);

    // Get daily trends
    const dailyTrends = await CourseAnalyticsEvent.aggregate([
      {
        $match: {
          courseId: { $in: courseIds },
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

    const analytics = {
      expertId,
      period,
      dateRange: {
        start: startDate.toISOString(),
        end: now.toISOString(),
      },
      overview: {
        totalCourses: courses.length,
        publishedCourses: courses.filter(c => c.status === 'PUBLISHED').length,
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
        avgConversionRate: Math.round(avgConversionRate * 100) / 100,
        avgClickToPaymentRate: Math.round(avgClickToPaymentRate * 100) / 100,
        avgPaymentSuccessRate: Math.round(avgPaymentSuccessRate * 100) / 100,
      },
      engagement: {
        totalWatchTimeMinutes,
        avgCompletionRate: Math.round(avgCompletionRate * 100) / 100,
      },
      topPerformingCourses: top5Courses,
      dailyTrends,
    };

    const response: ApiResponse<typeof analytics> = {
      success: true,
      data: analytics,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][srv/expert-analytics] Error:', error);

    // Handle authorization errors
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
      }
      if (error.message.includes('Forbidden')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 403 });
      }
    }

    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch analytics',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
