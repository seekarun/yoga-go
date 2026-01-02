/**
 * GET /api/auth/mobile/me
 * Get current user for mobile clients using Authorization header
 * Expects: Authorization: Bearer <cognito-access-token>
 *
 * Verifies the Cognito access token against Cognito's JWKS
 */
import { NextResponse } from 'next/server';
import { getUserByCognitoSub } from '@/lib/auth';
import { getAccessTokenVerifier } from '@/lib/cognito';
import type { ApiResponse, User } from '@/types';

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

    // Verify Cognito access token
    const verifier = getAccessTokenVerifier();

    if (!verifier) {
      console.error('[DBG][mobile/me] Access token verifier not available');
      const response: ApiResponse<null> = {
        success: false,
        error: 'Authentication service unavailable',
      };
      return NextResponse.json(response, { status: 500 });
    }

    let cognitoSub: string;
    try {
      const payload = await verifier.verify(token);
      cognitoSub = payload.sub;
      console.log('[DBG][mobile/me] Cognito token verified for sub:', cognitoSub);
    } catch (jwtError) {
      console.error('[DBG][mobile/me] Token verification failed:', jwtError);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid or expired token',
      };
      return NextResponse.json(response, { status: 401 });
    }

    if (!cognitoSub) {
      console.log('[DBG][mobile/me] No sub in token');
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid token - missing user identifier',
      };
      return NextResponse.json(response, { status: 401 });
    }

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
