import { NextResponse } from 'next/server';
import { getSession, getUserByAuth0Id } from '@/lib/auth';
import type { ApiResponse } from '@/types';
import * as liveSessionRepository from '@/lib/repositories/liveSessionRepository';

/**
 * POST /api/live/sessions/instant
 * Create an instant meeting (no scheduling required)
 * Requires expert to provide a meeting link (Zoom/Google Meet/etc)
 */
export async function POST(request: Request) {
  console.log('[DBG][api/live/sessions/instant] POST called');

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
    if (!isExpert || !user.expertProfile) {
      return NextResponse.json(
        { success: false, error: 'Only experts can create instant meetings' } as ApiResponse<null>,
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, meetingLink, meetingPlatform } = body;

    // Validate meeting link
    if (!meetingLink || !meetingLink.trim()) {
      return NextResponse.json(
        { success: false, error: 'Meeting link is required' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    console.log('[DBG][api/live/sessions/instant] Creating instant meeting:', {
      expertId: user.expertProfile,
      meetingPlatform,
    });

    // Create LiveSession record in DynamoDB with instant type
    const now = new Date();
    const liveSession = await liveSessionRepository.createLiveSession({
      expertId: user.expertProfile,
      expertName: user.profile.name || 'Expert',
      expertAvatar: user.profile.avatar,
      title: title || 'Instant Meeting',
      description: description || 'Join this instant meeting',
      sessionType: 'instant',
      scheduledStartTime: now.toISOString(),
      scheduledEndTime: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
      maxParticipants: 50,
      price: 0,
      currency: 'USD',
      status: 'live',
      actualStartTime: now.toISOString(),
      meetingLink: meetingLink.trim(), // Expert-provided meeting link
      meetingPlatform: meetingPlatform || 'other', // zoom | google-meet | other
      enrolledCount: 0,
      attendedCount: 0,
      currentViewers: 0,
      isFree: true,
      // Track who created this session
      scheduledByUserId: user.id,
      scheduledByName: user.profile.name,
      scheduledByRole: 'expert',
    });

    console.log('[DBG][api/live/sessions/instant] Instant meeting created:', liveSession.id);

    // Generate shareable link (works across networks)
    const joinUrl = `${process.env.AUTH0_BASE_URL || 'http://localhost:3111'}/app/live/instant/${liveSession.instantMeetingCode}`;

    const response: ApiResponse<{
      sessionId: string;
      roomCode: string;
      joinUrl: string;
      meetingLink: string;
      meetingPlatform: string;
    }> = {
      success: true,
      data: {
        sessionId: liveSession.id,
        roomCode: liveSession.instantMeetingCode || '',
        joinUrl: joinUrl,
        meetingLink: meetingLink.trim(),
        meetingPlatform: meetingPlatform || 'other',
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][api/live/sessions/instant] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create instant meeting',
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
