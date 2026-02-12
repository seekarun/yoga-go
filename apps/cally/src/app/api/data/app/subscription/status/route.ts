/**
 * GET /api/data/app/subscription/status
 * Authenticated — returns tenant's subscription config or { hasSubscription: false }
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";

export async function GET() {
  console.log("[DBG][subscription/status] GET called");

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

    if (!tenant.subscriptionConfig?.subscriptionId) {
      return NextResponse.json({
        success: true,
        data: { hasSubscription: false },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        hasSubscription: true,
        ...tenant.subscriptionConfig,
      },
    });
  } catch (error) {
    console.error("[DBG][subscription/status] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get subscription status" },
      { status: 500 },
    );
  }
}
