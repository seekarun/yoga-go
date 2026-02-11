/**
 * PUT /api/data/app/outlook-calendar/settings
 * Updates Outlook Calendar preferences (e.g., blockBookingSlots)
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  updateTenant,
} from "@/lib/repositories/tenantRepository";

export async function PUT(request: Request) {
  console.log("[DBG][outlook-calendar/settings] PUT called");

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

    if (!tenant.outlookCalendarConfig) {
      return NextResponse.json(
        { success: false, error: "Outlook Calendar is not connected" },
        { status: 400 },
      );
    }

    const body = await request.json();

    const updatedConfig = {
      ...tenant.outlookCalendarConfig,
    };

    if (typeof body.blockBookingSlots === "boolean") {
      updatedConfig.blockBookingSlots = body.blockBookingSlots;
    }
    if (typeof body.pushEvents === "boolean") {
      updatedConfig.pushEvents = body.pushEvents;
    }

    await updateTenant(tenant.id, {
      outlookCalendarConfig: updatedConfig,
    });

    console.log(
      "[DBG][outlook-calendar/settings] Updated settings for tenant:",
      tenant.id,
    );

    return NextResponse.json({
      success: true,
      data: {
        blockBookingSlots: updatedConfig.blockBookingSlots,
        pushEvents: updatedConfig.pushEvents,
      },
    });
  } catch (error) {
    console.error("[DBG][outlook-calendar/settings] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update settings" },
      { status: 500 },
    );
  }
}
