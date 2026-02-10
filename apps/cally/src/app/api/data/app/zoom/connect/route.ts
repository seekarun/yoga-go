/**
 * GET /api/data/app/zoom/connect
 * Redirects to Zoom OAuth consent screen
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import { buildZoomOAuthUrl } from "@/lib/zoom";

export async function GET() {
  console.log("[DBG][zoom/connect] GET called");

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

    const url = buildZoomOAuthUrl(tenant.id);
    console.log("[DBG][zoom/connect] Redirecting to Zoom OAuth");
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("[DBG][zoom/connect] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to initiate Zoom OAuth" },
      { status: 500 },
    );
  }
}
