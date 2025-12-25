import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { decode } from 'next-auth/jwt';
import { getUserByCognitoSub, getOrCreateUser } from '@/lib/auth';
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
 * 2. Try to get user from DynamoDB
 * 3. If DB user doesn't exist → auto-create from JWT data (JWT is already validated)
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

    // Try to get user from DynamoDB
    let user = await getUserByCognitoSub(cognitoSub);

    // If user doesn't exist in DynamoDB, create from JWT data
    // The JWT is already validated, so we trust the data in it
    if (!user) {
      console.log('[DBG][api/auth/me] DB user not found, creating from JWT data');

      // JWT must have email to create user
      if (!decoded.email) {
        console.log('[DBG][api/auth/me] No email in JWT, cannot create user');
        const response: ApiResponse<null> = {
          success: false,
          error: 'Invalid session - missing email',
        };
        return NextResponse.json(response, { status: 401 });
      }

      user = await getOrCreateUser({
        sub: cognitoSub,
        email: decoded.email,
        name: decoded.name || undefined,
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
