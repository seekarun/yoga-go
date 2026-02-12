/**
 * POST /api/data/tenants/[tenantId]/booking
 * Public endpoint to create a booking (calendar event)
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantById } from "@/lib/repositories/tenantRepository";
import {
  getCalendarEventsByDateRange,
  createCalendarEvent,
  updateCalendarEvent,
} from "@/lib/repositories/calendarEventRepository";
import { generateAvailableSlots } from "@/lib/booking/availability";
import { DEFAULT_BOOKING_CONFIG } from "@/types/booking";
import type { CreateBookingRequest } from "@/types/booking";
import { sendBookingNotificationEmail } from "@/lib/email/bookingNotification";
import { isValidEmail } from "@core/lib/email/validator";
import { extractVisitorInfo, checkSpamProtection } from "@core/lib";
import { Tables } from "@/lib/dynamodb";
import { pushCreateToGoogle } from "@/lib/google-calendar-sync";
import { getProductById } from "@/lib/repositories/productRepository";
import { createCheckoutSession } from "@/lib/stripe";
import { getLandingPageUrl } from "@/lib/email/bookingNotification";

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
    const { visitorName, visitorEmail, note, startTime, endTime, productId } =
      body;

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

    const bookingConfig = {
      ...(tenant.bookingConfig ?? DEFAULT_BOOKING_CONFIG),
    };

    // Look up product for duration override and event metadata
    let productName: string | undefined;
    let productColor: string | undefined;
    let productPrice = 0;
    if (productId) {
      const product = await getProductById(tenantId, productId);
      if (product && product.isActive) {
        bookingConfig.slotDurationMinutes = product.durationMinutes;
        productName = product.name;
        productColor = product.color;
        productPrice = product.price;
        console.log(
          "[DBG][booking] Using product duration:",
          product.durationMinutes,
          "min for product:",
          productId,
        );
      }
    }

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
      productName ? `Product: ${productName}` : null,
      note ? `Note: ${note}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const isFlaggedAsSpam = !emailValidation.valid;

    const eventTitle = productName
      ? `Booking: ${visitorName} — ${productName}`
      : `Booking: ${visitorName}`;

    // ===================================================================
    // PAID BOOKING PATH — Stripe Checkout
    // ===================================================================
    const requiresPayment =
      productId && productPrice > 0 && tenant.stripeConfig?.chargesEnabled;

    if (requiresPayment && tenant.stripeConfig) {
      console.log(
        "[DBG][booking] Paid booking path — creating pending_payment event",
      );

      // Create event with pending_payment status (reserves the slot)
      const event = await createCalendarEvent(tenantId, {
        title: eventTitle,
        description,
        startTime,
        endTime,
        date,
        type: "general",
        status: "pending_payment",
        color: productColor || "#f59e0b",
        productId: productId || undefined,
        flaggedAsSpam: isFlaggedAsSpam || undefined,
        visitorInfo,
      });

      console.log("[DBG][booking] Created pending_payment event:", event.id);

      // Calculate application fee
      const feePercent = tenant.stripeConfig.applicationFeePercent ?? 0;
      const applicationFeeAmount = Math.round(
        (productPrice * feePercent) / 100,
      );

      // Build success/cancel URLs
      const baseUrl = getLandingPageUrl(tenant);
      const successUrl = `${baseUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = baseUrl;

      // Create Stripe Checkout Session
      const checkoutSession = await createCheckoutSession({
        connectedAccountId: tenant.stripeConfig.accountId,
        currency: tenant.currency || "aud",
        unitAmount: productPrice,
        productName: productName || "Booking",
        applicationFeeAmount,
        successUrl,
        cancelUrl,
        metadata: {
          tenantId,
          eventId: event.id,
          date,
          visitorName,
          visitorEmail,
          note: note || "",
        },
      });

      // Update event with checkout session ID
      await updateCalendarEvent(tenantId, date, event.id, {
        stripeCheckoutSessionId: checkoutSession.id,
      });

      return NextResponse.json({
        success: true,
        data: {
          eventId: event.id,
          title: event.title,
          startTime: event.startTime,
          endTime: event.endTime,
          date: event.date,
          requiresPayment: true,
          checkoutUrl: checkoutSession.url,
        },
      });
    }

    // ===================================================================
    // FREE BOOKING PATH — existing flow unchanged
    // ===================================================================
    const event = await createCalendarEvent(tenantId, {
      title: eventTitle,
      description,
      startTime,
      endTime,
      date,
      type: "general",
      status: "pending",
      color: productColor || "#f59e0b",
      productId: productId || undefined,
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
