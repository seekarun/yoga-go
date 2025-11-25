import { NextResponse } from 'next/server';
import { getSession, getUserByCognitoSub, getOrCreateUser } from '@/lib/auth';
import type { ApiResponse, User } from '@/types';

/**
 * GET /api/auth/me
 * Get the currently authenticated user's data from MongoDB
 * Automatically syncs new users from Cognito to MongoDB on first access
 */
export async function GET() {
  console.log('[DBG][api/auth/me] GET /api/auth/me called');

  try {
    // Get session from NextAuth
    const session = await getSession();

    if (!session || !session.user || !session.user.cognitoSub) {
      console.log('[DBG][api/auth/me] No session found');
      const response: ApiResponse<null> = {
        success: false,
        error: 'Not authenticated',
      };
      return NextResponse.json(response, { status: 401 });
    }

    const cognitoSub = session.user.cognitoSub;
    if (!cognitoSub) {
      console.log('[DBG][api/auth/me] No cognitoSub in session');
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid session',
      };
      return NextResponse.json(response, { status: 401 });
    }

    console.log('[DBG][api/auth/me] Session found for cognitoSub:', cognitoSub);

    // Try to get user from MongoDB first
    let user = await getUserByCognitoSub(cognitoSub);

    // If user doesn't exist in MongoDB, create them (first login)
    if (!user) {
      console.log('[DBG][api/auth/me] User not found in MongoDB, creating new user');
      user = await getOrCreateUser({
        sub: cognitoSub,
        email: session.user.email || '',
        name: session.user.name || undefined,
        picture: session.user.image || undefined,
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
