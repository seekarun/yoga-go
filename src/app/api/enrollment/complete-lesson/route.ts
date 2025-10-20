import { NextResponse } from 'next/server';
import { getSession, getUserByAuth0Id } from '@/lib/auth';
import { updateLessonProgress } from '@/lib/enrollment';
import type { ApiResponse } from '@/types';

export async function POST(request: Request) {
  console.log('[DBG][complete-lesson/route.ts] POST /api/enrollment/complete-lesson called');

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
      console.error(
        '[DBG][complete-lesson/route.ts] User not found for auth0Id:',
        session.user.sub
      );
      const response: ApiResponse<null> = {
        success: false,
        error: 'User not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Parse request body
    const { courseId, lessonId, timeSpent, notes } = await request.json();

    if (!courseId || !lessonId) {
      return NextResponse.json(
        {
          success: false,
          error: 'courseId and lessonId are required',
        },
        { status: 400 }
      );
    }

    console.log('[DBG][complete-lesson/route.ts] Marking lesson complete:', {
      userId: user.id,
      courseId,
      lessonId,
    });

    // Update lesson progress
    const result = await updateLessonProgress(
      user.id,
      courseId,
      lessonId,
      true, // completed = true
      timeSpent,
      notes
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to update lesson progress',
        },
        { status: 500 }
      );
    }

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: 'Lesson marked as complete' },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][complete-lesson/route.ts] Error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
