import { NextResponse } from 'next/server';
import { getSession, getUserByAuth0Id, getOrCreateUser } from '@/lib/auth';
import type { ApiResponse, User } from '@/types';

/**
 * GET /api/auth/me
 * Get the currently authenticated user's data from MongoDB
 * Automatically syncs new users from Auth0 to MongoDB on first access
 */
export async function GET() {
  console.log('[DBG][api/auth/me] GET /api/auth/me called');

  try {
    // Get Auth0 session
    const session = await getSession();

    if (!session || !session.user) {
      console.log('[DBG][api/auth/me] No session found');
      const response: ApiResponse<null> = {
        success: false,
        error: 'Not authenticated',
      };
      return NextResponse.json(response, { status: 401 });
    }

    console.log('[DBG][api/auth/me] Session found for auth0Id:', session.user.sub);

    // Try to get user from MongoDB first
    let user = await getUserByAuth0Id(session.user.sub);

    // If user doesn't exist in MongoDB, create them (first login)
    if (!user) {
      console.log('[DBG][api/auth/me] User not found in MongoDB, creating new user');
      user = await getOrCreateUser({
        sub: session.user.sub,
        email: session.user.email || '',
        name: session.user.name,
        picture: session.user.picture,
      });
      console.log('[DBG][api/auth/me] New user created:', user.id);
    } else {
      console.log('[DBG][api/auth/me] Existing user found:', user.id);
    }

    const response: ApiResponse<User> = {
      success: true,
      data: user,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][api/auth/me] Error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
