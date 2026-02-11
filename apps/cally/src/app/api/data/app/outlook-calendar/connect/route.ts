/**
 * GET /api/data/app/outlook-calendar/connect
 * Redirects to Microsoft OAuth consent screen for Calendar API access
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import { buildOutlookOAuthUrl } from "@/lib/outlook-calendar";

export async function GET() {
  console.log("[DBG][outlook-calendar/connect] GET called");

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

    const url = buildOutlookOAuthUrl(tenant.id);
    console.log(
      "[DBG][outlook-calendar/connect] Redirecting to Microsoft OAuth",
    );
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("[DBG][outlook-calendar/connect] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to initiate Microsoft OAuth" },
      { status: 500 },
    );
  }
}
