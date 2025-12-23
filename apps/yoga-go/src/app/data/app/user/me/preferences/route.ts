/**
 * User Preferences API
 * GET /data/app/user/me/preferences - Get current user's preferences
 * PATCH /data/app/user/me/preferences - Update current user's preferences
 */

import { NextResponse } from 'next/server';
import type { ApiResponse, UserPreferences } from '@/types';
import { getSessionFromCookies, getUserByCognitoSub } from '@/lib/auth';
import * as userRepository from '@/lib/repositories/userRepository';

/**
 * GET /data/app/user/me/preferences
 * Get current user's preferences
 */
export async function GET() {
  console.log('[DBG][user/me/preferences] GET called');

  try {
    const session = await getSessionFromCookies();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<ApiResponse<UserPreferences>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user) {
      return NextResponse.json<ApiResponse<UserPreferences>>(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('[DBG][user/me/preferences] Returning preferences for user:', user.id);

    return NextResponse.json<ApiResponse<UserPreferences>>({
      success: true,
      data: user.preferences || {},
    });
  } catch (error) {
    console.error('[DBG][user/me/preferences] Error:', error);
    return NextResponse.json<ApiResponse<UserPreferences>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get preferences',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /data/app/user/me/preferences
 * Update current user's preferences (partial update)
 */
export async function PATCH(request: Request) {
  console.log('[DBG][user/me/preferences] PATCH called');

  try {
    const session = await getSessionFromCookies();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<ApiResponse<UserPreferences>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user) {
      return NextResponse.json<ApiResponse<UserPreferences>>(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    console.log('[DBG][user/me/preferences] Updating preferences:', body);

    // Merge existing preferences with updates
    const updatedPreferences: UserPreferences = {
      ...user.preferences,
      ...body,
    };

    // Update user with new preferences
    const updatedUser = await userRepository.updateUser(session.user.cognitoSub, {
      preferences: updatedPreferences,
    });

    console.log('[DBG][user/me/preferences] Preferences updated for user:', user.id);

    return NextResponse.json<ApiResponse<UserPreferences>>({
      success: true,
      data: updatedUser.preferences || {},
      message: 'Preferences updated successfully',
    });
  } catch (error) {
    console.error('[DBG][user/me/preferences] Error:', error);
    return NextResponse.json<ApiResponse<UserPreferences>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update preferences',
      },
      { status: 500 }
    );
  }
}
