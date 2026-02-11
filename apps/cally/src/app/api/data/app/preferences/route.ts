/**
 * Preferences API Route for Cally
 * GET  /api/data/app/preferences - Get tenant preferences (timezone)
 * PUT  /api/data/app/preferences - Update tenant preferences (timezone)
 */

import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  updateTenant,
} from "@/lib/repositories/tenantRepository";
import { isValidTimezone } from "@/lib/timezones";

interface PreferencesData {
  timezone: string;
  emailDisplayName: string;
  videoCallPreference: "cally" | "google_meet" | "zoom";
  googleCalendarConnected: boolean;
  zoomConnected: boolean;
}

const DEFAULT_TIMEZONE = "Australia/Sydney";

/**
 * GET /api/data/app/preferences
 * Returns the tenant's preferences
 */
export async function GET(): Promise<
  NextResponse<ApiResponse<PreferencesData>>
> {
  console.log("[DBG][preferences] GET called");

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

    const timezone =
      tenant.timezone || tenant.bookingConfig?.timezone || DEFAULT_TIMEZONE;

    return NextResponse.json({
      success: true,
      data: {
        timezone,
        emailDisplayName: tenant.emailDisplayName || "",
        videoCallPreference: tenant.videoCallPreference ?? "cally",
        googleCalendarConnected: !!tenant.googleCalendarConfig,
        zoomConnected: !!tenant.zoomConfig,
      },
    });
  } catch (error) {
    console.error("[DBG][preferences] GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to get preferences",
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/data/app/preferences
 * Update the tenant's preferences
 */
export async function PUT(
  request: Request,
): Promise<NextResponse<ApiResponse<PreferencesData>>> {
  console.log("[DBG][preferences] PUT called");

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

    const body = await request.json();
    const { timezone, videoCallPreference, emailDisplayName } = body;

    // Build partial update
    const updates: Record<string, unknown> = {};

    // Validate emailDisplayName if provided
    if (emailDisplayName !== undefined) {
      if (typeof emailDisplayName !== "string") {
        return NextResponse.json(
          { success: false, error: "emailDisplayName must be a string" },
          { status: 400 },
        );
      }
      if (emailDisplayName.length > 100) {
        return NextResponse.json(
          {
            success: false,
            error: "emailDisplayName must be 100 characters or less",
          },
          { status: 400 },
        );
      }
      // Allow empty string to clear the custom display name
      updates.emailDisplayName = emailDisplayName.trim() || "";
    }

    // Validate timezone if provided
    if (timezone !== undefined) {
      if (!timezone || typeof timezone !== "string") {
        return NextResponse.json(
          { success: false, error: "timezone must be a non-empty string" },
          { status: 400 },
        );
      }
      if (!isValidTimezone(timezone)) {
        return NextResponse.json(
          { success: false, error: "Invalid IANA timezone" },
          { status: 400 },
        );
      }
      updates.timezone = timezone;
    }

    // Validate videoCallPreference if provided
    if (videoCallPreference !== undefined) {
      if (
        videoCallPreference !== "cally" &&
        videoCallPreference !== "google_meet" &&
        videoCallPreference !== "zoom"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              'videoCallPreference must be "cally", "google_meet", or "zoom"',
          },
          { status: 400 },
        );
      }
      if (
        videoCallPreference === "google_meet" &&
        !tenant.googleCalendarConfig
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Google Calendar must be connected to use Google Meet",
          },
          { status: 400 },
        );
      }
      if (videoCallPreference === "zoom" && !tenant.zoomConfig) {
        return NextResponse.json(
          {
            success: false,
            error: "Zoom must be connected to use Zoom meetings",
          },
          { status: 400 },
        );
      }
      updates.videoCallPreference = videoCallPreference;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const updated = await updateTenant(tenant.id, updates);

    return NextResponse.json({
      success: true,
      data: {
        timezone: updated.timezone || tenant.timezone || DEFAULT_TIMEZONE,
        emailDisplayName: updated.emailDisplayName || "",
        videoCallPreference: updated.videoCallPreference ?? "cally",
        googleCalendarConnected: !!tenant.googleCalendarConfig,
        zoomConnected: !!tenant.zoomConfig,
      },
      message: "Preferences updated",
    });
  } catch (error) {
    console.error("[DBG][preferences] PUT error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update preferences",
      },
      { status: 500 },
    );
  }
}
