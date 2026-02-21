/**
 * GET /api/data/app/notifications
 * List notifications for the authenticated tenant
 *
 * Query params: limit, lastKey, unreadOnly
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { ApiResponse } from "@/types";
import type { NotificationListResult } from "@/lib/repositories/notificationRepository";
import { auth } from "@/auth";
import { getMobileAuthResult } from "@/lib/mobile-auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import * as notificationRepo from "@/lib/repositories/notificationRepository";

export async function GET(request: NextRequest) {
  console.log("[DBG][notifications] GET called");

  try {
    const mobileAuth = await getMobileAuthResult(request);
    let cognitoSub: string | undefined;

    if (mobileAuth.session) {
      cognitoSub = mobileAuth.session.cognitoSub;
    } else if (mobileAuth.tokenExpired) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Token expired" },
        { status: 401 },
      );
    } else {
      const session = await auth();
      cognitoSub = session?.user?.cognitoSub;
    }

    if (!cognitoSub) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(cognitoSub);
    if (!tenant) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const lastKey = searchParams.get("lastKey") || undefined;
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const result = await notificationRepo.getNotifications(tenant.id, {
      limit,
      lastKey,
      unreadOnly,
    });

    console.log(
      `[DBG][notifications] Returning ${result.notifications.length} notifications (${result.unreadCount} unread) for tenant ${tenant.id}`,
    );

    return NextResponse.json<ApiResponse<NotificationListResult>>({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[DBG][notifications] Error:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch notifications",
      },
      { status: 500 },
    );
  }
}
