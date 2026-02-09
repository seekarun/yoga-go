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
      data: { timezone },
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
    const { timezone } = body;

    if (!timezone || typeof timezone !== "string") {
      return NextResponse.json(
        { success: false, error: "timezone is required" },
        { status: 400 },
      );
    }

    if (!isValidTimezone(timezone)) {
      return NextResponse.json(
        { success: false, error: "Invalid IANA timezone" },
        { status: 400 },
      );
    }

    const updated = await updateTenant(tenant.id, { timezone });

    return NextResponse.json({
      success: true,
      data: { timezone: updated.timezone || timezone },
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
