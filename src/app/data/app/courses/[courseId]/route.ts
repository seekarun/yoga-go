import { NextResponse } from 'next/server';
import { getSession, getUserByAuth0Id } from '@/lib/auth';
import { getCourseProgress } from '@/lib/enrollment';
import { connectToDatabase } from '@/lib/mongodb';
import CourseModel from '@/models/Course';
import LessonModel from '@/models/Lesson';
import type { UserCourseData, ApiResponse, Course, Lesson } from '@/types';

export async function GET(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  console.log(`[DBG][app/courses/[courseId]/route.ts] GET /data/app/courses/${courseId} called`);

  try {
    // Check authentication
    const session = await getSession();
    if (!session || !session.user) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Not authenticated',
      };
      return NextResponse.json(response, { status: 401 });
    }

    // Get user from MongoDB
    const user = await getUserByAuth0Id(session.user.sub);
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

    // Connect to MongoDB
    await connectToDatabase();

    // Fetch course from MongoDB
    const courseDoc = await CourseModel.findOne({ _id: courseId }).lean().exec();
    if (!courseDoc) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Course not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Get progress from MongoDB
    const progress = await getCourseProgress(user.id, courseId);

    // Fetch all lessons for this course and populate curriculum
    const lessonDocs = await LessonModel.find({ courseId }).lean().exec();
    const lessons: Lesson[] = lessonDocs.map((doc: any) => ({
      ...doc,
      id: doc._id as string,
    }));

    // Build curriculum with actual lessons (access curriculum from raw doc before casting to Course)
    const rawCurriculum =
      ((courseDoc as Record<string, unknown>).curriculum as {
        week: number;
        title: string;
        lessonIds: string[];
      }[]) || [];

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

    // Transform to Course type
    const course: Course = {
      ...(courseDoc as any),
      id: (courseDoc as any)._id as string,
    };

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
        completedLessons: Array.isArray(progress?.completedLessons)
          ? progress.completedLessons
          : [], // Return the actual array of lesson IDs
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
