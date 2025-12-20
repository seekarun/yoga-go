/**
 * Expert Inbox API Routes
 * GET /data/app/expert/me/inbox - List emails with pagination and filters
 */

import { NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth';
import { getUserByCognitoSub } from '@/lib/repositories/userRepository';
import { getEmailsByExpert, getUnreadCount } from '@/lib/repositories/emailRepository';
import type { ApiResponse, EmailListResult, EmailFilters } from '@/types';

export async function GET(request: Request) {
  try {
    console.log('[DBG][expert/me/inbox] GET called');

    // Get session from cookies
    const session = await getSessionFromCookies();
    if (!session?.user?.cognitoSub) {
      console.log('[DBG][expert/me/inbox] No session found');
      return NextResponse.json({ success: false, error: 'Unauthorized' } as ApiResponse<null>, {
        status: 401,
      });
    }

    // Get user from database
    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user) {
      console.log('[DBG][expert/me/inbox] User not found');
      return NextResponse.json({ success: false, error: 'User not found' } as ApiResponse<null>, {
        status: 404,
      });
    }

    // Check if user is an expert
    const isExpert = Array.isArray(user.role)
      ? user.role.includes('expert')
      : user.role === 'expert';

    if (!isExpert || !user.expertProfile) {
      console.log('[DBG][expert/me/inbox] User is not an expert');
      return NextResponse.json(
        { success: false, error: 'Expert profile not found' } as ApiResponse<null>,
        { status: 403 }
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const filters: EmailFilters = {
      unreadOnly: url.searchParams.get('unreadOnly') === 'true',
      starredOnly: url.searchParams.get('starredOnly') === 'true',
      search: url.searchParams.get('search') || undefined,
      limit: parseInt(url.searchParams.get('limit') || '20', 10),
      lastKey: url.searchParams.get('lastKey') || undefined,
    };

    console.log('[DBG][expert/me/inbox] Fetching emails with filters:', filters);

    // Get emails
    const result = await getEmailsByExpert(user.expertProfile, filters);

    // Get total unread count (separate from filtered results)
    const totalUnreadCount = await getUnreadCount(user.expertProfile);

    const response: EmailListResult = {
      emails: result.emails,
      totalCount: result.totalCount,
      unreadCount: totalUnreadCount,
      lastKey: result.lastKey,
    };

    console.log(
      '[DBG][expert/me/inbox] Found',
      result.emails.length,
      'emails, unread:',
      totalUnreadCount
    );

    return NextResponse.json({
      success: true,
      data: response,
    } as ApiResponse<EmailListResult>);
  } catch (error) {
    console.error('[DBG][expert/me/inbox] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inbox' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
