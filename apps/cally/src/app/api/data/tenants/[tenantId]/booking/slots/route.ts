/**
 * GET /api/data/tenants/[tenantId]/booking/slots?date=YYYY-MM-DD
 * Public endpoint to get available booking slots for a given date
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  getTenantById,
  updateTenant,
} from "@/lib/repositories/tenantRepository";
import { getCalendarEventsByDateRange } from "@/lib/repositories/calendarEventRepository";
import { generateAvailableSlots } from "@/lib/booking/availability";
import { DEFAULT_BOOKING_CONFIG } from "@/types/booking";
import type { CalendarEvent } from "@/types";
import {
  getGoogleCalendarClient,
  listGoogleEvents,
} from "@/lib/google-calendar";
import { getProductById } from "@/lib/repositories/productRepository";

interface RouteParams {
  params: Promise<{
    tenantId: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    console.log(
      "[DBG][booking/slots] Fetching slots for tenant:",
      tenantId,
      "date:",
      date,
    );

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or missing date parameter (YYYY-MM-DD)",
        },
        { status: 400 },
      );
    }

    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    // Check for product-specific duration override
    const productId = searchParams.get("productId");
    const bookingConfig = {
      ...(tenant.bookingConfig ?? DEFAULT_BOOKING_CONFIG),
    };

    if (productId) {
      const product = await getProductById(tenantId, productId);
      if (product && product.isActive) {
        bookingConfig.slotDurationMinutes = product.durationMinutes;
        console.log(
          "[DBG][booking/slots] Using product duration:",
          product.durationMinutes,
          "min for product:",
          productId,
        );
      }
    }

    // Fetch existing events for the requested date
    const existingEvents = await getCalendarEventsByDateRange(
      tenantId,
      date,
      date,
    );

    console.log(
      "[DBG][booking/slots] Found",
      existingEvents.length,
      "existing events for date:",
      date,
    );

    // Fetch Google Calendar events to block slots if configured
    let allEvents: CalendarEvent[] = existingEvents;
    const googleCalendarConfig = tenant.googleCalendarConfig;

    if (googleCalendarConfig?.blockBookingSlots) {
      try {
        const { client, updatedConfig } =
          await getGoogleCalendarClient(googleCalendarConfig);

        if (updatedConfig !== googleCalendarConfig) {
          await updateTenant(tenantId, {
            googleCalendarConfig: updatedConfig,
          });
        }

        // Build time range for the requested date
        const dateStart = `${date}T00:00:00Z`;
        const dateEnd = `${date}T23:59:59Z`;

        const googleEvents = await listGoogleEvents(
          client,
          updatedConfig.calendarId,
          dateStart,
          dateEnd,
        );

        // Convert to CalendarEvent-like objects (only startTime/endTime needed)
        const googleBlocking: CalendarEvent[] = googleEvents
          .filter((ge) => ge.start?.dateTime && ge.end?.dateTime)
          .map((ge) => ({
            id: `gcal_${ge.id}`,
            expertId: tenantId,
            title: ge.summary || "",
            date,
            startTime: ge.start!.dateTime!,
            endTime: ge.end!.dateTime!,
            duration: 0,
            type: "general" as const,
            status: "scheduled" as const,
            createdAt: "",
            updatedAt: "",
          }));

        allEvents = [...existingEvents, ...googleBlocking];

        console.log(
          "[DBG][booking/slots] Added",
          googleBlocking.length,
          "Google events as blockers",
        );
      } catch (error) {
        console.warn(
          "[DBG][booking/slots] Failed to fetch Google Calendar events:",
          error,
        );
        // Proceed with CallyGo events only
      }
    }

    const slots = generateAvailableSlots(date, bookingConfig, allEvents);

    return NextResponse.json({
      success: true,
      data: {
        date,
        timezone: bookingConfig.timezone,
        slots,
        weeklySchedule: bookingConfig.weeklySchedule,
        lookaheadDays: bookingConfig.lookaheadDays,
      },
    });
  } catch (error) {
    console.error("[DBG][booking/slots] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
