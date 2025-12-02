import { NextResponse } from 'next/server';
import { getSession, getUserByAuth0Id } from '@/lib/auth';
import type { ApiResponse } from '@/types';
import * as liveSessionRepository from '@/lib/repositories/liveSessionRepository';

/**
 * POST /api/live/sessions/[id]/start
 * Start a scheduled live session (Expert only)
 * Changes status from 'scheduled' to 'live'
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;
  console.log('[DBG][api/live/sessions/[id]/start] POST request received:', sessionId);

  try {
    // Check authentication
    const session = await getSession();
    if (!session || !session.user || !session.user.cognitoSub) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Not authenticated',
      };
      return NextResponse.json(response, { status: 401 });
    }

    // Get user from database
    const user = await getUserByAuth0Id(session.user.cognitoSub);
    if (!user) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'User not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Get live session from DynamoDB
    const liveSession = await liveSessionRepository.getLiveSessionByIdOnly(sessionId);
    if (!liveSession) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Live session not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Verify user is the session's expert
    if (liveSession.expertId !== user.expertProfile) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Only the session expert can start the session',
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Check if session is in scheduled status
    if (liveSession.status !== 'scheduled') {
      const response: ApiResponse<null> = {
        success: false,
        error: `Cannot start session with status: ${liveSession.status}`,
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Update session status to live in DynamoDB
    const updatedSession = await liveSessionRepository.updateLiveSessionStatus(
      liveSession.expertId,
      sessionId,
      'live',
      { actualStartTime: new Date().toISOString() }
    );

    console.log('[DBG][api/live/sessions/[id]/start] Session started successfully');

    const response: ApiResponse<{
      sessionId: string;
      status: string;
      meetingLink: string;
      meetingPlatform: string;
    }> = {
      success: true,
      data: {
        sessionId: sessionId,
        status: updatedSession?.status || 'live',
        meetingLink: liveSession.meetingLink || '',
        meetingPlatform: liveSession.meetingPlatform || 'other',
      },
      message: 'Session started successfully. Students can now join.',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][api/live/sessions/[id]/start] Error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
