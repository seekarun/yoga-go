import { NextResponse } from 'next/server';
import * as boostService from '@/lib/boost-service';

/**
 * GET /api/cron/sync-boost-metrics
 *
 * Cron job to sync metrics for all active boost campaigns from Meta Ads.
 * Should be called every 15-30 minutes via Vercel Cron or external scheduler.
 *
 * Security: Requires CRON_SECRET header for authentication
 */
export async function GET(request: Request) {
  console.log('[DBG][sync-boost-metrics] Cron job triggered');

  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.log('[DBG][sync-boost-metrics] Unauthorized - invalid cron secret');
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await boostService.syncAllActiveBoosts();

    console.log('[DBG][sync-boost-metrics] Sync complete:', result);

    return NextResponse.json({
      success: true,
      data: {
        synced: result.synced,
        errors: result.errors,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[DBG][sync-boost-metrics] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed',
      },
      { status: 500 }
    );
  }
}

/**
 * Configure Vercel Cron
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/sync-boost-metrics",
 *     "schedule": "0,15,30,45 * * * *"
 *   }]
 * }
 */
