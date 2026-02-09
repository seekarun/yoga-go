/**
 * Instant Meeting API Route for Cally
 * POST /api/data/app/calendar/instant - Create an instant meeting
 *
 * Creates a calendar event with a 100ms video conference room that starts immediately
 */

import { NextResponse } from "next/server";
import type {
  ApiResponse,
  CalendarEvent,
  CreateCalendarEventInput,
} from "@/types";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import * as calendarEventRepository from "@/lib/repositories/calendarEventRepository";
import { is100msConfigured } from "@/lib/100ms-auth";
import { createHmsRoomForEvent } from "@/lib/100ms-meeting";

interface InstantMeetingResponse {
  event: CalendarEvent;
  joinUrl: string;
}

/**
 * POST /api/data/app/calendar/instant
 * Create an instant meeting with 100ms video conference
 */
export async function POST(
  request: Request,
): Promise<NextResponse<ApiResponse<InstantMeetingResponse>>> {
  console.log("[DBG][instant-meeting] POST called");

  try {
    // Check if 100ms is configured
    if (!is100msConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "Video conferencing is not configured",
        },
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

    const tenant = await getTenantByUserId(session.user.cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const tenantId = tenant.id;

    // Parse request body for optional duration
    const body = await request.json().catch(() => ({}));
    const durationMinutes = body.duration || 30; // Default 30 minutes

    // Create meeting times
    const now = new Date();
    const endTime = new Date(now.getTime() + durationMinutes * 60 * 1000);

    // Generate title with timestamp in tenant's timezone (server runs in UTC on Vercel)
    const tz =
      tenant.timezone || tenant.bookingConfig?.timezone || "Australia/Sydney";
    const title = `Instant Meeting - ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: tz })} ${now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz })}`;

    console.log("[DBG][instant-meeting] Creating instant meeting:", title);

    // Create temporary event ID for 100ms room
    const tempEventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Create the 100ms room
    let hmsRoomId: string;
    let hmsTemplateId: string;

    try {
      const hmsResult = await createHmsRoomForEvent(
        tenantId,
        tempEventId,
        title,
      );
      hmsRoomId = hmsResult.roomId;
      hmsTemplateId = hmsResult.templateId;
      console.log("[DBG][instant-meeting] Created 100ms room:", hmsRoomId);
    } catch (hmsError) {
      console.error(
        "[DBG][instant-meeting] Failed to create 100ms room:",
        hmsError,
      );
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create video conference room",
        },
        { status: 500 },
      );
    }

    // Create the calendar event
    const input: CreateCalendarEventInput = {
      title,
      description: "Instant video meeting",
      startTime: now.toISOString(),
      endTime: endTime.toISOString(),
      type: "general",
      hasVideoConference: true,
      hmsRoomId,
      hmsTemplateId,
    };

    const event = await calendarEventRepository.createCalendarEvent(
      tenantId,
      input,
    );

    console.log("[DBG][instant-meeting] Created event:", event.id);

    // Build the join URL
    const joinUrl = `/srv/${tenantId}/live/${event.id}`;

    return NextResponse.json({
      success: true,
      data: {
        event,
        joinUrl,
      },
      message: "Instant meeting created successfully",
    });
  } catch (error) {
    console.error("[DBG][instant-meeting] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create instant meeting",
      },
      { status: 500 },
    );
  }
}
