import { NextResponse } from 'next/server';
import { requireExpertOwnership } from '@/lib/auth';
import * as courseRepository from '@/lib/repositories/courseRepository';
import * as courseProgressRepository from '@/lib/repositories/courseProgressRepository';
import * as courseAnalyticsEventRepository from '@/lib/repositories/courseAnalyticsEventRepository';
import * as paymentRepository from '@/lib/repositories/paymentRepository';
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

    const startDateStr = startDate.toISOString();

    // Get all courses for this expert from DynamoDB
    const courses = await courseRepository.getCoursesByInstructorId(expertId);
    const courseIds = courses.map(c => c.id);

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
            enrollClicks: 0,
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

    // Aggregate analytics across all courses from DynamoDB
    const analyticsPromises = courseIds.map(async courseId => {
      const [views, uniqueViewers, enrollClicks, paymentModalOpens, watchTime] = await Promise.all([
        courseAnalyticsEventRepository.countEventsByCourseAndType(
          courseId,
          'course_view',
          startDateStr
        ),
        courseAnalyticsEventRepository.getUniqueViewersByCourse(courseId, startDateStr),
        courseAnalyticsEventRepository.countEventsByCourseAndType(
          courseId,
          'enroll_click',
          startDateStr
        ),
        courseAnalyticsEventRepository.countEventsByCourseAndType(
          courseId,
          'payment_modal_open',
          startDateStr
        ),
        courseAnalyticsEventRepository.getTotalWatchTimeByCourse(courseId, startDateStr),
      ]);

      return { courseId, views, uniqueViewers, enrollClicks, paymentModalOpens, watchTime };
    });

    const courseAnalytics = await Promise.all(analyticsPromises);

    // Aggregate totals
    const totalViews = courseAnalytics.reduce((sum, ca) => sum + ca.views, 0);
    const uniqueViewers = courseAnalytics.reduce((sum, ca) => sum + ca.uniqueViewers, 0);
    const enrollClicks = courseAnalytics.reduce((sum, ca) => sum + ca.enrollClicks, 0);
    const paymentModalOpens = courseAnalytics.reduce((sum, ca) => sum + ca.paymentModalOpens, 0);
    const totalWatchTime = courseAnalytics.reduce((sum, ca) => sum + ca.watchTime, 0);

    // Get payment data from DynamoDB
    const paymentPromises = courseIds.map(courseId =>
      paymentRepository.getPaymentsByCourse(courseId)
    );
    const allPaymentsArrays = await Promise.all(paymentPromises);
    const allPayments = allPaymentsArrays.flat();

    // Filter payments by date
    const payments = allPayments.filter(
      p =>
        ['initiated', 'pending', 'succeeded'].includes(p.status) &&
        new Date(p.initiatedAt) >= startDate
    );

    const successfulPayments = allPayments.filter(
      p => p.status === 'succeeded' && new Date(p.initiatedAt) >= startDate
    );

    const totalPaymentInitiated = payments.length;
    const totalEnrollments = successfulPayments.length;
    const totalRevenue = successfulPayments.reduce((sum, p) => sum + p.amount, 0);

    // Calculate conversion rates
    const avgClickToPaymentRate =
      enrollClicks > 0 ? (totalPaymentInitiated / enrollClicks) * 100 : 0;
    const avgConversionRate = enrollClicks > 0 ? (totalEnrollments / enrollClicks) * 100 : 0;
    const avgPaymentSuccessRate =
      totalPaymentInitiated > 0 ? (totalEnrollments / totalPaymentInitiated) * 100 : 0;

    // Get engagement data from DynamoDB
    const courseProgressPromises = courseIds.map(id =>
      courseProgressRepository.getCourseProgressByCourseIdAfterDate(id, startDateStr)
    );
    const courseProgressArrays = await Promise.all(courseProgressPromises);
    const courseProgressData = courseProgressArrays.flat();

    const totalWatchTimeMinutes = totalWatchTime > 0 ? Math.round(totalWatchTime / 60) : 0;

    const completedCourses = courseProgressData.filter(p => p.percentComplete === 100).length;
    const avgCompletionRate =
      totalEnrollments > 0 ? (completedCourses / totalEnrollments) * 100 : 0;

    // Build top performing courses
    const topPerformingCourses = courseAnalytics.map(ca => {
      const course = courses.find(c => c.id === ca.courseId);
      const coursePayments = successfulPayments.filter(p => p.courseId === ca.courseId);
      const courseRevenue = coursePayments.reduce((sum, p) => sum + p.amount, 0);

      return {
        courseId: ca.courseId,
        title: course?.title || 'Unknown',
        views: ca.views,
        enrollClicks: ca.enrollClicks,
        enrollments: coursePayments.length,
        revenue: courseRevenue,
      };
    });

    // Sort by revenue and take top 5
    topPerformingCourses.sort((a, b) => b.revenue - a.revenue);
    const top5Courses = topPerformingCourses.slice(0, 5);

    // Get daily trends from DynamoDB
    const dailyTrendsPromises = courseIds.map(courseId =>
      courseAnalyticsEventRepository.getDailyEventCountsByCourse(
        courseId,
        startDateStr,
        now.toISOString()
      )
    );
    const dailyTrendsArrays = await Promise.all(dailyTrendsPromises);
    const dailyEventCounts = dailyTrendsArrays.flat();

    // Aggregate daily trends
    const dailyTrendsMap = new Map<string, Map<string, number>>();
    for (const item of dailyEventCounts) {
      if (!dailyTrendsMap.has(item.date)) {
        dailyTrendsMap.set(item.date, new Map());
      }
      const dateMap = dailyTrendsMap.get(item.date)!;
      dateMap.set(item.eventType, (dateMap.get(item.eventType) || 0) + item.count);
    }

    const dailyTrends = Array.from(dailyTrendsMap.entries())
      .map(([date, eventMap]) => ({
        _id: date,
        events: Array.from(eventMap.entries()).map(([type, count]) => ({ type, count })),
      }))
      .sort((a, b) => a._id.localeCompare(b._id));

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
        uniqueViewers,
        enrollClicks,
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
