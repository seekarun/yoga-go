import { connectToDatabase } from './mongodb';
import User from '@/models/User';
import CourseProgress from '@/models/CourseProgress';
import CourseModel from '@/models/Course';
import type { CourseReview } from '@/types';

/**
 * Check if a user can review a course
 * Requirements:
 * - User must be enrolled
 * - User must have completed >= 25% of the course
 * - User must not have already reviewed the course
 */
export async function canUserReview(
  userId: string,
  courseId: string
): Promise<{
  canReview: boolean;
  reason?: string;
  progress?: number;
}> {
  console.log('[DBG][reviews] Checking if user can review', { userId, courseId });

  try {
    await connectToDatabase();

    // Check if user is enrolled
    const user = await User.findById(userId);
    if (!user) {
      return { canReview: false, reason: 'User not found' };
    }

    const isEnrolled = user.enrolledCourses.some((ec: any) => ec.courseId === courseId);
    if (!isEnrolled) {
      return { canReview: false, reason: 'You must be enrolled in this course to review it' };
    }

    // Get course progress
    const progressId = `${userId}_${courseId}`;
    const courseProgress = await CourseProgress.findById(progressId);

    if (!courseProgress) {
      return { canReview: false, reason: 'Course progress not found' };
    }

    const percentComplete = courseProgress.percentComplete || 0;

    // Check if user has completed at least 25%
    if (percentComplete < 25) {
      return {
        canReview: false,
        reason: `You need to complete at least 25% of the course to review it. Current progress: ${percentComplete}%`,
        progress: percentComplete,
      };
    }

    // Check if user has already reviewed this course
    const course = await CourseModel.findById(courseId);
    if (!course) {
      return { canReview: false, reason: 'Course not found' };
    }

    const existingReview = course.reviews?.find((review: CourseReview) => review.userId === userId);

    if (existingReview) {
      return {
        canReview: false,
        reason: 'You have already reviewed this course',
      };
    }

    return { canReview: true, progress: percentComplete };
  } catch (error) {
    console.error('[DBG][reviews] Error checking if user can review:', error);
    return { canReview: false, reason: 'Error checking review eligibility' };
  }
}

/**
 * Get user's course progress percentage
 */
export async function getUserCourseProgress(userId: string, courseId: string): Promise<number> {
  console.log('[DBG][reviews] Getting user course progress', { userId, courseId });

  try {
    await connectToDatabase();

    const progressId = `${userId}_${courseId}`;
    const courseProgress = await CourseProgress.findById(progressId);

    return courseProgress?.percentComplete || 0;
  } catch (error) {
    console.error('[DBG][reviews] Error getting course progress:', error);
    return 0;
  }
}

/**
 * Calculate average rating from published reviews
 */
export async function calculateCourseRating(courseId: string): Promise<{
  averageRating: number;
  totalRatings: number;
}> {
  console.log('[DBG][reviews] Calculating course rating for', courseId);

  try {
    await connectToDatabase();

    const course = await CourseModel.findById(courseId);
    if (!course) {
      console.error('[DBG][reviews] Course not found');
      return { averageRating: 0, totalRatings: 0 };
    }

    // Only count published reviews
    const publishedReviews =
      course.reviews?.filter((review: CourseReview) => review.status === 'published') || [];

    if (publishedReviews.length === 0) {
      return { averageRating: 0, totalRatings: 0 };
    }

    const totalRating = publishedReviews.reduce(
      (sum: number, review: CourseReview) => sum + review.rating,
      0
    );
    const averageRating = Math.round((totalRating / publishedReviews.length) * 10) / 10; // Round to 1 decimal

    console.log('[DBG][reviews] Calculated rating:', {
      averageRating,
      totalRatings: publishedReviews.length,
    });

    return {
      averageRating,
      totalRatings: publishedReviews.length,
    };
  } catch (error) {
    console.error('[DBG][reviews] Error calculating rating:', error);
    return { averageRating: 0, totalRatings: 0 };
  }
}

/**
 * Update course rating and totalRatings fields
 */
export async function updateCourseRatings(courseId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  console.log('[DBG][reviews] Updating course ratings for', courseId);

  try {
    await connectToDatabase();

    const { averageRating, totalRatings } = await calculateCourseRating(courseId);

    await CourseModel.findByIdAndUpdate(courseId, {
      rating: averageRating,
      totalRatings,
    });

    console.log('[DBG][reviews] Course ratings updated successfully');
    return { success: true };
  } catch (error) {
    console.error('[DBG][reviews] Error updating course ratings:', error);
    return { success: false, error: 'Failed to update course ratings' };
  }
}

/**
 * Check if user has already reviewed a course
 */
export async function hasUserReviewedCourse(userId: string, courseId: string): Promise<boolean> {
  console.log('[DBG][reviews] Checking if user has reviewed course', { userId, courseId });

  try {
    await connectToDatabase();

    const course = await CourseModel.findById(courseId);
    if (!course) {
      return false;
    }

    const existingReview = course.reviews?.find((review: CourseReview) => review.userId === userId);

    return !!existingReview;
  } catch (error) {
    console.error('[DBG][reviews] Error checking existing review:', error);
    return false;
  }
}
