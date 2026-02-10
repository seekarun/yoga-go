/**
 * POST /api/data/app/google-calendar/sync
 * One-time bulk push of existing Cally events to Google Calendar.
 * Skips events that already have a googleCalendarEventId.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  updateTenant,
} from "@/lib/repositories/tenantRepository";
import * as calendarEventRepository from "@/lib/repositories/calendarEventRepository";
import {
  getGoogleCalendarClient,
  createGoogleEvent,
} from "@/lib/google-calendar";

export async function POST() {
  console.log("[DBG][google-calendar/sync] POST called");

  try {
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

    if (!tenant.googleCalendarConfig) {
      return NextResponse.json(
        { success: false, error: "Google Calendar is not connected" },
        { status: 400 },
      );
    }

    const { client, updatedConfig } = await getGoogleCalendarClient(
      tenant.googleCalendarConfig,
    );

    if (updatedConfig !== tenant.googleCalendarConfig) {
      await updateTenant(tenant.id, {
        googleCalendarConfig: updatedConfig,
      });
    }

    // Get all Cally events
    const allEvents = await calendarEventRepository.getTenantCalendarEvents(
      tenant.id,
    );

    // Filter to only events not yet synced
    const unsyncedEvents = allEvents.filter(
      (e) => !e.googleCalendarEventId && e.status !== "cancelled",
    );

    console.log(
      "[DBG][google-calendar/sync] Found",
      unsyncedEvents.length,
      "unsynced events out of",
      allEvents.length,
      "total",
    );

    let synced = 0;
    let failed = 0;

    const withMeetLink = updatedConfig.autoAddMeetLink;

    for (const event of unsyncedEvents) {
      try {
        const { googleEventId, meetLink } = await createGoogleEvent(
          client,
          updatedConfig.calendarId,
          event,
          { withMeetLink },
        );

        // Store the Google event ID (and Meet link if generated) on the Cally event
        await calendarEventRepository.updateCalendarEvent(
          tenant.id,
          event.date,
          event.id,
          {
            googleCalendarEventId: googleEventId,
            ...(meetLink ? { meetingLink: meetLink } : {}),
          },
        );

        synced++;
      } catch (error) {
        console.warn(
          "[DBG][google-calendar/sync] Failed to sync event:",
          event.id,
          error,
        );
        failed++;
      }
    }

    console.log(
      "[DBG][google-calendar/sync] Sync complete:",
      synced,
      "synced,",
      failed,
      "failed",
    );

    return NextResponse.json({
      success: true,
      data: {
        total: allEvents.length,
        synced,
        failed,
        alreadySynced: allEvents.length - unsyncedEvents.length,
      },
    });
  } catch (error) {
    console.error("[DBG][google-calendar/sync] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sync events" },
      { status: 500 },
    );
  }
}
