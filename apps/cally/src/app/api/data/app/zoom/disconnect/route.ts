/**
 * POST /api/data/app/zoom/disconnect
 * Revokes Zoom OAuth token and removes config from tenant
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  removeZoomConfig,
  updateTenant,
} from "@/lib/repositories/tenantRepository";
import { revokeZoomToken } from "@/lib/zoom";

export async function POST() {
  console.log("[DBG][zoom/disconnect] POST called");

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

    if (!tenant.zoomConfig) {
      return NextResponse.json(
        { success: false, error: "Zoom is not connected" },
        { status: 400 },
      );
    }

    // Revoke the token (best-effort)
    await revokeZoomToken(tenant.zoomConfig.accessToken);

    // Remove config from tenant using DynamoDB REMOVE
    await removeZoomConfig(tenant.id);

    // If videoCallPreference was "zoom", reset to "cally"
    if (tenant.videoCallPreference === "zoom") {
      await updateTenant(tenant.id, { videoCallPreference: "cally" });
    }

    console.log("[DBG][zoom/disconnect] Disconnected for tenant:", tenant.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DBG][zoom/disconnect] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to disconnect Zoom" },
      { status: 500 },
    );
  }
}
