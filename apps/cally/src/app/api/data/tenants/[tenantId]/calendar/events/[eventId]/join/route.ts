/**
 * Public Meeting Join API Route for CallyGo
 * POST /api/data/tenants/[tenantId]/calendar/events/[eventId]/join
 *
 * Public endpoint - no auth required (middleware allows /api/data/tenants/*)
 * Generates 100ms auth token for guests to join a video conference.
 * If the caller is authenticated and is the tenant owner, assigns host role.
 */

import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import * as calendarEventRepository from "@/lib/repositories/calendarEventRepository";
import {
  generateAuthToken,
  determineRole,
  is100msConfigured,
} from "@/lib/100ms-auth";
import type { ApiResponse } from "@/types";
import type { HmsRole } from "@/lib/100ms-auth";

interface JoinMeetingResponse {
  authToken: string;
  roomId: string;
  role: HmsRole;
  userName: string;
  event: {
    title: string;
    description?: string;
  };
}

interface RouteParams {
  params: Promise<{
    tenantId: string;
    eventId: string;
  }>;
}

/**
 * POST /api/data/tenants/[tenantId]/calendar/events/[eventId]/join
 * Public endpoint - returns auth token for joining 100ms meeting
 * Body: { name: string }
 */
export async function POST(
  request: Request,
  context: RouteParams,
): Promise<NextResponse<ApiResponse<JoinMeetingResponse>>> {
  const { tenantId, eventId } = await context.params;
  console.log(
    "[DBG][public-join] POST request for tenant:",
    tenantId,
    "event:",
    eventId,
  );

  try {
    // Check if 100ms is configured
    if (!is100msConfigured()) {
      return NextResponse.json(
        { success: false, error: "Video conferencing is not configured" },
        { status: 503 },
      );
    }

    // Parse request body for guest name
    const body = await request.json().catch(() => ({}));
    const guestName = body.name?.trim();

    // Look up the event
    const event = await calendarEventRepository.getCalendarEventByIdOnly(
      tenantId,
      eventId,
    );

    if (!event) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 },
      );
    }

    // Check if event has video conferencing
    if (!event.hasVideoConference || !event.hmsRoomId) {
      return NextResponse.json(
        {
          success: false,
          error: "This event does not have video conferencing",
        },
        { status: 400 },
      );
    }

    // Optionally check auth - if logged-in user is tenant owner → host
    let isHost = false;
    let userName = guestName || "Guest";
    let userId = `guest_${uuidv4()}`;

    try {
      const session = await auth();
      if (session?.user?.cognitoSub) {
        const tenant = await getTenantByUserId(session.user.cognitoSub);
        if (tenant && tenant.id === tenantId) {
          isHost = true;
          userName = session.user.name || session.user.email || "Host";
          userId = session.user.cognitoSub;
          console.log(
            "[DBG][public-join] Authenticated as tenant owner (host)",
          );
        }
      }
    } catch (authErr) {
      // Auth check is optional - continue as guest
      console.log("[DBG][public-join] Auth check skipped:", authErr);
    }

    // Guest must provide a name
    if (!isHost && !guestName) {
      return NextResponse.json(
        { success: false, error: "Name is required to join as a guest" },
        { status: 400 },
      );
    }

    const role = determineRole(isHost);

    // Generate auth token
    const authToken = await generateAuthToken(
      event.hmsRoomId,
      userId,
      role,
      userName,
    );

    console.log(
      "[DBG][public-join] Generated token for:",
      userName,
      "role:",
      role,
    );

    return NextResponse.json({
      success: true,
      data: {
        authToken,
        roomId: event.hmsRoomId,
        role,
        userName,
        event: {
          title: event.title,
          description: event.description,
        },
      },
    });
  } catch (error) {
    console.error("[DBG][public-join] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to join meeting",
      },
      { status: 500 },
    );
  }
}
