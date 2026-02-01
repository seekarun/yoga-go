import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  getProcessingVideos,
  updateVideoStatuses,
  type VideoStatusUpdate,
} from '@/lib/repositories/videoStatusRepository';

/**
 * GET /api/cron/check-video-status
 *
 * Vercel Cron job that checks all videos in 'uploading' or 'processing' status
 * and updates them based on Cloudflare Stream API response.
 *
 * Runs every 5 minutes via Vercel Cron.
 */
export async function GET(request: NextRequest) {
  console.log('[DBG][cron-check-video-status] Cron job started');

  // Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // In production, require authorization
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.error('[DBG][cron-check-video-status] Unauthorized request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const cfToken = process.env.CF_TOKEN;
    const cfAccountId = process.env.CF_ACCOUNT_ID;

    if (!cfToken || !cfAccountId) {
      console.error('[DBG][cron-check-video-status] Missing Cloudflare credentials');
      return NextResponse.json(
        { success: false, error: 'Cloudflare credentials not configured' },
        { status: 500 }
      );
    }

    // Get all videos in processing/uploading state
    const { lessons, courses, experts } = await getProcessingVideos();
    const allVideos = [...lessons, ...courses, ...experts];

    console.log('[DBG][cron-check-video-status] Found', allVideos.length, 'videos to check');

    if (allVideos.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No videos to check',
        checked: 0,
        updated: 0,
      });
    }

    // Check status of each video
    const updates: VideoStatusUpdate[] = [];

    for (const video of allVideos) {
      try {
        const cfResponse = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/stream/${video.videoId}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${cfToken}`,
            },
          }
        );

        if (!cfResponse.ok) {
          console.error(
            '[DBG][cron-check-video-status] Failed to fetch video:',
            video.videoId,
            cfResponse.status
          );
          continue;
        }

        const data = await cfResponse.json();
        const cfVideo = data.result;
        const cfStatus = cfVideo?.status?.state;
        const readyToStream = cfVideo?.readyToStream;

        console.log('[DBG][cron-check-video-status] Video:', video.videoId, 'CF status:', cfStatus);

        // Determine new status
        let newStatus: VideoStatusUpdate['status'] | null = null;

        if (readyToStream || cfStatus === 'ready') {
          newStatus = 'ready';
        } else if (cfStatus === 'error') {
          newStatus = 'error';
        } else if (cfStatus === 'inprogress' || cfStatus === 'pendingupload') {
          // Still processing, keep as 'processing'
          if (video.status === 'uploading') {
            newStatus = 'processing';
          }
        }

        // Only update if status changed
        if (newStatus && newStatus !== video.status) {
          updates.push({
            entityType: video.entityType,
            entityId: video.entityId,
            parentId: video.parentId,
            status: newStatus,
            duration: cfVideo?.duration,
            errorReason: cfVideo?.status?.errorReasonText,
          });
        }
      } catch (err) {
        console.error('[DBG][cron-check-video-status] Error checking video:', video.videoId, err);
      }
    }

    // Apply updates
    let updatedCount = 0;
    if (updates.length > 0) {
      const result = await updateVideoStatuses(updates);
      updatedCount = result.success;
      console.log('[DBG][cron-check-video-status] Updated', updatedCount, 'videos');
    }

    return NextResponse.json({
      success: true,
      message: `Checked ${allVideos.length} videos, updated ${updatedCount}`,
      checked: allVideos.length,
      updated: updatedCount,
      details: {
        lessons: lessons.length,
        courses: courses.length,
        experts: experts.length,
      },
    });
  } catch (error) {
    console.error('[DBG][cron-check-video-status] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
