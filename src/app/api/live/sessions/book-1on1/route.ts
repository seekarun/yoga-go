import { NextResponse } from 'next/server';
import { getSession, getUserByAuth0Id } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import LiveSession from '@/models/LiveSession';
import LiveSessionParticipant from '@/models/LiveSessionParticipant';
import Expert from '@/models/Expert';
import { isSlotAvailable } from '@/lib/availability';
import type { ApiResponse, LiveSession as LiveSessionType } from '@/types';
import { nanoid } from 'nanoid';

/**
 * POST /api/live/sessions/book-1on1
 * Book a 1-on-1 session with an expert (Student only)
 * Creates session and auto-enrolls the student
 */
export async function POST(request: Request) {
  console.log('[DBG][api/live/sessions/book-1on1] POST request received');

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

    // Parse request body
    const body = await request.json();
    const { expertId, startTime, endTime, title, description } = body;

    // Validation
    if (!expertId || !startTime || !endTime) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'expertId, startTime, and endTime are required',
      };
      return NextResponse.json(response, { status: 400 });
    }

    await connectToDatabase();

    // Get expert details
    const expert = await Expert.findById(expertId);
    if (!expert) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Expert not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Check if expert has live streaming enabled
    if (!expert.liveStreamingEnabled) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'This expert does not offer live sessions',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate that slot is available
    const available = await isSlotAvailable(expertId, startTime, endTime);
    if (!available) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'This time slot is not available. Please choose another time.',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Create 1-on-1 session
    const sessionId = nanoid();
    const liveSession = new LiveSession({
      _id: sessionId,
      expertId: expert._id,
      expertName: expert.name,
      expertAvatar: expert.avatar,
      title: title || `1-on-1 Session with ${expert.name}`,
      description: description || `Private one-on-one session with ${expert.name}`,
      sessionType: '1-on-1',
      scheduledStartTime: startTime,
      scheduledEndTime: endTime,
      maxParticipants: 1, // Always 1 for 1-on-1 sessions
      price: 0, // Free for now (payment to be added later)
      currency: 'INR',
      status: 'scheduled',
      enrolledCount: 1, // Student is auto-enrolled
      attendedCount: 0,
      currentViewers: 0,
      isFree: true,
    });

    await liveSession.save();

    console.log('[DBG][api/live/sessions/book-1on1] Session created:', sessionId);

    // Auto-enroll the student
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
      paid: true, // Marked as paid since session is free
      paymentGateway: undefined,
      amountPaid: 0,
    });

    await participant.save();

    console.log('[DBG][api/live/sessions/book-1on1] Student enrolled:', participantId);

    // Return session data
    const data: LiveSessionType = {
      id: liveSession._id,
      expertId: liveSession.expertId,
      expertName: liveSession.expertName,
      expertAvatar: liveSession.expertAvatar,
      title: liveSession.title,
      description: liveSession.description,
      thumbnail: liveSession.thumbnail,
      sessionType: liveSession.sessionType,
      scheduledStartTime: liveSession.scheduledStartTime,
      scheduledEndTime: liveSession.scheduledEndTime,
      actualStartTime: liveSession.actualStartTime,
      actualEndTime: liveSession.actualEndTime,
      maxParticipants: liveSession.maxParticipants,
      currentViewers: liveSession.currentViewers,
      price: liveSession.price,
      currency: liveSession.currency,
      hmsDetails: liveSession.hmsDetails,
      status: liveSession.status,
      recordingS3Key: liveSession.recordingS3Key,
      recordedLessonId: liveSession.recordedLessonId,
      recordingAvailable: liveSession.recordingAvailable,
      enrolledCount: liveSession.enrolledCount,
      attendedCount: liveSession.attendedCount,
      metadata: liveSession.metadata,
      featured: liveSession.featured,
      isFree: liveSession.isFree,
      createdAt: liveSession.createdAt,
      updatedAt: liveSession.updatedAt,
    };

    const response: ApiResponse<LiveSessionType> = {
      success: true,
      data,
      message:
        '1-on-1 session booked successfully! You will receive a notification when the expert starts the session.',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][api/live/sessions/book-1on1] Error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
