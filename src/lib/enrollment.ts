import * as userRepository from './repositories/userRepository';
import * as courseRepository from './repositories/courseRepository';
import * as courseProgressRepository from './repositories/courseProgressRepository';
import type { EnrolledCourse, Achievement, User, CourseProgress } from '@/types';

/**
 * Enroll a user in a course
 * Creates enrollment record and initializes progress tracking
 */
export async function enrollUserInCourse(
  userId: string,
  courseId: string,
  paymentId?: string
): Promise<{ success: boolean; error?: string }> {
  console.log('[DBG][enrollment] Enrolling user', userId, 'in course', courseId);

  try {
    // Get user from DynamoDB
    const user = await userRepository.getUserById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Check if already enrolled
    const alreadyEnrolled = user.enrolledCourses.some(
      (ec: EnrolledCourse) => ec.courseId === courseId
    );
    if (alreadyEnrolled) {
      console.log('[DBG][enrollment] User already enrolled in course');
      return { success: true }; // Already enrolled is not an error
    }

    // Get course details from DynamoDB
    const course = await courseRepository.getCourseById(courseId);

    if (!course) {
      return { success: false, error: 'Course not found' };
    }

    const now = new Date().toISOString();

    // Build updates for user
    const enrolledCourse: EnrolledCourse = {
      courseId: course.id,
      title: course.title,
      instructor: course.instructor.name,
      progress: 0,
      lastAccessed: now,
      enrolledAt: now,
    };

    const updates: Partial<User> = {};

    // Add to enrolled courses
    const newEnrolledCourses = [...user.enrolledCourses, enrolledCourse];
    updates.enrolledCourses = newEnrolledCourses;

    // Update statistics
    updates.statistics = {
      ...user.statistics,
      totalCourses: (user.statistics.totalCourses || 0) + 1,
    };

    // Add payment to billing history if payment ID provided
    if (paymentId) {
      const billing = user.billing || { paymentHistory: [] };
      const paymentHistory = billing.paymentHistory || [];

      const newPayment = {
        date: now,
        amount: course.price,
        method: 'online',
        status: 'paid' as const,
        description: `Enrollment in ${course.title}`,
        invoice: paymentId,
      };

      updates.billing = {
        ...billing,
        paymentHistory: [...paymentHistory, newPayment],
        lastPayment: newPayment,
      };

      console.log('[DBG][enrollment] Added payment to billing history');
    }

    // Add "First Course" achievement if this is their first enrollment
    if (user.enrolledCourses.length === 0) {
      const firstCourseAchievement: Achievement = {
        id: 'first-course',
        title: 'Course Beginner',
        description: 'Enrolled in your first course',
        icon: '',
        unlockedAt: now,
        points: 50,
      };
      updates.achievements = [...user.achievements, firstCourseAchievement];
      console.log('[DBG][enrollment] Added first course achievement');
    }

    // Update user in DynamoDB
    console.log('[DBG][enrollment] Updating user in DynamoDB...');
    await userRepository.updateUser(userId, updates);
    console.log('[DBG][enrollment] User updated successfully!');

    // Create course progress record in DynamoDB
    const courseProgress = await courseProgressRepository.createCourseProgress({
      userId,
      courseId,
      totalLessons: course.totalLessons,
    });

    console.log('[DBG][enrollment] Enrollment successful:', courseProgress.id);
    return { success: true };
  } catch (error) {
    console.error('[DBG][enrollment] Error enrolling user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Enrollment failed',
    };
  }
}

/**
 * Update lesson completion status
 */
export async function updateLessonProgress(
  userId: string,
  courseId: string,
  lessonId: string,
  completed: boolean,
  timeSpent?: number,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  console.log('[DBG][enrollment] Updating lesson progress:', {
    userId,
    courseId,
    lessonId,
    completed,
  });

  try {
    // Get current progress from DynamoDB
    const progress = await courseProgressRepository.getCourseProgress(userId, courseId);

    if (!progress) {
      return { success: false, error: 'Course progress not found' };
    }

    // Update lesson progress using repository
    const updatedProgress = await courseProgressRepository.updateLessonProgress(
      userId,
      courseId,
      lessonId,
      {
        completed,
        timeSpent,
        notes,
      }
    );

    // Check if course is completed
    if (updatedProgress.percentComplete === 100 && !progress.completedAt) {
      const now = new Date().toISOString();

      // Update user statistics in DynamoDB
      const user = await userRepository.getUserById(userId);
      if (user) {
        const updates: Partial<User> = {};

        // Update statistics
        updates.statistics = {
          ...user.statistics,
          completedCourses: (user.statistics.completedCourses || 0) + 1,
          completedLessons: (user.statistics.completedLessons || 0) + 1,
        };

        // Update enrolled course progress
        const updatedEnrolledCourses = user.enrolledCourses.map((ec: EnrolledCourse) => {
          if (ec.courseId === courseId) {
            return { ...ec, progress: 100, completedAt: now };
          }
          return ec;
        });
        updates.enrolledCourses = updatedEnrolledCourses;

        // Add course completion achievement
        const completionAchievement: Achievement = {
          id: `course-complete-${courseId}`,
          title: 'Course Master',
          description: `Completed the course`,
          icon: '',
          unlockedAt: now,
          points: 100,
        };
        updates.achievements = [...user.achievements, completionAchievement];

        await userRepository.updateUser(userId, updates);
      }
    }

    console.log('[DBG][enrollment] Progress updated successfully');
    return { success: true };
  } catch (error) {
    console.error('[DBG][enrollment] Error updating progress:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Progress update failed',
    };
  }
}

/**
 * Get user's progress for a course
 */
export async function getCourseProgress(
  userId: string,
  courseId: string
): Promise<CourseProgress | null> {
  return courseProgressRepository.getCourseProgress(userId, courseId);
}

/**
 * Check if user is enrolled in a course
 */
export async function isUserEnrolled(userId: string, courseId: string): Promise<boolean> {
  const user = await userRepository.getUserById(userId);
  if (!user) return false;

  return user.enrolledCourses.some((ec: EnrolledCourse) => ec.courseId === courseId);
}
