/**
 * Admin Inbox API Routes
 * GET /data/admn/inbox - List platform emails with pagination and filters
 */

import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';
import { getEmailsByExpert, getUnreadCount } from '@/lib/repositories/emailRepository';
import type { ApiResponse, EmailListResult, EmailFilters } from '@/types';

const ADMIN_INBOX_ID = 'ADMIN';

export async function GET(request: Request) {
  try {
    console.log('[DBG][admn/inbox] GET called');

    // Require admin authentication
    await requireAdminAuth();

    // Parse query parameters
    const url = new URL(request.url);
    const filters: EmailFilters = {
      unreadOnly: url.searchParams.get('unreadOnly') === 'true',
      starredOnly: url.searchParams.get('starredOnly') === 'true',
      search: url.searchParams.get('search') || undefined,
      limit: parseInt(url.searchParams.get('limit') || '20', 10),
      lastKey: url.searchParams.get('lastKey') || undefined,
    };

    console.log('[DBG][admn/inbox] Fetching emails with filters:', filters);

    // Get emails using ADMIN as the expertId
    const result = await getEmailsByExpert(ADMIN_INBOX_ID, filters);

    // Get total unread count
    const totalUnreadCount = await getUnreadCount(ADMIN_INBOX_ID);

    const response: EmailListResult = {
      emails: result.emails,
      totalCount: result.totalCount,
      unreadCount: totalUnreadCount,
      lastKey: result.lastKey,
    };

    console.log(
      '[DBG][admn/inbox] Found',
      result.emails.length,
      'emails, unread:',
      totalUnreadCount
    );

    return NextResponse.json({
      success: true,
      data: response,
    } as ApiResponse<EmailListResult>);
  } catch (error) {
    console.error('[DBG][admn/inbox] Error:', error);

    // Check if it's an auth error
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' } as ApiResponse<null>,
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch inbox' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
