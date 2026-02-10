/**
 * POST /api/data/app/google-calendar/disconnect
 * Revokes Google OAuth token and removes config from tenant
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  removeGoogleCalendarConfig,
} from "@/lib/repositories/tenantRepository";
import { revokeGoogleToken } from "@/lib/google-calendar";

export async function POST() {
  console.log("[DBG][google-calendar/disconnect] POST called");

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

    // Revoke the token (best-effort)
    await revokeGoogleToken(tenant.googleCalendarConfig.accessToken);

    // Remove config from tenant using DynamoDB REMOVE
    await removeGoogleCalendarConfig(tenant.id);

    console.log(
      "[DBG][google-calendar/disconnect] Disconnected for tenant:",
      tenant.id,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DBG][google-calendar/disconnect] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to disconnect Google Calendar" },
      { status: 500 },
    );
  }
}
