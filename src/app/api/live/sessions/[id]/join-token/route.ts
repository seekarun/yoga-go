import { NextResponse } from 'next/server';
import { getSession, getUserByAuth0Id } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import LiveSession from '@/models/LiveSession';
import LiveSessionParticipant from '@/models/LiveSessionParticipant';
import { generateHMSAuthToken } from '@/lib/hms';
import type { ApiResponse } from '@/types';

/**
 * POST /api/live/sessions/[id]/join-token
 * Get an auth token to join a live session room
 * Role is determined by whether user is the expert or a participant
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;
  console.log('[DBG][api/live/sessions/[id]/join-token] POST request received:', sessionId);

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

    // Check if session is live
    if (liveSession.status !== 'live') {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Session is not currently live',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Check if room details exist
    if (!liveSession.hmsDetails) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Video room has not been created yet',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Determine role: 'host' for expert, 'guest' for student
    const isExpert = liveSession.expertId === user.expertProfile;
    const role = isExpert ? 'host' : 'guest';

    console.log('[DBG][api/live/sessions/[id]/join-token] User role:', role);

    // If not expert, check if user is enrolled
    if (!isExpert) {
      const participant = await LiveSessionParticipant.findOne({
        sessionId: sessionId,
        userId: user.id,
      });

      if (!participant) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'You must enroll in this session before joining',
        };
        return NextResponse.json(response, { status: 403 });
      }

      // Check if paid session and user hasn't paid
      if (liveSession.price > 0 && !participant.paid) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Payment required to join this session',
        };
        return NextResponse.json(response, { status: 403 });
      }

      // Update participant as attended
      if (!participant.attended) {
        participant.attended = true;
        participant.joinedAt = new Date().toISOString();
        await participant.save();

        // Increment attended count
        liveSession.attendedCount += 1;
        await liveSession.save();
      }
    }

    // Generate 100ms auth token
    try {
      const authToken = await generateHMSAuthToken(
        liveSession.hmsDetails.roomId,
        user.id,
        role,
        user.profile?.name || 'Anonymous'
      );

      console.log('[DBG][api/live/sessions/[id]/join-token] Auth token generated successfully');

      const response: ApiResponse<{
        token: string;
        roomId: string;
        role: string;
      }> = {
        success: true,
        data: {
          token: authToken,
          roomId: liveSession.hmsDetails.roomId,
          role: role,
        },
        message: 'Auth token generated successfully',
      };

      return NextResponse.json(response);
    } catch (tokenError: any) {
      console.error('[DBG][api/live/sessions/[id]/join-token] Error generating token:', tokenError);

      const response: ApiResponse<null> = {
        success: false,
        error: `Failed to generate join token: ${tokenError?.message || 'Unknown error'}`,
      };
      return NextResponse.json(response, { status: 500 });
    }
  } catch (error) {
    console.error('[DBG][api/live/sessions/[id]/join-token] Error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
