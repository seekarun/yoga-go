/**
 * POST /api/data/app/outlook-calendar/disconnect
 * Clears stored tokens and removes config from tenant
 *
 * Note: Microsoft doesn't have a direct token revocation endpoint,
 * so we just clear stored tokens.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  removeOutlookCalendarConfig,
} from "@/lib/repositories/tenantRepository";

export async function POST() {
  console.log("[DBG][outlook-calendar/disconnect] POST called");

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

    // Remove config from tenant using DynamoDB REMOVE
    await removeOutlookCalendarConfig(tenant.id);

    console.log(
      "[DBG][outlook-calendar/disconnect] Disconnected for tenant:",
      tenant.id,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DBG][outlook-calendar/disconnect] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to disconnect Outlook Calendar" },
      { status: 500 },
    );
  }
}
