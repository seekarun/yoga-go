import { NextResponse } from 'next/server';
import { getSession, getUserByAuth0Id } from '@/lib/auth';
import { getCourseProgress } from '@/lib/enrollment';
import * as courseRepository from '@/lib/repositories/courseRepository';
import * as lessonRepository from '@/lib/repositories/lessonRepository';
import type { UserCourseData, ApiResponse, Course, Lesson } from '@/types';

export async function GET(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  console.log(`[DBG][app/courses/[courseId]/route.ts] GET /data/app/courses/${courseId} called`);

  try {
    // Check authentication
    const session = await getSession();
    if (!session || !session.user || !session.user.cognitoSub) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Not authenticated',
      };
      return NextResponse.json(response, { status: 401 });
    }

    // Get user from MongoDB
    const user = await getUserByAuth0Id(session.user.cognitoSub);
    if (!user) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'User not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Check if user is enrolled in this course
    const enrolledCourse = user.enrolledCourses.find(ec => ec.courseId === courseId);
    if (!enrolledCourse) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Not enrolled in this course',
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Fetch course from DynamoDB (cross-tenant lookup)
    const courseDoc = await courseRepository.getCourseByIdOnly(courseId);
    if (!courseDoc) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Course not found',
      };
      return NextResponse.json(response, { status: 404 });
    }
    const tenantId = courseDoc.instructor.id;

    // Get progress from DynamoDB
    const progress = await getCourseProgress(tenantId, user.id, courseId);

    // Fetch all lessons for this course from DynamoDB
    const lessonDocs = await lessonRepository.getLessonsByCourseId(tenantId, courseId);
    const lessons: Lesson[] = lessonDocs;

    // Build curriculum with actual lessons
    const rawCurriculum = (courseDoc.curriculum || []).map(w => ({
      week: w.week,
      title: w.title,
      lessonIds: (w as { lessonIds?: string[] }).lessonIds || [],
    }));

    const completedLessonIds = progress?.completedLessons || [];

    const populatedCurriculum = rawCurriculum.map(week => {
      const weekLessons = (week.lessonIds || [])
        .map((lessonId: string) => {
          const lesson = lessons.find(l => l.id === lessonId);
          if (!lesson) return null;

          const isCompleted = completedLessonIds.includes(lessonId);
          return {
            ...lesson,
            completed: isCompleted,
            completedAt: isCompleted ? progress?.lastAccessed : undefined,
          } as Lesson & { completed: boolean; completedAt?: string };
        })
        .filter(
          (lesson): lesson is Lesson & { completed: boolean; completedAt?: string } =>
            lesson !== null
        );

      return {
        week: week.week,
        title: week.title,
        lessons: weekLessons,
      };
    });

    // Use course directly since it's already typed as Course
    const course: Course = { ...courseDoc };

    // Build user course data
    const userCourse: UserCourseData = {
      ...course,
      enrolledAt: enrolledCourse.enrolledAt || new Date().toISOString(),
      lastAccessed: enrolledCourse.lastAccessed,
      completedLessons: progress?.completedLessons.length || 0,
      percentComplete: progress?.percentComplete || enrolledCourse.progress,
      certificateAvailable: enrolledCourse.completedAt ? true : false,
      certificateUrl: enrolledCourse.certificateUrl,
      completedAt: enrolledCourse.completedAt,
      nextLesson: progress?.currentLessonId
        ? {
            id: progress.currentLessonId,
            title: 'Continue Learning',
            duration: '30 min',
          }
        : undefined,
      progress: {
        totalLessons: progress?.totalLessons || course.totalLessons,
        completedLessons: progress?.completedLessons?.length || 0,
        percentComplete: progress?.percentComplete || enrolledCourse.progress,
        currentLesson: progress?.currentLessonId
          ? {
              id: progress.currentLessonId,
              title: 'Current Lesson',
              duration: '30 min',
            }
          : undefined,
        streak: progress?.streak || 0,
        longestStreak: progress?.longestStreak,
        totalTimeSpent: progress?.totalTimeSpent || 0,
        averageSessionTime: progress?.averageSessionTime || 0,
        lastCompletedLesson:
          progress?.completedLessons && progress.completedLessons.length > 0
            ? {
                id: progress.completedLessons[progress.completedLessons.length - 1],
                title: 'Last Completed',
                completedAt: progress.lastAccessed,
              }
            : undefined,
      },
      curriculum: populatedCurriculum,
      notes: progress?.notes || [],
      resources: [],
    };

    const response: ApiResponse<UserCourseData> = {
      success: true,
      data: userCourse,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(`[DBG][app/courses/[courseId]/route.ts] Error:`, error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
