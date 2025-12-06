import { NextResponse } from 'next/server';
import { getSession, getUserByAuth0Id } from '@/lib/auth';
import * as userRepository from '@/lib/repositories/userRepository';
import type { ApiResponse, UserRole } from '@/types';

/**
 * POST /api/user/become-expert
 * Upgrade a regular user to expert role
 */
export async function POST() {
  console.log('[DBG][api/user/become-expert] POST /api/user/become-expert called');

  try {
    // Get Auth0 session
    const session = await getSession();

    console.log('[DBG][api/user/become-expert] Session:', JSON.stringify(session, null, 2));
    console.log('[DBG][api/user/become-expert] Session exists:', !!session);
    console.log('[DBG][api/user/become-expert] Session.user exists:', !!session?.user);
    console.log(
      '[DBG][api/user/become-expert] Session.user.cognitoSub:',
      session?.user?.cognitoSub
    );

    if (!session || !session.user || !session.user.cognitoSub) {
      console.log('[DBG][api/user/become-expert] No session found - details:');
      console.log('[DBG][api/user/become-expert]   session:', session);
      console.log('[DBG][api/user/become-expert]   session?.user:', session?.user);
      console.log('[DBG][api/user/become-expert]   cognitoSub:', session?.user?.cognitoSub);
      const response: ApiResponse<null> = {
        success: false,
        error: 'Not authenticated',
      };
      return NextResponse.json(response, { status: 401 });
    }

    console.log(
      '[DBG][api/user/become-expert] Session found for cognitoSub:',
      session.user.cognitoSub
    );

    // Get user from DynamoDB
    const user = await getUserByAuth0Id(session.user.cognitoSub);

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
    await userRepository.updateUser(session.user.cognitoSub, {
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
