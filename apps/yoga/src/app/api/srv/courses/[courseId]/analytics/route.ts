import { NextResponse } from 'next/server';
import * as courseProgressRepository from '@/lib/repositories/courseProgressRepository';
import * as courseAnalyticsEventRepository from '@/lib/repositories/courseAnalyticsEventRepository';
import * as paymentRepository from '@/lib/repositories/paymentRepository';
import * as courseRepository from '@/lib/repositories/courseRepository';
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
    // Get course to find tenantId
    const course = await courseRepository.getCourseByIdOnly(courseId);
    if (!course) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Course not found',
      };
      return NextResponse.json(response, { status: 404 });
    }
    const tenantId = course.instructor.id;

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

    const startDateStr = startDate.toISOString();

    // Get analytics data from DynamoDB
    const [
      totalViews,
      uniqueViewers,
      enrollClicks,
      paymentModalOpens,
      _enrollmentCompletes,
      totalWatchTime,
    ] = await Promise.all([
      // Total course views
      courseAnalyticsEventRepository.countEventsByCourseAndType(
        courseId,
        'course_view',
        startDateStr
      ),

      // Unique viewers (distinct userId + sessionId)
      courseAnalyticsEventRepository.getUniqueViewersByCourse(courseId, startDateStr),

      // Enroll button clicks
      courseAnalyticsEventRepository.countEventsByCourseAndType(
        courseId,
        'enroll_click',
        startDateStr
      ),

      // Payment modal opens
      courseAnalyticsEventRepository.countEventsByCourseAndType(
        courseId,
        'payment_modal_open',
        startDateStr
      ),

      // Enrollment completes
      courseAnalyticsEventRepository.countEventsByCourseAndType(
        courseId,
        'enrollment_complete',
        startDateStr
      ),

      // Video watch time
      courseAnalyticsEventRepository.getTotalWatchTimeByCourse(courseId, startDateStr),
    ]);

    // Get payment data from DynamoDB
    const allPayments = await paymentRepository.getPaymentsByCourse(courseId);

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
    const clickToPaymentRate = enrollClicks > 0 ? (totalPaymentInitiated / enrollClicks) * 100 : 0;
    const conversionRate = enrollClicks > 0 ? (totalEnrollments / enrollClicks) * 100 : 0;
    const paymentSuccessRate =
      totalPaymentInitiated > 0 ? (totalEnrollments / totalPaymentInitiated) * 100 : 0;

    // Get engagement data from CourseProgress (DynamoDB)
    const courseProgressData = await courseProgressRepository.getCourseProgressByCourseIdAfterDate(
      tenantId,
      courseId,
      startDateStr
    );

    const totalWatchTimeMinutes = totalWatchTime > 0 ? Math.round(totalWatchTime / 60) : 0;

    const avgWatchTimePerStudent =
      totalEnrollments > 0
        ? Math.round(
            courseProgressData.reduce((sum, p) => sum + p.totalTimeSpent, 0) / totalEnrollments
          )
        : 0;

    const completedCourses = courseProgressData.filter(p => p.percentComplete === 100).length;
    const completionRate = totalEnrollments > 0 ? (completedCourses / totalEnrollments) * 100 : 0;

    // Get daily breakdown from DynamoDB
    const dailyEventCounts = await courseAnalyticsEventRepository.getDailyEventCountsByCourse(
      courseId,
      startDateStr,
      now.toISOString()
    );

    // Transform daily counts to match expected format
    const dailyBreakdownMap = new Map<string, Array<{ type: string; count: number }>>();
    for (const item of dailyEventCounts) {
      if (!dailyBreakdownMap.has(item.date)) {
        dailyBreakdownMap.set(item.date, []);
      }
      dailyBreakdownMap.get(item.date)!.push({ type: item.eventType, count: item.count });
    }

    const dailyBreakdown = Array.from(dailyBreakdownMap.entries())
      .map(([date, events]) => ({ _id: date, events }))
      .sort((a, b) => a._id.localeCompare(b._id));

    // Get lesson-level engagement from DynamoDB
    const lessonEngagementData = await courseAnalyticsEventRepository.getLessonEngagementStats(
      courseId,
      startDateStr
    );

    const lessonEngagement = lessonEngagementData.map(item => ({
      _id: item.lessonId,
      lessonId: item.lessonId,
      views: item.views,
      completions: item.completions,
      completionRate: Math.round(item.completionRate * 100) / 100,
    }));

    const analytics = {
      courseId,
      period,
      dateRange: {
        start: startDate.toISOString(),
        end: now.toISOString(),
      },
      overview: {
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
