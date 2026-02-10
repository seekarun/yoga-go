/**
 * GET /api/data/app/google-calendar/status
 * Returns Google Calendar connection status
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";

export async function GET() {
  console.log("[DBG][google-calendar/status] GET called");

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

    const config = tenant.googleCalendarConfig;

    return NextResponse.json({
      success: true,
      data: {
        connected: !!config,
        email: config?.email || null,
        blockBookingSlots: config?.blockBookingSlots ?? true,
        autoAddMeetLink: config?.autoAddMeetLink ?? false,
        connectedAt: config?.connectedAt || null,
      },
    });
  } catch (error) {
    console.error("[DBG][google-calendar/status] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get status" },
      { status: 500 },
    );
  }
}
