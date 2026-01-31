/**
 * Single Recording API - CRUD operations
 *
 * GET /data/app/expert/me/recordings/[recordingId]
 * PATCH /data/app/expert/me/recordings/[recordingId]
 * DELETE /data/app/expert/me/recordings/[recordingId]
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { ApiResponse, Recording } from '@/types';
import { getSessionFromCookies, getUserByCognitoSub } from '@/lib/auth';
import * as recordingRepository from '@/lib/repositories/recordingRepository';
import * as cloudflareStream from '@/lib/cloudflare-stream';
import { deleteHmsRecordingAsset } from '@/lib/100ms-meeting';

interface RouteParams {
  params: Promise<{ recordingId: string }>;
}

/**
 * GET /data/app/expert/me/recordings/[recordingId]
 * Get a single recording by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { recordingId } = await params;
  console.log('[DBG][recordings/[recordingId]/route.ts] GET called:', recordingId);

  try {
    // Require authentication
    const session = await getSessionFromCookies();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as ApiResponse<Recording>,
        { status: 401 }
      );
    }

    // Get user from DynamoDB
    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' } as ApiResponse<Recording>,
        { status: 404 }
      );
    }

    // Check if user is an expert
    const isExpert = Array.isArray(user.role)
      ? user.role.includes('expert')
      : user.role === 'expert';
    if (!isExpert || !user.expertProfile) {
      return NextResponse.json(
        { success: false, error: 'User is not an expert' } as ApiResponse<Recording>,
        { status: 403 }
      );
    }

    const expertId = user.expertProfile;

    // Get recording
    const recording = await recordingRepository.getRecordingById(recordingId, expertId);

    if (!recording) {
      return NextResponse.json(
        { success: false, error: 'Recording not found' } as ApiResponse<Recording>,
        { status: 404 }
      );
    }

    // If recording is processing, check Cloudflare status
    if (recording.status === 'processing' && recording.cloudflareStreamId) {
      try {
        const videoDetails = await cloudflareStream.getVideoDetails(recording.cloudflareStreamId);

        if (videoDetails.readyToStream) {
          // Update to ready status
          const updatedRecording = await recordingRepository.updateRecordingStatus(
            recordingId,
            expertId,
            'ready',
            {
              cloudflarePlaybackUrl: videoDetails.playback?.hls,
              thumbnailUrl: cloudflareStream.getThumbnailUrl(recording.cloudflareStreamId),
              processedAt: new Date().toISOString(),
            }
          );

          if (updatedRecording) {
            return NextResponse.json({
              success: true,
              data: updatedRecording,
            } as ApiResponse<Recording>);
          }
        } else if (videoDetails.status.state === 'error') {
          // Update to failed status
          await recordingRepository.updateRecordingStatus(recordingId, expertId, 'failed', {
            statusMessage: videoDetails.status.errorReasonText || 'Video processing failed',
          });
        }
      } catch (cfError) {
        console.error('[DBG][recordings/[recordingId]/route.ts] Cloudflare check error:', cfError);
      }
    }

    console.log('[DBG][recordings/[recordingId]/route.ts] Found recording:', recordingId);
    return NextResponse.json({
      success: true,
      data: recording,
    } as ApiResponse<Recording>);
  } catch (error) {
    console.error('[DBG][recordings/[recordingId]/route.ts] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get recording',
      } as ApiResponse<Recording>,
      { status: 500 }
    );
  }
}

/**
 * PATCH /data/app/expert/me/recordings/[recordingId]
 * Update recording metadata (title, description, course linking)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { recordingId } = await params;
  console.log('[DBG][recordings/[recordingId]/route.ts] PATCH called:', recordingId);

  try {
    // Require authentication
    const session = await getSessionFromCookies();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as ApiResponse<Recording>,
        { status: 401 }
      );
    }

    // Get user from DynamoDB
    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' } as ApiResponse<Recording>,
        { status: 404 }
      );
    }

    // Check if user is an expert
    const isExpert = Array.isArray(user.role)
      ? user.role.includes('expert')
      : user.role === 'expert';
    if (!isExpert || !user.expertProfile) {
      return NextResponse.json(
        { success: false, error: 'User is not an expert' } as ApiResponse<Recording>,
        { status: 403 }
      );
    }

    const expertId = user.expertProfile;

    // Parse request body
    const body = await request.json();
    const updates: {
      title?: string;
      description?: string;
      courseId?: string;
      lessonId?: string;
    } = {};

    if (typeof body.title === 'string') {
      updates.title = body.title.trim();
    }
    if (typeof body.description === 'string') {
      updates.description = body.description.trim();
    }
    if (typeof body.courseId === 'string' || body.courseId === null) {
      updates.courseId = body.courseId;
    }
    if (typeof body.lessonId === 'string' || body.lessonId === null) {
      updates.lessonId = body.lessonId;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid updates provided' } as ApiResponse<Recording>,
        { status: 400 }
      );
    }

    // Update recording
    const updatedRecording = await recordingRepository.updateRecording(
      recordingId,
      expertId,
      updates
    );

    if (!updatedRecording) {
      return NextResponse.json(
        { success: false, error: 'Recording not found' } as ApiResponse<Recording>,
        { status: 404 }
      );
    }

    console.log('[DBG][recordings/[recordingId]/route.ts] Updated recording:', recordingId);
    return NextResponse.json({
      success: true,
      data: updatedRecording,
    } as ApiResponse<Recording>);
  } catch (error) {
    console.error('[DBG][recordings/[recordingId]/route.ts] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update recording',
      } as ApiResponse<Recording>,
      { status: 500 }
    );
  }
}

/**
 * DELETE /data/app/expert/me/recordings/[recordingId]
 * Delete a recording (also deletes from Cloudflare Stream or 100ms)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { recordingId } = await params;
  console.log('[DBG][recordings/[recordingId]/route.ts] DELETE called:', recordingId);

  try {
    // Require authentication
    const session = await getSessionFromCookies();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json({ success: false, error: 'Unauthorized' } as ApiResponse<null>, {
        status: 401,
      });
    }

    // Get user from DynamoDB
    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' } as ApiResponse<null>, {
        status: 404,
      });
    }

    // Check if user is an expert
    const isExpert = Array.isArray(user.role)
      ? user.role.includes('expert')
      : user.role === 'expert';
    if (!isExpert || !user.expertProfile) {
      return NextResponse.json(
        { success: false, error: 'User is not an expert' } as ApiResponse<null>,
        { status: 403 }
      );
    }

    const expertId = user.expertProfile;

    // Check if this is a 100ms recording (not stored in DynamoDB)
    // 100ms asset IDs are UUIDs, check URL param for hms asset
    const url = new URL(request.url);
    const isHmsRecording = url.searchParams.get('source') === 'live';

    if (isHmsRecording) {
      // Delete from 100ms directly
      try {
        await deleteHmsRecordingAsset(recordingId);
        console.log('[DBG][recordings/[recordingId]/route.ts] Deleted from 100ms:', recordingId);
        return NextResponse.json({
          success: true,
          data: null,
        } as ApiResponse<null>);
      } catch (hmsError) {
        console.error('[DBG][recordings/[recordingId]/route.ts] 100ms delete error:', hmsError);
        return NextResponse.json(
          {
            success: false,
            error: hmsError instanceof Error ? hmsError.message : 'Failed to delete recording',
          } as ApiResponse<null>,
          { status: 500 }
        );
      }
    }

    // Get recording first to get Cloudflare Stream ID (for DB-stored recordings)
    const recording = await recordingRepository.getRecordingById(recordingId, expertId);

    if (!recording) {
      // If not found in DB, try to delete from 100ms as fallback
      try {
        await deleteHmsRecordingAsset(recordingId);
        console.log(
          '[DBG][recordings/[recordingId]/route.ts] Deleted from 100ms (fallback):',
          recordingId
        );
        return NextResponse.json({
          success: true,
          data: null,
        } as ApiResponse<null>);
      } catch {
        return NextResponse.json(
          { success: false, error: 'Recording not found' } as ApiResponse<null>,
          { status: 404 }
        );
      }
    }

    // Delete from Cloudflare Stream if exists
    if (recording.cloudflareStreamId) {
      try {
        await cloudflareStream.deleteVideo(recording.cloudflareStreamId);
        console.log(
          '[DBG][recordings/[recordingId]/route.ts] Deleted from Cloudflare:',
          recording.cloudflareStreamId
        );
      } catch (cfError) {
        console.error('[DBG][recordings/[recordingId]/route.ts] Cloudflare delete error:', cfError);
        // Continue with DynamoDB deletion even if Cloudflare fails
      }
    }

    // Delete from 100ms if it's a live recording with hmsAssetId
    if (recording.hmsAssetId) {
      try {
        await deleteHmsRecordingAsset(recording.hmsAssetId);
        console.log(
          '[DBG][recordings/[recordingId]/route.ts] Deleted from 100ms:',
          recording.hmsAssetId
        );
      } catch (hmsError) {
        console.error('[DBG][recordings/[recordingId]/route.ts] 100ms delete error:', hmsError);
        // Continue with DynamoDB deletion even if 100ms fails
      }
    }

    // Delete from DynamoDB
    const deleted = await recordingRepository.deleteRecording(recordingId, expertId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete recording' } as ApiResponse<null>,
        { status: 500 }
      );
    }

    console.log('[DBG][recordings/[recordingId]/route.ts] Deleted recording:', recordingId);
    return NextResponse.json({
      success: true,
      data: null,
    } as ApiResponse<null>);
  } catch (error) {
    console.error('[DBG][recordings/[recordingId]/route.ts] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete recording',
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
