/**
 * Admin Waitlist API Routes
 * GET /data/admn/waitlist - List all waitlist signups
 */

import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';
import { getAllWaitlistSignups } from '@/lib/repositories/waitlistRepository';
import type { ApiResponse } from '@/types';
import type { WaitlistSignup } from '@/lib/repositories/waitlistRepository';

export async function GET() {
  try {
    console.log('[DBG][admn/waitlist] GET called');

    // Require admin authentication
    await requireAdminAuth();

    // Get all waitlist signups
    const signups = await getAllWaitlistSignups();

    console.log('[DBG][admn/waitlist] Found', signups.length, 'waitlist signups');

    return NextResponse.json({
      success: true,
      data: {
        signups,
        totalCount: signups.length,
      },
    } as ApiResponse<{ signups: WaitlistSignup[]; totalCount: number }>);
  } catch (error) {
    console.error('[DBG][admn/waitlist] Error:', error);

    // Check if it's an auth error
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' } as ApiResponse<null>,
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch waitlist' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
