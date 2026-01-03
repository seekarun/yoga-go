/**
 * Mark All Notifications as Read
 * POST /data/app/expert/me/notifications/read-all
 *
 * Supports dual auth: cookies (web) or Bearer token (mobile)
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireExpertAuthDual } from '@/lib/auth';
import { markAllAsRead } from '@/lib/repositories/notificationRepository';
import type { ApiResponse } from '@/types';

export async function POST(request: NextRequest) {
  try {
    console.log('[DBG][notifications/read-all] POST called');

    // Require expert authentication (supports both cookies and Bearer token)
    const { user, session } = await requireExpertAuthDual(request);
    console.log('[DBG][notifications/read-all] Authenticated via', session.authType);

    if (!user.expertProfile) {
      console.log('[DBG][notifications/read-all] Expert profile not found');
      return NextResponse.json(
        { success: false, error: 'Expert profile not found' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    // Mark all notifications as read
    const count = await markAllAsRead(user.expertProfile);

    console.log('[DBG][notifications/read-all] Marked', count, 'notifications as read');

    return NextResponse.json({
      success: true,
      message: `${count} notifications marked as read`,
      data: { count },
    } as ApiResponse<{ count: number }>);
  } catch (error) {
    console.error('[DBG][notifications/read-all] Error:', error);

    // Handle auth errors with appropriate status
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to mark notifications as read';
    const status =
      errorMessage === 'Unauthorized' ? 401 : errorMessage.includes('Forbidden') ? 403 : 500;

    return NextResponse.json({ success: false, error: errorMessage } as ApiResponse<null>, {
      status,
    });
  }
}
