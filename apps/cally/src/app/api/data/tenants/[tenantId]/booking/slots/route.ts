/**
 * GET /api/data/tenants/[tenantId]/booking/slots?date=YYYY-MM-DD
 * Public endpoint to get available booking slots for a given date
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantById } from "@/lib/repositories/tenantRepository";
import { getCalendarEventsByDateRange } from "@/lib/repositories/calendarEventRepository";
import { generateAvailableSlots } from "@/lib/booking/availability";
import { DEFAULT_BOOKING_CONFIG } from "@/types/booking";

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

    const bookingConfig = tenant.bookingConfig ?? DEFAULT_BOOKING_CONFIG;

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

    const slots = generateAvailableSlots(date, bookingConfig, existingEvents);

    return NextResponse.json({
      success: true,
      data: {
        date,
        timezone: bookingConfig.timezone,
        slots,
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
