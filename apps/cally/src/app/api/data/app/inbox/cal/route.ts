/**
 * GET /api/data/app/inbox/cal
 * Get AI assistant inbox emails for the authenticated user's tenant
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
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
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const cognitoSub = session.user.cognitoSub;
    console.log(
      "[DBG][inbox/cal] Getting AI inbox emails for user:",
      cognitoSub,
    );

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

    const result = await getEmailsByTenant(
      tenant.id,
      { limit, unreadOnly, starredOnly, search, lastKey },
      "cal",
    );

    // Get total unread count for AI inbox
    const totalUnreadCount = await getUnreadCount(tenant.id, "cal");

    // Group emails by thread
    const groupedEmails = groupEmailsByThread(result.emails);

    console.log(
      "[DBG][inbox/cal] Found",
      result.emails.length,
      "AI inbox emails in",
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
    console.error("[DBG][inbox/cal] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
