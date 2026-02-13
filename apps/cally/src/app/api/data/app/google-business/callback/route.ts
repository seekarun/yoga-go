/**
 * GET /api/data/app/google-business/callback
 * Handles Google OAuth callback — exchanges code for tokens, fetches account/location, stores config
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  updateTenant,
} from "@/lib/repositories/tenantRepository";
import {
  exchangeGBPCodeForTokens,
  fetchGBPUserEmail,
  listGBPAccounts,
  listGBPLocations,
} from "@/lib/google-business";
import type { GoogleBusinessConfig } from "@/types/google-business";

const getBaseUrl = () => process.env.NEXTAUTH_URL || "http://localhost:3113";

export async function GET(request: NextRequest) {
  console.log("[DBG][google-business/callback] GET called");

  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.redirect(new URL("/auth/signin", getBaseUrl()));
    }

    const tenant = await getTenantByUserId(session.user.cognitoSub);
    if (!tenant) {
      return NextResponse.redirect(new URL("/auth/signin", getBaseUrl()));
    }

    const settingsUrl = `/srv/${tenant.id}/settings/google-business`;
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      console.error("[DBG][google-business/callback] OAuth error:", error);
      return NextResponse.redirect(
        new URL(
          `${settingsUrl}?error=${encodeURIComponent(error)}`,
          getBaseUrl(),
        ),
      );
    }

    if (!code || !state) {
      console.error("[DBG][google-business/callback] Missing code or state");
      return NextResponse.redirect(
        new URL(`${settingsUrl}?error=missing_params`, getBaseUrl()),
      );
    }

    // Validate state
    const stateData = JSON.parse(Buffer.from(state, "base64").toString("utf8"));
    if (stateData.tenantId !== tenant.id) {
      console.error("[DBG][google-business/callback] State mismatch");
      return NextResponse.redirect(
        new URL(`${settingsUrl}?error=state_mismatch`, getBaseUrl()),
      );
    }

    // Exchange code for tokens
    const { accessToken, refreshToken, tokenExpiry } =
      await exchangeGBPCodeForTokens(code);

    // Fetch Google user email
    const email = await fetchGBPUserEmail(accessToken);

    // Build a temporary config for API calls
    const tempConfig: GoogleBusinessConfig = {
      accessToken,
      refreshToken,
      tokenExpiry,
      email,
      accountId: "",
      locationId: "",
      locationName: "",
      connectedAt: new Date().toISOString(),
    };

    // List accounts — pick first
    const { accounts, updatedConfig: configAfterAccounts } =
      await listGBPAccounts(tempConfig);

    if (accounts.length === 0) {
      console.error("[DBG][google-business/callback] No GBP accounts found");
      return NextResponse.redirect(
        new URL(`${settingsUrl}?error=no_accounts`, getBaseUrl()),
      );
    }

    const account = accounts[0];

    // List locations — pick first
    const { locations, updatedConfig: configAfterLocations } =
      await listGBPLocations(
        { ...configAfterAccounts, accountId: account.name },
        account.name,
      );

    if (locations.length === 0) {
      console.error("[DBG][google-business/callback] No locations found");
      return NextResponse.redirect(
        new URL(`${settingsUrl}?error=no_locations`, getBaseUrl()),
      );
    }

    const location = locations[0];

    // Store config on tenant
    const googleBusinessConfig: GoogleBusinessConfig = {
      accessToken: configAfterLocations.accessToken,
      refreshToken: configAfterLocations.refreshToken,
      tokenExpiry: configAfterLocations.tokenExpiry,
      email,
      accountId: account.name,
      locationId: location.name,
      locationName: location.title,
      connectedAt: new Date().toISOString(),
    };

    await updateTenant(tenant.id, { googleBusinessConfig });

    console.log(
      "[DBG][google-business/callback] Connected Google Business for:",
      email,
      "location:",
      location.title,
    );

    return NextResponse.redirect(
      new URL(`${settingsUrl}?connected=true`, getBaseUrl()),
    );
  } catch (error) {
    console.error("[DBG][google-business/callback] Error:", error);

    // Try to redirect to settings with error
    try {
      const session = await auth();
      if (session?.user?.cognitoSub) {
        const tenant = await getTenantByUserId(session.user.cognitoSub);
        if (tenant) {
          return NextResponse.redirect(
            new URL(
              `/srv/${tenant.id}/settings/google-business?error=connection_failed`,
              getBaseUrl(),
            ),
          );
        }
      }
    } catch {
      // Fallback
    }

    return NextResponse.json(
      { success: false, error: "Failed to connect Google Business Profile" },
      { status: 500 },
    );
  }
}
