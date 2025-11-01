import { NextResponse } from 'next/server';
import { getSession, getUserByAuth0Id } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import LiveSession from '@/models/LiveSession';
import { createHMSRoom, getActiveSession } from '@/lib/hms';
import type { ApiResponse } from '@/types';

/**
 * POST /api/live/sessions/[id]/start
 * Start a live session and create 100ms room (Expert only)
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;
  console.log('[DBG][api/live/sessions/[id]/start] POST request received:', sessionId);

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

    // Create 100ms room if not already created
    if (!liveSession.hmsDetails) {
      console.log('[DBG][api/live/sessions/[id]/start] Creating 100ms room...');

      try {
        // Create 100ms room
        const roomData = await createHMSRoom(
          `${liveSession.title} - ${sessionId}`,
          liveSession.description
        );

        // Update session with 100ms details
        liveSession.hmsDetails = {
          roomId: roomData.roomId,
          roomCode: roomData.roomCode,
          // sessionId will be populated when someone joins
        };

        console.log('[DBG][api/live/sessions/[id]/start] 100ms room created successfully');
      } catch (hmsError: any) {
        console.error('[DBG][api/live/sessions/[id]/start] ❌ Error creating 100ms room');
        console.error('[DBG][api/live/sessions/[id]/start] Error:', hmsError?.message);

        const response: ApiResponse<null> = {
          success: false,
          error: `Failed to create video room: ${hmsError?.message || 'Unknown error'}`,
        };
        return NextResponse.json(response, { status: 500 });
      }
    }

    // Update session status to live
    liveSession.status = 'live';
    liveSession.actualStartTime = new Date().toISOString();
    await liveSession.save();

    console.log('[DBG][api/live/sessions/[id]/start] Session started successfully');

    const response: ApiResponse<{
      roomId: string;
      roomCode: string;
      sessionUrl: string;
    }> = {
      success: true,
      data: {
        roomId: liveSession.hmsDetails?.roomId || '',
        roomCode: liveSession.hmsDetails?.roomCode || '',
        sessionUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3111'}/app/live/host/${sessionId}`,
      },
      message: 'Session started. Click the link to join the video room.',
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
