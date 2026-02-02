/**
 * GET /api/data/tenants/[tenantId]
 * Public endpoint to get tenant data with landing page for public viewing
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantById } from "@/lib/repositories/tenantRepository";

interface RouteParams {
  params: Promise<{
    tenantId: string;
  }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await params;

    console.log("[DBG][tenants/tenantId] Fetching public tenant:", tenantId);

    const tenant = await getTenantById(tenantId);

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    // Return public tenant data (excluding draft)
    const publicTenant = {
      id: tenant.id,
      name: tenant.name,
      avatar: tenant.avatar,
      landingPage: tenant.customLandingPage,
      isLandingPagePublished: tenant.isLandingPagePublished,
    };

    return NextResponse.json({ success: true, data: publicTenant });
  } catch (error) {
    console.error("[DBG][tenants/tenantId] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
