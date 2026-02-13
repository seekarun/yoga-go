/**
 * POST /api/data/app/google-business/disconnect
 * Revokes Google OAuth token and removes config from tenant
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  removeGoogleBusinessConfig,
} from "@/lib/repositories/tenantRepository";
import { revokeGBPToken } from "@/lib/google-business";

export async function POST() {
  console.log("[DBG][google-business/disconnect] POST called");

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

    if (!tenant.googleBusinessConfig) {
      return NextResponse.json(
        { success: false, error: "Google Business Profile is not connected" },
        { status: 400 },
      );
    }

    // Revoke the token (best-effort)
    await revokeGBPToken(tenant.googleBusinessConfig.accessToken);

    // Remove config from tenant using DynamoDB REMOVE
    await removeGoogleBusinessConfig(tenant.id);

    console.log(
      "[DBG][google-business/disconnect] Disconnected for tenant:",
      tenant.id,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DBG][google-business/disconnect] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to disconnect Google Business Profile",
      },
      { status: 500 },
    );
  }
}
