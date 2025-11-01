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

    if (!session || !session.user) {
      console.log('[DBG][api/user/become-expert] No session found');
      const response: ApiResponse<null> = {
        success: false,
        error: 'Not authenticated',
      };
      return NextResponse.json(response, { status: 401 });
    }

    console.log('[DBG][api/user/become-expert] Session found for auth0Id:', session.user.sub);

    // Get user from MongoDB
    const user = await getUserByAuth0Id(session.user.sub);

    if (!user) {
      console.log('[DBG][api/user/become-expert] User not found in MongoDB');
      const response: ApiResponse<null> = {
        success: false,
        error: 'User not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Check if already an expert
    if (user.role === 'expert') {
      console.log('[DBG][api/user/become-expert] User is already an expert');
      const response: ApiResponse<{ message: string }> = {
        success: true,
        data: { message: 'User is already an expert' },
      };
      return NextResponse.json(response);
    }

    // Update user role to expert
    await UserModel.updateOne(
      { _id: user.id },
      {
        $set: {
          role: 'expert',
          // Note: expertProfile will be created during onboarding at /srv
        },
      }
    );

    console.log('[DBG][api/user/become-expert] User upgraded to expert:', user.id);

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
