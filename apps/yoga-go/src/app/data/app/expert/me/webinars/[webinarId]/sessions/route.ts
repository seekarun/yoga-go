/**
 * Expert Webinar Sessions Route
 * POST /data/app/expert/me/webinars/[webinarId]/sessions - Add a new session
 * PUT /data/app/expert/me/webinars/[webinarId]/sessions - Update a session
 * DELETE /data/app/expert/me/webinars/[webinarId]/sessions - Delete a session
 */

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import type { ApiResponse, Webinar, WebinarSession } from '@/types';
import { getSessionFromCookies, getUserByCognitoSub } from '@/lib/auth';
import * as webinarRepository from '@/lib/repositories/webinarRepository';
import { isGoogleConnected } from '@/lib/google-auth';
import { createMeetEvent } from '@/lib/google-meet';
import { isZoomConnected } from '@/lib/zoom-auth';
import { createZoomMeeting } from '@/lib/zoom-meeting';
import { is100msConfigured } from '@/lib/100ms-auth';
import { createHmsRoomForSession } from '@/lib/100ms-meeting';

interface RouteParams {
  params: Promise<{
    webinarId: string;
  }>;
}

/**
 * POST /data/app/expert/me/webinars/[webinarId]/sessions
 * Add a new session to the webinar
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { webinarId } = await params;
  console.log('[DBG][expert/me/webinars/[id]/sessions] POST called for:', webinarId);

  try {
    const session = await getSessionFromCookies();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<ApiResponse<Webinar>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user?.expertProfile) {
      return NextResponse.json<ApiResponse<Webinar>>(
        { success: false, error: 'Expert profile not found' },
        { status: 403 }
      );
    }

    const webinar = await webinarRepository.getWebinarByIdOnly(webinarId);

    if (!webinar) {
      return NextResponse.json<ApiResponse<Webinar>>(
        { success: false, error: 'Webinar not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (webinar.expertId !== user.expertProfile) {
      return NextResponse.json<ApiResponse<Webinar>>(
        { success: false, error: 'Not authorized to modify this webinar' },
        { status: 403 }
      );
    }

    const body = await request.json();
    console.log('[DBG][expert/me/webinars/[id]/sessions] Adding session:', body.title);

    // Validate required fields
    if (!body.title || !body.startTime || !body.endTime) {
      return NextResponse.json<ApiResponse<Webinar>>(
        { success: false, error: 'Title, startTime, and endTime are required' },
        { status: 400 }
      );
    }

    // Calculate duration
    const startDate = new Date(body.startTime);
    const endDate = new Date(body.endTime);
    const duration = Math.round((endDate.getTime() - startDate.getTime()) / 60000);

    const sessionId = uuidv4();
    const newSession: WebinarSession = {
      id: sessionId,
      title: body.title,
      description: body.description,
      startTime: body.startTime,
      endTime: body.endTime,
      duration,
    };

    // If webinar is SCHEDULED, create video conference link based on platform
    if (webinar.status === 'SCHEDULED') {
      const videoPlatform = webinar.videoPlatform;

      if (videoPlatform === 'zoom') {
        // Create Zoom meeting
        const zoomConnected = await isZoomConnected(user.expertProfile);
        if (zoomConnected) {
          console.log('[DBG][expert/me/webinars/[id]/sessions] Creating Zoom link for new session');
          try {
            const zoomResult = await createZoomMeeting({
              expertId: user.expertProfile,
              webinarId,
              sessionId,
              title: `${webinar.title} - ${body.title}`,
              description: body.description || webinar.description,
              startTime: body.startTime,
              endTime: body.endTime,
              duration,
            });

            newSession.zoomMeetingId = zoomResult.meetingId;
            newSession.zoomMeetingLink = zoomResult.joinUrl;
            newSession.zoomJoinUrl = zoomResult.joinUrl;
            newSession.zoomStartUrl = zoomResult.startUrl;
            newSession.zoomPassword = zoomResult.password;
            console.log(
              '[DBG][expert/me/webinars/[id]/sessions] Created Zoom link:',
              zoomResult.joinUrl
            );
          } catch (zoomError) {
            console.error(
              '[DBG][expert/me/webinars/[id]/sessions] Failed to create Zoom:',
              zoomError
            );
            // Don't fail, just continue without Zoom link
          }
        }
      } else if (videoPlatform === 'google_meet') {
        // Create Google Meet event
        const googleConnected = await isGoogleConnected(user.expertProfile);
        if (googleConnected) {
          console.log('[DBG][expert/me/webinars/[id]/sessions] Creating Meet link for new session');
          try {
            const meetResult = await createMeetEvent({
              expertId: user.expertProfile,
              webinarId,
              sessionId,
              title: `${webinar.title} - ${body.title}`,
              description: body.description || webinar.description,
              startTime: body.startTime,
              endTime: body.endTime,
            });

            newSession.googleMeetLink = meetResult.meetLink;
            newSession.googleEventId = meetResult.eventId;
            console.log(
              '[DBG][expert/me/webinars/[id]/sessions] Created Meet link:',
              meetResult.meetLink
            );
          } catch (meetError) {
            console.error(
              '[DBG][expert/me/webinars/[id]/sessions] Failed to create Meet:',
              meetError
            );
            // Don't fail, just continue without Meet link
          }
        }
      } else if (videoPlatform === '100ms') {
        // Create 100ms room
        if (is100msConfigured()) {
          console.log(
            '[DBG][expert/me/webinars/[id]/sessions] Creating 100ms room for new session'
          );
          try {
            const hmsResult = await createHmsRoomForSession(
              user.expertProfile,
              webinarId,
              sessionId,
              `${webinar.title} - ${body.title}`
            );

            newSession.hmsRoomId = hmsResult.roomId;
            newSession.hmsTemplateId = hmsResult.templateId;
            console.log(
              '[DBG][expert/me/webinars/[id]/sessions] Created 100ms room:',
              hmsResult.roomId
            );
          } catch (hmsError) {
            console.error(
              '[DBG][expert/me/webinars/[id]/sessions] Failed to create 100ms room:',
              hmsError
            );
            // Don't fail, just continue without 100ms room
          }
        }
      }
    }

    const updatedWebinar = await webinarRepository.addSession(
      webinar.expertId,
      webinarId,
      newSession
    );

    return NextResponse.json<ApiResponse<Webinar>>({
      success: true,
      data: updatedWebinar,
      message: 'Session added successfully',
    });
  } catch (error) {
    console.error('[DBG][expert/me/webinars/[id]/sessions] Error:', error);
    return NextResponse.json<ApiResponse<Webinar>>(
      { success: false, error: error instanceof Error ? error.message : 'Failed to add session' },
      { status: 500 }
    );
  }
}

/**
 * PUT /data/app/expert/me/webinars/[webinarId]/sessions
 * Update an existing session
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const { webinarId } = await params;
  console.log('[DBG][expert/me/webinars/[id]/sessions] PUT called for:', webinarId);

  try {
    const session = await getSessionFromCookies();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<ApiResponse<Webinar>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user?.expertProfile) {
      return NextResponse.json<ApiResponse<Webinar>>(
        { success: false, error: 'Expert profile not found' },
        { status: 403 }
      );
    }

    const webinar = await webinarRepository.getWebinarByIdOnly(webinarId);

    if (!webinar) {
      return NextResponse.json<ApiResponse<Webinar>>(
        { success: false, error: 'Webinar not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (webinar.expertId !== user.expertProfile) {
      return NextResponse.json<ApiResponse<Webinar>>(
        { success: false, error: 'Not authorized to modify this webinar' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { sessionId, ...updates } = body;

    if (!sessionId) {
      return NextResponse.json<ApiResponse<Webinar>>(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Recalculate duration if times changed
    if (updates.startTime && updates.endTime) {
      const startDate = new Date(updates.startTime);
      const endDate = new Date(updates.endTime);
      updates.duration = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
    }

    const updatedWebinar = await webinarRepository.updateSession(
      webinar.expertId,
      webinarId,
      sessionId,
      updates
    );

    return NextResponse.json<ApiResponse<Webinar>>({
      success: true,
      data: updatedWebinar,
      message: 'Session updated successfully',
    });
  } catch (error) {
    console.error('[DBG][expert/me/webinars/[id]/sessions] Error:', error);
    return NextResponse.json<ApiResponse<Webinar>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update session',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /data/app/expert/me/webinars/[webinarId]/sessions
 * Delete a session
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const { webinarId } = await params;
  console.log('[DBG][expert/me/webinars/[id]/sessions] DELETE called for:', webinarId);

  try {
    const session = await getSessionFromCookies();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<ApiResponse<Webinar>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user?.expertProfile) {
      return NextResponse.json<ApiResponse<Webinar>>(
        { success: false, error: 'Expert profile not found' },
        { status: 403 }
      );
    }

    const webinar = await webinarRepository.getWebinarByIdOnly(webinarId);

    if (!webinar) {
      return NextResponse.json<ApiResponse<Webinar>>(
        { success: false, error: 'Webinar not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (webinar.expertId !== user.expertProfile) {
      return NextResponse.json<ApiResponse<Webinar>>(
        { success: false, error: 'Not authorized to modify this webinar' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json<ApiResponse<Webinar>>(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const updatedWebinar = await webinarRepository.deleteSession(
      webinar.expertId,
      webinarId,
      sessionId
    );

    return NextResponse.json<ApiResponse<Webinar>>({
      success: true,
      data: updatedWebinar,
      message: 'Session deleted successfully',
    });
  } catch (error) {
    console.error('[DBG][expert/me/webinars/[id]/sessions] Error:', error);
    return NextResponse.json<ApiResponse<Webinar>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete session',
      },
      { status: 500 }
    );
  }
}
