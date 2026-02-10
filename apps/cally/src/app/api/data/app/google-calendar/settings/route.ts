/**
 * PUT /api/data/app/google-calendar/settings
 * Updates Google Calendar preferences (e.g., blockBookingSlots)
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  updateTenant,
} from "@/lib/repositories/tenantRepository";

export async function PUT(request: Request) {
  console.log("[DBG][google-calendar/settings] PUT called");

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

    if (!tenant.googleCalendarConfig) {
      return NextResponse.json(
        { success: false, error: "Google Calendar is not connected" },
        { status: 400 },
      );
    }

    const body = await request.json();

    const updatedConfig = {
      ...tenant.googleCalendarConfig,
    };

    if (typeof body.blockBookingSlots === "boolean") {
      updatedConfig.blockBookingSlots = body.blockBookingSlots;
    }
    if (typeof body.autoAddMeetLink === "boolean") {
      updatedConfig.autoAddMeetLink = body.autoAddMeetLink;
    }

    await updateTenant(tenant.id, {
      googleCalendarConfig: updatedConfig,
    });

    console.log(
      "[DBG][google-calendar/settings] Updated settings for tenant:",
      tenant.id,
    );

    return NextResponse.json({
      success: true,
      data: {
        blockBookingSlots: updatedConfig.blockBookingSlots,
        autoAddMeetLink: updatedConfig.autoAddMeetLink,
      },
    });
  } catch (error) {
    console.error("[DBG][google-calendar/settings] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update settings" },
      { status: 500 },
    );
  }
}
