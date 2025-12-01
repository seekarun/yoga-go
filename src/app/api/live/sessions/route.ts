import { NextResponse } from 'next/server';
import { getSession, getUserByAuth0Id } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import LiveSession from '@/models/LiveSession';
import Expert from '@/models/Expert';
import { nanoid } from 'nanoid';
import type { ApiResponse, LiveSession as LiveSessionType } from '@/types';

/**
 * POST /api/live/sessions
 * Create a new live session (Expert only)
 */
export async function POST(request: Request) {
  console.log('[DBG][api/live/sessions] POST request received');

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

    // Verify user is an expert (role is now an array)
    const isExpert = Array.isArray(user.role)
      ? user.role.includes('expert')
      : user.role === 'expert';
    if (!isExpert || !user.expertProfile) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Only experts can create live sessions',
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Get request body
    const body = await request.json();
    const {
      title,
      description,
      meetingLink,
      meetingPlatform,
      sessionType,
      scheduledStartTime,
      scheduledEndTime,
      maxParticipants,
      price,
      currency,
      thumbnail,
      metadata,
    } = body;

    // Validate required fields
    if (!title || !description || !sessionType || !scheduledStartTime || !scheduledEndTime) {
      const response: ApiResponse<null> = {
        success: false,
        error:
          'Missing required fields: title, description, sessionType, scheduledStartTime, scheduledEndTime',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate meeting link
    if (!meetingLink || !meetingLink.trim()) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Meeting link is required',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate session type
    if (!['1-on-1', 'group'].includes(sessionType)) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid session type. Must be: 1-on-1 or group',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Connect to database
    await connectToDatabase();

    // Get expert details
    const expert = await Expert.findById(user.expertProfile);
    if (!expert) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Expert profile not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Check if expert has live streaming enabled
    if (!expert.liveStreamingEnabled) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Live streaming is not enabled for this expert. Please contact support.',
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Create live session document
    const sessionId = nanoid();
    const liveSession = new LiveSession({
      _id: sessionId,
      expertId: user.expertProfile,
      expertName: expert.name,
      expertAvatar: expert.avatar,
      title,
      description,
      thumbnail,
      sessionType,
      meetingLink: meetingLink.trim(),
      meetingPlatform: meetingPlatform || 'other',
      scheduledStartTime,
      scheduledEndTime,
      maxParticipants,
      price: price || 0,
      currency: currency || 'INR',
      status: 'scheduled',
      enrolledCount: 0,
      attendedCount: 0,
      currentViewers: 0,
      metadata,
      isFree: (price || 0) === 0,
      // Track who created this session
      scheduledByUserId: user.id,
      scheduledByName: user.profile.name,
      scheduledByRole: 'expert',
    });

    await liveSession.save();

    // Update expert's session counts
    expert.totalLiveSessions = (expert.totalLiveSessions || 0) + 1;
    expert.upcomingLiveSessions = (expert.upcomingLiveSessions || 0) + 1;
    await expert.save();

    console.log('[DBG][api/live/sessions] Live session created:', sessionId);

    const response: ApiResponse<{ session: LiveSessionType }> = {
      success: true,
      data: {
        session: {
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
          maxParticipants: liveSession.maxParticipants,
          currentViewers: liveSession.currentViewers,
          price: liveSession.price,
          currency: liveSession.currency,
          status: liveSession.status,
          enrolledCount: liveSession.enrolledCount,
          attendedCount: liveSession.attendedCount,
          metadata: liveSession.metadata,
          featured: liveSession.featured,
          isFree: liveSession.isFree,
          createdAt: liveSession.createdAt?.toISOString(),
          updatedAt: liveSession.updatedAt?.toISOString(),
        } as LiveSessionType,
      },
      message:
        'Live session created successfully. Start the session when ready to generate streaming details.',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][api/live/sessions] Error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * GET /api/live/sessions
 * List live sessions with optional filters
 * Query params:
 *   - status: 'scheduled' | 'live' | 'ended' | 'cancelled'
 *   - expertId: Filter by expert ID
 *   - featured: 'true' | 'false'
 *   - limit: Number of sessions to return (default: 20)
 *   - skip: Number of sessions to skip (default: 0)
 */
export async function GET(request: Request) {
  console.log('[DBG][api/live/sessions] GET request received');

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const expertId = searchParams.get('expertId');
    const featured = searchParams.get('featured');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = parseInt(searchParams.get('skip') || '0');

    // Connect to database
    await connectToDatabase();

    // Build query
    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (expertId) {
      query.expertId = expertId;
    }

    if (featured === 'true') {
      query.featured = true;
    }

    // Get sessions
    const sessions = await LiveSession.find(query)
      .sort({ scheduledStartTime: 1 }) // Upcoming first
      .limit(limit)
      .skip(skip)
      .lean();

    // Get total count
    const total = await LiveSession.countDocuments(query);

    console.log('[DBG][api/live/sessions] Found sessions:', sessions.length);

    // Transform sessions to match API type
    const transformedSessions = sessions.map((session: any) => ({
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
      currentViewers: session.currentViewers,
      price: session.price,
      currency: session.currency,
      meetingLink: session.meetingLink,
      meetingPlatform: session.meetingPlatform,
      status: session.status,
      recordingAvailable: session.recordingAvailable,
      recordedLessonId: session.recordedLessonId,
      enrolledCount: session.enrolledCount,
      attendedCount: session.attendedCount,
      metadata: session.metadata,
      scheduledByUserId: session.scheduledByUserId,
      scheduledByName: session.scheduledByName,
      scheduledByRole: session.scheduledByRole,
      featured: session.featured,
      isFree: session.isFree,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    }));

    const response: ApiResponse<LiveSessionType[]> = {
      success: true,
      data: transformedSessions,
      total,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][api/live/sessions] Error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
