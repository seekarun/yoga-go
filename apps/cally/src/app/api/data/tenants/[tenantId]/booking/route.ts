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
import { isValidEmail } from "@core/lib/email/validator";
import { extractVisitorInfo, checkSpamProtection } from "@core/lib";
import { Tables } from "@/lib/dynamodb";
import { pushCreateToGoogle } from "@/lib/google-calendar-sync";

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

    // Spam protection check (honeypot → timing → rate limit)
    const spamCheck = await checkSpamProtection(
      request.headers,
      body as unknown as Record<string, unknown>,
      { tableName: Tables.CORE },
    );
    if (!spamCheck.passed) {
      console.log(
        `[DBG][booking] Spam blocked for tenant ${tenantId}: ${spamCheck.reason}`,
      );
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    const visitorInfo = extractVisitorInfo(request.headers);
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

    // Validate email (format, disposable domain, MX record) — after slot check to avoid DNS lookups for invalid slots
    const emailValidation = await isValidEmail(visitorEmail);

    // Create the booking as a calendar event
    const description = [
      `Visitor: ${visitorName}`,
      `Email: ${visitorEmail}`,
      note ? `Note: ${note}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const isFlaggedAsSpam = !emailValidation.valid;

    const event = await createCalendarEvent(tenantId, {
      title: `Booking: ${visitorName}`,
      description,
      startTime,
      endTime,
      date,
      type: "general",
      status: "pending",
      color: "#f59e0b",
      flaggedAsSpam: isFlaggedAsSpam || undefined,
      visitorInfo,
    });

    console.log("[DBG][booking] Created booking event:", event.id);

    // Push to Google Calendar (fire-and-forget)
    pushCreateToGoogle(tenant, event).catch((err) =>
      console.warn("[DBG][booking] Google push failed:", err),
    );

    if (isFlaggedAsSpam) {
      console.log(
        `[DBG][booking] Spam-flagged booking ${event.id} — reason: ${emailValidation.reason}`,
      );

      return NextResponse.json(
        {
          success: true,
          warning:
            "Your email address appears invalid. Your booking was received, but you may not receive a confirmation email. Please check your email address if this is a mistake.",
          data: {
            eventId: event.id,
            title: event.title,
            startTime: event.startTime,
            endTime: event.endTime,
            date: event.date,
          },
        },
        { status: 202 },
      );
    }

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
