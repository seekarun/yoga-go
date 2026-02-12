/**
 * POST /api/data/app/outlook-calendar/sync
 * One-time bulk push of existing CallyGo events to Outlook Calendar.
 * Skips events that already have an outlookCalendarEventId.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  updateTenant,
} from "@/lib/repositories/tenantRepository";
import * as calendarEventRepository from "@/lib/repositories/calendarEventRepository";
import { getOutlookClient, createOutlookEvent } from "@/lib/outlook-calendar";

export async function POST() {
  console.log("[DBG][outlook-calendar/sync] POST called");

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

    if (!tenant.outlookCalendarConfig) {
      return NextResponse.json(
        { success: false, error: "Outlook Calendar is not connected" },
        { status: 400 },
      );
    }

    const { updatedConfig } = await getOutlookClient(
      tenant.outlookCalendarConfig,
    );

    if (updatedConfig !== tenant.outlookCalendarConfig) {
      await updateTenant(tenant.id, {
        outlookCalendarConfig: updatedConfig,
      });
    }

    // Get all CallyGo events
    const allEvents = await calendarEventRepository.getTenantCalendarEvents(
      tenant.id,
    );

    // Filter to only events not yet synced
    const unsyncedEvents = allEvents.filter(
      (e) => !e.outlookCalendarEventId && e.status !== "cancelled",
    );

    console.log(
      "[DBG][outlook-calendar/sync] Found",
      unsyncedEvents.length,
      "unsynced events out of",
      allEvents.length,
      "total",
    );

    let synced = 0;
    let failed = 0;

    for (const event of unsyncedEvents) {
      try {
        const outlookEventId = await createOutlookEvent(updatedConfig, event);

        // Store the Outlook event ID on the CallyGo event
        await calendarEventRepository.updateCalendarEvent(
          tenant.id,
          event.date,
          event.id,
          { outlookCalendarEventId: outlookEventId },
        );

        synced++;
      } catch (error) {
        console.warn(
          "[DBG][outlook-calendar/sync] Failed to sync event:",
          event.id,
          error,
        );
        failed++;
      }
    }

    console.log(
      "[DBG][outlook-calendar/sync] Sync complete:",
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
    console.error("[DBG][outlook-calendar/sync] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sync events" },
      { status: 500 },
    );
  }
}
