/**
 * Public RSVP Route
 * GET /api/data/tenants/[tenantId]/calendar/events/[eventId]/rsvp?token=...
 * Allows attendees to accept/decline an event invitation via signed token.
 * No authentication required — the HMAC token proves the link is legitimate.
 */
import { NextResponse } from "next/server";
import * as calendarEventRepository from "@/lib/repositories/calendarEventRepository";
import { verifyRsvpToken } from "@/lib/rsvp-token";
import type { EventAttendee } from "@/types";

interface RouteParams {
  params: Promise<{ tenantId: string; eventId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { tenantId, eventId } = await params;
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  console.log(
    "[DBG][rsvp] RSVP request for event:",
    eventId,
    "tenant:",
    tenantId,
  );

  if (!token) {
    return NextResponse.json(
      { success: false, error: "Missing token" },
      { status: 400 },
    );
  }

  const payload = verifyRsvpToken(token);
  if (!payload) {
    return NextResponse.json(
      { success: false, error: "Invalid or expired RSVP link" },
      { status: 403 },
    );
  }

  // Verify token matches the route params
  if (payload.tenantId !== tenantId || payload.eventId !== eventId) {
    return NextResponse.json(
      { success: false, error: "Token mismatch" },
      { status: 403 },
    );
  }

  // Find the event
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

  // Update the attendee's RSVP status
  const attendees: EventAttendee[] = event.attendees || [];
  const attendeeIndex = attendees.findIndex(
    (a) => a.email.toLowerCase() === payload.email.toLowerCase(),
  );

  if (attendeeIndex === -1) {
    return NextResponse.json(
      { success: false, error: "You are not listed as an attendee" },
      { status: 404 },
    );
  }

  attendees[attendeeIndex] = {
    ...attendees[attendeeIndex],
    rsvpStatus: payload.response,
  };

  // Persist the update
  await calendarEventRepository.updateCalendarEvent(
    tenantId,
    event.date,
    eventId,
    { attendees },
  );

  console.log(
    `[DBG][rsvp] ${payload.email} responded "${payload.response}" for event ${eventId}`,
  );

  // Redirect to a confirmation page
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://proj-cally.vercel.app";
  const redirectUrl = `${baseUrl}/rsvp/confirmed?response=${payload.response}&event=${encodeURIComponent(event.title)}`;

  return NextResponse.redirect(redirectUrl);
}
