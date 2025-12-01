import { NextResponse } from 'next/server';
import { getSession, getUserByAuth0Id } from '@/lib/auth';
import UserModel from '@/models/User';
import type { ApiResponse } from '@/types';

/**
 * POST /api/user/become-expert
 * Upgrade a regular user to expert role
 */
export async function POST() {
  console.log('[DBG][api/user/become-expert] POST /api/user/become-expert called');

  try {
    // Get Auth0 session
    const session = await getSession();

    if (!session || !session.user || !session.user.cognitoSub) {
      console.log('[DBG][api/user/become-expert] No session found');
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

    // Get user from MongoDB
    const user = await getUserByAuth0Id(session.user.cognitoSub);

    if (!user) {
      console.log('[DBG][api/user/become-expert] User not found in MongoDB');
      const response: ApiResponse<null> = {
        success: false,
        error: 'User not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Check if already has expert role (handle both array and legacy string)
    const currentRoles = Array.isArray(user.role) ? user.role : [user.role];
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
    const newRoles = [...currentRoles, 'expert'];
    await UserModel.updateOne(
      { _id: user.id },
      {
        $set: {
          role: newRoles,
          // Note: expertProfile will be created during onboarding at /srv
        },
      }
    );

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
