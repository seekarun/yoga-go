/**
 * User Profile API
 * PATCH /data/app/user/me/profile - Update current user's profile (name, avatar, etc.)
 */

import { NextResponse } from 'next/server';
import type { ApiResponse, UserProfile } from '@/types';
import { getSessionFromCookies, getUserByCognitoSub } from '@/lib/auth';
import * as userRepository from '@/lib/repositories/userRepository';

/**
 * PATCH /data/app/user/me/profile
 * Update current user's profile (partial update)
 */
export async function PATCH(request: Request) {
  console.log('[DBG][user/me/profile] PATCH called');

  try {
    const session = await getSessionFromCookies();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<ApiResponse<UserProfile>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user) {
      return NextResponse.json<ApiResponse<UserProfile>>(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    console.log('[DBG][user/me/profile] Updating profile:', Object.keys(body));

    // Only allow updating specific profile fields
    const allowedFields = ['name', 'avatar', 'bio', 'phoneNumber', 'location', 'timezone'];
    const profileUpdates: Partial<UserProfile> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        profileUpdates[field as keyof UserProfile] = body[field];
      }
    }

    if (Object.keys(profileUpdates).length === 0) {
      return NextResponse.json<ApiResponse<UserProfile>>(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Merge existing profile with updates
    const updatedProfile: UserProfile = {
      ...user.profile,
      ...profileUpdates,
    };

    // Update user with new profile
    const updatedUser = await userRepository.updateUser(session.user.cognitoSub, {
      profile: updatedProfile,
    });

    console.log('[DBG][user/me/profile] Profile updated for user:', user.id);

    return NextResponse.json<ApiResponse<UserProfile>>({
      success: true,
      data: updatedUser.profile,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('[DBG][user/me/profile] Error:', error);
    return NextResponse.json<ApiResponse<UserProfile>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update profile',
      },
      { status: 500 }
    );
  }
}
