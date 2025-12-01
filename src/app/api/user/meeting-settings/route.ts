import { NextResponse } from 'next/server';
import { getSession, getUserByAuth0Id } from '@/lib/auth';
import UserModel from '@/models/User';
import type { ApiResponse } from '@/types';

/**
 * PUT /api/user/meeting-settings
 * Update user's default meeting link settings
 */
export async function PUT(request: Request) {
  console.log('[DBG][api/user/meeting-settings] PUT called');

  try {
    // Authenticate
    const session = await getSession();
    if (!session || !session.user || !session.user.cognitoSub) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' } as ApiResponse<null>,
        { status: 401 }
      );
    }

    const user = await getUserByAuth0Id(session.user.cognitoSub);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' } as ApiResponse<null>, {
        status: 404,
      });
    }

    // Check if user is an expert (role is now an array)
    const isExpert = Array.isArray(user.role)
      ? user.role.includes('expert')
      : user.role === 'expert';
    if (!isExpert) {
      return NextResponse.json(
        {
          success: false,
          error: 'Only experts can set meeting link settings',
        } as ApiResponse<null>,
        { status: 403 }
      );
    }

    const body = await request.json();
    const { defaultMeetingLink, defaultMeetingPlatform } = body;

    // Update user's meeting settings
    const updateData: {
      defaultMeetingLink?: string;
      defaultMeetingPlatform?: 'zoom' | 'google-meet' | 'other';
    } = {};

    if (defaultMeetingLink !== undefined) {
      updateData.defaultMeetingLink = defaultMeetingLink.trim() || undefined;
    }

    if (defaultMeetingPlatform !== undefined) {
      if (!['zoom', 'google-meet', 'other'].includes(defaultMeetingPlatform)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid meeting platform. Must be zoom, google-meet, or other',
          } as ApiResponse<null>,
          { status: 400 }
        );
      }
      updateData.defaultMeetingPlatform = defaultMeetingPlatform;
    }

    console.log('[DBG][api/user/meeting-settings] Updating meeting settings:', updateData);

    await UserModel.findByIdAndUpdate(user.id, updateData);

    const response: ApiResponse<{
      defaultMeetingLink?: string;
      defaultMeetingPlatform?: string;
    }> = {
      success: true,
      data: updateData,
      message: 'Meeting settings updated successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][api/user/meeting-settings] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update meeting settings',
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

/**
 * GET /api/user/meeting-settings
 * Get user's default meeting link settings
 */
export async function GET() {
  console.log('[DBG][api/user/meeting-settings] GET called');

  try {
    // Authenticate
    const session = await getSession();
    if (!session || !session.user || !session.user.cognitoSub) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' } as ApiResponse<null>,
        { status: 401 }
      );
    }

    const user = await getUserByAuth0Id(session.user.cognitoSub);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' } as ApiResponse<null>, {
        status: 404,
      });
    }

    const response: ApiResponse<{
      defaultMeetingLink?: string;
      defaultMeetingPlatform?: string;
    }> = {
      success: true,
      data: {
        defaultMeetingLink: user.defaultMeetingLink,
        defaultMeetingPlatform: user.defaultMeetingPlatform,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][api/user/meeting-settings] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch meeting settings',
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
