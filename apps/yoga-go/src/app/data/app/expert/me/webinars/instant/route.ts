/**
 * Instant Session API Route
 * POST /data/app/expert/me/webinars/instant - Create an instant live session
 *
 * Creates a webinar with a single session that starts immediately using 100ms
 */

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import type { ApiResponse, SupportedCurrency } from '@/types';
import { getSessionFromCookies, getUserByCognitoSub } from '@/lib/auth';
import * as webinarRepository from '@/lib/repositories/webinarRepository';
import * as expertRepository from '@/lib/repositories/expertRepository';
import { is100msConfigured } from '@/lib/100ms-auth';
import { createHmsRoomForSession } from '@/lib/100ms-meeting';
import { DEFAULT_CURRENCY } from '@/config/currencies';

interface InstantSessionResponse {
  webinarId: string;
  sessionId: string;
  title: string;
}

/**
 * POST /data/app/expert/me/webinars/instant
 * Create an instant live session with 100ms
 */
export async function POST(): Promise<NextResponse<ApiResponse<InstantSessionResponse>>> {
  console.log('[DBG][instant-session] POST called');

  try {
    // Check if 100ms is configured
    if (!is100msConfigured()) {
      return NextResponse.json(
        { success: false, error: '100ms video is not configured. Please contact support.' },
        { status: 503 }
      );
    }

    const session = await getSessionFromCookies();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user?.expertProfile) {
      return NextResponse.json(
        { success: false, error: 'Expert profile not found' },
        { status: 403 }
      );
    }

    const expertId = user.expertProfile;

    // Get expert info for title
    const expert = await expertRepository.getExpertById(expertId);
    const expertName = expert?.name || 'Expert';
    const expertCurrency: SupportedCurrency =
      expert?.platformPreferences?.currency || DEFAULT_CURRENCY;

    // Generate IDs
    const webinarId = uuidv4();
    const sessionId = uuidv4();

    // Create session times (start now, 2 hour duration)
    const now = new Date();
    const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now

    const title = `Instant Session - ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    const sessionTitle = 'Live Session';

    console.log('[DBG][instant-session] Creating webinar:', webinarId, 'session:', sessionId);

    // Create the 100ms room first
    let hmsRoomId: string | undefined;
    let hmsTemplateId: string | undefined;

    try {
      const hmsResult = await createHmsRoomForSession(
        expertId,
        webinarId,
        sessionId,
        `${expertName} - ${title}`
      );
      hmsRoomId = hmsResult.roomId;
      hmsTemplateId = hmsResult.templateId;
      console.log('[DBG][instant-session] Created 100ms room:', hmsRoomId);
    } catch (hmsError) {
      console.error('[DBG][instant-session] Failed to create 100ms room:', hmsError);
      return NextResponse.json(
        { success: false, error: 'Failed to create video room. Please try again.' },
        { status: 500 }
      );
    }

    // Create the webinar with session
    const webinar = await webinarRepository.createWebinar(expertId, {
      id: webinarId,
      expertId,
      title,
      description: `Instant live session started by ${expertName}`,
      price: 0, // Free for instant sessions
      currency: expertCurrency,
      status: 'LIVE', // Start as live immediately
      videoPlatform: '100ms',
      sessions: [
        {
          id: sessionId,
          title: sessionTitle,
          description: 'Instant live session',
          startTime: now.toISOString(),
          endTime: endTime.toISOString(),
          duration: 120, // 2 hours
          hmsRoomId,
          hmsTemplateId,
        },
      ],
      tags: ['instant', 'live'],
    });

    console.log('[DBG][instant-session] Created instant session webinar:', webinar.id);

    return NextResponse.json({
      success: true,
      data: {
        webinarId,
        sessionId,
        title,
      },
      message: 'Instant session created successfully',
    });
  } catch (error) {
    console.error('[DBG][instant-session] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create instant session',
      },
      { status: 500 }
    );
  }
}
