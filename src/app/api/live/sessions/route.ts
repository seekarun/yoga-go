import { NextResponse } from 'next/server';
import { getSession, getUserByAuth0Id } from '@/lib/auth';
import type { ApiResponse, LiveSession as LiveSessionType } from '@/types';
import * as expertRepository from '@/lib/repositories/expertRepository';
import * as liveSessionRepository from '@/lib/repositories/liveSessionRepository';

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

    // Get expert details from DynamoDB
    const expert = await expertRepository.getExpertById(user.expertProfile);
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

    // Create live session in DynamoDB
    const liveSession = await liveSessionRepository.createLiveSession({
      expertId: expert.id,
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

    // Update expert's session counts in DynamoDB
    await expertRepository.updateExpert(expert.id, {
      totalLiveSessions: (expert.totalLiveSessions || 0) + 1,
      upcomingLiveSessions: (expert.upcomingLiveSessions || 0) + 1,
    });

    console.log('[DBG][api/live/sessions] Live session created:', liveSession.id);

    const response: ApiResponse<{ session: LiveSessionType }> = {
      success: true,
      data: {
        session: liveSession,
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

    let sessions: LiveSessionType[];

    // Get sessions based on filters
    if (expertId) {
      // Get sessions by expert
      sessions = await liveSessionRepository.getLiveSessionsByExpert(expertId);
    } else if (status) {
      // Get sessions by status
      sessions = await liveSessionRepository.getLiveSessionsByStatus(
        status as 'scheduled' | 'live' | 'ended' | 'cancelled'
      );
    } else {
      // Get all scheduled and live sessions (default public view)
      const [scheduled, live] = await Promise.all([
        liveSessionRepository.getLiveSessionsByStatus('scheduled'),
        liveSessionRepository.getLiveSessionsByStatus('live'),
      ]);
      sessions = [...scheduled, ...live];
    }

    // Apply status filter if we didn't query by status directly
    if (status && expertId) {
      sessions = sessions.filter(s => s.status === status);
    }

    // Apply featured filter
    if (featured === 'true') {
      sessions = sessions.filter(s => s.featured);
    }

    // Sort by scheduledStartTime ascending (upcoming first)
    sessions.sort(
      (a, b) => new Date(a.scheduledStartTime).getTime() - new Date(b.scheduledStartTime).getTime()
    );

    // Apply pagination
    const total = sessions.length;
    sessions = sessions.slice(skip, skip + limit);

    console.log('[DBG][api/live/sessions] Found sessions:', sessions.length);

    const response: ApiResponse<LiveSessionType[]> = {
      success: true,
      data: sessions,
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
