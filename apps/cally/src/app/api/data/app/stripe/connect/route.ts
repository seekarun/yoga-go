/**
 * GET /api/data/app/stripe/connect
 * Starts Stripe Connect onboarding — creates an Express account and redirects to Stripe
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  updateTenant,
} from "@/lib/repositories/tenantRepository";
import { createConnectedAccount, createAccountLink } from "@/lib/stripe";

export async function GET() {
  console.log("[DBG][stripe/connect] GET called");

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

    // If already connected, redirect to refresh instead
    if (tenant.stripeConfig?.accountId) {
      console.log(
        "[DBG][stripe/connect] Tenant already has Stripe account, refreshing link",
      );
      const accountLink = await createAccountLink(
        tenant.stripeConfig.accountId,
        tenant.id,
      );
      return NextResponse.redirect(accountLink.url);
    }

    // Create new Express connected account
    const account = await createConnectedAccount(tenant.email);
    console.log("[DBG][stripe/connect] Created account:", account.id);

    // Store initial stripeConfig on tenant
    await updateTenant(tenant.id, {
      stripeConfig: {
        accountId: account.id,
        chargesEnabled: false,
        detailsSubmitted: false,
        email: tenant.email,
        applicationFeePercent: 0,
        connectedAt: new Date().toISOString(),
      },
    });

    // Create onboarding link and redirect
    const accountLink = await createAccountLink(account.id, tenant.id);
    console.log("[DBG][stripe/connect] Redirecting to Stripe onboarding");

    return NextResponse.redirect(accountLink.url);
  } catch (error) {
    console.error("[DBG][stripe/connect] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to start Stripe onboarding" },
      { status: 500 },
    );
  }
}
