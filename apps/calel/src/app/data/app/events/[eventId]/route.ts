/**
 * Individual Event API
 *
 * DELETE /data/app/events/[eventId] - Delete an event
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import { getEventsByHost, deleteEvent } from "@/lib/repositories";

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
