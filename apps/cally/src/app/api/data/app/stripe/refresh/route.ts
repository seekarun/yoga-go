/**
 * GET /api/data/app/stripe/refresh
 * Called when Stripe onboarding link expires — creates a new link and redirects
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import { createAccountLink } from "@/lib/stripe";

export async function GET() {
  console.log("[DBG][stripe/refresh] GET called");

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

    // Create a new account link for the existing account
    const accountLink = await createAccountLink(
      tenant.stripeConfig.accountId,
      tenant.id,
    );
    console.log("[DBG][stripe/refresh] Redirecting to new onboarding link");

    return NextResponse.redirect(accountLink.url);
  } catch (error) {
    console.error("[DBG][stripe/refresh] Error:", error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://cally.live";
    return NextResponse.redirect(
      `${baseUrl}/srv/settings?error=stripe_refresh_failed`,
    );
  }
}
