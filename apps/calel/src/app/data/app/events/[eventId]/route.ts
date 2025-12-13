/**
 * Individual Event API
 *
 * PUT /data/app/events/[eventId] - Update an event
 * DELETE /data/app/events/[eventId] - Delete an event
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { getEventsByHost, deleteEvent, updateEvent } from "@/lib/repositories";

// Response helper
function jsonResponse<T>(data: T, success = true, status = 200): NextResponse {
  return NextResponse.json({ success, data }, { status });
}

function errorResponse(message: string, status = 400): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status });
}

interface RouteParams {
  params: Promise<{ eventId: string }>;
}

/**
 * DELETE /data/app/events/[eventId]
 * Delete an event
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { eventId } = await params;
  console.log("[DBG][events-api] DELETE /data/app/events/", eventId);

  try {
    const session = await getSession();

    if (!session.isAuthenticated || !session.user) {
      return errorResponse("Authentication required", 401);
    }

    const hostId = session.user.sub;

    // Find the event to get its date (needed for SK)
    const events = await getEventsByHost(hostId);
    const event = events.find((e) => e.id === eventId);

    if (!event) {
      return errorResponse("Event not found", 404);
    }

    await deleteEvent(hostId, event.date, eventId);

    console.log("[DBG][events-api] Deleted event:", eventId);
    return jsonResponse({ deleted: true });
  } catch (error) {
    console.error("[DBG][events-api] Error deleting event:", error);
    return errorResponse("Failed to delete event", 500);
  }
}

/**
 * PUT /data/app/events/[eventId]
 * Update an event
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { eventId } = await params;
  console.log("[DBG][events-api] PUT /data/app/events/", eventId);

  try {
    const session = await getSession();

    if (!session.isAuthenticated || !session.user) {
      return errorResponse("Authentication required", 401);
    }

    const hostId = session.user.sub;
    const body = await request.json();

    // Find existing event to get current date (needed for DynamoDB key)
    const events = await getEventsByHost(hostId);
    const existingEvent = events.find((e) => e.id === eventId);

    if (!existingEvent) {
      return errorResponse("Event not found", 404);
    }

    // Build updates object with only provided fields
    const updates: {
      title?: string;
      description?: string;
      date?: string;
      startTime?: string;
      endTime?: string;
      tagId?: string;
    } = {};

    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.date !== undefined) updates.date = body.date;
    if (body.startTime !== undefined) updates.startTime = body.startTime;
    if (body.endTime !== undefined) updates.endTime = body.endTime;
    if (body.tagId !== undefined) updates.tagId = body.tagId;

    const updatedEvent = await updateEvent(
      hostId,
      existingEvent.date,
      eventId,
      updates,
    );

    if (!updatedEvent) {
      return errorResponse("Failed to update event", 500);
    }

    console.log("[DBG][events-api] Updated event:", eventId);
    return jsonResponse(updatedEvent);
  } catch (error) {
    console.error("[DBG][events-api] Error updating event:", error);
    return errorResponse("Failed to update event", 500);
  }
}
