/**
 * GET /api/data/app/google-business/connect
 * Redirects to Google OAuth consent screen for Business Profile API access
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import { buildGoogleBusinessOAuthUrl } from "@/lib/google-business";

export async function GET() {
  console.log("[DBG][google-business/connect] GET called");

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

    const url = buildGoogleBusinessOAuthUrl(tenant.id);
    console.log("[DBG][google-business/connect] Redirecting to Google OAuth");
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("[DBG][google-business/connect] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to initiate Google OAuth" },
      { status: 500 },
    );
  }
}
