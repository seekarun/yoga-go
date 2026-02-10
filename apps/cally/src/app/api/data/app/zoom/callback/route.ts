/**
 * GET /api/data/app/zoom/callback
 * Handles Zoom OAuth callback — exchanges code for tokens, stores config on tenant
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  updateTenant,
} from "@/lib/repositories/tenantRepository";
import { exchangeZoomCodeForTokens, fetchZoomUserEmail } from "@/lib/zoom";
import type { ZoomConfig } from "@/types/zoom";

const getBaseUrl = () => process.env.NEXTAUTH_URL || "http://localhost:3113";

export async function GET(request: NextRequest) {
  console.log("[DBG][zoom/callback] GET called");

  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.redirect(new URL("/auth/signin", getBaseUrl()));
    }

    const tenant = await getTenantByUserId(session.user.cognitoSub);
    if (!tenant) {
      return NextResponse.redirect(new URL("/auth/signin", getBaseUrl()));
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      console.error("[DBG][zoom/callback] OAuth error:", error);
      return NextResponse.redirect(
        new URL(
          `/srv/${tenant.id}/settings/zoom?error=${encodeURIComponent(error)}`,
          getBaseUrl(),
        ),
      );
    }

    if (!code || !state) {
      console.error("[DBG][zoom/callback] Missing code or state");
      return NextResponse.redirect(
        new URL(
          `/srv/${tenant.id}/settings/zoom?error=missing_params`,
          getBaseUrl(),
        ),
      );
    }

    // Validate state
    const stateData = JSON.parse(Buffer.from(state, "base64").toString("utf8"));
    if (stateData.tenantId !== tenant.id) {
      console.error("[DBG][zoom/callback] State mismatch");
      return NextResponse.redirect(
        new URL(
          `/srv/${tenant.id}/settings/zoom?error=state_mismatch`,
          getBaseUrl(),
        ),
      );
    }

    // Exchange code for tokens
    const { accessToken, refreshToken, tokenExpiry } =
      await exchangeZoomCodeForTokens(code);

    // Fetch Zoom user email
    const email = await fetchZoomUserEmail(accessToken);

    // Store config on tenant
    const zoomConfig: ZoomConfig = {
      accessToken,
      refreshToken,
      tokenExpiry,
      email,
      connectedAt: new Date().toISOString(),
    };

    await updateTenant(tenant.id, { zoomConfig });

    console.log("[DBG][zoom/callback] Connected Zoom for:", email);

    return NextResponse.redirect(
      new URL(`/srv/${tenant.id}/settings/zoom?connected=true`, getBaseUrl()),
    );
  } catch (error) {
    console.error("[DBG][zoom/callback] Error:", error);

    // Try to redirect to settings with error
    try {
      const session = await auth();
      if (session?.user?.cognitoSub) {
        const tenant = await getTenantByUserId(session.user.cognitoSub);
        if (tenant) {
          return NextResponse.redirect(
            new URL(
              `/srv/${tenant.id}/settings/zoom?error=connection_failed`,
              getBaseUrl(),
            ),
          );
        }
      }
    } catch {
      // Fallback
    }

    return NextResponse.json(
      { success: false, error: "Failed to connect Zoom" },
      { status: 500 },
    );
  }
}
