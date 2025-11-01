import { NextResponse } from 'next/server';
import { getSession, getUserByAuth0Id } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import LiveSession from '@/models/LiveSession';
import Expert from '@/models/Expert';
import { endHMSRoom } from '@/lib/hms';
import type { ApiResponse } from '@/types';

/**
 * POST /api/live/sessions/[id]/end
 * End a live session and disable the room (Expert only)
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
        error: 'Only the session expert can end the stream',
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

    // Disable 100ms room if active
    if (liveSession.hmsDetails?.roomId) {
      try {
        await endHMSRoom(liveSession.hmsDetails.roomId);
        console.log('[DBG][api/live/sessions/[id]/end] 100ms room disabled');
      } catch (hmsError) {
        console.error('[DBG][api/live/sessions/[id]/end] Error disabling room:', hmsError);
        // Continue with session ending even if room disable fails
      }
    }

    // Update session status
    liveSession.status = 'ended';
    liveSession.actualEndTime = new Date().toISOString();
    liveSession.currentViewers = 0;
    await liveSession.save();

    // Update expert's upcoming session count
    const expert = await Expert.findById(liveSession.expertId);
    if (expert) {
      expert.upcomingLiveSessions = Math.max(0, (expert.upcomingLiveSessions || 1) - 1);
      await expert.save();
    }

    console.log('[DBG][api/live/sessions/[id]/end] Session ended successfully');

    // TODO: Trigger recording processing if recording was enabled
    // This would involve:
    // 1. Waiting for 100ms to finish recording
    // 2. Processing the recording (convert, trim, etc.)
    // 3. Uploading to Cloudflare Stream
    // 4. Creating a Lesson document
    // 5. Updating liveSession.recordedLessonId

    const response: ApiResponse<{
      sessionId: string;
      duration: number; // in minutes
    }> = {
      success: true,
      data: {
        sessionId: liveSession._id,
        duration:
          liveSession.actualStartTime && liveSession.actualEndTime
            ? Math.round(
                (new Date(liveSession.actualEndTime).getTime() -
                  new Date(liveSession.actualStartTime).getTime()) /
                  60000
              )
            : 0,
      },
      message: 'Session ended successfully',
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
