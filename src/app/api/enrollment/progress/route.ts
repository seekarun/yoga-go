import { NextResponse } from 'next/server';
import { getSession, getUserByAuth0Id } from '@/lib/auth';
import { updateLessonProgress } from '@/lib/enrollment';
import type { ApiResponse } from '@/types';

/**
 * POST /api/enrollment/progress
 * Update lesson completion progress for authenticated user
 */
export async function POST(request: Request) {
  console.log('[DBG][api/enrollment/progress] POST request received');

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

    // Get request body
    const body = await request.json();
    const { courseId, lessonId, completed, timeSpent, notes } = body;

    if (!courseId || !lessonId || completed === undefined) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Course ID, lesson ID, and completed status are required',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Get user from session
    const user = await getUserByAuth0Id(session.user.sub);

    if (!user) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'User not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Update progress
    const result = await updateLessonProgress(
      user.id,
      courseId,
      lessonId,
      completed,
      timeSpent,
      notes
    );

    if (!result.success) {
      const response: ApiResponse<null> = {
        success: false,
        error: result.error || 'Progress update failed',
      };
      return NextResponse.json(response, { status: 500 });
    }

    const response: ApiResponse<{ lessonId: string; completed: boolean }> = {
      success: true,
      data: { lessonId, completed },
      message: 'Progress updated successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][api/enrollment/progress] Error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
