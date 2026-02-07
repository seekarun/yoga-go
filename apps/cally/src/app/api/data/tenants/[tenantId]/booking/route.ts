/**
 * POST /api/data/tenants/[tenantId]/booking
 * Public endpoint to create a booking (calendar event)
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantById } from "@/lib/repositories/tenantRepository";
import { getCalendarEventsByDateRange } from "@/lib/repositories/calendarEventRepository";
import { createCalendarEvent } from "@/lib/repositories/calendarEventRepository";
import { generateAvailableSlots } from "@/lib/booking/availability";
import { DEFAULT_BOOKING_CONFIG } from "@/types/booking";
import type { CreateBookingRequest } from "@/types/booking";
import { sendBookingNotificationEmail } from "@/lib/email/bookingNotification";

interface RouteParams {
  params: Promise<{
    tenantId: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await params;
    const body = (await request.json()) as CreateBookingRequest;

    console.log("[DBG][booking] Creating booking for tenant:", tenantId);

    const { visitorName, visitorEmail, note, startTime, endTime } = body;

    // Validate required fields
    if (!visitorName || !visitorEmail || !startTime || !endTime) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: visitorName, visitorEmail, startTime, endTime",
        },
        { status: 400 },
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(visitorEmail)) {
      return NextResponse.json(
        { success: false, error: "Invalid email address" },
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

    // Re-validate slot availability to prevent double-booking
    // Extract date in the tenant's timezone (not UTC) to match how slots were generated
    const startDate = new Date(startTime);
    const dateFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: bookingConfig.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const date = dateFormatter.format(startDate);
    const existingEvents = await getCalendarEventsByDateRange(
      tenantId,
      date,
      date,
    );

    const slots = generateAvailableSlots(date, bookingConfig, existingEvents);

    const requestedSlot = slots.find(
      (s) => s.startTime === startTime && s.endTime === endTime,
    );

    if (!requestedSlot) {
      return NextResponse.json(
        { success: false, error: "Requested time slot is not valid" },
        { status: 400 },
      );
    }

    if (!requestedSlot.available) {
      return NextResponse.json(
        { success: false, error: "Requested time slot is no longer available" },
        { status: 409 },
      );
    }

    // Create the booking as a calendar event
    const description = [
      `Visitor: ${visitorName}`,
      `Email: ${visitorEmail}`,
      note ? `Note: ${note}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const event = await createCalendarEvent(tenantId, {
      title: `Booking: ${visitorName}`,
      description,
      startTime,
      endTime,
      date,
      type: "general",
      status: "pending",
      color: "#f59e0b",
    });

    console.log("[DBG][booking] Created booking event:", event.id);

    // Send booking notification email to visitor (errors caught internally — won't break response)
    await sendBookingNotificationEmail({
      visitorName,
      visitorEmail,
      note,
      startTime,
      endTime,
      date,
      tenant,
    });

    return NextResponse.json({
      success: true,
      data: {
        eventId: event.id,
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        date: event.date,
      },
    });
  } catch (error) {
    console.error("[DBG][booking] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
