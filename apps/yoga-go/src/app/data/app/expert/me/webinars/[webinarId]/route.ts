/**
 * Expert Webinar Management Route - Single Webinar
 * GET /data/app/expert/me/webinars/[webinarId] - Get webinar details
 * PUT /data/app/expert/me/webinars/[webinarId] - Update webinar
 * DELETE /data/app/expert/me/webinars/[webinarId] - Delete webinar
 */

import { NextResponse } from 'next/server';
import type { ApiResponse, Webinar, WebinarStatus } from '@/types';
import { getSessionFromCookies, getUserByCognitoSub } from '@/lib/auth';
import * as webinarRepository from '@/lib/repositories/webinarRepository';
import { isGoogleConnected } from '@/lib/google-auth';
import { createMeetEventsForWebinar } from '@/lib/google-meet';
import { isZoomConnected } from '@/lib/zoom-auth';
import { createZoomMeetingsForWebinar } from '@/lib/zoom-meeting';
import { is100msConfigured } from '@/lib/100ms-auth';
import { createHmsRoomsForWebinar } from '@/lib/100ms-meeting';

interface RouteParams {
  params: Promise<{
    webinarId: string;
  }>;
}

/**
 * GET /data/app/expert/me/webinars/[webinarId]
 * Get webinar details for the expert
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { webinarId } = await params;
  console.log('[DBG][expert/me/webinars/[id]] GET called for:', webinarId);

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
        { success: false, error: 'Not authorized to access this webinar' },
        { status: 403 }
      );
    }

    // Check if video platforms are connected/configured
    const [googleConnected, zoomConnected] = await Promise.all([
      isGoogleConnected(user.expertProfile),
      isZoomConnected(user.expertProfile),
    ]);
    const hmsConfigured = is100msConfigured();

    return NextResponse.json<
      ApiResponse<
        Webinar & { googleConnected: boolean; zoomConnected: boolean; hmsConfigured: boolean }
      >
    >({
      success: true,
      data: {
        ...webinar,
        googleConnected,
        zoomConnected,
        hmsConfigured,
      },
    });
  } catch (error) {
    console.error('[DBG][expert/me/webinars/[id]] Error:', error);
    return NextResponse.json<ApiResponse<Webinar>>(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch webinar' },
      { status: 500 }
    );
  }
}

/**
 * PUT /data/app/expert/me/webinars/[webinarId]
 * Update webinar details
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const { webinarId } = await params;
  console.log('[DBG][expert/me/webinars/[id]] PUT called for:', webinarId);

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
        { success: false, error: 'Not authorized to update this webinar' },
        { status: 403 }
      );
    }

    const body = await request.json();
    console.log('[DBG][expert/me/webinars/[id]] Updating webinar:', Object.keys(body));

    // Handle status change to SCHEDULED - create Meet links if Google is connected
    const oldStatus = webinar.status;
    const newStatus = body.status as WebinarStatus | undefined;
    const videoPlatformFromBody = body.videoPlatform;

    console.log('[DBG][expert/me/webinars/[id]] Status transition:', {
      oldStatus,
      newStatus,
      videoPlatform: videoPlatformFromBody,
      sessionsCount: webinar.sessions?.length || 0,
    });

    // Remove fields that shouldn't be updated directly
    const {
      id: _id,
      expertId: _expertId,
      totalRegistrations: _totalRegistrations,
      rating: _rating,
      totalRatings: _totalRatings,
      createdAt: _createdAt,
      ...allowedUpdates
    } = body;

    let updatedWebinar = await webinarRepository.updateWebinar(
      webinar.expertId,
      webinarId,
      allowedUpdates
    );

    // If publishing (DRAFT -> SCHEDULED), try to create video conference links based on platform
    const isPublishing = oldStatus === 'DRAFT' && newStatus === 'SCHEDULED';
    console.log('[DBG][expert/me/webinars/[id]] isPublishing:', isPublishing);

    if (isPublishing) {
      const videoPlatform = updatedWebinar.videoPlatform;
      console.log('[DBG][expert/me/webinars/[id]] Updated webinar videoPlatform:', videoPlatform);

      if (updatedWebinar.sessions && updatedWebinar.sessions.length > 0) {
        if (videoPlatform === 'zoom') {
          // Create Zoom meetings
          const zoomConnected = await isZoomConnected(user.expertProfile);
          console.log('[DBG][expert/me/webinars/[id]] Zoom connected:', zoomConnected);
          if (zoomConnected) {
            console.log('[DBG][expert/me/webinars/[id]] Creating Zoom links for published webinar');
            try {
              const zoomResults = await createZoomMeetingsForWebinar(user.expertProfile, webinarId);
              console.log(
                '[DBG][expert/me/webinars/[id]] Created',
                zoomResults.length,
                'Zoom meetings'
              );

              // Refresh webinar to get updated session data with Zoom links
              const refreshed = await webinarRepository.getWebinarByIdOnly(webinarId);
              if (refreshed) {
                updatedWebinar = refreshed;
              }
            } catch (zoomError) {
              console.error(
                '[DBG][expert/me/webinars/[id]] Failed to create Zoom links:',
                zoomError
              );
              // Don't fail the update, just log the error
            }
          }
        } else if (videoPlatform === 'google_meet') {
          // Create Google Meet events
          const googleConnected = await isGoogleConnected(user.expertProfile);
          if (googleConnected) {
            console.log('[DBG][expert/me/webinars/[id]] Creating Meet links for published webinar');
            try {
              const meetResults = await createMeetEventsForWebinar(user.expertProfile, webinarId);
              console.log(
                '[DBG][expert/me/webinars/[id]] Created',
                meetResults.length,
                'Meet events'
              );

              // Refresh webinar to get updated session data with Meet links
              const refreshed = await webinarRepository.getWebinarByIdOnly(webinarId);
              if (refreshed) {
                updatedWebinar = refreshed;
              }
            } catch (meetError) {
              console.error(
                '[DBG][expert/me/webinars/[id]] Failed to create Meet links:',
                meetError
              );
              // Don't fail the update, just log the error
            }
          }
        } else if (videoPlatform === '100ms') {
          // Create 100ms rooms
          if (is100msConfigured()) {
            console.log(
              '[DBG][expert/me/webinars/[id]] Creating 100ms rooms for published webinar'
            );
            try {
              const hmsResults = await createHmsRoomsForWebinar(user.expertProfile, webinarId);
              console.log(
                '[DBG][expert/me/webinars/[id]] Created',
                hmsResults.length,
                '100ms rooms'
              );

              // Refresh webinar to get updated session data with 100ms rooms
              const refreshed = await webinarRepository.getWebinarByIdOnly(webinarId);
              if (refreshed) {
                updatedWebinar = refreshed;
              }
            } catch (hmsError) {
              console.error(
                '[DBG][expert/me/webinars/[id]] Failed to create 100ms rooms:',
                hmsError
              );
              // Don't fail the update, just log the error
            }
          }
        }
      }
    }

    return NextResponse.json<ApiResponse<Webinar>>({
      success: true,
      data: updatedWebinar,
      message: 'Webinar updated successfully',
    });
  } catch (error) {
    console.error('[DBG][expert/me/webinars/[id]] Error:', error);
    return NextResponse.json<ApiResponse<Webinar>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update webinar',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /data/app/expert/me/webinars/[webinarId]
 * Delete webinar
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { webinarId } = await params;
  console.log('[DBG][expert/me/webinars/[id]] DELETE called for:', webinarId);

  try {
    const session = await getSessionFromCookies();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user?.expertProfile) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Expert profile not found' },
        { status: 403 }
      );
    }

    const webinar = await webinarRepository.getWebinarByIdOnly(webinarId);

    if (!webinar) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Webinar not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (webinar.expertId !== user.expertProfile) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Not authorized to delete this webinar' },
        { status: 403 }
      );
    }

    // Don't allow deleting active webinars (SCHEDULED/LIVE) with registrations
    // CANCELLED and COMPLETED webinars can be deleted even with registrations
    if (
      webinar.totalRegistrations &&
      webinar.totalRegistrations > 0 &&
      (webinar.status === 'SCHEDULED' || webinar.status === 'LIVE')
    ) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: 'Cannot delete webinar with registrations. Cancel it instead.' },
        { status: 400 }
      );
    }

    await webinarRepository.deleteWebinar(webinar.expertId, webinarId);

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      data: null,
      message: 'Webinar deleted successfully',
    });
  } catch (error) {
    console.error('[DBG][expert/me/webinars/[id]] Error:', error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete webinar',
      },
      { status: 500 }
    );
  }
}
