/**
 * Session Join API Route for 100ms
 * POST /data/app/webinars/[webinarId]/sessions/[sessionId]/join
 * Generates auth token for user to join 100ms session
 */

import { NextResponse } from 'next/server';
import { getSession, getUserByCognitoSub } from '@/lib/auth';
import * as webinarRepository from '@/lib/repositories/webinarRepository';
import * as webinarRegistrationRepository from '@/lib/repositories/webinarRegistrationRepository';
import { generateAuthToken, determineRole, is100msConfigured } from '@/lib/100ms-auth';
import type { ApiResponse } from '@/types';
import type { HmsRole } from '@/lib/100ms-auth';

interface JoinSessionResponse {
  authToken: string;
  roomId: string;
  role: HmsRole;
  userName: string;
}

interface RouteParams {
  params: Promise<{
    webinarId: string;
    sessionId: string;
  }>;
}

/**
 * POST /data/app/webinars/[webinarId]/sessions/[sessionId]/join
 * Returns auth token for joining 100ms session
 */
export async function POST(
  _request: Request,
  context: RouteParams
): Promise<NextResponse<ApiResponse<JoinSessionResponse>>> {
  const { webinarId, sessionId } = await context.params;
  console.log('[DBG][sessions/join] POST request for session:', sessionId);

  try {
    // Check if 100ms is configured
    if (!is100msConfigured()) {
      return NextResponse.json(
        { success: false, error: '100ms is not configured' },
        { status: 503 }
      );
    }

    const session = await getSession();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.cognitoSub;

    // Get webinar
    const webinar = await webinarRepository.getWebinarByIdOnly(webinarId);
    if (!webinar) {
      return NextResponse.json({ success: false, error: 'Webinar not found' }, { status: 404 });
    }

    // Find the session
    const webinarSession = webinar.sessions.find(s => s.id === sessionId);
    if (!webinarSession) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    // Check if session has 100ms room
    if (!webinarSession.hmsRoomId) {
      return NextResponse.json(
        { success: false, error: 'Session does not have video room configured' },
        { status: 400 }
      );
    }

    // Get user info
    const user = await getUserByCognitoSub(userId);
    const userName = user?.profile?.name || session.user.email || 'Participant';

    // Check if user is the expert (host)
    const isExpert = user?.expertProfile === webinar.expertId;

    // Check if this is an open session (any logged-in user can join)
    // Uses isOpen field, with fallback to tags for backward compatibility
    const isOpenSession =
      webinar.isOpen === true ||
      webinar.tags?.includes('instant') ||
      webinar.tags?.includes('open');

    // If not expert and not instant session, check registration
    if (!isExpert && !isOpenSession) {
      const registration = await webinarRegistrationRepository.getRegistration(
        webinar.expertId,
        webinarId,
        userId
      );

      if (!registration || registration.status === 'cancelled') {
        // For free webinars, allow access without registration
        if (webinar.price > 0) {
          return NextResponse.json(
            { success: false, error: 'Not registered for this webinar' },
            { status: 403 }
          );
        }
      }
    }

    // For instant sessions, log that we're allowing open access
    if (isOpenSession && !isExpert) {
      console.log('[DBG][sessions/join] Allowing open access for instant session');
    }

    // Determine role
    const role = determineRole(isExpert);

    // Generate auth token
    const authToken = await generateAuthToken(webinarSession.hmsRoomId, userId, role, userName);

    console.log('[DBG][sessions/join] Generated token for user:', userId, 'role:', role);

    return NextResponse.json({
      success: true,
      data: {
        authToken,
        roomId: webinarSession.hmsRoomId,
        role,
        userName,
      },
    });
  } catch (error) {
    console.error('[DBG][sessions/join] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to join session',
      },
      { status: 500 }
    );
  }
}
