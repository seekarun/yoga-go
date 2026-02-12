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
  sendBookingDeclinedEmail,
  parseVisitorFromDescription,
} from "@/lib/email/bookingNotification";
import {
  sendBookingCancelledEmailToVisitor,
  sendBookingCancelledEmailToTenant,
} from "@/lib/email/bookingCancelledEmail";
import {
  pushUpdateToGoogle,
  pushDeleteToGoogle,
  generateMeetLinkForEvent,
} from "@/lib/google-calendar-sync";
import {
  pushUpdateToOutlook,
  pushDeleteToOutlook,
} from "@/lib/outlook-calendar-sync";
import { buildCancelUrl } from "@/lib/cancel-token";
import { getPaymentIntent, createFullRefund } from "@/lib/stripe";

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
    const { searchParams } = new URL(request.url);
    const updateFuture = searchParams.get("updateFuture") === "true";

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
    if (body.attendees !== undefined) updates.attendees = body.attendees;

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

    // Handle updating future events in a recurrence group
    if (
      updateFuture &&
      currentEvent.recurrenceGroupId &&
      body.startTime &&
      body.endTime
    ) {
      console.log(
        "[DBG][calendar/events/[eventId]] Updating future events in recurrence group:",
        currentEvent.recurrenceGroupId,
      );

      // Compute time delta: how much the start time shifted
      const startDeltaMs =
        new Date(body.startTime).getTime() -
        new Date(currentEvent.startTime).getTime();
      const endDeltaMs =
        new Date(body.endTime).getTime() -
        new Date(currentEvent.endTime).getTime();

      // Fetch all events in the recurrence group
      const groupEvents =
        await calendarEventRepository.getCalendarEventsByRecurrenceGroup(
          tenantId,
          currentEvent.recurrenceGroupId,
        );

      // Filter to future events (date >= current event's date) excluding the current event
      const futureEvents = groupEvents.filter(
        (evt) => evt.date >= currentEvent.date && evt.id !== currentEvent.id,
      );

      console.log(
        "[DBG][calendar/events/[eventId]] Found",
        futureEvents.length,
        "future events to update",
      );

      for (const futureEvent of futureEvents) {
        const shiftedStart = new Date(
          new Date(futureEvent.startTime).getTime() + startDeltaMs,
        ).toISOString();
        const shiftedEnd = new Date(
          new Date(futureEvent.endTime).getTime() + endDeltaMs,
        ).toISOString();

        const futureUpdates: Partial<CalendarEvent> = {
          startTime: shiftedStart,
          endTime: shiftedEnd,
        };
        if (body.title !== undefined) futureUpdates.title = body.title;
        if (body.description !== undefined)
          futureUpdates.description = body.description;
        if (body.location !== undefined) futureUpdates.location = body.location;

        const updatedFutureEvent =
          await calendarEventRepository.updateCalendarEvent(
            tenantId,
            futureEvent.date,
            futureEvent.id,
            futureUpdates,
          );

        // Fire-and-forget sync for each updated future event
        if (updatedFutureEvent) {
          pushUpdateToGoogle(tenant, updatedFutureEvent).catch((err) =>
            console.warn(
              "[DBG][calendar/events/[eventId]] Google push failed for future event:",
              err,
            ),
          );
          pushUpdateToOutlook(tenant, updatedFutureEvent).catch((err) =>
            console.warn(
              "[DBG][calendar/events/[eventId]] Outlook push failed for future event:",
              err,
            ),
          );
        }
      }

      console.log(
        "[DBG][calendar/events/[eventId]] Updated",
        futureEvents.length,
        "future events",
      );
    }

    // Push update to Google Calendar (fire-and-forget)
    pushUpdateToGoogle(tenant, updatedEvent).catch((err) =>
      console.warn("[DBG][calendar/events/[eventId]] Google push failed:", err),
    );

    // Push update to Outlook Calendar (fire-and-forget)
    pushUpdateToOutlook(tenant, updatedEvent).catch((err) =>
      console.warn(
        "[DBG][calendar/events/[eventId]] Outlook push failed:",
        err,
      ),
    );

    // Generate Meet link on approval if autoAddMeetLink is enabled
    const isApproval =
      currentEvent.status === "pending" && body.status === "scheduled";
    if (
      isApproval &&
      tenant.googleCalendarConfig?.autoAddMeetLink &&
      !updatedEvent.meetingLink
    ) {
      const meetLink = await generateMeetLinkForEvent(tenant, updatedEvent);
      if (meetLink) {
        updatedEvent.meetingLink = meetLink;
      }
    }

    // Send booking emails on status transitions
    const isBookingStatusChange =
      (currentEvent.status === "pending" ||
        currentEvent.status === "scheduled") &&
      body.status &&
      body.status !== currentEvent.status;

    if (isBookingStatusChange) {
      const visitor = parseVisitorFromDescription(currentEvent.description);
      if (visitor) {
        if (body.status === "scheduled") {
          // Generate cancel URL for the confirmed email
          let cancelUrl: string | undefined;
          try {
            cancelUrl = buildCancelUrl(tenant, {
              tenantId: tenant.id,
              eventId: updatedEvent.id,
              date: updatedEvent.date,
            });
          } catch (err) {
            console.warn(
              "[DBG][calendar/events/[eventId]] Failed to generate cancel URL:",
              err,
            );
          }

          await sendBookingConfirmedEmail({
            visitorName: visitor.visitorName,
            visitorEmail: visitor.visitorEmail,
            note: visitor.note,
            startTime: updatedEvent.startTime,
            endTime: updatedEvent.endTime,
            tenant,
            message: body.message,
            cancelUrl,
          });
        } else if (body.status === "cancelled") {
          // Tenant cancelling — issue full refund if paid
          const currency = tenant.currency ?? "AUD";
          let refundAmountCents = 0;
          let stripeRefundId: string | undefined;

          if (updatedEvent.stripePaymentIntentId) {
            try {
              const pi = await getPaymentIntent(
                updatedEvent.stripePaymentIntentId,
              );
              refundAmountCents = pi.amount;
              const refund = await createFullRefund(
                updatedEvent.stripePaymentIntentId,
              );
              stripeRefundId = refund.id;
              console.log(
                "[DBG][calendar/events/[eventId]] Full refund issued:",
                stripeRefundId,
              );

              // Update event with refund info
              await calendarEventRepository.updateCalendarEvent(
                tenantId,
                updatedEvent.date,
                updatedEvent.id,
                {
                  cancelledBy: "tenant",
                  cancelledAt: new Date().toISOString(),
                  refundAmountCents,
                  stripeRefundId,
                },
              );
            } catch (refundErr) {
              console.error(
                "[DBG][calendar/events/[eventId]] Refund failed:",
                refundErr,
              );
            }
          } else {
            // No payment — still record cancellation metadata
            await calendarEventRepository.updateCalendarEvent(
              tenantId,
              updatedEvent.date,
              updatedEvent.id,
              {
                cancelledBy: "tenant",
                cancelledAt: new Date().toISOString(),
              },
            );
          }

          // Send cancellation email (with refund info) instead of decline email
          if (refundAmountCents > 0 || updatedEvent.stripePaymentIntentId) {
            await sendBookingCancelledEmailToVisitor({
              visitorName: visitor.visitorName,
              visitorEmail: visitor.visitorEmail,
              startTime: updatedEvent.startTime,
              endTime: updatedEvent.endTime,
              tenant,
              cancelledBy: "tenant",
              refundAmountCents,
              currency,
              isFullRefund: true,
              message: body.message,
            });
          } else {
            // Non-paid booking — send regular decline email
            await sendBookingDeclinedEmail({
              visitorName: visitor.visitorName,
              visitorEmail: visitor.visitorEmail,
              startTime: updatedEvent.startTime,
              endTime: updatedEvent.endTime,
              tenant,
              message: body.message,
            });
          }
        }
      } else if (body.status === "scheduled" || body.status === "cancelled") {
        console.warn(
          "[DBG][calendar/events/[eventId]] Could not parse visitor info for booking email",
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
 * Query params:
 *   - deleteAll=true: Delete all events in the recurrence series
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const { eventId } = await params;
  console.log("[DBG][calendar/events/[eventId]] DELETE called for:", eventId);

  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<
        ApiResponse<{ deleted: boolean; count?: number }>
      >({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const tenant = await getTenantByUserId(session.user.cognitoSub);
    if (!tenant) {
      return NextResponse.json<
        ApiResponse<{ deleted: boolean; count?: number }>
      >({ success: false, error: "Tenant not found" }, { status: 404 });
    }

    const tenantId = tenant.id;
    const { searchParams } = new URL(request.url);
    const deleteAll = searchParams.get("deleteAll") === "true";

    // Get current event to find its date
    const currentEvent = await calendarEventRepository.getCalendarEventByIdOnly(
      tenantId,
      eventId,
    );

    if (!currentEvent) {
      return NextResponse.json<
        ApiResponse<{ deleted: boolean; count?: number }>
      >({ success: false, error: "Event not found" }, { status: 404 });
    }

    // Delete all events in the recurrence series
    if (deleteAll && currentEvent.recurrenceGroupId) {
      console.log(
        "[DBG][calendar/events/[eventId]] Deleting entire recurrence group:",
        currentEvent.recurrenceGroupId,
      );

      const deletedEvents =
        await calendarEventRepository.deleteCalendarEventsByRecurrenceGroup(
          tenantId,
          currentEvent.recurrenceGroupId,
        );

      // Push delete to Google/Outlook for each deleted event (fire-and-forget)
      for (const event of deletedEvents) {
        pushDeleteToGoogle(tenant, event).catch((err) =>
          console.warn(
            "[DBG][calendar/events/[eventId]] Google delete failed for series event:",
            err,
          ),
        );
        pushDeleteToOutlook(tenant, event).catch((err) =>
          console.warn(
            "[DBG][calendar/events/[eventId]] Outlook delete failed for series event:",
            err,
          ),
        );
      }

      console.log(
        "[DBG][calendar/events/[eventId]] Deleted",
        deletedEvents.length,
        "events from recurrence group",
      );
      return NextResponse.json<
        ApiResponse<{ deleted: boolean; count?: number }>
      >({
        success: true,
        data: { deleted: true, count: deletedEvents.length },
      });
    }

    // Push delete to Google Calendar (fire-and-forget, before deleting locally)
    pushDeleteToGoogle(tenant, currentEvent).catch((err) =>
      console.warn(
        "[DBG][calendar/events/[eventId]] Google delete failed:",
        err,
      ),
    );

    // Push delete to Outlook Calendar (fire-and-forget, before deleting locally)
    pushDeleteToOutlook(tenant, currentEvent).catch((err) =>
      console.warn(
        "[DBG][calendar/events/[eventId]] Outlook delete failed:",
        err,
      ),
    );

    console.log("[DBG][calendar/events/[eventId]] Deleting event:", eventId);

    const deleted = await calendarEventRepository.deleteCalendarEvent(
      tenantId,
      currentEvent.date,
      eventId,
    );

    if (!deleted) {
      return NextResponse.json<
        ApiResponse<{ deleted: boolean; count?: number }>
      >({ success: false, error: "Failed to delete event" }, { status: 500 });
    }

    console.log("[DBG][calendar/events/[eventId]] Deleted event:", eventId);
    return NextResponse.json<ApiResponse<{ deleted: boolean; count?: number }>>(
      {
        success: true,
        data: { deleted: true },
      },
    );
  } catch (error) {
    console.error("[DBG][calendar/events/[eventId]] Error deleting:", error);
    return NextResponse.json<ApiResponse<{ deleted: boolean; count?: number }>>(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete event",
      },
      { status: 500 },
    );
  }
}
