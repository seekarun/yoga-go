/**
 * POST /api/data/app/subscription/portal
 * Authenticated — creates Stripe Customer Portal session, returns portalUrl
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import { createCustomerPortalSession } from "@/lib/stripe";

export async function POST() {
  console.log("[DBG][subscription/portal] POST called");

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

    const customerId = tenant.subscriptionConfig?.customerId;
    if (!customerId) {
      return NextResponse.json(
        { success: false, error: "No subscription found" },
        { status: 400 },
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://proj-cally.vercel.app";
    const portalSession = await createCustomerPortalSession({
      customerId,
      returnUrl: `${baseUrl}/srv/${tenant.id}/settings/subscription`,
    });

    return NextResponse.json({
      success: true,
      data: { portalUrl: portalSession.url },
    });
  } catch (error) {
    console.error("[DBG][subscription/portal] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create portal session" },
      { status: 500 },
    );
  }
}
