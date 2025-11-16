import { NextResponse } from 'next/server';
import { getSession, getUserByAuth0Id } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import LiveSession from '@/models/LiveSession';
import type { ApiResponse } from '@/types';

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
    if (!session || !session.user) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Not authenticated',
      };
      return NextResponse.json(response, { status: 401 });
    }

    // Get user from database
    const user = await getUserByAuth0Id(session.user.sub);
    if (!user) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'User not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Connect to database
    await connectToDatabase();

    // Get live session
    const liveSession = await LiveSession.findById(sessionId);
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

    // Update session status to ended
    liveSession.status = 'ended';
    liveSession.actualEndTime = new Date().toISOString();
    liveSession.currentViewers = 0; // Reset viewer count
    await liveSession.save();

    console.log('[DBG][api/live/sessions/[id]/end] Session ended successfully');

    const response: ApiResponse<{
      sessionId: string;
      status: string;
    }> = {
      success: true,
      data: {
        sessionId: liveSession._id,
        status: liveSession.status,
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
