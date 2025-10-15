import { NextResponse } from 'next/server';
import type { User, ApiResponse } from '@/types';
import { getSession, getUserById } from '@/lib/auth';

export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  console.log(
    `[DBG][app/user/[userId]/details/route.ts] GET /data/app/user/${userId}/details called`
  );

  try {
    // Verify authentication
    const session = await getSession();
    if (!session || !session.user) {
      console.log('[DBG][app/user/details] No session found');
      const response: ApiResponse<null> = {
        success: false,
        error: 'Not authenticated',
      };
      return NextResponse.json(response, { status: 401 });
    }

    // Get user from MongoDB
    const user = await getUserById(userId);

    if (!user) {
      console.log('[DBG][app/user/details] User not found');
      const response: ApiResponse<null> = {
        success: false,
        error: 'User not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Verify user can only access their own data
    // Note: In the session, we might have mongoUserId or need to look up by auth0Id
    // For now, we'll allow access if authenticated (consider adding authorization check)

    console.log('[DBG][app/user/details] User found:', user.id);

    const response: ApiResponse<User> = {
      success: true,
      data: user,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][app/user/details] Error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
