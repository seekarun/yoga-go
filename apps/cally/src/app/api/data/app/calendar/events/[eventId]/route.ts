/**
 * Calendar Event CRUD Route for Cally
 * GET /api/data/app/calendar/events/[eventId] - Get single event
 * PUT /api/data/app/calendar/events/[eventId] - Update event
 * DELETE /api/data/app/calendar/events/[eventId] - Delete event
 */

import { NextResponse } from "next/server";
import type { ApiResponse, CalendarEvent, CalendarEventStatus } from "@/types";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import * as calendarEventRepository from "@/lib/repositories/calendarEventRepository";
import {
  sendBookingConfirmedEmail,
  parseVisitorFromDescription,
} from "@/lib/email/bookingNotification";

interface RouteParams {
  params: Promise<{
    eventId: string;
  }>;
}

/**
 * GET /api/data/app/calendar/events/[eventId]
 * Get a single calendar event by ID
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { eventId } = await params;
  console.log("[DBG][calendar/events/[eventId]] GET called for:", eventId);

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

    // Get event by ID only (searches all dates)
    const event = await calendarEventRepository.getCalendarEventByIdOnly(
      tenantId,
      eventId,
    );

    if (!event) {
      return NextResponse.json<ApiResponse<CalendarEvent>>(
        { success: false, error: "Event not found" },
        { status: 404 },
      );
    }

    console.log("[DBG][calendar/events/[eventId]] Found event:", eventId);
    return NextResponse.json<ApiResponse<CalendarEvent>>({
      success: true,
      data: event,
    });
  } catch (error) {
    console.error("[DBG][calendar/events/[eventId]] Error:", error);
    return NextResponse.json<ApiResponse<CalendarEvent>>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch event",
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/data/app/calendar/events/[eventId]
 * Update a calendar event
 */
export async function PUT(request: Request, { params }: RouteParams) {
  const { eventId } = await params;
  console.log("[DBG][calendar/events/[eventId]] PUT called for:", eventId);

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

    // Get current event to find its date
    const currentEvent = await calendarEventRepository.getCalendarEventByIdOnly(
      tenantId,
      eventId,
    );

    if (!currentEvent) {
      return NextResponse.json<ApiResponse<CalendarEvent>>(
        { success: false, error: "Event not found" },
        { status: 404 },
      );
    }

    // Validate dates if provided
    if (body.startTime && body.endTime) {
      const startDate = new Date(body.startTime);
      const endDate = new Date(body.endTime);

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
    }

    // Build update object with only provided fields
    const updates: Partial<CalendarEvent> = {};

    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.startTime !== undefined) updates.startTime = body.startTime;
    if (body.endTime !== undefined) updates.endTime = body.endTime;
    if (body.status !== undefined)
      updates.status = body.status as CalendarEventStatus;
    if (body.location !== undefined) updates.location = body.location;
    if (body.isAllDay !== undefined) updates.isAllDay = body.isAllDay;
    if (body.color !== undefined) updates.color = body.color;
    if (body.notes !== undefined) updates.notes = body.notes;

    console.log("[DBG][calendar/events/[eventId]] Updating event:", eventId);

    const updatedEvent = await calendarEventRepository.updateCalendarEvent(
      tenantId,
      currentEvent.date,
      eventId,
      updates,
    );

    if (!updatedEvent) {
      return NextResponse.json<ApiResponse<CalendarEvent>>(
        { success: false, error: "Failed to update event" },
        { status: 500 },
      );
    }

    console.log("[DBG][calendar/events/[eventId]] Updated event:", eventId);

    // Send confirmation email when a pending booking is approved (status → scheduled)
    if (currentEvent.status === "pending" && body.status === "scheduled") {
      const visitor = parseVisitorFromDescription(currentEvent.description);
      if (visitor) {
        await sendBookingConfirmedEmail({
          visitorName: visitor.visitorName,
          visitorEmail: visitor.visitorEmail,
          note: visitor.note,
          startTime: updatedEvent.startTime,
          endTime: updatedEvent.endTime,
          tenant,
        });
      } else {
        console.warn(
          "[DBG][calendar/events/[eventId]] Could not parse visitor info for confirmation email",
        );
      }
    }

    return NextResponse.json<ApiResponse<CalendarEvent>>({
      success: true,
      data: updatedEvent,
    });
  } catch (error) {
    console.error("[DBG][calendar/events/[eventId]] Error updating:", error);
    return NextResponse.json<ApiResponse<CalendarEvent>>(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update event",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/data/app/calendar/events/[eventId]
 * Delete a calendar event
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const { eventId } = await params;
  console.log("[DBG][calendar/events/[eventId]] DELETE called for:", eventId);

  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<ApiResponse<{ deleted: boolean }>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(session.user.cognitoSub);
    if (!tenant) {
      return NextResponse.json<ApiResponse<{ deleted: boolean }>>(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const tenantId = tenant.id;

    // Get current event to find its date
    const currentEvent = await calendarEventRepository.getCalendarEventByIdOnly(
      tenantId,
      eventId,
    );

    if (!currentEvent) {
      return NextResponse.json<ApiResponse<{ deleted: boolean }>>(
        { success: false, error: "Event not found" },
        { status: 404 },
      );
    }

    console.log("[DBG][calendar/events/[eventId]] Deleting event:", eventId);

    const deleted = await calendarEventRepository.deleteCalendarEvent(
      tenantId,
      currentEvent.date,
      eventId,
    );

    if (!deleted) {
      return NextResponse.json<ApiResponse<{ deleted: boolean }>>(
        { success: false, error: "Failed to delete event" },
        { status: 500 },
      );
    }

    console.log("[DBG][calendar/events/[eventId]] Deleted event:", eventId);
    return NextResponse.json<ApiResponse<{ deleted: boolean }>>({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    console.error("[DBG][calendar/events/[eventId]] Error deleting:", error);
    return NextResponse.json<ApiResponse<{ deleted: boolean }>>(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete event",
      },
      { status: 500 },
    );
  }
}
