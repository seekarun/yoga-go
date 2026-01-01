import * as tenantUserRepository from './repositories/tenantUserRepository';
import * as courseRepository from './repositories/courseRepository';
import * as courseProgressRepository from './repositories/courseProgressRepository';
import * as webinarRepository from './repositories/webinarRepository';
import * as webinarRegistrationRepository from './repositories/webinarRegistrationRepository';
import type {
  EnrolledCourse,
  Achievement,
  TenantUser,
  CourseProgress,
  WebinarRegistration,
} from '@/types';

/**
 * Enroll a user in a course
 * Creates enrollment record and initializes progress tracking
 *
 * @param tenantId - The tenant ID (instructor's expertId)
 * @param userId - The user's cognitoSub
 * @param courseId - The course ID
 * @param paymentId - Optional payment ID
 */
export async function enrollUserInCourse(
  tenantId: string,
  userId: string,
  courseId: string,
  paymentId?: string
): Promise<{ success: boolean; error?: string }> {
  console.log(
    '[DBG][enrollment] Enrolling user',
    userId,
    'in course',
    courseId,
    'tenant',
    tenantId
  );

  try {
    // Get or create tenant user in DynamoDB
    const user = await tenantUserRepository.getTenantUser(tenantId, userId);
    if (!user) {
      return { success: false, error: 'User not found in tenant' };
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
    const course = await courseRepository.getCourseById(tenantId, courseId);

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

    const updates: Partial<TenantUser> = {};

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
    await tenantUserRepository.updateTenantUser(tenantId, userId, updates);
    console.log('[DBG][enrollment] User updated successfully!');

    // Create course progress record in DynamoDB
    const courseProgress = await courseProgressRepository.createCourseProgress(tenantId, {
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
 *
 * @param tenantId - The tenant ID (instructor's expertId)
 * @param userId - The user's cognitoSub
 * @param courseId - The course ID
 * @param lessonId - The lesson ID
 * @param completed - Whether the lesson is completed
 * @param timeSpent - Optional time spent on the lesson
 * @param notes - Optional notes
 */
export async function updateLessonProgress(
  tenantId: string,
  userId: string,
  courseId: string,
  lessonId: string,
  completed: boolean,
  timeSpent?: number,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  console.log('[DBG][enrollment] Updating lesson progress:', {
    tenantId,
    userId,
    courseId,
    lessonId,
    completed,
  });

  try {
    // Get current progress from DynamoDB
    const progress = await courseProgressRepository.getCourseProgress(tenantId, userId, courseId);

    if (!progress) {
      return { success: false, error: 'Course progress not found' };
    }

    // Update lesson progress using repository
    const updatedProgress = await courseProgressRepository.updateLessonProgress(
      tenantId,
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
      const user = await tenantUserRepository.getTenantUser(tenantId, userId);
      if (user) {
        const updates: Partial<TenantUser> = {};

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

        await tenantUserRepository.updateTenantUser(tenantId, userId, updates);
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
 *
 * @param tenantId - The tenant ID (instructor's expertId)
 * @param userId - The user's cognitoSub
 * @param courseId - The course ID
 */
export async function getCourseProgress(
  tenantId: string,
  userId: string,
  courseId: string
): Promise<CourseProgress | null> {
  return courseProgressRepository.getCourseProgress(tenantId, userId, courseId);
}

/**
 * Check if user is enrolled in a course
 *
 * @param tenantId - The tenant ID (instructor's expertId)
 * @param userId - The user's cognitoSub
 * @param courseId - The course ID
 */
export async function isUserEnrolled(
  tenantId: string,
  userId: string,
  courseId: string
): Promise<boolean> {
  const user = await tenantUserRepository.getTenantUser(tenantId, userId);
  if (!user) return false;

  return user.enrolledCourses.some((ec: EnrolledCourse) => ec.courseId === courseId);
}

/**
 * Register a user for a webinar
 * Creates registration record and updates webinar registration count
 *
 * @param tenantId - The tenant ID (webinar's expertId)
 * @param userId - The user's cognitoSub
 * @param webinarId - The webinar ID
 * @param userName - The user's name
 * @param userEmail - The user's email
 * @param paymentId - Optional payment ID
 */
export async function registerUserForWebinar(
  tenantId: string,
  userId: string,
  webinarId: string,
  userName: string,
  userEmail: string,
  paymentId?: string
): Promise<{ success: boolean; registration?: WebinarRegistration; error?: string }> {
  console.log(
    '[DBG][enrollment] Registering user',
    userId,
    'for webinar',
    webinarId,
    'tenant',
    tenantId
  );

  try {
    // Get webinar details from DynamoDB
    const webinar = await webinarRepository.getWebinarById(tenantId, webinarId);
    if (!webinar) {
      return { success: false, error: 'Webinar not found' };
    }

    // Check if webinar is open for registration
    if (webinar.status !== 'SCHEDULED' && webinar.status !== 'DRAFT') {
      return { success: false, error: 'Webinar is not open for registration' };
    }

    // Check if already registered
    const existingRegistration = await webinarRegistrationRepository.getRegistration(
      tenantId,
      webinarId,
      userId
    );
    if (existingRegistration && existingRegistration.status === 'registered') {
      console.log('[DBG][enrollment] User already registered for webinar');
      return { success: true, registration: existingRegistration };
    }

    // Check capacity
    const hasCapacity = await webinarRepository.hasCapacity(tenantId, webinarId);
    if (!hasCapacity) {
      return { success: false, error: 'Webinar is at full capacity' };
    }

    // Create registration ID
    const registrationId = `reg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Create registration record
    const registration = await webinarRegistrationRepository.createRegistration(tenantId, {
      id: registrationId,
      webinarId,
      userId,
      userName,
      userEmail,
      paymentId,
    });

    // Increment webinar registration count
    await webinarRepository.incrementRegistrations(tenantId, webinarId);

    console.log('[DBG][enrollment] Webinar registration successful:', registrationId);
    return { success: true, registration };
  } catch (error) {
    console.error('[DBG][enrollment] Error registering for webinar:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Registration failed',
    };
  }
}

/**
 * Check if user is registered for a webinar
 *
 * @param tenantId - The tenant ID (webinar's expertId)
 * @param userId - The user's cognitoSub
 * @param webinarId - The webinar ID
 */
export async function isUserRegisteredForWebinar(
  tenantId: string,
  userId: string,
  webinarId: string
): Promise<boolean> {
  return webinarRegistrationRepository.isUserRegistered(tenantId, webinarId, userId);
}

/**
 * Get user's webinar registrations (cross-tenant)
 * This looks up registrations across all tenants for a user
 *
 * @param userId - The user's cognitoSub
 */
export async function getUserWebinarRegistrations(userId: string): Promise<WebinarRegistration[]> {
  return webinarRegistrationRepository.getRegistrationsByUserId(userId);
}
