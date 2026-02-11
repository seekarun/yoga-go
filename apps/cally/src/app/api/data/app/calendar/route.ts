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
  RecurrenceRule,
} from "@/types";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import * as calendarEventRepository from "@/lib/repositories/calendarEventRepository";
import { createHmsRoomForEvent } from "@/lib/100ms-meeting";
import { is100msConfigured } from "@/lib/100ms-auth";
import {
  pushCreateToGoogle,
  generateMeetLinkForEvent,
} from "@/lib/google-calendar-sync";
import {
  getGoogleCalendarClient,
  listGoogleEvents,
} from "@/lib/google-calendar";
import { updateTenant } from "@/lib/repositories/tenantRepository";
import { createZoomMeeting, getZoomClient } from "@/lib/zoom";
import { pushCreateToOutlook } from "@/lib/outlook-calendar-sync";
import { getOutlookClient, listOutlookEvents } from "@/lib/outlook-calendar";
import { expandRecurrence } from "@/lib/recurrence";

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

    // Fetch Cally events, Google Calendar events, and Outlook events in parallel
    const eventsPromise = calendarEventRepository.getCalendarEventsByDateRange(
      tenantId,
      startDate,
      endDate,
    );

    let googleItems: CalendarItem[] = [];
    const googleCalendarConfig = tenant.googleCalendarConfig;

    if (googleCalendarConfig) {
      try {
        const { client, updatedConfig } =
          await getGoogleCalendarClient(googleCalendarConfig);

        if (updatedConfig !== googleCalendarConfig) {
          await updateTenant(tenantId, {
            googleCalendarConfig: updatedConfig,
          });
        }

        const googleEvents = await listGoogleEvents(
          client,
          updatedConfig.calendarId,
          start,
          end,
        );

        googleItems = googleEvents
          .filter((ge) => ge.start?.dateTime && ge.end?.dateTime)
          .map((ge) => ({
            id: `gcal_${ge.id}`,
            title: ge.summary || "(No title)",
            start: ge.start!.dateTime!,
            end: ge.end!.dateTime!,
            allDay: false,
            type: "event" as const,
            color: "#4285F4", // Google blue
            extendedProps: {
              description: ge.description || undefined,
              location: ge.location || undefined,
              status: "scheduled" as const,
              source: "google_calendar",
            },
          }));
      } catch (error) {
        console.warn(
          "[DBG][calendar] Failed to fetch Google Calendar events:",
          error,
        );
      }
    }

    let outlookItems: CalendarItem[] = [];
    const outlookCalendarConfig = tenant.outlookCalendarConfig;

    if (outlookCalendarConfig) {
      try {
        const { updatedConfig } = await getOutlookClient(outlookCalendarConfig);

        if (updatedConfig !== outlookCalendarConfig) {
          await updateTenant(tenantId, {
            outlookCalendarConfig: updatedConfig,
          });
        }

        const outlookEvents = await listOutlookEvents(
          updatedConfig,
          start,
          end,
        );

        outlookItems = outlookEvents
          .filter((oe) => oe.start?.dateTime && oe.end?.dateTime)
          .map((oe) => {
            // Graph API returns dateTime without Z suffix when using UTC preference
            // e.g. "2026-02-11T03:30:00.0000000" — append Z so browsers parse as UTC
            const startDt = oe.start!.dateTime!;
            const endDt = oe.end!.dateTime!;
            const ensureUtc = (dt: string) =>
              dt.endsWith("Z") ? dt : new Date(dt + "Z").toISOString();

            return {
              id: `outlook_${oe.id}`,
              title: oe.subject || "(No title)",
              start: ensureUtc(startDt),
              end: ensureUtc(endDt),
              allDay: oe.isAllDay || false,
              type: "event" as const,
              color: "#0078D4", // Outlook blue
              extendedProps: {
                description: oe.body?.content || undefined,
                location: oe.location?.displayName || undefined,
                status: "scheduled" as const,
                source: "outlook_calendar",
              },
            };
          });
      } catch (error) {
        console.warn(
          "[DBG][calendar] Failed to fetch Outlook Calendar events:",
          error,
        );
      }
    }

    const events = await eventsPromise;

    // Collect Google event IDs from Cally events to avoid duplicates
    const syncedGoogleIds = new Set(
      events.map((e) => e.googleCalendarEventId).filter(Boolean),
    );

    // Filter out Google events that are already synced as Cally events
    const filteredGoogleItems = googleItems.filter((gi) => {
      const googleId = gi.id.replace("gcal_", "");
      return !syncedGoogleIds.has(googleId);
    });

    // Collect Outlook event IDs from Cally events to avoid duplicates
    const syncedOutlookIds = new Set(
      events.map((e) => e.outlookCalendarEventId).filter(Boolean),
    );

    // Filter out Outlook events that are already synced as Cally events
    const filteredOutlookItems = outlookItems.filter((oi) => {
      const outlookId = oi.id.replace("outlook_", "");
      return !syncedOutlookIds.has(outlookId);
    });

    // Color constants for status-based overrides
    const PENDING_COLOR = "#f59e0b"; // Amber for pending bookings

    // Transform Cally events to CalendarItem format for FullCalendar
    const calendarItems: CalendarItem[] = events.map((event) => {
      // Override color for pending events so they stand out
      const color =
        event.status === "pending" ? PENDING_COLOR : event.color || EVENT_COLOR;

      return {
        id: event.id,
        title: event.title,
        start: event.startTime,
        end: event.endTime,
        allDay: event.isAllDay,
        type: "event",
        color,
        extendedProps: {
          description: event.description,
          meetingLink: event.meetingLink,
          location: event.location,
          status: event.status,
          // 100ms Video conferencing
          hasVideoConference: event.hasVideoConference,
          hmsRoomId: event.hmsRoomId,
          hmsTemplateId: event.hmsTemplateId,
          // Recurrence
          recurrenceGroupId: event.recurrenceGroupId,
        },
      };
    });

    // Merge Google Calendar events
    calendarItems.push(...filteredGoogleItems);

    // Merge Outlook Calendar events
    calendarItems.push(...filteredOutlookItems);

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

    // Handle recurring events
    const recurrenceRule = body.recurrenceRule as RecurrenceRule | undefined;

    if (recurrenceRule) {
      // Block video conferencing for recurring events
      if (body.hasVideoConference) {
        return NextResponse.json<ApiResponse<CalendarEvent>>(
          {
            success: false,
            error:
              "Video conferencing is not supported for recurring events. Create individual events instead.",
          },
          { status: 400 },
        );
      }

      console.log(
        "[DBG][calendar] Creating recurring event series with rule:",
        recurrenceRule.frequency,
      );

      const recurrenceGroupId = `rgrp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const occurrenceDates = expandRecurrence(startTime, recurrenceRule);

      console.log(
        "[DBG][calendar] Expanded to",
        occurrenceDates.length,
        "occurrences",
      );

      // Compute time-of-day offset from the original startTime
      const originalStart = new Date(startTime);
      const originalEnd = new Date(endTime);
      const durationMs = originalEnd.getTime() - originalStart.getTime();

      const events: CalendarEvent[] = [];
      for (let i = 0; i < occurrenceDates.length; i++) {
        const occDate = occurrenceDates[i];
        // Preserve the time-of-day from the original start, change the date
        const occStart = new Date(originalStart);
        const [year, month, day] = occDate.split("-").map(Number);
        occStart.setFullYear(year, month - 1, day);
        const occEnd = new Date(occStart.getTime() + durationMs);

        const occInput: CreateCalendarEventInput = {
          title,
          description: body.description,
          startTime: occStart.toISOString(),
          endTime: occEnd.toISOString(),
          date: occDate,
          type: "general",
          location: body.location,
          isAllDay: body.isAllDay,
          color: body.color,
          notes: body.notes,
          recurrenceGroupId,
          // Store recurrenceRule only on the first instance
          recurrenceRule: i === 0 ? recurrenceRule : undefined,
        };

        const event = await calendarEventRepository.createCalendarEvent(
          tenantId,
          occInput,
        );
        events.push(event);
      }

      console.log(
        "[DBG][calendar] Created",
        events.length,
        "recurring event instances",
      );

      // Fire-and-forget push each instance to Google/Outlook for sync
      for (const event of events) {
        if (tenant.googleCalendarConfig) {
          pushCreateToGoogle(tenant, event).catch((err) =>
            console.warn(
              "[DBG][calendar] Google push failed for recurring instance:",
              err,
            ),
          );
        }
        if (tenant.outlookCalendarConfig) {
          pushCreateToOutlook(tenant, event).catch((err) =>
            console.warn(
              "[DBG][calendar] Outlook push failed for recurring instance:",
              err,
            ),
          );
        }
      }

      // Return the first event (frontend refetches via onEventCreated)
      return NextResponse.json<ApiResponse<CalendarEvent>>({
        success: true,
        data: events[0],
      });
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

    // Determine video call preference
    const useGoogleMeet =
      tenant.videoCallPreference === "google_meet" &&
      !!tenant.googleCalendarConfig;
    const useZoom =
      tenant.videoCallPreference === "zoom" && !!tenant.zoomConfig;

    // Create Zoom meeting if requested
    if (body.hasVideoConference && useZoom) {
      console.log("[DBG][calendar] Creating Zoom meeting for event");
      try {
        const durationMs =
          new Date(endTime).getTime() - new Date(startTime).getTime();
        const durationMinutes = Math.max(Math.round(durationMs / 60000), 15);

        const { joinUrl } = await createZoomMeeting(
          tenant.zoomConfig!,
          title,
          startTime,
          durationMinutes,
        );
        input.meetingLink = joinUrl;
        console.log("[DBG][calendar] Zoom meeting created:", joinUrl);

        // Persist refreshed token if it was updated
        const { updatedConfig } = await getZoomClient(tenant.zoomConfig!);
        if (updatedConfig !== tenant.zoomConfig) {
          await updateTenant(tenantId, { zoomConfig: updatedConfig });
        }
      } catch (zoomError) {
        console.warn(
          "[DBG][calendar] Zoom meeting creation failed, falling back to 100ms:",
          zoomError,
        );
        // Fall back to 100ms
        if (is100msConfigured()) {
          const tempEventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          try {
            const hmsResult = await createHmsRoomForEvent(
              tenantId,
              tempEventId,
              title,
            );
            input.hmsRoomId = hmsResult.roomId;
            input.hmsTemplateId = hmsResult.templateId;
          } catch (hmsErr) {
            console.warn("[DBG][calendar] 100ms fallback also failed:", hmsErr);
          }
        }
      }
    }

    // Create 100ms room for Cally Video (default)
    if (body.hasVideoConference && !useGoogleMeet && !useZoom) {
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

    // Push to Outlook Calendar for sync (fire-and-forget)
    // Placed before Google Calendar blocks which may return early
    if (tenant.outlookCalendarConfig) {
      pushCreateToOutlook(tenant, event).catch((err) =>
        console.warn("[DBG][calendar] Outlook push failed:", err),
      );
    }

    // If Google Meet was requested, generate a Meet link for the event
    if (body.hasVideoConference && useGoogleMeet) {
      console.log(
        "[DBG][calendar] Generating Google Meet link for event:",
        event.id,
      );
      try {
        const meetLink = await generateMeetLinkForEvent(tenant, event);
        if (meetLink) {
          console.log("[DBG][calendar] Google Meet link generated:", meetLink);
          const updatedEvent =
            await calendarEventRepository.getCalendarEventById(
              tenantId,
              event.date,
              event.id,
            );
          if (updatedEvent) {
            return NextResponse.json<ApiResponse<CalendarEvent>>({
              success: true,
              data: updatedEvent,
            });
          }
        } else {
          // Fall back to 100ms if Meet link generation failed
          console.warn(
            "[DBG][calendar] Google Meet link generation returned null, falling back to 100ms",
          );
          if (is100msConfigured()) {
            const tempEventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            try {
              const hmsResult = await createHmsRoomForEvent(
                tenantId,
                tempEventId,
                title,
              );
              await calendarEventRepository.updateCalendarEvent(
                tenantId,
                event.date,
                event.id,
                {
                  hmsRoomId: hmsResult.roomId,
                  hmsTemplateId: hmsResult.templateId,
                },
              );
              const fallbackEvent =
                await calendarEventRepository.getCalendarEventById(
                  tenantId,
                  event.date,
                  event.id,
                );
              if (fallbackEvent) {
                return NextResponse.json<ApiResponse<CalendarEvent>>({
                  success: true,
                  data: fallbackEvent,
                });
              }
            } catch (hmsErr) {
              console.warn(
                "[DBG][calendar] 100ms fallback also failed:",
                hmsErr,
              );
            }
          }
        }
      } catch (meetErr) {
        console.warn(
          "[DBG][calendar] Google Meet link generation failed:",
          meetErr,
        );
      }
    }

    // Push to Google Calendar for sync
    // Skip if we already pushed via generateMeetLinkForEvent above
    // When Zoom is the video provider, still sync but don't let Google add a Meet link
    if (
      tenant.googleCalendarConfig &&
      !(body.hasVideoConference && useGoogleMeet)
    ) {
      console.log(
        "[DBG][calendar] Google Calendar config exists:",
        !!tenant.googleCalendarConfig,
        "autoAddMeetLink:",
        tenant.googleCalendarConfig?.autoAddMeetLink,
      );
      try {
        const googleEventId = await pushCreateToGoogle(tenant, event);
        console.log(
          "[DBG][calendar] pushCreateToGoogle result:",
          googleEventId,
        );
        // Re-fetch event to get the meetingLink and googleCalendarEventId
        const updatedEvent = await calendarEventRepository.getCalendarEventById(
          tenantId,
          event.date,
          event.id,
        );
        console.log(
          "[DBG][calendar] Re-fetched event meetingLink:",
          updatedEvent?.meetingLink,
        );
        if (updatedEvent) {
          return NextResponse.json<ApiResponse<CalendarEvent>>({
            success: true,
            data: updatedEvent,
          });
        }
      } catch (err) {
        console.warn("[DBG][calendar] Google push failed:", err);
      }
    }

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
