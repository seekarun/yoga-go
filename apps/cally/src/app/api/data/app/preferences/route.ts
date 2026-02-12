/**
 * Preferences API Route for Cally
 * GET  /api/data/app/preferences - Get tenant preferences (timezone)
 * PUT  /api/data/app/preferences - Update tenant preferences (timezone)
 */

import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import type { WeeklySchedule } from "@/types/booking";
import { DEFAULT_BOOKING_CONFIG } from "@/types/booking";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  updateTenant,
} from "@/lib/repositories/tenantRepository";
import { isValidTimezone } from "@/lib/timezones";

interface PreferencesData {
  name: string;
  address: string;
  timezone: string;
  videoCallPreference: "cally" | "google_meet" | "zoom";
  defaultEventDuration: number;
  currency: string;
  googleCalendarConnected: boolean;
  zoomConnected: boolean;
  weeklySchedule: WeeklySchedule;
}

const VALID_CURRENCIES = [
  "AUD",
  "USD",
  "GBP",
  "EUR",
  "INR",
  "NZD",
  "CAD",
  "SGD",
];

const MIN_DURATION = 5;
const MAX_DURATION = 480;

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
        name: tenant.name,
        address: tenant.address ?? "",
        timezone,
        videoCallPreference: tenant.videoCallPreference ?? "cally",
        defaultEventDuration: tenant.defaultEventDuration ?? 30,
        currency: tenant.currency ?? "AUD",
        googleCalendarConnected: !!tenant.googleCalendarConfig,
        zoomConnected: !!tenant.zoomConfig,
        weeklySchedule:
          tenant.bookingConfig?.weeklySchedule ??
          DEFAULT_BOOKING_CONFIG.weeklySchedule,
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
    const {
      name,
      address,
      timezone,
      videoCallPreference,
      defaultEventDuration,
      currency,
      weeklySchedule,
    } = body;

    // Build partial update
    const updates: Record<string, unknown> = {};

    // Validate address if provided
    if (address !== undefined) {
      if (typeof address !== "string") {
        return NextResponse.json(
          { success: false, error: "Address must be a string" },
          { status: 400 },
        );
      }
      if (address.length > 300) {
        return NextResponse.json(
          {
            success: false,
            error: "Address must be 300 characters or less",
          },
          { status: 400 },
        );
      }
      updates.address = address.trim();
    }

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return NextResponse.json(
          { success: false, error: "Name must be a non-empty string" },
          { status: 400 },
        );
      }
      if (name.length > 100) {
        return NextResponse.json(
          {
            success: false,
            error: "Name must be 100 characters or less",
          },
          { status: 400 },
        );
      }
      updates.name = name.trim();
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

    // Validate defaultEventDuration if provided
    if (defaultEventDuration !== undefined) {
      const duration = Number(defaultEventDuration);
      if (
        !Number.isInteger(duration) ||
        duration < MIN_DURATION ||
        duration > MAX_DURATION
      ) {
        return NextResponse.json(
          {
            success: false,
            error: `defaultEventDuration must be a whole number between ${MIN_DURATION} and ${MAX_DURATION}`,
          },
          { status: 400 },
        );
      }
      updates.defaultEventDuration = duration;
    }

    // Validate currency if provided
    if (currency !== undefined) {
      if (
        typeof currency !== "string" ||
        !VALID_CURRENCIES.includes(currency)
      ) {
        return NextResponse.json(
          {
            success: false,
            error: `Currency must be one of: ${VALID_CURRENCIES.join(", ")}`,
          },
          { status: 400 },
        );
      }
      updates.currency = currency;
    }

    // Validate weeklySchedule if provided
    if (weeklySchedule !== undefined) {
      if (typeof weeklySchedule !== "object" || weeklySchedule === null) {
        return NextResponse.json(
          { success: false, error: "weeklySchedule must be an object" },
          { status: 400 },
        );
      }

      const requiredDays = [0, 1, 2, 3, 4, 5, 6];
      for (const day of requiredDays) {
        const entry = weeklySchedule[day];
        if (!entry || typeof entry !== "object") {
          return NextResponse.json(
            {
              success: false,
              error: `weeklySchedule must include day ${day}`,
            },
            { status: 400 },
          );
        }
        if (typeof entry.enabled !== "boolean") {
          return NextResponse.json(
            {
              success: false,
              error: `weeklySchedule[${day}].enabled must be a boolean`,
            },
            { status: 400 },
          );
        }
        const start = Number(entry.startHour);
        const end = Number(entry.endHour);
        if (
          !Number.isInteger(start) ||
          start < 0 ||
          start > 23 ||
          !Number.isInteger(end) ||
          end < 0 ||
          end > 23
        ) {
          return NextResponse.json(
            {
              success: false,
              error: `weeklySchedule[${day}] hours must be integers 0-23`,
            },
            { status: 400 },
          );
        }
        if (entry.enabled && end <= start) {
          return NextResponse.json(
            {
              success: false,
              error: `weeklySchedule[${day}].endHour must be greater than startHour`,
            },
            { status: 400 },
          );
        }
      }

      const hasEnabledDay = requiredDays.some((d) => weeklySchedule[d].enabled);
      if (!hasEnabledDay) {
        return NextResponse.json(
          {
            success: false,
            error: "At least one day must be enabled",
          },
          { status: 400 },
        );
      }

      // Merge into bookingConfig, preserving other fields
      const existingConfig = tenant.bookingConfig ?? DEFAULT_BOOKING_CONFIG;
      updates.bookingConfig = {
        ...existingConfig,
        weeklySchedule,
        timezone:
          (updates.timezone as string) ||
          tenant.timezone ||
          existingConfig.timezone,
      };
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
        name: updated.name,
        address: updated.address ?? "",
        timezone: updated.timezone || tenant.timezone || DEFAULT_TIMEZONE,
        videoCallPreference: updated.videoCallPreference ?? "cally",
        defaultEventDuration: updated.defaultEventDuration ?? 30,
        currency: updated.currency ?? "AUD",
        googleCalendarConnected: !!tenant.googleCalendarConfig,
        zoomConnected: !!tenant.zoomConfig,
        weeklySchedule:
          updated.bookingConfig?.weeklySchedule ??
          DEFAULT_BOOKING_CONFIG.weeklySchedule,
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
