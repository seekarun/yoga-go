import { NextResponse } from 'next/server';
import { getSession, getUserByAuth0Id } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import LiveSession from '@/models/LiveSession';
import LiveSessionParticipant from '@/models/LiveSessionParticipant';
import { nanoid } from 'nanoid';
import type { ApiResponse } from '@/types';

/**
 * POST /api/live/sessions/[id]/enroll
 * Enroll authenticated user in a live session
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;
  console.log('[DBG][api/live/sessions/[id]/enroll] POST request received:', sessionId);

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

    // Get request body for payment info (optional)
    const body = await request.json().catch(() => ({}));
    const { paymentId, paymentGateway } = body;

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

    // Check if session is available for enrollment
    if (liveSession.status === 'ended' || liveSession.status === 'cancelled') {
      const response: ApiResponse<null> = {
        success: false,
        error: `Cannot enroll in session with status: ${liveSession.status}`,
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Check if user is already enrolled
    const existingParticipant = await LiveSessionParticipant.findOne({
      sessionId: sessionId,
      userId: user.id,
    });

    if (existingParticipant) {
      const response: ApiResponse<{ participantId: string }> = {
        success: true,
        data: { participantId: existingParticipant._id },
        message: 'Already enrolled in this session',
      };
      return NextResponse.json(response);
    }

    // Check if session has reached max participants
    if (liveSession.maxParticipants && liveSession.enrolledCount >= liveSession.maxParticipants) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Session is full',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Payment check temporarily disabled - all sessions are free for now
    // TODO: Re-enable payment validation when payment integration is complete
    // if (liveSession.price > 0 && !paymentId) {
    //   const response: ApiResponse<null> = {
    //     success: false,
    //     error: 'Payment required for this session',
    //   };
    //   return NextResponse.json(response, { status: 400 });
    // }

    // Create participant record
    const participantId = nanoid();
    const participant = new LiveSessionParticipant({
      _id: participantId,
      sessionId: sessionId,
      userId: user.id,
      userName: user.profile.name,
      userEmail: user.profile.email,
      userAvatar: user.profile.avatar,
      enrolledAt: new Date().toISOString(),
      attended: false,
      paid: true, // Always true for now (payment integration to be added later)
      paymentId: paymentId,
      paymentGateway: paymentGateway,
      amountPaid: liveSession.price,
      chatMessages: 0,
    });

    await participant.save();

    // Update session enrolled count
    liveSession.enrolledCount = (liveSession.enrolledCount || 0) + 1;
    await liveSession.save();

    console.log('[DBG][api/live/sessions/[id]/enroll] User enrolled successfully');

    const response: ApiResponse<{ participantId: string }> = {
      success: true,
      data: { participantId },
      message: 'Successfully enrolled in live session',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][api/live/sessions/[id]/enroll] Error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
