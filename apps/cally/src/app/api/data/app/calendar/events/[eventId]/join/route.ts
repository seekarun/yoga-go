/**
 * Meeting Join API Route for CallyGo
 * POST /api/data/app/calendar/events/[eventId]/join
 * Generates auth token for user to join 100ms video conference
 */

import { NextResponse } from "next/server";
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
}

interface RouteParams {
  params: Promise<{
    eventId: string;
  }>;
}

/**
 * POST /api/data/app/calendar/events/[eventId]/join
 * Returns auth token for joining 100ms meeting
 */
export async function POST(
  _request: Request,
  context: RouteParams,
): Promise<NextResponse<ApiResponse<JoinMeetingResponse>>> {
  const { eventId } = await context.params;
  console.log("[DBG][meeting/join] POST request for event:", eventId);

  try {
    // Check if 100ms is configured
    if (!is100msConfigured()) {
      return NextResponse.json(
        { success: false, error: "Video conferencing is not configured" },
        { status: 503 },
      );
    }

    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const userId = session.user.cognitoSub;

    // Get tenant
    const tenant = await getTenantByUserId(userId);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    // Get calendar event
    const event = await calendarEventRepository.getCalendarEventByIdOnly(
      tenant.id,
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

    // Get user name from session
    const userName = session.user.name || session.user.email || "Participant";

    // Tenant owner is always the host
    const isHost = true; // In cally, the logged-in user is the tenant owner

    // Determine role
    const role = determineRole(isHost);

    // Generate auth token
    const authToken = await generateAuthToken(
      event.hmsRoomId,
      userId,
      role,
      userName,
    );

    console.log(
      "[DBG][meeting/join] Generated token for user:",
      userId,
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
      },
    });
  } catch (error) {
    console.error("[DBG][meeting/join] Error:", error);
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
