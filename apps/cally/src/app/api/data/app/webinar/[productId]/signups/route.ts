/**
 * Webinar Signup Management API Routes (Authenticated)
 * GET    /api/data/app/webinar/[productId]/signups - List signups
 * DELETE /api/data/app/webinar/[productId]/signups - Remove a signup by email (in body)
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { ApiResponse, WebinarSignup } from "@/types";
import { auth } from "@/auth";
import { getMobileAuthResult } from "@/lib/mobile-auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import {
  getWebinarSignups,
  deleteWebinarSignup,
} from "@/lib/repositories/webinarSignupRepository";
import {
  getCalendarEventsByRecurrenceGroup,
  updateCalendarEvent,
} from "@/lib/repositories/calendarEventRepository";

interface RouteParams {
  params: Promise<{ productId: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse<ApiResponse<WebinarSignup[]>>> {
  const { productId } = await params;

  try {
    // Auth check — same pattern as products/route.ts
    const mobileAuth = await getMobileAuthResult(request);
    let cognitoSub: string | undefined;
    if (mobileAuth.session) {
      cognitoSub = mobileAuth.session.cognitoSub;
    } else if (mobileAuth.tokenExpired) {
      return NextResponse.json(
        { success: false, error: "Token expired" },
        { status: 401 },
      );
    } else {
      const session = await auth();
      cognitoSub = session?.user?.cognitoSub;
    }
    if (!cognitoSub) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const signups = await getWebinarSignups(tenant.id, productId);

    console.log(
      `[DBG][webinarSignups] Returning ${signups.length} signups for product ${productId}`,
    );

    return NextResponse.json({
      success: true,
      data: signups,
    });
  } catch (error) {
    console.error("[DBG][webinarSignups] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch signups" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse<ApiResponse<null>>> {
  const { productId } = await params;

  try {
    // Auth check
    const mobileAuth = await getMobileAuthResult(request);
    let cognitoSub: string | undefined;
    if (mobileAuth.session) {
      cognitoSub = mobileAuth.session.cognitoSub;
    } else if (mobileAuth.tokenExpired) {
      return NextResponse.json(
        { success: false, error: "Token expired" },
        { status: 401 },
      );
    } else {
      const session = await auth();
      cognitoSub = session?.user?.cognitoSub;
    }
    if (!cognitoSub) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 },
      );
    }

    // Remove attendee from all session events
    const sessionEvents = await getCalendarEventsByRecurrenceGroup(
      tenant.id,
      productId,
    );

    const normalizedEmail = email.toLowerCase().trim();
    for (const event of sessionEvents) {
      if (event.attendees) {
        const filtered = event.attendees.filter(
          (a) => a.email.toLowerCase() !== normalizedEmail,
        );
        if (filtered.length !== event.attendees.length) {
          await updateCalendarEvent(tenant.id, event.date, event.id, {
            attendees: filtered,
          });
        }
      }
    }

    await deleteWebinarSignup(tenant.id, productId, email);

    console.log(
      `[DBG][webinarSignups] Removed signup ${email} from product ${productId}`,
    );

    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    console.error("[DBG][webinarSignups] DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to remove signup" },
      { status: 500 },
    );
  }
}
