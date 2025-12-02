import { NextResponse } from 'next/server';
import type { ApiResponse, LiveSession as LiveSessionType } from '@/types';
import * as liveSessionRepository from '@/lib/repositories/liveSessionRepository';

/**
 * GET /api/live/sessions/[id]
 * Get a single live session by ID
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = await params;
  console.log('[DBG][api/live/sessions/[id]] GET request received:', sessionId);

  try {
    // Get live session from DynamoDB
    const liveSession = await liveSessionRepository.getLiveSessionByIdOnly(sessionId);
    if (!liveSession) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Live session not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    console.log('[DBG][api/live/sessions/[id]] Session found:', sessionId);

    const response: ApiResponse<LiveSessionType> = {
      success: true,
      data: liveSession,
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
