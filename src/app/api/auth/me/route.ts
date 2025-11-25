import { NextResponse } from 'next/server';
import { getSession, getUserByAuth0Id, getOrCreateUser } from '@/lib/auth';
import type { ApiResponse, User, UserRole } from '@/types';

// Role claim namespace - must match Auth0 Post-Login Action
const ROLE_CLAIM_NAMESPACE = 'https://myyoga.guru';

/**
 * GET /api/auth/me
 * Get the currently authenticated user's data from MongoDB
 * Automatically syncs new users from Auth0 to MongoDB on first access
 */
export async function GET() {
  try {
    const session = await getSession();

    if (!session || !session.user) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Not authenticated',
      };
      return NextResponse.json(response, { status: 401 });
    }

    // Try to get user from MongoDB first
    let user = await getUserByAuth0Id(session.user.sub);

    // If user doesn't exist in MongoDB, create them (first login)
    if (!user) {
      // Extract role from Auth0 token claims if available
      const userClaims = session.user as Record<string, unknown>;
      const roleFromClaims = userClaims[`${ROLE_CLAIM_NAMESPACE}/role`] as UserRole | undefined;
      const role: UserRole = roleFromClaims || 'learner';

      const result = await getOrCreateUser(
        {
          sub: session.user.sub,
          email: session.user.email || '',
          name: session.user.name,
          picture: session.user.picture,
        },
        role
      );
      user = result.user;
    }

    const response: ApiResponse<User> = {
      success: true,
      data: user,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[api/auth/me] Error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
