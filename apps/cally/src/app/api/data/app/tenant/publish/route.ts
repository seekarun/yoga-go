/**
 * POST /api/data/app/tenant/publish
 * Publish landing page (copy draft to published)
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  publishLandingPage,
} from "@/lib/repositories/tenantRepository";

export async function POST() {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const cognitoSub = session.user.cognitoSub;
    console.log("[DBG][publish] Publishing landing page for user:", cognitoSub);

    // Get tenant by user ID
    const tenant = await getTenantByUserId(cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    // Publish landing page
    const updatedTenant = await publishLandingPage(tenant.id);

    console.log("[DBG][publish] Published landing page for tenant:", tenant.id);

    return NextResponse.json({
      success: true,
      data: {
        id: updatedTenant.id,
        customLandingPage: updatedTenant.customLandingPage,
        isLandingPagePublished: updatedTenant.isLandingPagePublished,
        updatedAt: updatedTenant.updatedAt,
      },
    });
  } catch (error) {
    console.error("[DBG][publish] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
