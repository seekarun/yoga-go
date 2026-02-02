/**
 * PUT /api/data/app/tenant/landing-page
 * Update draft landing page (authenticated)
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  updateDraftLandingPage,
} from "@/lib/repositories/tenantRepository";
import type { SimpleLandingPageConfig } from "@/types/landing-page";

export async function PUT(request: NextRequest) {
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
    console.log(
      "[DBG][landing-page] Updating landing page for user:",
      cognitoSub,
    );

    // Get tenant by user ID
    const tenant = await getTenantByUserId(cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    // Parse request body
    const body = (await request.json()) as SimpleLandingPageConfig;

    // Update draft landing page
    const updatedTenant = await updateDraftLandingPage(tenant.id, body);

    console.log("[DBG][landing-page] Draft updated for tenant:", tenant.id);

    return NextResponse.json({
      success: true,
      data: {
        id: updatedTenant.id,
        draftLandingPage: updatedTenant.draftLandingPage,
        updatedAt: updatedTenant.updatedAt,
      },
    });
  } catch (error) {
    console.error("[DBG][landing-page] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[DBG][landing-page] Error message:", errorMessage);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${errorMessage}` },
      { status: 500 },
    );
  }
}

export async function GET() {
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
    console.log(
      "[DBG][landing-page] Getting landing page for user:",
      cognitoSub,
    );

    // Get tenant by user ID
    const tenant = await getTenantByUserId(cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: tenant.id,
        draftLandingPage: tenant.draftLandingPage,
        customLandingPage: tenant.customLandingPage,
        isLandingPagePublished: tenant.isLandingPagePublished,
      },
    });
  } catch (error) {
    console.error("[DBG][landing-page] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
