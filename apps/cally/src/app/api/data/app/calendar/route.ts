/**
 * Calendar API Route for Cally
 * GET /api/data/app/calendar - Get calendar events for date range
 * POST /api/data/app/calendar - Create a new calendar event
 *
 * Note: Cally only supports "general" events (no webinars/live sessions)
 */

import { NextResponse } from "next/server";
import type {
  ApiResponse,
  CalendarEvent,
  CalendarItem,
  CreateCalendarEventInput,
} from "@/types";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import * as calendarEventRepository from "@/lib/repositories/calendarEventRepository";
import { createHmsRoomForEvent } from "@/lib/100ms-meeting";
import { is100msConfigured } from "@/lib/100ms-auth";

// Color constant for general events
const EVENT_COLOR = "#6366f1"; // Indigo - matches cally design

/**
 * GET /api/data/app/calendar
 * Get calendar events for date range
 *
 * Query params:
 *   - start: ISO date (required) - Start of date range
 *   - end: ISO date (required) - End of date range
 */
export async function GET(request: Request) {
  console.log("[DBG][calendar] GET called");

  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<ApiResponse<CalendarItem[]>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(session.user.cognitoSub);
    if (!tenant) {
      return NextResponse.json<ApiResponse<CalendarItem[]>>(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const tenantId = tenant.id;
    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (!start || !end) {
      return NextResponse.json<ApiResponse<CalendarItem[]>>(
        {
          success: false,
          error: "start and end query parameters are required",
        },
        { status: 400 },
      );
    }

    // Extract date parts (YYYY-MM-DD)
    const startDate = start.substring(0, 10);
    const endDate = end.substring(0, 10);

    console.log(
      "[DBG][calendar] Getting calendar for range:",
      startDate,
      "to",
      endDate,
    );

    // Fetch calendar events
    const events = await calendarEventRepository.getCalendarEventsByDateRange(
      tenantId,
      startDate,
      endDate,
    );

    // Transform events to CalendarItem format for FullCalendar
    const calendarItems: CalendarItem[] = events.map((event) => ({
      id: event.id,
      title: event.title,
      start: event.startTime,
      end: event.endTime,
      allDay: event.isAllDay,
      type: "event",
      color: event.color || EVENT_COLOR,
      extendedProps: {
        description: event.description,
        location: event.location,
        status: event.status,
        // 100ms Video conferencing
        hasVideoConference: event.hasVideoConference,
        hmsRoomId: event.hmsRoomId,
        hmsTemplateId: event.hmsTemplateId,
      },
    }));

    // Sort by start time
    calendarItems.sort((a, b) => a.start.localeCompare(b.start));

    console.log(
      "[DBG][calendar] Returning",
      calendarItems.length,
      "calendar items",
    );
    return NextResponse.json<ApiResponse<CalendarItem[]>>({
      success: true,
      data: calendarItems,
    });
  } catch (error) {
    console.error("[DBG][calendar] Error:", error);
    return NextResponse.json<ApiResponse<CalendarItem[]>>(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch calendar",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/data/app/calendar
 * Create a new calendar event
 */
export async function POST(request: Request) {
  console.log("[DBG][calendar] POST called");

  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<ApiResponse<CalendarEvent>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(session.user.cognitoSub);
    if (!tenant) {
      return NextResponse.json<ApiResponse<CalendarEvent>>(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const tenantId = tenant.id;
    const body = await request.json();

    // Validate required fields
    const { title, startTime, endTime } =
      body as Partial<CreateCalendarEventInput>;

    if (!title || !startTime || !endTime) {
      return NextResponse.json<ApiResponse<CalendarEvent>>(
        { success: false, error: "title, startTime, and endTime are required" },
        { status: 400 },
      );
    }

    // Validate dates
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json<ApiResponse<CalendarEvent>>(
        { success: false, error: "Invalid date format" },
        { status: 400 },
      );
    }

    if (endDate <= startDate) {
      return NextResponse.json<ApiResponse<CalendarEvent>>(
        { success: false, error: "End time must be after start time" },
        { status: 400 },
      );
    }

    const input: CreateCalendarEventInput = {
      title,
      description: body.description,
      startTime,
      endTime,
      type: "general", // Cally only supports general events
      location: body.location,
      isAllDay: body.isAllDay,
      color: body.color,
      notes: body.notes,
      hasVideoConference: body.hasVideoConference,
    };

    // Create 100ms room if video conferencing is requested
    if (body.hasVideoConference) {
      if (!is100msConfigured()) {
        return NextResponse.json<ApiResponse<CalendarEvent>>(
          {
            success: false,
            error: "Video conferencing is not configured",
          },
          { status: 400 },
        );
      }

      console.log("[DBG][calendar] Creating 100ms room for event");

      // Create a temporary event ID for the room name
      const tempEventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      try {
        const hmsResult = await createHmsRoomForEvent(
          tenantId,
          tempEventId,
          title,
        );
        input.hmsRoomId = hmsResult.roomId;
        input.hmsTemplateId = hmsResult.templateId;
        console.log("[DBG][calendar] Created 100ms room:", hmsResult.roomId);
      } catch (hmsError) {
        console.error("[DBG][calendar] Failed to create 100ms room:", hmsError);
        return NextResponse.json<ApiResponse<CalendarEvent>>(
          {
            success: false,
            error: "Failed to create video conference room",
          },
          { status: 500 },
        );
      }
    }

    console.log("[DBG][calendar] Creating event:", title);

    const event = await calendarEventRepository.createCalendarEvent(
      tenantId,
      input,
    );

    console.log("[DBG][calendar] Created event:", event.id);
    return NextResponse.json<ApiResponse<CalendarEvent>>({
      success: true,
      data: event,
    });
  } catch (error) {
    console.error("[DBG][calendar] Error creating event:", error);
    return NextResponse.json<ApiResponse<CalendarEvent>>(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create event",
      },
      { status: 500 },
    );
  }
}
