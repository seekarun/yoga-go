/**
 * Google Calendar sync helpers
 *
 * Fire-and-forget push sync: creates/updates/deletes Google Calendar events
 * when CallyGo events change. Failures are logged but don't break the request.
 */

import type { CalendarEvent } from "@/types";
import type { CallyTenant } from "@/lib/repositories/tenantRepository";
import {
  getGoogleCalendarClient,
  createGoogleEvent,
  updateGoogleEvent,
  deleteGoogleEvent,
  addMeetLinkToGoogleEvent,
} from "@/lib/google-calendar";
import { updateTenant } from "@/lib/repositories/tenantRepository";
import * as calendarEventRepository from "@/lib/repositories/calendarEventRepository";

/**
 * Push a newly created CallyGo event to Google Calendar.
 * Updates the CallyGo event with the Google Calendar event ID.
 * Returns the Google event ID if successful, null otherwise.
 */
export async function pushCreateToGoogle(
  tenant: CallyTenant,
  event: CalendarEvent,
): Promise<string | null> {
  if (!tenant.googleCalendarConfig) return null;
  if (tenant.googleCalendarConfig.pushEvents === false) return null;

  try {
    const { client, updatedConfig } = await getGoogleCalendarClient(
      tenant.googleCalendarConfig,
    );

    // Persist refreshed token if it changed
    if (updatedConfig !== tenant.googleCalendarConfig) {
      await updateTenant(tenant.id, {
        googleCalendarConfig: updatedConfig,
      });
    }

    console.log(
      "[DBG][google-calendar-sync] autoAddMeetLink:",
      updatedConfig.autoAddMeetLink,
    );
    const { googleEventId, meetLink } = await createGoogleEvent(
      client,
      updatedConfig.calendarId,
      event,
      {
        withMeetLink:
          updatedConfig.autoAddMeetLink &&
          !!event.hasVideoConference &&
          tenant.videoCallPreference === "google_meet",
      },
    );
    console.log(
      "[DBG][google-calendar-sync] createGoogleEvent result - id:",
      googleEventId,
      "meetLink:",
      meetLink,
    );

    // Store the Google event ID (and Meet link if generated) on the CallyGo event
    // Don't overwrite meetingLink if the event already has one (e.g. from Zoom)
    const eventUpdates: Partial<CalendarEvent> = {
      googleCalendarEventId: googleEventId,
    };
    if (meetLink && !event.meetingLink) {
      eventUpdates.meetingLink = meetLink;
    }

    await calendarEventRepository.updateCalendarEvent(
      tenant.id,
      event.date,
      event.id,
      eventUpdates,
    );

    console.log(
      "[DBG][google-calendar-sync] Pushed create to Google:",
      googleEventId,
      meetLink ? `Meet: ${meetLink}` : "",
    );
    return googleEventId;
  } catch (error) {
    console.warn(
      "[DBG][google-calendar-sync] Failed to push create to Google:",
      error,
    );
    return null;
  }
}

/**
 * Push an updated CallyGo event to Google Calendar
 */
export async function pushUpdateToGoogle(
  tenant: CallyTenant,
  event: CalendarEvent,
): Promise<void> {
  if (!tenant.googleCalendarConfig || !event.googleCalendarEventId) return;
  if (tenant.googleCalendarConfig.pushEvents === false) return;

  try {
    const { client, updatedConfig } = await getGoogleCalendarClient(
      tenant.googleCalendarConfig,
    );

    if (updatedConfig !== tenant.googleCalendarConfig) {
      await updateTenant(tenant.id, {
        googleCalendarConfig: updatedConfig,
      });
    }

    await updateGoogleEvent(
      client,
      updatedConfig.calendarId,
      event.googleCalendarEventId,
      event,
    );

    console.log(
      "[DBG][google-calendar-sync] Pushed update to Google:",
      event.googleCalendarEventId,
    );
  } catch (error) {
    console.warn(
      "[DBG][google-calendar-sync] Failed to push update to Google:",
      error,
    );
  }
}

/**
 * Push a delete to Google Calendar
 */
export async function pushDeleteToGoogle(
  tenant: CallyTenant,
  event: CalendarEvent,
): Promise<void> {
  if (!tenant.googleCalendarConfig || !event.googleCalendarEventId) return;
  if (tenant.googleCalendarConfig.pushEvents === false) return;

  try {
    const { client, updatedConfig } = await getGoogleCalendarClient(
      tenant.googleCalendarConfig,
    );

    if (updatedConfig !== tenant.googleCalendarConfig) {
      await updateTenant(tenant.id, {
        googleCalendarConfig: updatedConfig,
      });
    }

    await deleteGoogleEvent(
      client,
      updatedConfig.calendarId,
      event.googleCalendarEventId,
    );

    console.log(
      "[DBG][google-calendar-sync] Pushed delete to Google:",
      event.googleCalendarEventId,
    );
  } catch (error) {
    console.warn(
      "[DBG][google-calendar-sync] Failed to push delete to Google:",
      error,
    );
  }
}

/**
 * Generate a Google Meet link for a CallyGo event.
 * If the event already exists in Google Calendar, patches it to add Meet.
 * If not, creates a Google Calendar event with Meet.
 * Stores the meetingLink back on the CallyGo event.
 * Returns the Meet link if successful, null otherwise.
 */
export async function generateMeetLinkForEvent(
  tenant: CallyTenant,
  event: CalendarEvent,
): Promise<string | null> {
  if (!tenant.googleCalendarConfig) return null;
  if (event.meetingLink) return event.meetingLink; // Already has a link

  try {
    const { client, updatedConfig } = await getGoogleCalendarClient(
      tenant.googleCalendarConfig,
    );

    if (updatedConfig !== tenant.googleCalendarConfig) {
      await updateTenant(tenant.id, {
        googleCalendarConfig: updatedConfig,
      });
    }

    let meetLink: string | undefined;

    if (event.googleCalendarEventId) {
      // Event already in Google Calendar — patch it to add Meet
      meetLink = await addMeetLinkToGoogleEvent(
        client,
        updatedConfig.calendarId,
        event.googleCalendarEventId,
      );
    } else {
      // Create in Google Calendar with Meet link
      const result = await createGoogleEvent(
        client,
        updatedConfig.calendarId,
        event,
        { withMeetLink: true },
      );
      meetLink = result.meetLink;

      // Store the Google event ID too
      await calendarEventRepository.updateCalendarEvent(
        tenant.id,
        event.date,
        event.id,
        { googleCalendarEventId: result.googleEventId },
      );
    }

    if (meetLink) {
      // Store the Meet link on the CallyGo event
      await calendarEventRepository.updateCalendarEvent(
        tenant.id,
        event.date,
        event.id,
        { meetingLink: meetLink },
      );

      console.log("[DBG][google-calendar-sync] Generated Meet link:", meetLink);
      return meetLink;
    }

    return null;
  } catch (error) {
    console.warn(
      "[DBG][google-calendar-sync] Failed to generate Meet link:",
      error,
    );
    return null;
  }
}
