import { NextResponse } from 'next/server';
import { getSession, getUserByAuth0Id } from '@/lib/auth';
import type { ApiResponse, LiveSession as LiveSessionType } from '@/types';
import * as liveSessionRepository from '@/lib/repositories/liveSessionRepository';
import * as liveSessionParticipantRepository from '@/lib/repositories/liveSessionParticipantRepository';

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

    // Find all sessions where this user is enrolled as a participant from DynamoDB
    const participantRecords = await liveSessionParticipantRepository.getSessionsByUser(userId);

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

    // Fetch the actual session details for these sessions from DynamoDB
    const sessionsPromises = sessionIds.map(id => liveSessionRepository.getLiveSessionByIdOnly(id));
    const sessionsResults = await Promise.all(sessionsPromises);

    // Filter out null results and only return active sessions (scheduled or live, not ended/cancelled)
    const sessions = sessionsResults
      .filter((s): s is LiveSessionType => s !== null)
      .filter(s => ['scheduled', 'live'].includes(s.status))
      .sort(
        (a, b) =>
          new Date(a.scheduledStartTime).getTime() - new Date(b.scheduledStartTime).getTime()
      );

    console.log('[DBG][api/app/live/my-sessions] Returning', sessions.length, 'active sessions');

    const response: ApiResponse<LiveSessionType[]> = {
      success: true,
      data: sessions,
      total: sessions.length,
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
