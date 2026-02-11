/**
 * GET /api/data/app/outlook-calendar/callback
 * Handles Microsoft OAuth callback — exchanges code for tokens, stores config on tenant
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  updateTenant,
} from "@/lib/repositories/tenantRepository";
import {
  exchangeOutlookCodeForTokens,
  fetchOutlookUserEmail,
} from "@/lib/outlook-calendar";
import type { OutlookCalendarConfig } from "@/types/outlook-calendar";

const getBaseUrl = () => process.env.NEXTAUTH_URL || "http://localhost:3113";

export async function GET(request: NextRequest) {
  console.log("[DBG][outlook-calendar/callback] GET called");

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
      console.error("[DBG][outlook-calendar/callback] OAuth error:", error);
      return NextResponse.redirect(
        new URL(
          `/srv/${tenant.id}/settings/outlook?error=${encodeURIComponent(error)}`,
          getBaseUrl(),
        ),
      );
    }

    if (!code || !state) {
      console.error("[DBG][outlook-calendar/callback] Missing code or state");
      return NextResponse.redirect(
        new URL(
          `/srv/${tenant.id}/settings/outlook?error=missing_params`,
          getBaseUrl(),
        ),
      );
    }

    // Validate state
    const stateData = JSON.parse(Buffer.from(state, "base64").toString("utf8"));
    if (stateData.tenantId !== tenant.id) {
      console.error("[DBG][outlook-calendar/callback] State mismatch");
      return NextResponse.redirect(
        new URL(
          `/srv/${tenant.id}/settings/outlook?error=state_mismatch`,
          getBaseUrl(),
        ),
      );
    }

    // Exchange code for tokens
    const { accessToken, refreshToken, tokenExpiry } =
      await exchangeOutlookCodeForTokens(code);

    // Fetch Microsoft user email
    const email = await fetchOutlookUserEmail(accessToken);

    // Store config on tenant
    const outlookCalendarConfig: OutlookCalendarConfig = {
      accessToken,
      refreshToken,
      tokenExpiry,
      email,
      calendarId: "primary",
      blockBookingSlots: true,
      pushEvents: true,
      connectedAt: new Date().toISOString(),
    };

    await updateTenant(tenant.id, { outlookCalendarConfig });

    console.log(
      "[DBG][outlook-calendar/callback] Connected Outlook Calendar for:",
      email,
    );

    return NextResponse.redirect(
      new URL(
        `/srv/${tenant.id}/settings/outlook?connected=true`,
        getBaseUrl(),
      ),
    );
  } catch (error) {
    console.error("[DBG][outlook-calendar/callback] Error:", error);

    // Try to redirect to settings with error
    try {
      const session = await auth();
      if (session?.user?.cognitoSub) {
        const tenant = await getTenantByUserId(session.user.cognitoSub);
        if (tenant) {
          return NextResponse.redirect(
            new URL(
              `/srv/${tenant.id}/settings/outlook?error=connection_failed`,
              getBaseUrl(),
            ),
          );
        }
      }
    } catch {
      // Fallback
    }

    return NextResponse.json(
      { success: false, error: "Failed to connect Outlook Calendar" },
      { status: 500 },
    );
  }
}
