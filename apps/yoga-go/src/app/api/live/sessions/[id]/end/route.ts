import { NextResponse } from 'next/server';
import { getSession, getUserByAuth0Id } from '@/lib/auth';
import type { ApiResponse } from '@/types';
import * as liveSessionRepository from '@/lib/repositories/liveSessionRepository';

/**
 * POST /api/live/sessions/[id]/end
 * End a live session (Expert only)
 * Changes status from 'live' to 'ended'
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;
  console.log('[DBG][api/live/sessions/[id]/end] POST request received:', sessionId);

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
        error: 'Only the session expert can end the session',
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Check if session is live
    if (liveSession.status !== 'live') {
      const response: ApiResponse<null> = {
        success: false,
        error: `Cannot end session with status: ${liveSession.status}`,
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Update session status to ended in DynamoDB
    const updatedSession = await liveSessionRepository.updateLiveSession(
      liveSession.expertId,
      sessionId,
      {
        status: 'ended',
        actualEndTime: new Date().toISOString(),
        currentViewers: 0, // Reset viewer count
      }
    );

    console.log('[DBG][api/live/sessions/[id]/end] Session ended successfully');

    const response: ApiResponse<{
      sessionId: string;
      status: string;
    }> = {
      success: true,
      data: {
        sessionId: sessionId,
        status: updatedSession?.status || 'ended',
      },
      message: 'Session ended successfully.',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][api/live/sessions/[id]/end] Error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
