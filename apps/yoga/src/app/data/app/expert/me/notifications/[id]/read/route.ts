/**
 * Mark Notification as Read
 * POST /data/app/expert/me/notifications/[id]/read
 *
 * Supports dual auth: cookies (web) or Bearer token (mobile)
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireExpertAuthDual } from '@/lib/auth';
import { markAsRead } from '@/lib/repositories/notificationRepository';
import type { ApiResponse } from '@/types';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: notificationId } = await params;
    console.log('[DBG][notifications/[id]/read] POST called for:', notificationId);

    // Require expert authentication (supports both cookies and Bearer token)
    const { user, session } = await requireExpertAuthDual(request);
    console.log('[DBG][notifications/[id]/read] Authenticated via', session.authType);

    if (!user.expertProfile) {
      console.log('[DBG][notifications/[id]/read] Expert profile not found');
      return NextResponse.json(
        { success: false, error: 'Expert profile not found' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    // Mark notification as read
    const success = await markAsRead(user.expertProfile, notificationId);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Notification not found' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    console.log('[DBG][notifications/[id]/read] Marked as read:', notificationId);

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read',
    } as ApiResponse<null>);
  } catch (error) {
    console.error('[DBG][notifications/[id]/read] Error:', error);

    // Handle auth errors with appropriate status
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to mark notification as read';
    const status =
      errorMessage === 'Unauthorized' ? 401 : errorMessage.includes('Forbidden') ? 403 : 500;

    return NextResponse.json({ success: false, error: errorMessage } as ApiResponse<null>, {
      status,
    });
  }
}
