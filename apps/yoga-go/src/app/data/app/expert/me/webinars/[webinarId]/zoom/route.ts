/**
 * Expert Webinar Zoom Route
 * POST /data/app/expert/me/webinars/[webinarId]/zoom - Generate Zoom links for all sessions
 */

import { NextResponse } from 'next/server';
import type { ApiResponse, Webinar } from '@/types';
import { getSessionFromCookies, getUserByCognitoSub } from '@/lib/auth';
import * as webinarRepository from '@/lib/repositories/webinarRepository';
import { isZoomConnected } from '@/lib/zoom-auth';
import { createZoomMeetingsForWebinar } from '@/lib/zoom-meeting';

interface RouteParams {
  params: Promise<{
    webinarId: string;
  }>;
}

interface ZoomGenerationResult {
  webinar: Webinar;
  sessionsWithZoomLinks: number;
  totalSessions: number;
}

/**
 * POST /data/app/expert/me/webinars/[webinarId]/zoom
 * Generate Zoom meeting links for all sessions in the webinar
 */
export async function POST(_request: Request, { params }: RouteParams) {
  const { webinarId } = await params;
  console.log('[DBG][expert/me/webinars/[id]/zoom] POST called for:', webinarId);

  try {
    const session = await getSessionFromCookies();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<ApiResponse<ZoomGenerationResult>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user?.expertProfile) {
      return NextResponse.json<ApiResponse<ZoomGenerationResult>>(
        { success: false, error: 'Expert profile not found' },
        { status: 403 }
      );
    }

    const webinar = await webinarRepository.getWebinarById(webinarId);

    if (!webinar) {
      return NextResponse.json<ApiResponse<ZoomGenerationResult>>(
        { success: false, error: 'Webinar not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (webinar.expertId !== user.expertProfile) {
      return NextResponse.json<ApiResponse<ZoomGenerationResult>>(
        { success: false, error: 'Not authorized to modify this webinar' },
        { status: 403 }
      );
    }

    // Check if webinar has sessions
    if (!webinar.sessions || webinar.sessions.length === 0) {
      return NextResponse.json<ApiResponse<ZoomGenerationResult>>(
        { success: false, error: 'Webinar has no sessions. Add sessions first.' },
        { status: 400 }
      );
    }

    // Check if Zoom is connected
    const zoomConnected = await isZoomConnected(user.expertProfile);

    if (!zoomConnected) {
      return NextResponse.json<ApiResponse<ZoomGenerationResult>>(
        {
          success: false,
          error: 'Zoom account not connected. Please connect your Zoom account first.',
        },
        { status: 400 }
      );
    }

    console.log(
      '[DBG][expert/me/webinars/[id]/zoom] Creating Zoom meetings for',
      webinar.sessions.length,
      'sessions'
    );

    // Create Zoom meetings for all sessions
    const results = await createZoomMeetingsForWebinar(user.expertProfile, webinarId);

    // Refresh webinar to get updated data
    const updatedWebinar = await webinarRepository.getWebinarById(webinarId);

    if (!updatedWebinar) {
      throw new Error('Failed to refresh webinar data');
    }

    const sessionsWithZoomLinks =
      updatedWebinar.sessions?.filter(s => s.zoomJoinUrl || s.zoomMeetingLink).length || 0;

    console.log(
      '[DBG][expert/me/webinars/[id]/zoom] Created Zoom meetings:',
      results.length,
      'sessions with links:',
      sessionsWithZoomLinks
    );

    return NextResponse.json<ApiResponse<ZoomGenerationResult>>({
      success: true,
      data: {
        webinar: updatedWebinar,
        sessionsWithZoomLinks,
        totalSessions: updatedWebinar.sessions?.length || 0,
      },
      message: `Created ${results.length} Zoom meeting links`,
    });
  } catch (error) {
    console.error('[DBG][expert/me/webinars/[id]/zoom] Error:', error);
    return NextResponse.json<ApiResponse<ZoomGenerationResult>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create Zoom links',
      },
      { status: 500 }
    );
  }
}
