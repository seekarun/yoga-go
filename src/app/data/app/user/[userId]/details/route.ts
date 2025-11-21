import { NextResponse } from 'next/server';
import type { User, ApiResponse } from '@/types';
import { getSession, getUserById, getUserByAuth0Id } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import UserModel from '@/models/User';

export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  console.log(
    `[DBG][app/user/[userId]/details/route.ts] GET /data/app/user/${userId}/details called`
  );

  try {
    // Verify authentication
    const session = await getSession();
    if (!session || !session.user) {
      console.log('[DBG][app/user/details] No session found');
      const response: ApiResponse<null> = {
        success: false,
        error: 'Not authenticated',
      };
      return NextResponse.json(response, { status: 401 });
    }

    // Get user from MongoDB
    const user = await getUserById(userId);

    if (!user) {
      console.log('[DBG][app/user/details] User not found');
      const response: ApiResponse<null> = {
        success: false,
        error: 'User not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Verify user can only access their own data
    // Note: In the session, we might have mongoUserId or need to look up by auth0Id
    // For now, we'll allow access if authenticated (consider adding authorization check)

    console.log('[DBG][app/user/details] User found:', user.id);

    const response: ApiResponse<User> = {
      success: true,
      data: user,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][app/user/details] Error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  console.log(
    `[DBG][app/user/[userId]/details/route.ts] PATCH /data/app/user/${userId}/details called`
  );

  try {
    // Verify authentication
    const session = await getSession();
    if (!session || !session.user) {
      console.log('[DBG][app/user/details] No session found');
      const response: ApiResponse<null> = {
        success: false,
        error: 'Not authenticated',
      };
      return NextResponse.json(response, { status: 401 });
    }

    // Get current user from session
    const currentUser = await getUserByAuth0Id(session.user.sub);
    if (!currentUser) {
      console.log('[DBG][app/user/details] Current user not found');
      const response: ApiResponse<null> = {
        success: false,
        error: 'User not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Verify user can only update their own profile
    if (currentUser.id !== userId) {
      console.log('[DBG][app/user/details] Unauthorized: user can only update own profile');
      const response: ApiResponse<null> = {
        success: false,
        error: 'Unauthorized: You can only update your own profile',
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const {
      name,
      bio,
      experienceLevel,
      weight,
      weightUnit,
      height,
      heightUnit,
      preconditions,
      onboardingCompleted,
    } = body;

    console.log('[DBG][app/user/details] Update data:', {
      name,
      bio,
      experienceLevel,
      weight,
      weightUnit,
      height,
      heightUnit,
      preconditions,
      onboardingCompleted,
    });

    // Validate input
    if (name !== undefined && (!name || typeof name !== 'string' || name.trim().length === 0)) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Name is required and must be a non-empty string',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Update user in MongoDB
    await connectToDatabase();

    const updateData: Record<string, string | number | boolean> = {};
    if (name !== undefined) {
      updateData['profile.name'] = name.trim();
      // When user sets their name, mark it as no longer being from email
      updateData['profile.nameIsFromEmail'] = false;
    }
    if (bio !== undefined) updateData['profile.bio'] = bio?.trim() || '';
    if (onboardingCompleted !== undefined)
      updateData['profile.onboardingCompleted'] = onboardingCompleted;

    // Yoga-specific fields
    if (experienceLevel !== undefined) updateData['profile.experienceLevel'] = experienceLevel;
    if (weight !== undefined) updateData['profile.weight'] = weight;
    if (weightUnit !== undefined) updateData['profile.weightUnit'] = weightUnit;
    if (height !== undefined) updateData['profile.height'] = height;
    if (heightUnit !== undefined) updateData['profile.heightUnit'] = heightUnit;
    if (preconditions !== undefined)
      updateData['profile.preconditions'] = preconditions?.trim() || '';

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      console.log('[DBG][app/user/details] User not found for update');
      const response: ApiResponse<null> = {
        success: false,
        error: 'User not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    console.log('[DBG][app/user/details] User profile updated successfully');

    // Convert to User type
    const user: User = {
      id: updatedUser._id,
      auth0Id: updatedUser.auth0Id,
      role: updatedUser.role,
      expertProfile: updatedUser.expertProfile,
      profile: updatedUser.profile,
      membership: updatedUser.membership,
      statistics: updatedUser.statistics,
      achievements: updatedUser.achievements,
      enrolledCourses: updatedUser.enrolledCourses,
      preferences: updatedUser.preferences,
      billing: updatedUser.billing,
      savedItems: updatedUser.savedItems,
      social: updatedUser.social,
      defaultMeetingLink: updatedUser.defaultMeetingLink,
      defaultMeetingPlatform: updatedUser.defaultMeetingPlatform,
    };

    const response: ApiResponse<User> = {
      success: true,
      data: user,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][app/user/details] Update error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
