import { NextResponse } from 'next/server';
import type { ApiResponse, LiveSession } from '@/types';
import * as liveSessionRepository from '@/lib/repositories/liveSessionRepository';

/**
 * GET /api/live/sessions/instant/[code]
 * Get instant meeting details by room code
 */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  console.log('[DBG][api/live/sessions/instant/code] GET called for code:', code);

  try {
    // Find session by instant meeting code from DynamoDB
    const session = await liveSessionRepository.getLiveSessionByInstantCode(code);

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Meeting not found' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const response: ApiResponse<LiveSession> = {
      success: true,
      data: session,
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
