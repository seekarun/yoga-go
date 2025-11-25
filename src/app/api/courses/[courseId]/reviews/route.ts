import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import CourseModel from '@/models/Course';
import { canUserReview, getUserCourseProgress, updateCourseRatings } from '@/lib/reviews';
import type { CourseReview, ApiResponse } from '@/types';
import { nanoid } from 'nanoid';

/**
 * POST /api/courses/[courseId]/reviews
 * Submit a course review (authenticated users only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params;
  console.log('[DBG][review-api] POST /api/courses/[courseId]/reviews');

  try {
    // Check authentication
    const session = await getSession();
    if (!session || !session.user || !session.user.cognitoSub) {
      console.log('[DBG][review-api] Unauthorized - no session');
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const cognitoSub = session.user.cognitoSub;
    await connectToDatabase();

    // Get user from database
    const user = await User.findOne({ 'profile.email': session.user.email });
    if (!user) {
      console.log('[DBG][review-api] User not found in database');
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = user._id;

    // Parse request body
    const body = await request.json();
    const { rating, comment } = body;

    // Validate input
    if (!rating || !comment) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Rating and comment are required' },
        { status: 400 }
      );
    }

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    if (typeof comment !== 'string' || comment.trim().length < 10) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Comment must be at least 10 characters' },
        { status: 400 }
      );
    }

    // Check if user can review (enrolled + 25% progress + no duplicate)
    const eligibility = await canUserReview(userId, courseId);
    if (!eligibility.canReview) {
      console.log('[DBG][review-api] User cannot review:', eligibility.reason);
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: eligibility.reason || 'Cannot review this course' },
        { status: 403 }
      );
    }

    // Create review object
    const now = new Date().toISOString();
    const newReview: CourseReview = {
      id: nanoid(),
      user: user.profile.name || 'Anonymous',
      userId: userId,
      rating,
      date: now,
      comment: comment.trim(),
      verified: true, // User is enrolled, so verified purchase
      status: 'submitted', // Reviews start as submitted
      courseProgress: eligibility.progress,
      createdAt: now,
      updatedAt: now,
    };

    // Add review to course
    const course = await CourseModel.findById(courseId);
    if (!course) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Course not found' },
        { status: 404 }
      );
    }

    if (!course.reviews) {
      course.reviews = [];
    }

    course.reviews.push(newReview);
    await course.save();

    console.log('[DBG][review-api] Review submitted successfully:', {
      reviewId: newReview.id,
      courseId,
      userId,
    });

    return NextResponse.json<ApiResponse<CourseReview>>(
      {
        success: true,
        data: newReview,
        message: 'Review submitted successfully. It will be visible after expert approval.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[DBG][review-api] Error submitting review:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to submit review' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/courses/[courseId]/reviews
 * Get published reviews for a course (public access)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  console.log('[DBG][review-api] GET /api/courses/[courseId]/reviews');

  try {
    const { courseId } = await params;

    await connectToDatabase();

    const course = await CourseModel.findById(courseId);
    if (!course) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Course not found' },
        { status: 404 }
      );
    }

    // Filter to only published reviews
    const publishedReviews =
      course.reviews?.filter((review: CourseReview) => review.status === 'published') || [];

    // Calculate stats
    const totalReviews = publishedReviews.length;
    const averageRating =
      totalReviews > 0
        ? Math.round(
            (publishedReviews.reduce((sum: number, r: CourseReview) => sum + r.rating, 0) /
              totalReviews) *
              10
          ) / 10
        : 0;

    console.log('[DBG][review-api] Returning published reviews:', {
      courseId,
      totalReviews,
      averageRating,
    });

    return NextResponse.json<ApiResponse<CourseReview[]>>(
      {
        success: true,
        data: publishedReviews,
        total: totalReviews,
        message: `Retrieved ${totalReviews} published reviews`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[DBG][review-api] Error getting reviews:', error);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: 'Failed to get reviews' },
      { status: 500 }
    );
  }
}
