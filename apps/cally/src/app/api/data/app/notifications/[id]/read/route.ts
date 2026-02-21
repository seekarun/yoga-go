/**
 * POST /api/data/app/notifications/[id]/read
 * Mark a single notification as read
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { ApiResponse } from "@/types";
import { auth } from "@/auth";
import { getMobileAuthResult } from "@/lib/mobile-auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import * as notificationRepo from "@/lib/repositories/notificationRepository";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: notificationId } = await params;
  console.log("[DBG][notifications] POST read for:", notificationId);

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

    const success = await notificationRepo.markAsRead(
      tenant.id,
      notificationId,
    );

    if (!success) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Notification not found" },
        { status: 404 },
      );
    }

    return NextResponse.json<ApiResponse<{ marked: boolean }>>({
      success: true,
      data: { marked: true },
    });
  } catch (error) {
    console.error("[DBG][notifications] Error marking as read:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to mark notification as read",
      },
      { status: 500 },
    );
  }
}
