/**
 * Booking Waitlist API
 * POST /api/data/tenants/[tenantId]/booking/waitlist - Join the waitlist for a date
 * GET  /api/data/tenants/[tenantId]/booking/waitlist?date=YYYY-MM-DD&email=xxx - Check status
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { getTenantById } from "@/lib/repositories/tenantRepository";
import {
  addToWaitlist,
  getWaitlistByEmail,
} from "@/lib/repositories/waitlistRepository";
import { sendWaitlistConfirmationEmail } from "@/lib/email/waitlistNotificationEmail";
import { DEFAULT_BOOKING_CONFIG } from "@/types/booking";

interface RouteParams {
  params: Promise<{ tenantId: string }>;
}

/**
 * POST - Join the waitlist for a specific date
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { tenantId } = await params;

  console.log("[DBG][booking/waitlist] POST called for tenant:", tenantId);

  try {
    const body = await request.json();
    const { date, visitorName, visitorEmail, visitorPhone } = body;

    // Validate required fields
    if (!date || !visitorName || !visitorEmail) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: "Missing required fields: date, visitorName, visitorEmail",
        },
        { status: 400 },
      );
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invalid date format (expected YYYY-MM-DD)" },
        { status: 400 },
      );
    }

    // Validate date is in the future
    const today = new Date().toISOString().substring(0, 10);
    if (date < today) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Date must be in the future" },
        { status: 400 },
      );
    }

    // Get tenant
    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    // Validate date is within lookahead window
    const lookaheadDays =
      tenant.bookingConfig?.lookaheadDays ??
      DEFAULT_BOOKING_CONFIG.lookaheadDays;
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + lookaheadDays);
    const maxDateStr = maxDate.toISOString().substring(0, 10);

    if (date > maxDateStr) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Date is too far in the future" },
        { status: 400 },
      );
    }

    // Check for duplicate (same email + date)
    const existing = await getWaitlistByEmail(tenantId, date, visitorEmail);
    if (existing) {
      return NextResponse.json<
        ApiResponse<{ position: number; message: string }>
      >({
        success: true,
        data: {
          position: existing.position,
          message: `You're already on the waitlist at position #${existing.position}.`,
        },
      });
    }

    // Generate unique ID
    const entryId = `wl_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Add to waitlist
    const entry = await addToWaitlist(tenantId, {
      id: entryId,
      tenantId,
      date,
      visitorName: visitorName.trim(),
      visitorEmail: visitorEmail.trim().toLowerCase(),
      ...(visitorPhone && { visitorPhone: visitorPhone.trim() }),
    });

    // Send confirmation email (fire-and-forget)
    sendWaitlistConfirmationEmail({
      visitorName: entry.visitorName,
      visitorEmail: entry.visitorEmail,
      date: entry.date,
      position: entry.position,
      tenant,
    }).catch((err) =>
      console.error(
        "[DBG][booking/waitlist] Failed to send confirmation email:",
        err,
      ),
    );

    console.log(
      `[DBG][booking/waitlist] Added ${visitorEmail} to waitlist at position #${entry.position}`,
    );

    return NextResponse.json<
      ApiResponse<{ position: number; message: string }>
    >({
      success: true,
      data: {
        position: entry.position,
        message: `You're #${entry.position} on the waitlist! We'll email you if a slot opens up.`,
      },
    });
  } catch (error) {
    console.error("[DBG][booking/waitlist] POST error:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to join waitlist",
      },
      { status: 500 },
    );
  }
}

/**
 * GET - Check waitlist status for a date + email
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { tenantId } = await params;
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const email = searchParams.get("email");

  console.log(
    "[DBG][booking/waitlist] GET called for tenant:",
    tenantId,
    "date:",
    date,
    "email:",
    email,
  );

  if (!date || !email) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Missing required params: date, email" },
      { status: 400 },
    );
  }

  try {
    const entry = await getWaitlistByEmail(tenantId, date, email);

    if (!entry) {
      return NextResponse.json<ApiResponse<null>>({
        success: true,
        data: null,
      });
    }

    return NextResponse.json<ApiResponse<{ position: number; status: string }>>(
      {
        success: true,
        data: {
          position: entry.position,
          status: entry.status,
        },
      },
    );
  } catch (error) {
    console.error("[DBG][booking/waitlist] GET error:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to check waitlist status",
      },
      { status: 500 },
    );
  }
}
