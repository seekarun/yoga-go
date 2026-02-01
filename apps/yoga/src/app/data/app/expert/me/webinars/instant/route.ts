/**
 * Instant Session API Route
 * POST /data/app/expert/me/webinars/instant - Create an instant live session
 *
 * Creates a webinar with a single session that starts immediately using 100ms
 * Instant sessions are open - any logged in user can join without registration
 */

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import type { ApiResponse, SupportedCurrency } from '@/types';
import { getSessionFromCookies, getUserByCognitoSub } from '@/lib/auth';
import * as webinarRepository from '@/lib/repositories/webinarRepository';
import * as expertRepository from '@/lib/repositories/expertRepository';
import { is100msConfigured } from '@/lib/100ms-auth';
import { createHmsRoomForSession } from '@/lib/100ms-meeting';
import { isGoogleConnected, getOAuth2ClientForExpert } from '@/lib/google-auth';
import { google } from 'googleapis';
import { DEFAULT_CURRENCY } from '@/config/currencies';
import { getSubdomainUrl } from '@/config/env';

interface InstantSessionResponse {
  webinarId: string;
  sessionId: string;
  title: string;
}

/**
 * POST /data/app/expert/me/webinars/instant
 * Create an instant live session with 100ms
 */
export async function POST(
  request: Request
): Promise<NextResponse<ApiResponse<InstantSessionResponse>>> {
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

    // Parse request body for duration and isOpen
    const body = await request.json().catch(() => ({}));
    const durationMinutes = body.duration || 30; // Default 30 minutes
    const isOpen = body.isOpen !== false; // Default true for instant sessions

    const expertId = user.expertProfile;

    // Get expert info for title
    const expert = await expertRepository.getExpertById(expertId);
    const expertName = expert?.name || 'Expert';
    const expertCurrency: SupportedCurrency =
      expert?.platformPreferences?.currency || DEFAULT_CURRENCY;

    // Generate IDs
    const webinarId = uuidv4();
    const sessionId = uuidv4();

    // Create session times with specified duration
    const now = new Date();
    const endTime = new Date(now.getTime() + durationMinutes * 60 * 1000);

    const title = `Instant Session - ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
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

    // Build the join URL for calendar event
    const joinUrl = `${getSubdomainUrl(expertId)}/app/live/${webinarId}/${sessionId}`;

    // Create the webinar with session
    const sessionDescription = isOpen
      ? 'Instant live session - open to all logged in users'
      : 'Instant live session - registration required';
    const webinarDescription = isOpen
      ? `Instant live session started by ${expertName}. Open session - any logged in user can join.`
      : `Instant live session started by ${expertName}. Registration required to join.`;
    const tags = isOpen ? ['instant', 'live', 'open'] : ['instant', 'live'];

    const webinar = await webinarRepository.createWebinar(expertId, {
      id: webinarId,
      expertId,
      title,
      description: webinarDescription,
      price: 0, // Free for instant sessions
      currency: expertCurrency,
      status: 'LIVE', // Start as live immediately
      videoPlatform: '100ms',
      isOpen, // Open session flag
      sessions: [
        {
          id: sessionId,
          title: sessionTitle,
          description: sessionDescription,
          startTime: now.toISOString(),
          endTime: endTime.toISOString(),
          duration: durationMinutes,
          hmsRoomId,
          hmsTemplateId,
        },
      ],
      tags,
    });

    console.log('[DBG][instant-session] Created instant session webinar:', webinar.id);

    // Try to create a calendar event if Google is connected
    try {
      const googleConnected = await isGoogleConnected(expertId);
      if (googleConnected) {
        console.log('[DBG][instant-session] Creating calendar event');
        const oauth2Client = await getOAuth2ClientForExpert(expertId);
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        const calendarDescription = isOpen
          ? `Instant live session\n\nJoin URL: ${joinUrl}\n\nThis is an open session - any logged in user can join.`
          : `Instant live session\n\nJoin URL: ${joinUrl}\n\nRegistration required to join.`;

        await calendar.events.insert({
          calendarId: 'primary',
          requestBody: {
            summary: `${title} - ${expertName}`,
            description: calendarDescription,
            start: {
              dateTime: now.toISOString(),
              timeZone: 'UTC',
            },
            end: {
              dateTime: endTime.toISOString(),
              timeZone: 'UTC',
            },
            reminders: {
              useDefault: false,
              overrides: [],
            },
          },
        });
        console.log('[DBG][instant-session] Calendar event created');
      }
    } catch (calendarError) {
      // Don't fail if calendar event creation fails
      console.error('[DBG][instant-session] Failed to create calendar event:', calendarError);
    }

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
