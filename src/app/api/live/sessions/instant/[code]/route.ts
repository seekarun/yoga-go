import { NextResponse } from 'next/server';
import LiveSessionModel from '@/models/LiveSession';
import type { ApiResponse, LiveSession } from '@/types';

/**
 * GET /api/live/sessions/instant/[code]
 * Get instant meeting details by room code
 */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  console.log('[DBG][api/live/sessions/instant/code] GET called for code:', code);

  try {
    // Find session by instant meeting code
    const session = await LiveSessionModel.findOne({ instantMeetingCode: code });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Meeting not found' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    // Convert to LiveSession type
    const sessionData: LiveSession = {
      id: session._id,
      expertId: session.expertId,
      expertName: session.expertName,
      expertAvatar: session.expertAvatar,
      title: session.title,
      description: session.description,
      thumbnail: session.thumbnail,
      sessionType: session.sessionType,
      instantMeetingCode: session.instantMeetingCode,
      scheduledStartTime: session.scheduledStartTime,
      scheduledEndTime: session.scheduledEndTime,
      actualStartTime: session.actualStartTime,
      actualEndTime: session.actualEndTime,
      maxParticipants: session.maxParticipants,
      currentViewers: session.currentViewers || 0,
      price: session.price,
      currency: session.currency,
      meetingLink: session.meetingLink,
      meetingPlatform: session.meetingPlatform,
      hmsDetails: session.hmsDetails,
      status: session.status,
      recordingS3Key: session.recordingS3Key,
      recordedLessonId: session.recordedLessonId,
      recordingAvailable: session.recordingAvailable || false,
      enrolledCount: session.enrolledCount || 0,
      attendedCount: session.attendedCount || 0,
      metadata: session.metadata,
      featured: session.featured || false,
      isFree: session.isFree !== undefined ? session.isFree : true,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };

    const response: ApiResponse<LiveSession> = {
      success: true,
      data: sessionData,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][api/live/sessions/instant/code] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get meeting',
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
