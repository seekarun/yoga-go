/**
 * GET /api/data/app/google-calendar/callback
 * Handles Google OAuth callback — exchanges code for tokens, stores config on tenant
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  updateTenant,
} from "@/lib/repositories/tenantRepository";
import {
  exchangeCodeForTokens,
  fetchGoogleUserEmail,
} from "@/lib/google-calendar";
import type { GoogleCalendarConfig } from "@/types/google-calendar";

const getBaseUrl = () => process.env.NEXTAUTH_URL || "http://localhost:3113";

export async function GET(request: NextRequest) {
  console.log("[DBG][google-calendar/callback] GET called");

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
      console.error("[DBG][google-calendar/callback] OAuth error:", error);
      return NextResponse.redirect(
        new URL(
          `/srv/${tenant.id}/settings/google?error=${encodeURIComponent(error)}`,
          getBaseUrl(),
        ),
      );
    }

    if (!code || !state) {
      console.error("[DBG][google-calendar/callback] Missing code or state");
      return NextResponse.redirect(
        new URL(
          `/srv/${tenant.id}/settings/google?error=missing_params`,
          getBaseUrl(),
        ),
      );
    }

    // Validate state
    const stateData = JSON.parse(Buffer.from(state, "base64").toString("utf8"));
    if (stateData.tenantId !== tenant.id) {
      console.error("[DBG][google-calendar/callback] State mismatch");
      return NextResponse.redirect(
        new URL(
          `/srv/${tenant.id}/settings/google?error=state_mismatch`,
          getBaseUrl(),
        ),
      );
    }

    // Exchange code for tokens
    const { accessToken, refreshToken, tokenExpiry } =
      await exchangeCodeForTokens(code);

    // Fetch Google user email
    const email = await fetchGoogleUserEmail(accessToken);

    // Store config on tenant
    const googleCalendarConfig: GoogleCalendarConfig = {
      accessToken,
      refreshToken,
      tokenExpiry,
      email,
      calendarId: "primary",
      blockBookingSlots: true,
      autoAddMeetLink: false,
      connectedAt: new Date().toISOString(),
    };

    await updateTenant(tenant.id, { googleCalendarConfig });

    console.log(
      "[DBG][google-calendar/callback] Connected Google Calendar for:",
      email,
    );

    return NextResponse.redirect(
      new URL(`/srv/${tenant.id}/settings/google?connected=true`, getBaseUrl()),
    );
  } catch (error) {
    console.error("[DBG][google-calendar/callback] Error:", error);

    // Try to redirect to settings with error
    try {
      const session = await auth();
      if (session?.user?.cognitoSub) {
        const tenant = await getTenantByUserId(session.user.cognitoSub);
        if (tenant) {
          return NextResponse.redirect(
            new URL(
              `/srv/${tenant.id}/settings/google?error=connection_failed`,
              getBaseUrl(),
            ),
          );
        }
      }
    } catch {
      // Fallback
    }

    return NextResponse.json(
      { success: false, error: "Failed to connect Google Calendar" },
      { status: 500 },
    );
  }
}
