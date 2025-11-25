import { NextResponse } from 'next/server';
import { getSession, getUserByAuth0Id } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import LiveSession from '@/models/LiveSession';
import type { ApiResponse } from '@/types';

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

    // Update session status to live
    liveSession.status = 'live';
    liveSession.actualStartTime = new Date().toISOString();
    await liveSession.save();

    console.log('[DBG][api/live/sessions/[id]/start] Session started successfully');

    const response: ApiResponse<{
      sessionId: string;
      status: string;
      meetingLink: string;
      meetingPlatform: string;
    }> = {
      success: true,
      data: {
        sessionId: liveSession._id,
        status: liveSession.status,
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
