/**
 * Calendar Events API
 *
 * GET /data/app/events - List all events for authenticated user
 * POST /data/app/events - Create a new event
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";
import {
  getEventsByHost,
  createEvent,
  type CreateEventInput,
} from "@/lib/repositories";

// Response helper
function jsonResponse<T>(data: T, success = true, status = 200): NextResponse {
  return NextResponse.json({ success, data }, { status });
}

function errorResponse(message: string, status = 400): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status });
}

/**
 * GET /data/app/events
 * Get all events for the authenticated user
 */
export async function GET() {
  console.log("[DBG][events-api] GET /data/app/events");

  try {
    const session = await getSession();

    if (!session.isAuthenticated || !session.user) {
      return errorResponse("Authentication required", 401);
    }

    // Use user's sub as hostId
    const hostId = session.user.sub;
    const events = await getEventsByHost(hostId);

    console.log("[DBG][events-api] Returning", events.length, "events");
    return jsonResponse(events);
  } catch (error) {
    console.error("[DBG][events-api] Error fetching events:", error);
    return errorResponse("Failed to fetch events", 500);
  }
}

/**
 * POST /data/app/events
 * Create a new event
 */
export async function POST(request: NextRequest) {
  console.log("[DBG][events-api] POST /data/app/events");

  try {
    const session = await getSession();

    if (!session.isAuthenticated || !session.user) {
      return errorResponse("Authentication required", 401);
    }

    const body = await request.json();

    // Validate required fields
    const { title, date, startTime, endTime } = body;
    if (!title || !date || !startTime || !endTime) {
      return errorResponse(
        "Missing required fields: title, date, startTime, endTime",
      );
    }

    // Use user's sub as hostId
    const hostId = session.user.sub;

    const input: CreateEventInput = {
      hostId,
      title,
      description: body.description || "",
      date,
      startTime,
      endTime,
      tagId: body.tagId,
    };

    const event = await createEvent(input);

    console.log("[DBG][events-api] Created event:", event.id);
    return jsonResponse(event, true, 201);
  } catch (error) {
    console.error("[DBG][events-api] Error creating event:", error);
    return errorResponse("Failed to create event", 500);
  }
}
