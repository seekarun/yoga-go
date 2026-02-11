/**
 * GET /api/data/app/outlook-calendar/status
 * Returns Outlook Calendar connection status
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";

export async function GET() {
  console.log("[DBG][outlook-calendar/status] GET called");

  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(session.user.cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const config = tenant.outlookCalendarConfig;

    return NextResponse.json({
      success: true,
      data: {
        connected: !!config,
        email: config?.email || null,
        blockBookingSlots: config?.blockBookingSlots ?? true,
        pushEvents: config?.pushEvents ?? true,
        connectedAt: config?.connectedAt || null,
      },
    });
  } catch (error) {
    console.error("[DBG][outlook-calendar/status] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get status" },
      { status: 500 },
    );
  }
}
