import { NextResponse } from 'next/server';
import { getSession, getUserByAuth0Id } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import LiveSession from '@/models/LiveSession';
import LiveSessionParticipant from '@/models/LiveSessionParticipant';
import type { ApiResponse, LiveSession as LiveSessionType } from '@/types';

/**
 * GET /api/app/live/my-sessions
 * Get only the sessions the authenticated user has enrolled in (booked)
 * Returns user's upcoming and live sessions
 */
export async function GET() {
  console.log('[DBG][api/app/live/my-sessions] GET request received');

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

    const userId = user.id;

    // Connect to database
    await connectToDatabase();

    // Find all sessions where this user is enrolled as a participant
    const participantRecords = await LiveSessionParticipant.find({ userId });

    if (!participantRecords || participantRecords.length === 0) {
      console.log('[DBG][api/app/live/my-sessions] No enrollments found for user:', userId);
      const response: ApiResponse<LiveSessionType[]> = {
        success: true,
        data: [],
        total: 0,
      };
      return NextResponse.json(response);
    }

    // Get session IDs from participant records
    const sessionIds = participantRecords.map(p => p.sessionId);

    console.log(
      '[DBG][api/app/live/my-sessions] Found',
      sessionIds.length,
      'enrolled sessions for user:',
      userId
    );

    // Fetch the actual session details for these sessions
    // Only return active sessions (scheduled or live, not ended/cancelled)
    const sessions = await LiveSession.find({
      _id: { $in: sessionIds },
      status: { $in: ['scheduled', 'live'] },
    }).sort({ scheduledStartTime: 1 });

    console.log('[DBG][api/app/live/my-sessions] Returning', sessions.length, 'active sessions');

    // Transform to API format
    const sessionsData: LiveSessionType[] = sessions.map(session => ({
      id: session._id,
      expertId: session.expertId,
      expertName: session.expertName,
      expertAvatar: session.expertAvatar,
      title: session.title,
      description: session.description,
      thumbnail: session.thumbnail,
      sessionType: session.sessionType,
      scheduledStartTime: session.scheduledStartTime,
      scheduledEndTime: session.scheduledEndTime,
      actualStartTime: session.actualStartTime,
      actualEndTime: session.actualEndTime,
      maxParticipants: session.maxParticipants,
      currentViewers: session.currentViewers,
      price: session.price,
      currency: session.currency,
      status: session.status,
      recordingS3Key: session.recordingS3Key,
      recordedLessonId: session.recordedLessonId,
      recordingAvailable: session.recordingAvailable,
      enrolledCount: session.enrolledCount,
      attendedCount: session.attendedCount,
      metadata: session.metadata,
      featured: session.featured,
      isFree: session.isFree,
      createdAt: session.createdAt?.toISOString(),
      updatedAt: session.updatedAt?.toISOString(),
    }));

    const response: ApiResponse<LiveSessionType[]> = {
      success: true,
      data: sessionsData,
      total: sessionsData.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][api/app/live/my-sessions] Error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
