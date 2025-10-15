import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { enrollUserInCourse } from '@/lib/enrollment';
import type { ApiResponse } from '@/types';

/**
 * POST /api/enrollment/enroll
 * Enroll authenticated user in a course
 */
export async function POST(request: Request) {
  console.log('[DBG][api/enrollment/enroll] POST request received');

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
    const { courseId, paymentId } = body;

    if (!courseId) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Course ID is required',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Get user ID from session
    // In production, you'd fetch the MongoDB user ID via the auth0Id
    // For now, we'll assume the session contains the user ID
    const { getUserByAuth0Id } = await import('@/lib/auth');
    const user = await getUserByAuth0Id(session.user.sub);

    if (!user) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'User not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Enroll user
    const result = await enrollUserInCourse(user.id, courseId, paymentId);

    if (!result.success) {
      const response: ApiResponse<null> = {
        success: false,
        error: result.error || 'Enrollment failed',
      };
      return NextResponse.json(response, { status: 500 });
    }

    const response: ApiResponse<{ courseId: string }> = {
      success: true,
      data: { courseId },
      message: 'Successfully enrolled in course',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][api/enrollment/enroll] Error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
