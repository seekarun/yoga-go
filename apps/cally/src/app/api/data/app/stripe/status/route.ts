/**
 * GET /api/data/app/stripe/status
 * Returns Stripe Connect connection status for the tenant
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";

export async function GET() {
  console.log("[DBG][stripe/status] GET called");

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

    const config = tenant.stripeConfig;

    return NextResponse.json({
      success: true,
      data: {
        connected: !!config,
        chargesEnabled: config?.chargesEnabled ?? false,
        detailsSubmitted: config?.detailsSubmitted ?? false,
        email: config?.email || null,
        connectedAt: config?.connectedAt || null,
      },
    });
  } catch (error) {
    console.error("[DBG][stripe/status] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get status" },
      { status: 500 },
    );
  }
}
