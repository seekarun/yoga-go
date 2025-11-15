import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireExpertAuth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import CourseModel from '@/models/Course';
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
    const reviewIndex = course.reviews?.findIndex((review: CourseReview) => review.id === reviewId);

    if (reviewIndex === -1 || reviewIndex === undefined) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Review not found' },
        { status: 404 }
      );
    }

    // Update review status
    const oldStatus = course.reviews![reviewIndex].status;
    course.reviews![reviewIndex].status = status;
    course.reviews![reviewIndex].updatedAt = new Date().toISOString();

    await course.save();

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

    return NextResponse.json<ApiResponse<CourseReview>>(
      {
        success: true,
        data: course.reviews![reviewIndex],
        message: `Review ${status === 'published' ? 'published' : 'unpublished'} successfully`,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[DBG][expert-review-approve-api] Error updating review:', error);

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
      { success: false, error: 'Failed to update review status' },
      { status: 500 }
    );
  }
}
