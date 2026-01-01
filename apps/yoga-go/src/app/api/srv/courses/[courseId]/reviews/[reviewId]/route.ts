import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireExpertAuth } from '@/lib/auth';
import * as courseRepository from '@/lib/repositories/courseRepository';
import { updateCourseRatings } from '@/lib/reviews';
import type { CourseReview, ApiResponse } from '@/types';

/**
 * PATCH /api/srv/courses/[courseId]/reviews/[reviewId]
 * Update review status (expert access only)
 * Allows changing review from 'submitted' to 'published'
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; reviewId: string }> }
) {
  console.log('[DBG][expert-review-approve-api] PATCH review status');

  try {
    // Verify expert authentication
    const { user } = await requireExpertAuth();

    const { courseId, reviewId } = await params;

    // Get course from DynamoDB (cross-tenant lookup)
    const course = await courseRepository.getCourseByIdOnly(courseId);
    if (!course) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Course not found' },
        { status: 404 }
      );
    }
    const tenantId = course.instructor.id;

    // Verify expert owns this course
    if (tenantId !== user.expertProfile) {
      console.log('[DBG][expert-review-approve-api] Expert does not own this course');
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Forbidden - You do not own this course' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { status } = body;

    // Validate status
    if (!status || !['submitted', 'published'].includes(status)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Invalid status. Must be "submitted" or "published"' },
        { status: 400 }
      );
    }

    // Find the review
    const reviews = course.reviews || [];
    const reviewIndex = reviews.findIndex((review: CourseReview) => review.id === reviewId);

    if (reviewIndex === -1) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Review not found' },
        { status: 404 }
      );
    }

    // Update review status
    const oldStatus = reviews[reviewIndex].status;
    const updatedReview: Partial<CourseReview> = {
      status,
      updatedAt: new Date().toISOString(),
    };

    // Update the review in DynamoDB
    const updatedCourse = await courseRepository.updateReview(
      tenantId,
      courseId,
      reviewId,
      updatedReview
    );

    console.log('[DBG][expert-review-approve-api] Review status updated:', {
      reviewId,
      oldStatus,
      newStatus: status,
    });

    // If review was published, update course rating
    if (status === 'published') {
      await updateCourseRatings(courseId);
      console.log('[DBG][expert-review-approve-api] Course ratings updated');
    }

    // Get the updated review
    const returnedReview = updatedCourse.reviews?.find((r: CourseReview) => r.id === reviewId);

    return NextResponse.json<ApiResponse<CourseReview>>(
      {
        success: true,
        data: returnedReview!,
        message: `Review ${status === 'published' ? 'published' : 'unpublished'} successfully`,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('[DBG][expert-review-approve-api] Error updating review:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage === 'Unauthorized' || errorMessage === 'User not found') {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: errorMessage },
        { status: 401 }
      );
    }

    if (errorMessage.includes('Forbidden')) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: errorMessage },
        { status: 403 }
      );
    }

    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to update review status' },
      { status: 500 }
    );
  }
}
