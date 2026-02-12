/**
 * GET /api/data/app/stripe/callback
 * Return URL from Stripe onboarding — updates account status and redirects to settings
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  updateTenant,
} from "@/lib/repositories/tenantRepository";
import { getAccountStatus } from "@/lib/stripe";

export async function GET() {
  console.log("[DBG][stripe/callback] GET called");

  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://cally.live";
      return NextResponse.redirect(`${baseUrl}/auth/signin`);
    }

    const tenant = await getTenantByUserId(session.user.cognitoSub);
    if (!tenant || !tenant.stripeConfig?.accountId) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://cally.live";
      return NextResponse.redirect(
        `${baseUrl}/srv/${tenant?.id || ""}/settings?error=stripe_not_found`,
      );
    }

    // Check account status from Stripe
    const status = await getAccountStatus(tenant.stripeConfig.accountId);
    console.log("[DBG][stripe/callback] Account status:", status);

    // Update stripeConfig with latest status
    await updateTenant(tenant.id, {
      stripeConfig: {
        ...tenant.stripeConfig,
        chargesEnabled: status.chargesEnabled,
        detailsSubmitted: status.detailsSubmitted,
        email: status.email || tenant.stripeConfig.email,
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://cally.live";
    const queryParam =
      status.chargesEnabled && status.detailsSubmitted
        ? "connected=true"
        : "pending=true";

    return NextResponse.redirect(
      `${baseUrl}/srv/${tenant.id}/settings/stripe?${queryParam}`,
    );
  } catch (error) {
    console.error("[DBG][stripe/callback] Error:", error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://cally.live";
    return NextResponse.redirect(
      `${baseUrl}/srv/settings?error=stripe_callback_failed`,
    );
  }
}
