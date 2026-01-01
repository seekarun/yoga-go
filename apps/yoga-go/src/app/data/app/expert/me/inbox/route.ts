/**
 * Expert Inbox API Routes
 * GET /data/app/expert/me/inbox - List emails with pagination and filters
 */

import { NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth';
import { getUserByCognitoSub } from '@/lib/repositories/userRepository';
import { getEmailsByExpert, getUnreadCount } from '@/lib/repositories/emailRepository';
import type { ApiResponse, EmailListResult, EmailFilters, Email, EmailWithThread } from '@/types';

/**
 * Group emails by thread, returning thread roots with metadata
 */
function groupEmailsByThread(emails: Email[]): EmailWithThread[] {
  // Separate emails into threads and standalone
  const threadMap = new Map<string, Email[]>();
  const standalone: Email[] = [];

  for (const email of emails) {
    if (email.threadId) {
      const existing = threadMap.get(email.threadId) || [];
      existing.push(email);
      threadMap.set(email.threadId, existing);
    } else {
      standalone.push(email);
    }
  }

  // Process threads - find root and add metadata
  const threadRoots: EmailWithThread[] = [];

  for (const [threadId, threadEmails] of threadMap) {
    // Sort by receivedAt (oldest first for thread display)
    threadEmails.sort(
      (a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime()
    );

    // Thread root is the email whose id matches threadId
    const root = threadEmails.find(e => e.id === threadId);

    if (root) {
      // Calculate thread metadata
      const threadCount = threadEmails.length;
      const threadHasUnread = threadEmails.some(e => !e.isRead && !e.isOutgoing);
      const latestEmail = threadEmails[threadEmails.length - 1];

      threadRoots.push({
        ...root,
        threadCount,
        threadHasUnread,
        threadLatestAt: latestEmail.receivedAt,
        threadMessages: threadEmails,
      });
    } else {
      // No root found (shouldn't happen), add all as standalone
      for (const email of threadEmails) {
        standalone.push(email);
      }
    }
  }

  // Combine and sort by latest activity (thread latest or standalone receivedAt)
  const result: EmailWithThread[] = [...threadRoots, ...standalone];
  result.sort((a, b) => {
    const aTime = new Date(a.threadLatestAt || a.receivedAt).getTime();
    const bTime = new Date(b.threadLatestAt || b.receivedAt).getTime();
    return bTime - aTime; // Most recent first
  });

  return result;
}

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

    // Group emails by thread
    const groupedEmails = groupEmailsByThread(result.emails);

    const response: EmailListResult = {
      emails: groupedEmails,
      totalCount: groupedEmails.length, // Count threads, not individual emails
      unreadCount: totalUnreadCount,
      lastKey: result.lastKey,
    };

    console.log(
      '[DBG][expert/me/inbox] Found',
      result.emails.length,
      'emails in',
      groupedEmails.length,
      'threads/items, unread:',
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
