import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireExpertAuth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import CourseModel from '@/models/Course';
import type { CourseReview, ApiResponse } from '@/types';

/**
 * GET /api/srv/courses/[courseId]/reviews
 * Get all reviews for a course (expert access only)
 * Returns both submitted and published reviews
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  console.log('[DBG][expert-review-api] GET /api/srv/courses/[courseId]/reviews');

  try {
    // Verify expert authentication
    const { user } = await requireExpertAuth();

    const { courseId } = await params;

    await connectToDatabase();

    // Get course
    const course = await CourseModel.findById(courseId);
    if (!course) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Course not found' },
        { status: 404 }
      );
    }

    // Verify expert owns this course
    if (course.instructor.id !== user.expertProfile) {
      console.log('[DBG][expert-review-api] Expert does not own this course');
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Forbidden - You do not own this course' },
        { status: 403 }
      );
    }

    // Get all reviews (submitted + published)
    const allReviews = course.reviews || [];

    // Calculate stats
    const submittedReviews = allReviews.filter(
      (review: CourseReview) => review.status === 'submitted'
    );
    const publishedReviews = allReviews.filter(
      (review: CourseReview) => review.status === 'published'
    );

    const stats = {
      total: allReviews.length,
      submitted: submittedReviews.length,
      published: publishedReviews.length,
      averageRating:
        publishedReviews.length > 0
          ? Math.round(
              (publishedReviews.reduce((sum: number, r: CourseReview) => sum + r.rating, 0) /
                publishedReviews.length) *
                10
            ) / 10
          : 0,
    };

    console.log('[DBG][expert-review-api] Returning all reviews:', {
      courseId,
      stats,
    });

    return NextResponse.json<ApiResponse<{ reviews: CourseReview[]; stats: typeof stats }>>(
      {
        success: true,
        data: {
          reviews: allReviews,
          stats,
        },
        total: allReviews.length,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[DBG][expert-review-api] Error getting reviews:', error);

    if (error.message === 'Unauthorized' || error.message === 'User not found') {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: 401 }
      );
    }

    if (error.message?.includes('Forbidden')) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to get reviews' },
      { status: 500 }
    );
  }
}
