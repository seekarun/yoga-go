/**
 * POST /api/data/app/notifications/read-all
 * Mark all notifications as read for the authenticated tenant
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { ApiResponse } from "@/types";
import { auth } from "@/auth";
import { getMobileAuthResult } from "@/lib/mobile-auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import * as notificationRepo from "@/lib/repositories/notificationRepository";

export async function POST(request: NextRequest) {
  console.log("[DBG][notifications] POST read-all called");

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

    const count = await notificationRepo.markAllAsRead(tenant.id);

    console.log(
      `[DBG][notifications] Marked ${count} notifications as read for tenant ${tenant.id}`,
    );

    return NextResponse.json<ApiResponse<{ count: number }>>({
      success: true,
      data: { count },
    });
  } catch (error) {
    console.error("[DBG][notifications] Error marking all as read:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to mark all notifications as read",
      },
      { status: 500 },
    );
  }
}
