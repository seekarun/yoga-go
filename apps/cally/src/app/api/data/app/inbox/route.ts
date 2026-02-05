/**
 * GET /api/data/app/inbox
 * Get emails for the authenticated user's tenant
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import { getEmailsByTenant } from "@/lib/repositories/emailRepository";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const cognitoSub = session.user.cognitoSub;
    console.log("[DBG][inbox] Getting emails for user:", cognitoSub);

    // Get tenant for this user
    const tenant = await getTenantByUserId(cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const starredOnly = searchParams.get("starredOnly") === "true";
    const search = searchParams.get("search") || undefined;
    const lastKey = searchParams.get("lastKey") || undefined;

    const result = await getEmailsByTenant(tenant.id, {
      limit,
      unreadOnly,
      starredOnly,
      search,
      lastKey,
    });

    console.log(
      "[DBG][inbox] Found",
      result.emails.length,
      "emails for tenant:",
      tenant.id,
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[DBG][inbox] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
