/**
 * GET /api/auth/mobile/me
 * Get current user for mobile clients using Authorization header
 * Expects: Authorization: Bearer <token>
 */
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getUserByCognitoSub } from '@/lib/auth';
import type { ApiResponse, User } from '@/types';

interface MobileTokenPayload {
  sub: string;
  email: string;
  name?: string;
  platform: string;
  aud: string;
}

export async function GET(request: Request) {
  console.log('[DBG][mobile/me] GET /api/auth/mobile/me called');

  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[DBG][mobile/me] No Authorization header or invalid format');
      const response: ApiResponse<null> = {
        success: false,
        error: 'Missing or invalid Authorization header',
      };
      return NextResponse.json(response, { status: 401 });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify and decode the token
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

    let payload: MobileTokenPayload;
    try {
      const verified = await jwtVerify(token, secret, {
        audience: 'yoga-mobile',
      });
      payload = verified.payload as unknown as MobileTokenPayload;
    } catch (jwtError) {
      console.error('[DBG][mobile/me] Token verification failed:', jwtError);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid or expired token',
      };
      return NextResponse.json(response, { status: 401 });
    }

    // Verify this is a mobile token
    if (payload.platform !== 'mobile') {
      console.log('[DBG][mobile/me] Token is not a mobile token');
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid token type',
      };
      return NextResponse.json(response, { status: 401 });
    }

    const cognitoSub = payload.sub;
    if (!cognitoSub) {
      console.log('[DBG][mobile/me] No sub in token');
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid token - missing user identifier',
      };
      return NextResponse.json(response, { status: 401 });
    }

    console.log('[DBG][mobile/me] Token valid for cognitoSub:', cognitoSub);

    // Get user from DynamoDB
    const user = await getUserByCognitoSub(cognitoSub);

    if (!user) {
      console.log('[DBG][mobile/me] User not found in database');
      const response: ApiResponse<null> = {
        success: false,
        error: 'User not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    console.log('[DBG][mobile/me] User found:', user.id);

    const response: ApiResponse<User> = {
      success: true,
      data: user,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][mobile/me] Error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
