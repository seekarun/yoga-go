/**
 * Expert Notifications API Routes
 * GET /data/app/expert/me/notifications - List notifications with pagination
 *
 * Supports dual auth: cookies (web) or Bearer token (mobile)
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireExpertAuthDual } from '@/lib/auth';
import {
  getNotificationsByRecipient,
  type NotificationFilters,
  type NotificationListResult,
} from '@/lib/repositories/notificationRepository';
import type { ApiResponse } from '@/types';

export async function GET(request: NextRequest) {
  try {
    console.log('[DBG][expert/me/notifications] GET called');

    // Require expert authentication (supports both cookies and Bearer token)
    const { user, session } = await requireExpertAuthDual(request);
    console.log('[DBG][expert/me/notifications] Authenticated via', session.authType);

    if (!user.expertProfile) {
      console.log('[DBG][expert/me/notifications] Expert profile not found');
      return NextResponse.json(
        { success: false, error: 'Expert profile not found' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const filters: NotificationFilters = {
      unreadOnly: url.searchParams.get('unreadOnly') === 'true',
      limit: parseInt(url.searchParams.get('limit') || '50', 10),
      lastKey: url.searchParams.get('lastKey') || undefined,
    };

    console.log('[DBG][expert/me/notifications] Fetching notifications with filters:', filters);

    // Get notifications
    const result = await getNotificationsByRecipient(user.expertProfile, filters);

    console.log(
      '[DBG][expert/me/notifications] Found',
      result.notifications.length,
      'notifications, unread:',
      result.unreadCount
    );

    return NextResponse.json({
      success: true,
      data: result,
    } as ApiResponse<NotificationListResult>);
  } catch (error) {
    console.error('[DBG][expert/me/notifications] Error:', error);

    // Handle auth errors with appropriate status
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch notifications';
    const status =
      errorMessage === 'Unauthorized' ? 401 : errorMessage.includes('Forbidden') ? 403 : 500;

    return NextResponse.json({ success: false, error: errorMessage } as ApiResponse<null>, {
      status,
    });
  }
}
