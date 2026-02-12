/**
 * POST /api/data/app/stripe/disconnect
 * Removes Stripe config from tenant (does not delete the Stripe account)
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  removeStripeConfig,
} from "@/lib/repositories/tenantRepository";

export async function POST() {
  console.log("[DBG][stripe/disconnect] POST called");

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

    await removeStripeConfig(tenant.id);

    console.log(
      "[DBG][stripe/disconnect] Disconnected Stripe for tenant:",
      tenant.id,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DBG][stripe/disconnect] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to disconnect Stripe" },
      { status: 500 },
    );
  }
}
