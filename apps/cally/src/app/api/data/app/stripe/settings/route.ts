/**
 * PUT /api/data/app/stripe/settings
 * Updates Stripe settings (application fee percent)
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  updateTenant,
} from "@/lib/repositories/tenantRepository";

export async function PUT(request: NextRequest) {
  console.log("[DBG][stripe/settings] PUT called");

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

    if (!tenant.stripeConfig) {
      return NextResponse.json(
        { success: false, error: "Stripe is not connected" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { applicationFeePercent } = body;

    // Validate applicationFeePercent
    if (
      typeof applicationFeePercent !== "number" ||
      applicationFeePercent < 0 ||
      applicationFeePercent > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "applicationFeePercent must be a number between 0 and 100",
        },
        { status: 400 },
      );
    }

    await updateTenant(tenant.id, {
      stripeConfig: {
        ...tenant.stripeConfig,
        applicationFeePercent,
      },
    });

    console.log(
      "[DBG][stripe/settings] Updated application fee to:",
      applicationFeePercent,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DBG][stripe/settings] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update Stripe settings" },
      { status: 500 },
    );
  }
}
