import { NextResponse } from 'next/server';
import { getSession, getUserByAuth0Id } from '@/lib/auth';
import { isSlotAvailable, getAvailabilityForTime } from '@/lib/availability';
import type { ApiResponse, LiveSession as LiveSessionType } from '@/types';
import * as expertRepository from '@/lib/repositories/expertRepository';
import * as liveSessionRepository from '@/lib/repositories/liveSessionRepository';
import * as liveSessionParticipantRepository from '@/lib/repositories/liveSessionParticipantRepository';

/**
 * POST /api/live/sessions/book-1on1
 * Book a 1-on-1 session with an expert (Student only)
 * Creates session and auto-enrolls the student
 * Uses meeting link from expert's availability configuration
 */
export async function POST(request: Request) {
  console.log('[DBG][api/live/sessions/book-1on1] POST request received');

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

    // Get expert details from DynamoDB
    const expert = await expertRepository.getExpertById(expertId);
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

    // Get meeting link from expert's availability configuration
    console.log('[DBG][api/live/sessions/book-1on1] Looking for availability:', {
      expertId,
      startTime,
    });

    const availabilityConfig = await getAvailabilityForTime(expertId, startTime);

    console.log('[DBG][api/live/sessions/book-1on1] Found availability:', {
      found: !!availabilityConfig,
      meetingLink: availabilityConfig?.meetingLink,
    });

    const meetingLink = availabilityConfig?.meetingLink?.trim() || '';

    // Validate expert has meeting link set up
    if (!meetingLink) {
      console.error(
        '[DBG][api/live/sessions/book-1on1] No meeting link found for expert:',
        expertId
      );
      const response: ApiResponse<null> = {
        success: false,
        error:
          'This time slot is not available for booking. The expert has not completed their session setup. Please try another time slot or contact the expert directly.',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Create 1-on-1 session in DynamoDB
    const liveSession = await liveSessionRepository.createLiveSession({
      expertId: expert.id,
      expertName: expert.name,
      expertAvatar: expert.avatar,
      title: title || `1-on-1 Session with ${expert.name}`,
      description: description || `Private one-on-one session with ${expert.name}`,
      sessionType: '1-on-1',
      meetingLink: meetingLink,
      meetingPlatform: 'other', // Meeting link from availability config
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
      // Track who booked this session
      scheduledByUserId: user.id,
      scheduledByName: user.profile.name,
      scheduledByRole: 'student',
    });

    console.log('[DBG][api/live/sessions/book-1on1] Session created:', liveSession.id);

    // Auto-enroll the student in DynamoDB
    const participant = await liveSessionParticipantRepository.createParticipant({
      sessionId: liveSession.id,
      userId: user.id,
      userName: user.profile.name,
      userEmail: user.profile.email,
      userAvatar: user.profile.avatar,
      enrolledAt: new Date().toISOString(),
      attended: false,
      paid: true, // Marked as paid since session is free
      amountPaid: 0,
    });

    console.log('[DBG][api/live/sessions/book-1on1] Student enrolled:', participant.id);

    // Return session data
    const data: LiveSessionType = liveSession;

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
