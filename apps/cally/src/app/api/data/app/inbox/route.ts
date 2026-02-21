/**
 * GET /api/data/app/inbox
 * Get emails for the authenticated user's tenant
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getMobileAuthResult } from "@/lib/mobile-auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import {
  getEmailsByTenant,
  getUnreadCount,
} from "@/lib/repositories/emailRepository";
import type { Email, EmailWithThread } from "@/types";

/**
 * Group emails by thread, returning thread roots with metadata
 */
function groupEmailsByThread(emails: Email[]): EmailWithThread[] {
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

  const threadRoots: EmailWithThread[] = [];

  for (const [threadId, threadEmails] of threadMap) {
    threadEmails.sort(
      (a, b) =>
        new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime(),
    );

    const root = threadEmails.find((e) => e.id === threadId);

    if (root) {
      const threadCount = threadEmails.length;
      const threadHasUnread = threadEmails.some(
        (e) => !e.isRead && !e.isOutgoing,
      );
      const latestEmail = threadEmails[threadEmails.length - 1];

      threadRoots.push({
        ...root,
        threadCount,
        threadHasUnread,
        threadLatestAt: latestEmail.receivedAt,
        threadMessages: threadEmails,
      });
    } else {
      for (const email of threadEmails) {
        standalone.push(email);
      }
    }
  }

  const result: EmailWithThread[] = [...threadRoots, ...standalone];
  result.sort((a, b) => {
    const aTime = new Date(a.threadLatestAt || a.receivedAt).getTime();
    const bTime = new Date(b.threadLatestAt || b.receivedAt).getTime();
    return bTime - aTime;
  });

  return result;
}

export async function GET(request: NextRequest) {
  try {
    // Check auth — try Bearer token first (mobile), fall back to cookie (web)
    let cognitoSub: string | undefined;

    const mobileAuth = await getMobileAuthResult(request);
    if (mobileAuth.session) {
      cognitoSub = mobileAuth.session.cognitoSub;
    } else if (!mobileAuth.tokenExpired) {
      const session = await auth();
      cognitoSub = session?.user?.cognitoSub;
    }

    if (!cognitoSub) {
      return NextResponse.json(
        {
          success: false,
          error: mobileAuth.tokenExpired
            ? "Token expired"
            : "Not authenticated",
        },
        { status: 401 },
      );
    }
    console.log("[DBG][inbox] Getting emails for user:", cognitoSub);

    // Get tenant for this user
    const tenant = await getTenantByUserId(cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const starredOnly = searchParams.get("starredOnly") === "true";
    const search = searchParams.get("search") || undefined;
    const lastKey = searchParams.get("lastKey") || undefined;
    const folder =
      (searchParams.get("folder") as
        | "inbox"
        | "sent"
        | "trash"
        | "archive"
        | null) || undefined;
    const labelId = searchParams.get("labelId") || undefined;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    const hasAttachment =
      searchParams.get("hasAttachment") === "true" ? true : undefined;
    const after = searchParams.get("after") || undefined;
    const before = searchParams.get("before") || undefined;

    const result = await getEmailsByTenant(tenant.id, {
      limit,
      unreadOnly,
      starredOnly,
      search,
      lastKey,
      folder,
      labelId,
      from,
      to,
      hasAttachment,
      after,
      before,
    });

    // Get total unread count (separate from filtered/paginated results)
    const totalUnreadCount = await getUnreadCount(tenant.id);

    // Group emails by thread
    const groupedEmails = groupEmailsByThread(result.emails);

    console.log(
      "[DBG][inbox] Found",
      result.emails.length,
      "emails in",
      groupedEmails.length,
      "threads/items, unread:",
      totalUnreadCount,
    );

    return NextResponse.json({
      success: true,
      data: {
        emails: groupedEmails,
        totalCount: groupedEmails.length,
        unreadCount: totalUnreadCount,
        lastKey: result.lastKey,
      },
    });
  } catch (error) {
    console.error("[DBG][inbox] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
