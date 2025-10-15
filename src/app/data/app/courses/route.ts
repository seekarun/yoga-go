import { NextResponse } from 'next/server';
import { getSession, getUserByAuth0Id } from '@/lib/auth';
import { getCourseProgress } from '@/lib/enrollment';
import { connectToDatabase } from '@/lib/mongodb';
import CourseModel from '@/models/Course';
import type {
  UserCoursesData,
  ApiResponse,
  UserCourseData,
  RecommendedCourse,
  Course,
} from '@/types';

export async function GET() {
  console.log('[DBG][app/courses/route.ts] GET /data/app/courses called');

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

    // Connect to MongoDB for course data
    await connectToDatabase();

    // Build enrolled courses data with progress
    const enrolledCoursesData: UserCourseData[] = [];

    console.log(
      `[DBG][app/courses/route.ts] User has ${user.enrolledCourses.length} enrolled courses:`,
      user.enrolledCourses.map(ec => ec.courseId)
    );

    for (const enrolledCourse of user.enrolledCourses) {
      // Fetch course from MongoDB using findOne (since _id is a String, not ObjectId)
      console.log(`[DBG][app/courses/route.ts] Fetching course: ${enrolledCourse.courseId}`);
      const courseDoc = await CourseModel.findOne({ _id: enrolledCourse.courseId }).lean().exec();
      if (!courseDoc) {
        console.error(
          `[DBG][app/courses/route.ts] Course ${enrolledCourse.courseId} not found in MongoDB`
        );
        continue;
      }

      console.log(
        `[DBG][app/courses/route.ts] Found course: ${(courseDoc as { _id: string })._id}`
      );

      // Transform to Course type
      const course: Course = {
        ...(courseDoc as unknown as Course),
        id: (courseDoc as { _id: string })._id,
      };

      // Get progress from MongoDB
      const progress = await getCourseProgress(user.id, enrolledCourse.courseId);

      const userCourse = {
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
          completedLessons: progress?.completedLessons.length || 0,
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
            progress?.completedLessons.length > 0
              ? {
                  id: progress.completedLessons[progress.completedLessons.length - 1],
                  title: 'Last Completed',
                  completedAt: progress.lastAccessed,
                }
              : undefined,
        },
      };

      enrolledCoursesData.push(userCourse as UserCourseData);
    }

    // Get recommended courses (courses user hasn't enrolled in)
    const enrolledIds = user.enrolledCourses.map(ec => ec.courseId);

    // Fetch all published courses from MongoDB
    const allCourseDocs = await CourseModel.find({ status: 'PUBLISHED' }).lean().exec();
    const allCourses: Course[] = allCourseDocs.map(doc => ({
      ...(doc as unknown as Course),
      id: (doc as { _id: string })._id,
    }));

    const notEnrolledCourses = allCourses.filter(c => !enrolledIds.includes(c.id));

    const recommendedCourses: RecommendedCourse[] = notEnrolledCourses.slice(0, 4).map(course => ({
      id: course.id,
      title: course.title,
      description: course.description,
      instructor: course.instructor,
      thumbnail: course.thumbnail,
      level: course.level,
      price: course.price,
      rating: course.rating,
      matchScore: 75,
      reason: 'Based on your interests',
    }));

    const data: UserCoursesData = {
      enrolled: enrolledCoursesData,
      recommended: recommendedCourses,
      statistics: {
        totalEnrolled: enrolledCoursesData.length,
        completed: enrolledCoursesData.filter(c => c.percentComplete === 100).length,
        inProgress: enrolledCoursesData.filter(
          c => c.percentComplete > 0 && c.percentComplete < 100
        ).length,
        totalTimeSpent: enrolledCoursesData.reduce((acc, c) => acc + c.progress.totalTimeSpent, 0),
        currentStreak: user.statistics.currentStreak || 0,
      },
    };

    const response: ApiResponse<UserCoursesData> = {
      success: true,
      data,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][app/courses/route.ts] Error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
