/**
 * Expert Webinar Google Meet Route
 * POST /data/app/expert/me/webinars/[webinarId]/meet - Generate Meet links for all sessions
 */

import { NextResponse } from 'next/server';
import type { ApiResponse, Webinar } from '@/types';
import { getSessionFromCookies, getUserByCognitoSub } from '@/lib/auth';
import * as webinarRepository from '@/lib/repositories/webinarRepository';
import { isGoogleConnected } from '@/lib/google-auth';
import { createMeetEventsForWebinar } from '@/lib/google-meet';

interface RouteParams {
  params: Promise<{
    webinarId: string;
  }>;
}

interface MeetGenerationResult {
  webinar: Webinar;
  sessionsWithMeetLinks: number;
  totalSessions: number;
}

/**
 * POST /data/app/expert/me/webinars/[webinarId]/meet
 * Generate Google Meet links for all sessions in the webinar
 */
export async function POST(_request: Request, { params }: RouteParams) {
  const { webinarId } = await params;
  console.log('[DBG][expert/me/webinars/[id]/meet] POST called for:', webinarId);

  try {
    const session = await getSessionFromCookies();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<ApiResponse<MeetGenerationResult>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user?.expertProfile) {
      return NextResponse.json<ApiResponse<MeetGenerationResult>>(
        { success: false, error: 'Expert profile not found' },
        { status: 403 }
      );
    }

    const webinar = await webinarRepository.getWebinarById(webinarId);

    if (!webinar) {
      return NextResponse.json<ApiResponse<MeetGenerationResult>>(
        { success: false, error: 'Webinar not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (webinar.expertId !== user.expertProfile) {
      return NextResponse.json<ApiResponse<MeetGenerationResult>>(
        { success: false, error: 'Not authorized to modify this webinar' },
        { status: 403 }
      );
    }

    // Check if webinar has sessions
    if (!webinar.sessions || webinar.sessions.length === 0) {
      return NextResponse.json<ApiResponse<MeetGenerationResult>>(
        { success: false, error: 'Webinar has no sessions. Add sessions first.' },
        { status: 400 }
      );
    }

    // Check if Google is connected
    const googleConnected = await isGoogleConnected(user.expertProfile);

    if (!googleConnected) {
      return NextResponse.json<ApiResponse<MeetGenerationResult>>(
        {
          success: false,
          error: 'Google account not connected. Please connect your Google account first.',
        },
        { status: 400 }
      );
    }

    console.log(
      '[DBG][expert/me/webinars/[id]/meet] Creating Meet events for',
      webinar.sessions.length,
      'sessions'
    );

    // Create Meet events for all sessions
    const results = await createMeetEventsForWebinar(user.expertProfile, webinarId);

    // Refresh webinar to get updated data
    const updatedWebinar = await webinarRepository.getWebinarById(webinarId);

    if (!updatedWebinar) {
      throw new Error('Failed to refresh webinar data');
    }

    const sessionsWithMeetLinks =
      updatedWebinar.sessions?.filter(s => s.googleMeetLink).length || 0;

    console.log(
      '[DBG][expert/me/webinars/[id]/meet] Created Meet events:',
      results.length,
      'sessions with links:',
      sessionsWithMeetLinks
    );

    return NextResponse.json<ApiResponse<MeetGenerationResult>>({
      success: true,
      data: {
        webinar: updatedWebinar,
        sessionsWithMeetLinks,
        totalSessions: updatedWebinar.sessions?.length || 0,
      },
      message: `Created ${results.length} Google Meet links`,
    });
  } catch (error) {
    console.error('[DBG][expert/me/webinars/[id]/meet] Error:', error);
    return NextResponse.json<ApiResponse<MeetGenerationResult>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create Meet links',
      },
      { status: 500 }
    );
  }
}
