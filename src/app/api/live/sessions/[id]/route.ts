import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import LiveSession from '@/models/LiveSession';
import type { ApiResponse, LiveSession as LiveSessionType } from '@/types';

/**
 * GET /api/live/sessions/[id]
 * Get a single live session by ID
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;
  console.log('[DBG][api/live/sessions/[id]] GET request received:', sessionId);

  try {
    // Connect to database
    await connectToDatabase();

    // Get live session
    const liveSession: any = await LiveSession.findById(sessionId).lean();
    if (!liveSession) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Live session not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    console.log('[DBG][api/live/sessions/[id]] Session found:', sessionId);

    // Transform session to match API type
    const sessionData: LiveSessionType = {
      id: liveSession._id,
      expertId: liveSession.expertId,
      expertName: liveSession.expertName,
      expertAvatar: liveSession.expertAvatar,
      title: liveSession.title,
      description: liveSession.description,
      thumbnail: liveSession.thumbnail,
      sessionType: liveSession.sessionType,
      meetingLink: liveSession.meetingLink,
      meetingPlatform: liveSession.meetingPlatform,
      instantMeetingCode: liveSession.instantMeetingCode,
      scheduledStartTime: liveSession.scheduledStartTime,
      scheduledEndTime: liveSession.scheduledEndTime,
      actualStartTime: liveSession.actualStartTime,
      actualEndTime: liveSession.actualEndTime,
      maxParticipants: liveSession.maxParticipants,
      currentViewers: liveSession.currentViewers,
      price: liveSession.price,
      currency: liveSession.currency,
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
      data: sessionData,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][api/live/sessions/[id]] Error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
