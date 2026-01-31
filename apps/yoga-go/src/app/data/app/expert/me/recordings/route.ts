/**
 * Recordings API - List expert's recordings
 *
 * GET /data/app/expert/me/recordings
 * Query params: source, status, search, limit, lastKey
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { ApiResponse, Recording, RecordingListResult, RecordingFilters } from '@/types';
import { getSessionFromCookies, getUserByCognitoSub } from '@/lib/auth';
import * as recordingRepository from '@/lib/repositories/recordingRepository';
import { getHmsRecordings } from '@/lib/100ms-meeting';
import { is100msConfigured } from '@/lib/100ms-auth';
import * as webinarRepository from '@/lib/repositories/webinarRepository';

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
    if (source === 'zoom' || source === 'google_meet' || source === 'upload' || source === 'live') {
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

    // Get recordings from repository (for zoom, google_meet, upload)
    let recordings: Recording[] = [];
    let totalCount = 0;

    // If not filtering by 'live' only, get DB recordings
    if (filters.source !== 'live') {
      const result = await recordingRepository.getRecordingsByExpert(expertId, filters);
      recordings = result.recordings;
      totalCount = result.totalCount;
    }

    // If source is 'live' or no source filter, also fetch 100ms recordings
    if ((filters.source === 'live' || !filters.source) && is100msConfigured()) {
      try {
        // Get expert's webinars to find their room IDs
        const webinarsList = await webinarRepository.getWebinarsByExpertId(expertId);

        // Collect all room IDs from webinar sessions
        const roomIds: Set<string> = new Set();
        for (const webinar of webinarsList) {
          for (const session of webinar.sessions || []) {
            if (session.hmsRoomId) {
              roomIds.add(session.hmsRoomId);
            }
          }
        }

        console.log('[DBG][recordings/route.ts] Found', roomIds.size, 'room IDs to check');

        // Fetch recordings from 100ms for each room
        const hmsRecordings: Recording[] = [];
        for (const roomId of roomIds) {
          try {
            const hmsResult = await getHmsRecordings(roomId, 50);

            for (const asset of hmsResult.data || []) {
              // Skip if not a video recording
              if (asset.type !== 'room-composite') continue;

              // Find the webinar/session for this recording
              let webinarTitle = 'Live Session';
              for (const webinar of webinarsList) {
                const session = webinar.sessions?.find(s => s.hmsRoomId === roomId);
                if (session) {
                  webinarTitle = `${webinar.title} - ${session.title}`;
                  break;
                }
              }

              // Convert to Recording type (omit pk/sk as they're DB-specific)
              const recording = {
                id: asset.id,
                expertId,
                source: 'live' as const,
                sourceId: asset.room_id,
                title: webinarTitle,
                duration: Math.round(asset.duration || 0),
                fileSize: asset.size || 0,
                status: (asset.status === 'completed' ? 'ready' : 'failed') as Recording['status'],
                recordedAt: asset.created_at,
                createdAt: asset.created_at,
                updatedAt: asset.created_at,
                hmsAssetId: asset.id,
                hmsRoomId: asset.room_id,
                hmsSessionId: asset.session_id,
              } satisfies Omit<Recording, 'pk' | 'sk'>;

              // Apply search filter if present
              if (
                filters.search &&
                !recording.title.toLowerCase().includes(filters.search.toLowerCase())
              ) {
                continue;
              }

              // Apply status filter
              if (filters.status && recording.status !== filters.status) {
                continue;
              }

              hmsRecordings.push(recording);
            }
          } catch (err) {
            console.error(
              '[DBG][recordings/route.ts] Error fetching 100ms recordings for room:',
              roomId,
              err
            );
          }
        }

        console.log('[DBG][recordings/route.ts] Found', hmsRecordings.length, '100ms recordings');

        // Merge recordings
        recordings = [...recordings, ...hmsRecordings];
        totalCount += hmsRecordings.length;

        // Sort by date (newest first)
        recordings.sort((a, b) => {
          const dateA = new Date(a.recordedAt || a.createdAt || '').getTime();
          const dateB = new Date(b.recordedAt || b.createdAt || '').getTime();
          return dateB - dateA;
        });
      } catch (err) {
        console.error('[DBG][recordings/route.ts] Error fetching 100ms recordings:', err);
      }
    }

    console.log('[DBG][recordings/route.ts] Found', recordings.length, 'total recordings');

    return NextResponse.json({
      success: true,
      data: {
        recordings,
        totalCount,
      },
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
