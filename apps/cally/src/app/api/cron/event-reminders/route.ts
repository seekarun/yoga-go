/**
 * GET /api/cron/event-reminders
 * Cron job to send event reminder emails to attendees.
 *
 * Runs every 5 minutes via Vercel Cron.
 * Sends reminders at two windows:
 * - 24 hours before event start (23h50m–24h10m window)
 * - 10 minutes before event start (5m–15m window)
 *
 * Deduplication: stores reminder24hSentAt / reminder10mSentAt on the event.
 */
import { NextResponse } from "next/server";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, Tables, EntityType } from "@/lib/dynamodb";
import type { CallyTenant } from "@/lib/repositories/tenantRepository";
import {
  getCalendarEventsByDateRange,
  updateCalendarEvent,
} from "@/lib/repositories/calendarEventRepository";
import type { CalendarEvent } from "@/types";
import {
  sendEventReminderEmail,
  type ReminderType,
} from "@/lib/email/eventReminderEmail";

const CRON_SECRET = process.env.CRON_SECRET;

// Time windows in milliseconds
const MS_24H = 24 * 60 * 60 * 1000;
const MS_10M = 10 * 60 * 1000;
const MS_5M = 5 * 60 * 1000;
const MS_15M = 15 * 60 * 1000;

/**
 * Get all tenants (scan for entityType = TENANT)
 */
async function getAllTenants(): Promise<CallyTenant[]> {
  console.log("[DBG][event-reminders] Scanning all tenants");

  const result = await docClient.send(
    new ScanCommand({
      TableName: Tables.CORE,
      FilterExpression: "entityType = :entityType",
      ExpressionAttributeValues: {
        ":entityType": EntityType.TENANT,
      },
    }),
  );

  const tenants = (result.Items || []) as CallyTenant[];
  console.log("[DBG][event-reminders] Found", tenants.length, "tenants");
  return tenants;
}

/**
 * Get today and tomorrow date strings (YYYY-MM-DD) in UTC
 */
function getTodayAndTomorrow(): { today: string; tomorrow: string } {
  const now = new Date();
  const today = now.toISOString().substring(0, 10);
  const tomorrowDate = new Date(now.getTime() + MS_24H + MS_15M);
  const tomorrow = tomorrowDate.toISOString().substring(0, 10);
  return { today, tomorrow };
}

/**
 * Check if event start time falls within a reminder window
 */
function isInWindow(
  eventStartTime: string,
  nowMs: number,
  targetMs: number,
  toleranceMs: number,
): boolean {
  const eventMs = new Date(eventStartTime).getTime();
  const diff = eventMs - nowMs;
  return diff >= targetMs - toleranceMs && diff <= targetMs + toleranceMs;
}

/**
 * Send reminders for a single event and return which type was sent
 */
async function processEvent(
  event: CalendarEvent,
  tenant: CallyTenant,
  nowMs: number,
): Promise<{ sent24h: boolean; sent10m: boolean; errors: number }> {
  let sent24h = false;
  let sent10m = false;
  let errors = 0;

  const attendees = event.attendees || [];

  // Check 24h window: event starts in 23h50m–24h10m
  if (
    !event.reminder24hSentAt &&
    isInWindow(event.startTime, nowMs, MS_24H, MS_10M)
  ) {
    console.log(
      `[DBG][event-reminders] Sending 24h reminders for event "${event.title}" (${event.id})`,
    );
    const sendResults = await sendRemindersToAttendees(
      attendees,
      event,
      tenant,
      "24h",
    );
    errors += sendResults.errors;

    // Mark as sent
    await updateCalendarEvent(tenant.id, event.date, event.id, {
      reminder24hSentAt: new Date().toISOString(),
    });
    sent24h = true;
  }

  // Check 10m window: event starts in 5m–15m
  if (
    !event.reminder10mSentAt &&
    isInWindow(event.startTime, nowMs, MS_10M, MS_5M)
  ) {
    console.log(
      `[DBG][event-reminders] Sending 10m reminders for event "${event.title}" (${event.id})`,
    );
    const sendResults = await sendRemindersToAttendees(
      attendees,
      event,
      tenant,
      "10m",
    );
    errors += sendResults.errors;

    // Mark as sent
    await updateCalendarEvent(tenant.id, event.date, event.id, {
      reminder10mSentAt: new Date().toISOString(),
    });
    sent10m = true;
  }

  return { sent24h, sent10m, errors };
}

/**
 * Send reminder emails to all attendees of an event
 */
async function sendRemindersToAttendees(
  attendees: CalendarEvent["attendees"],
  event: CalendarEvent,
  tenant: CallyTenant,
  reminderType: ReminderType,
): Promise<{ errors: number }> {
  let errors = 0;

  for (const attendee of attendees || []) {
    try {
      await sendEventReminderEmail({
        attendeeName: attendee.name,
        attendeeEmail: attendee.email,
        eventTitle: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        tenant,
        reminderType,
      });
    } catch (error) {
      console.error(
        `[DBG][event-reminders] Failed to send ${reminderType} reminder to ${attendee.email}:`,
        error,
      );
      errors++;
    }
  }

  return { errors };
}

/**
 * GET - Cron job handler
 */
export async function GET(request: Request) {
  console.log("[DBG][event-reminders] Cron job triggered");

  // Verify Vercel Cron secret
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      console.warn("[DBG][event-reminders] Unauthorized cron request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const startTime = Date.now();
  const results = {
    checked: 0,
    reminded24h: 0,
    reminded10m: 0,
    errors: 0,
  };

  try {
    const tenants = await getAllTenants();
    const nowMs = Date.now();
    const { today, tomorrow } = getTodayAndTomorrow();

    for (const tenant of tenants) {
      // Get events for today + tomorrow to cover the 24h window
      const events = await getCalendarEventsByDateRange(
        tenant.id,
        today,
        tomorrow,
      );

      // Filter to scheduled events with attendees
      const eligible = events.filter(
        (e) =>
          e.status === "scheduled" && e.attendees && e.attendees.length > 0,
      );
      results.checked += eligible.length;

      for (const event of eligible) {
        const result = await processEvent(event, tenant, nowMs);
        if (result.sent24h) results.reminded24h++;
        if (result.sent10m) results.reminded10m++;
        results.errors += result.errors;
      }
    }

    const durationMs = Date.now() - startTime;
    console.log(
      "[DBG][event-reminders] Cron job completed in",
      durationMs,
      "ms",
      results,
    );

    return NextResponse.json({
      success: true,
      data: {
        ...results,
        durationMs,
      },
    });
  } catch (error) {
    console.error("[DBG][event-reminders] Cron job error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: results,
      },
      { status: 500 },
    );
  }
}
