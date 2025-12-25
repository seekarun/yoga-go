import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { decode } from 'next-auth/jwt';
import { getUserByCognitoSub, getOrCreateUser } from '@/lib/auth';
import { adminGetUserBySub } from '@/lib/cognito-auth';
import type { ApiResponse, User } from '@/types';

interface DecodedToken {
  cognitoSub?: string;
  email?: string;
  name?: string;
}

/**
 * GET /api/auth/me
 * Get the currently authenticated user's data from DynamoDB
 * Decodes JWT directly from cookie instead of using NextAuth's auth()
 * This is needed because we use custom login that creates JWT directly
 *
 * Flow:
 * 1. Decode session JWT to get cognitoSub
 * 2. Verify user exists in Cognito (source of truth)
 * 3. If Cognito user doesn't exist → 401 (stale session)
 * 4. If Cognito user exists but DB user doesn't → auto-create DB user
 */
export async function GET(request: NextRequest) {
  console.log('[DBG][api/auth/me] GET /api/auth/me called');

  try {
    // Get the session token directly from cookies
    const sessionToken = request.cookies.get('authjs.session-token')?.value;

    if (!sessionToken) {
      console.log('[DBG][api/auth/me] No session token cookie found');
      const response: ApiResponse<null> = {
        success: false,
        error: 'Not authenticated',
      };
      return NextResponse.json(response, { status: 401 });
    }

    console.log('[DBG][api/auth/me] Found session token cookie');

    // Decode the JWT directly
    const decoded = (await decode({
      token: sessionToken,
      secret: process.env.NEXTAUTH_SECRET!,
      salt: 'authjs.session-token',
    })) as DecodedToken | null;

    if (!decoded) {
      console.log('[DBG][api/auth/me] Failed to decode token');
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid session',
      };
      return NextResponse.json(response, { status: 401 });
    }

    console.log('[DBG][api/auth/me] Decoded token:', {
      cognitoSub: decoded.cognitoSub,
      email: decoded.email,
      name: decoded.name,
    });

    const cognitoSub = decoded.cognitoSub;
    if (!cognitoSub) {
      console.log('[DBG][api/auth/me] No cognitoSub in token');
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid session - missing cognitoSub',
      };
      return NextResponse.json(response, { status: 401 });
    }

    console.log('[DBG][api/auth/me] Session found for cognitoSub:', cognitoSub);

    // Step 1: Verify user exists in Cognito (source of truth)
    const cognitoUser = await adminGetUserBySub(cognitoSub);

    if (!cognitoUser) {
      console.log('[DBG][api/auth/me] Cognito user not found - stale session');
      const response: ApiResponse<null> = {
        success: false,
        error: 'User not found - please login again',
      };
      return NextResponse.json(response, { status: 401 });
    }

    console.log('[DBG][api/auth/me] Cognito user verified:', cognitoUser.email);

    // Step 2: Try to get user from DynamoDB
    let user = await getUserByCognitoSub(cognitoSub);

    // Step 3: If user doesn't exist in DynamoDB but exists in Cognito, create them
    if (!user) {
      console.log('[DBG][api/auth/me] DB user not found, creating from Cognito data');
      user = await getOrCreateUser({
        sub: cognitoSub,
        email: cognitoUser.email,
        name: cognitoUser.name || decoded.name || undefined,
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
