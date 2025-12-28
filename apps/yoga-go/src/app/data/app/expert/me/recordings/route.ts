/**
 * Recordings API - List expert's recordings
 *
 * GET /data/app/expert/me/recordings
 * Query params: source, status, search, limit, lastKey
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, Recording, RecordingListResult, RecordingFilters } from '@/types';
import { getSessionFromCookies, getUserByCognitoSub } from '@/lib/auth';
import * as recordingRepository from '@/lib/repositories/recordingRepository';

/**
 * GET /data/app/expert/me/recordings
 * List the current expert's recordings
 */
export async function GET(request: NextRequest) {
  console.log('[DBG][recordings/route.ts] GET called');

  try {
    // Require authentication
    const session = await getSessionFromCookies();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as ApiResponse<Recording[]>,
        { status: 401 }
      );
    }

    // Get user from DynamoDB
    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' } as ApiResponse<Recording[]>,
        { status: 404 }
      );
    }

    // Check if user is an expert
    const isExpert = Array.isArray(user.role)
      ? user.role.includes('expert')
      : user.role === 'expert';
    if (!isExpert || !user.expertProfile) {
      return NextResponse.json(
        { success: false, error: 'User is not an expert' } as ApiResponse<Recording[]>,
        { status: 403 }
      );
    }

    const expertId = user.expertProfile;

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const filters: RecordingFilters = {};

    const source = searchParams.get('source');
    if (source === 'zoom' || source === 'google_meet' || source === 'upload') {
      filters.source = source;
    }

    const status = searchParams.get('status');
    if (
      status === 'pending' ||
      status === 'downloading' ||
      status === 'uploading' ||
      status === 'processing' ||
      status === 'ready' ||
      status === 'failed'
    ) {
      filters.status = status;
    }

    const search = searchParams.get('search');
    if (search) {
      filters.search = search;
    }

    const limit = searchParams.get('limit');
    if (limit) {
      filters.limit = parseInt(limit, 10);
    }

    const lastKey = searchParams.get('lastKey');
    if (lastKey) {
      filters.lastKey = lastKey;
    }

    // Get recordings from repository
    const result = await recordingRepository.getRecordingsByExpert(expertId, filters);

    console.log('[DBG][recordings/route.ts] Found', result.recordings.length, 'recordings');

    return NextResponse.json({
      success: true,
      data: result,
    } as ApiResponse<RecordingListResult>);
  } catch (error) {
    console.error('[DBG][recordings/route.ts] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get recordings',
      } as ApiResponse<Recording[]>,
      { status: 500 }
    );
  }
}
