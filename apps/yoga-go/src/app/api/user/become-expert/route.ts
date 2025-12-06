import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { decode } from 'next-auth/jwt';
import { getUserByAuth0Id } from '@/lib/auth';
import * as userRepository from '@/lib/repositories/userRepository';
import type { ApiResponse, UserRole } from '@/types';

interface DecodedToken {
  cognitoSub?: string;
  sub?: string;
  email?: string;
  name?: string;
}

/**
 * POST /api/user/become-expert
 * Upgrade a regular user to expert role
 *
 * Uses direct cookie reading + JWT decode (same as /api/auth/me)
 * because auth() doesn't work reliably in API routes on Vercel
 */
export async function POST(request: NextRequest) {
  console.log('[DBG][api/user/become-expert] POST /api/user/become-expert called');

  try {
    // Get the session token directly from cookies (same approach as /api/auth/me)
    const sessionToken = request.cookies.get('authjs.session-token')?.value;

    if (!sessionToken) {
      console.log('[DBG][api/user/become-expert] No session token cookie found');
      const response: ApiResponse<null> = {
        success: false,
        error: 'Not authenticated',
      };
      return NextResponse.json(response, { status: 401 });
    }

    console.log('[DBG][api/user/become-expert] Found session token cookie');

    // Decode the JWT directly
    const decoded = (await decode({
      token: sessionToken,
      secret: process.env.NEXTAUTH_SECRET!,
      salt: 'authjs.session-token',
    })) as DecodedToken | null;

    if (!decoded) {
      console.log('[DBG][api/user/become-expert] Failed to decode token');
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid session',
      };
      return NextResponse.json(response, { status: 401 });
    }

    // Use cognitoSub or fall back to sub (standard JWT claim)
    const cognitoSub = decoded.cognitoSub || decoded.sub;

    console.log('[DBG][api/user/become-expert] Decoded token:', {
      cognitoSub,
      email: decoded.email,
      name: decoded.name,
    });

    if (!cognitoSub) {
      console.log('[DBG][api/user/become-expert] No cognitoSub in token');
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid session - missing cognitoSub',
      };
      return NextResponse.json(response, { status: 401 });
    }

    console.log('[DBG][api/user/become-expert] Session found for cognitoSub:', cognitoSub);

    // Get user from DynamoDB
    const user = await getUserByAuth0Id(cognitoSub);

    if (!user) {
      console.log('[DBG][api/user/become-expert] User not found in DynamoDB');
      const response: ApiResponse<null> = {
        success: false,
        error: 'User not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Check if already has expert role (handle both array and legacy string)
    const currentRoles: UserRole[] = Array.isArray(user.role) ? user.role : [user.role as UserRole];
    const isAlreadyExpert = currentRoles.includes('expert');

    if (isAlreadyExpert) {
      console.log('[DBG][api/user/become-expert] User is already an expert');
      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: { message: 'User is already an expert' },
      };
      return NextResponse.json(response);
    }

    // Add 'expert' to user's roles array
    const newRoles: UserRole[] = [...currentRoles, 'expert'];
    await userRepository.updateUser(cognitoSub, {
      role: newRoles,
      // Note: expertProfile will be created during onboarding at /srv
    });

    console.log(
      '[DBG][api/user/become-expert] User upgraded to expert:',
      user.id,
      'roles:',
      newRoles
    );

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: 'Successfully upgraded to expert' },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][api/user/become-expert] Error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
