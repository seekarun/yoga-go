import { connectToDatabase } from './mongodb';
import User from '@/models/User';
import CourseProgress from '@/models/CourseProgress';
import CourseModel from '@/models/Course';
import type { EnrolledCourse, Achievement } from '@/types';

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
    await connectToDatabase();

    // Get user
    const user = await User.findById(userId);
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

    // Get course details from MongoDB using findOne (since _id is String, not ObjectId)
    const courseDoc = await CourseModel.findOne({ _id: courseId }).lean().exec();

    if (!courseDoc || Array.isArray(courseDoc)) {
      return { success: false, error: 'Course not found' };
    }

    const course = {
      ...(courseDoc as any),
      id: courseDoc._id as string,
    };

    const now = new Date().toISOString();

    // Add to user's enrolled courses
    const enrolledCourse: EnrolledCourse = {
      courseId: course.id,
      title: course.title,
      instructor: course.instructor.name,
      progress: 0,
      lastAccessed: now,
      enrolledAt: now,
    };

    console.log(
      '[DBG][enrollment] Before push - enrolledCourses count:',
      user.enrolledCourses.length
    );
    user.enrolledCourses.push(enrolledCourse);
    console.log(
      '[DBG][enrollment] After push - enrolledCourses count:',
      user.enrolledCourses.length
    );
    console.log('[DBG][enrollment] Enrolled course data:', JSON.stringify(enrolledCourse, null, 2));

    // Update user statistics
    user.statistics.totalCourses = (user.statistics.totalCourses || 0) + 1;
    console.log('[DBG][enrollment] Updated totalCourses to:', user.statistics.totalCourses);

    // Add payment to billing history if payment ID provided
    if (paymentId) {
      if (!user.billing) {
        user.billing = { paymentHistory: [] };
      }
      if (!user.billing.paymentHistory) {
        user.billing.paymentHistory = [];
      }

      user.billing.paymentHistory.push({
        date: now,
        amount: course.price,
        method: 'online',
        status: 'paid',
        description: `Enrollment in ${course.title}`,
        invoice: paymentId,
      });

      user.billing.lastPayment =
        user.billing.paymentHistory[user.billing.paymentHistory.length - 1];

      console.log('[DBG][enrollment] Added payment to billing history');
    }

    // Add "First Course" achievement if this is their first enrollment
    if (user.enrolledCourses.length === 1) {
      const firstCourseAchievement: Achievement = {
        id: 'first-course',
        title: 'Course Beginner',
        description: 'Enrolled in your first course',
        icon: '🎓',
        unlockedAt: now,
        points: 50,
      };
      user.achievements.push(firstCourseAchievement);
      console.log('[DBG][enrollment] Added first course achievement');
    }

    console.log('[DBG][enrollment] About to save user document...');
    const savedUser = await user.save();
    console.log(
      '[DBG][enrollment] User saved successfully! enrolledCourses count:',
      savedUser.enrolledCourses.length
    );
    console.log('[DBG][enrollment] Saved user ID:', savedUser._id);

    // Create course progress record
    const progressId = `${userId}_${courseId}`;
    const courseProgress = await CourseProgress.create({
      _id: progressId,
      userId,
      courseId,
      enrolledAt: now,
      lastAccessed: now,
      totalLessons: course.totalLessons,
      completedLessons: [],
      percentComplete: 0,
      totalTimeSpent: 0,
      averageSessionTime: 0,
      streak: 0,
      longestStreak: 0,
      lessonProgress: [],
      sessions: [],
      notes: [],
      achievementIds: [],
    });

    console.log('[DBG][enrollment] Enrollment successful:', courseProgress._id);
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
    await connectToDatabase();

    const progressId = `${userId}_${courseId}`;
    const progress = await CourseProgress.findById(progressId);

    if (!progress) {
      return { success: false, error: 'Course progress not found' };
    }

    const now = new Date().toISOString();

    // Update or create lesson progress
    const existingLessonProgress = progress.lessonProgress.find(
      (lp: { lessonId: string }) => lp.lessonId === lessonId
    );

    if (existingLessonProgress) {
      existingLessonProgress.completed = completed;
      if (completed && !existingLessonProgress.completedAt) {
        existingLessonProgress.completedAt = now;
      }
      if (timeSpent) {
        existingLessonProgress.timeSpent = (existingLessonProgress.timeSpent || 0) + timeSpent;
      }
      if (notes) {
        existingLessonProgress.notes = notes;
      }
    } else {
      progress.lessonProgress.push({
        lessonId,
        completed,
        completedAt: completed ? now : undefined,
        timeSpent: timeSpent || 0,
        notes: notes || '',
      });
    }

    // Update completed lessons array
    if (completed && !progress.completedLessons.includes(lessonId)) {
      progress.completedLessons.push(lessonId);
    } else if (!completed && progress.completedLessons.includes(lessonId)) {
      progress.completedLessons = progress.completedLessons.filter((id: string) => id !== lessonId);
    }

    // Update progress percentage
    progress.percentComplete = Math.round(
      (progress.completedLessons.length / progress.totalLessons) * 100
    );

    // Update time spent
    if (timeSpent) {
      progress.totalTimeSpent += timeSpent;
      progress.averageSessionTime = Math.round(
        progress.totalTimeSpent / progress.sessions.length || 1
      );
    }

    // Update last accessed and current lesson
    progress.lastAccessed = now;
    progress.currentLessonId = lessonId;

    // Check if course is completed
    if (progress.percentComplete === 100 && !progress.completedAt) {
      progress.completedAt = now;

      // Update user statistics
      const user = await User.findById(userId);
      if (user) {
        user.statistics.completedCourses = (user.statistics.completedCourses || 0) + 1;
        user.statistics.completedLessons = (user.statistics.completedLessons || 0) + 1;

        // Update enrolled course in user doc
        const enrolledCourse = user.enrolledCourses.find(
          (ec: EnrolledCourse) => ec.courseId === courseId
        );
        if (enrolledCourse) {
          enrolledCourse.progress = 100;
          enrolledCourse.completedAt = now;
        }

        // Add course completion achievement
        const completionAchievement: Achievement = {
          id: `course-complete-${courseId}`,
          title: 'Course Master',
          description: `Completed the course`,
          icon: '🏆',
          unlockedAt: now,
          points: 100,
        };
        user.achievements.push(completionAchievement);

        await user.save();
      }
    }

    await progress.save();

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
export async function getCourseProgress(userId: string, courseId: string) {
  await connectToDatabase();

  const progressId = `${userId}_${courseId}`;
  const progress = await CourseProgress.findById(progressId);

  return progress;
}

/**
 * Check if user is enrolled in a course
 */
export async function isUserEnrolled(userId: string, courseId: string): Promise<boolean> {
  await connectToDatabase();

  const user = await User.findById(userId);
  if (!user) return false;

  return user.enrolledCourses.some((ec: EnrolledCourse) => ec.courseId === courseId);
}
