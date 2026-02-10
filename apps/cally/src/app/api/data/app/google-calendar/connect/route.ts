/**
 * GET /api/data/app/google-calendar/connect
 * Redirects to Google OAuth consent screen for Calendar API access
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import { buildGoogleOAuthUrl } from "@/lib/google-calendar";

export async function GET() {
  console.log("[DBG][google-calendar/connect] GET called");

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

    const url = buildGoogleOAuthUrl(tenant.id);
    console.log("[DBG][google-calendar/connect] Redirecting to Google OAuth");
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("[DBG][google-calendar/connect] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to initiate Google OAuth" },
      { status: 500 },
    );
  }
}
