/**
 * Expert Webinar Management Route
 * GET /data/app/expert/me/webinars - List expert's webinars
 * POST /data/app/expert/me/webinars - Create a new webinar
 */

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import type { ApiResponse, Webinar, WebinarStatus, SupportedCurrency } from '@/types';
import { getSessionFromCookies, getUserByCognitoSub } from '@/lib/auth';
import * as webinarRepository from '@/lib/repositories/webinarRepository';
import * as expertRepository from '@/lib/repositories/expertRepository';
import { isGoogleConnected } from '@/lib/google-auth';
import { createMeetEventsForWebinar } from '@/lib/google-meet';
import { isZoomConnected } from '@/lib/zoom-auth';
import { createZoomMeetingsForWebinar } from '@/lib/zoom-meeting';
import { normalizeCurrency, DEFAULT_CURRENCY } from '@/config/currencies';

/**
 * GET /data/app/expert/me/webinars
 * List all webinars for the current expert
 */
export async function GET() {
  console.log('[DBG][expert/me/webinars] GET called');

  try {
    const session = await getSessionFromCookies();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<ApiResponse<Webinar[]>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user?.expertProfile) {
      return NextResponse.json<ApiResponse<Webinar[]>>(
        { success: false, error: 'Expert profile not found' },
        { status: 403 }
      );
    }

    const webinars = await webinarRepository.getWebinarsByExpertId(user.expertProfile);

    // Sort by createdAt descending (newest first)
    webinars.sort((a, b) => {
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate;
    });

    console.log('[DBG][expert/me/webinars] Found', webinars.length, 'webinars');
    return NextResponse.json<ApiResponse<Webinar[]>>({
      success: true,
      data: webinars,
    });
  } catch (error) {
    console.error('[DBG][expert/me/webinars] Error:', error);
    return NextResponse.json<ApiResponse<Webinar[]>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch webinars',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /data/app/expert/me/webinars
 * Create a new webinar
 */
export async function POST(request: Request) {
  console.log('[DBG][expert/me/webinars] POST called');

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

    const body = await request.json();
    const requestedStatus = (body.status as WebinarStatus) || 'DRAFT';
    const videoPlatform = body.videoPlatform || 'none';

    console.log(
      '[DBG][expert/me/webinars] Creating webinar:',
      body.title,
      'status:',
      requestedStatus,
      'platform:',
      videoPlatform
    );

    // Validate required fields
    if (!body.title || !body.description) {
      return NextResponse.json<ApiResponse<Webinar>>(
        { success: false, error: 'Title and description are required' },
        { status: 400 }
      );
    }

    const webinarId = uuidv4();

    // Get expert's currency preference
    let webinarCurrency: SupportedCurrency = DEFAULT_CURRENCY;
    if (body.currency) {
      // Use currency from request if provided
      webinarCurrency = normalizeCurrency(body.currency);
    } else {
      // Fetch expert to get their preferred currency
      const expert = await expertRepository.getExpertById(user.expertProfile);
      if (expert?.platformPreferences?.currency) {
        webinarCurrency = normalizeCurrency(expert.platformPreferences.currency);
      }
    }
    console.log('[DBG][expert/me/webinars] Webinar currency:', webinarCurrency);

    let webinar = await webinarRepository.createWebinar({
      id: webinarId,
      expertId: user.expertProfile,
      title: body.title,
      description: body.description,
      thumbnail: body.thumbnail,
      coverImage: body.coverImage,
      promoVideoCloudflareId: body.promoVideoCloudflareId,
      promoVideoStatus: body.promoVideoStatus,
      price: body.price || 0,
      currency: webinarCurrency,
      maxParticipants: body.maxParticipants,
      status: requestedStatus,
      videoPlatform,
      sessions: body.sessions || [],
      tags: body.tags || [],
      category: body.category,
      level: body.level,
      requirements: body.requirements || [],
      whatYouWillLearn: body.whatYouWillLearn || [],
    });

    console.log('[DBG][expert/me/webinars] Created webinar:', webinarId);

    // If publishing directly (status=SCHEDULED), create video conference links
    if (requestedStatus === 'SCHEDULED' && webinar.sessions && webinar.sessions.length > 0) {
      console.log('[DBG][expert/me/webinars] Publishing directly, creating video links');

      if (videoPlatform === 'zoom') {
        const zoomConnected = await isZoomConnected(user.expertProfile);
        console.log('[DBG][expert/me/webinars] Zoom connected:', zoomConnected);
        if (zoomConnected) {
          try {
            const results = await createZoomMeetingsForWebinar(user.expertProfile, webinarId);
            console.log('[DBG][expert/me/webinars] Created', results.length, 'Zoom meetings');
            // Refresh webinar data
            const refreshed = await webinarRepository.getWebinarById(webinarId);
            if (refreshed) webinar = refreshed;
          } catch (zoomError) {
            console.error('[DBG][expert/me/webinars] Failed to create Zoom links:', zoomError);
          }
        }
      } else if (videoPlatform === 'google_meet') {
        const googleConnected = await isGoogleConnected(user.expertProfile);
        console.log('[DBG][expert/me/webinars] Google connected:', googleConnected);
        if (googleConnected) {
          try {
            const results = await createMeetEventsForWebinar(user.expertProfile, webinarId);
            console.log('[DBG][expert/me/webinars] Created', results.length, 'Meet events');
            // Refresh webinar data
            const refreshed = await webinarRepository.getWebinarById(webinarId);
            if (refreshed) webinar = refreshed;
          } catch (meetError) {
            console.error('[DBG][expert/me/webinars] Failed to create Meet links:', meetError);
          }
        }
      }
    }

    return NextResponse.json<ApiResponse<Webinar>>({
      success: true,
      data: webinar,
      message:
        requestedStatus === 'SCHEDULED'
          ? 'Webinar published successfully'
          : 'Webinar created successfully',
    });
  } catch (error) {
    console.error('[DBG][expert/me/webinars] Error:', error);
    return NextResponse.json<ApiResponse<Webinar>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create webinar',
      },
      { status: 500 }
    );
  }
}
