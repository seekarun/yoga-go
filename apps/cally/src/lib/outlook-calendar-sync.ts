/**
 * Outlook Calendar sync helpers
 *
 * Fire-and-forget push sync: creates/updates/deletes Outlook Calendar events
 * when CallyGo events change. Failures are logged but don't break the request.
 */

import type { CalendarEvent } from "@/types";
import type { CallyTenant } from "@/lib/repositories/tenantRepository";
import {
  getOutlookClient,
  createOutlookEvent,
  updateOutlookEvent,
  deleteOutlookEvent,
} from "@/lib/outlook-calendar";
import { updateTenant } from "@/lib/repositories/tenantRepository";
import * as calendarEventRepository from "@/lib/repositories/calendarEventRepository";

/**
 * Push a newly created CallyGo event to Outlook Calendar.
 * Updates the CallyGo event with the Outlook Calendar event ID.
 * Returns the Outlook event ID if successful, null otherwise.
 */
export async function pushCreateToOutlook(
  tenant: CallyTenant,
  event: CalendarEvent,
): Promise<string | null> {
  if (!tenant.outlookCalendarConfig) return null;
  if (tenant.outlookCalendarConfig.pushEvents === false) return null;

  try {
    const { updatedConfig } = await getOutlookClient(
      tenant.outlookCalendarConfig,
    );

    // Persist refreshed token if it changed
    if (updatedConfig !== tenant.outlookCalendarConfig) {
      await updateTenant(tenant.id, {
        outlookCalendarConfig: updatedConfig,
      });
    }

    const outlookEventId = await createOutlookEvent(updatedConfig, event);

    // Store the Outlook event ID on the CallyGo event
    await calendarEventRepository.updateCalendarEvent(
      tenant.id,
      event.date,
      event.id,
      { outlookCalendarEventId: outlookEventId },
    );

    console.log(
      "[DBG][outlook-calendar-sync] Pushed create to Outlook:",
      outlookEventId,
    );
    return outlookEventId;
  } catch (error) {
    console.warn(
      "[DBG][outlook-calendar-sync] Failed to push create to Outlook:",
      error,
    );
    return null;
  }
}

/**
 * Push an updated CallyGo event to Outlook Calendar
 */
export async function pushUpdateToOutlook(
  tenant: CallyTenant,
  event: CalendarEvent,
): Promise<void> {
  if (!tenant.outlookCalendarConfig || !event.outlookCalendarEventId) return;
  if (tenant.outlookCalendarConfig.pushEvents === false) return;

  try {
    const { updatedConfig } = await getOutlookClient(
      tenant.outlookCalendarConfig,
    );

    if (updatedConfig !== tenant.outlookCalendarConfig) {
      await updateTenant(tenant.id, {
        outlookCalendarConfig: updatedConfig,
      });
    }

    await updateOutlookEvent(
      updatedConfig,
      event.outlookCalendarEventId,
      event,
    );

    console.log(
      "[DBG][outlook-calendar-sync] Pushed update to Outlook:",
      event.outlookCalendarEventId,
    );
  } catch (error) {
    console.warn(
      "[DBG][outlook-calendar-sync] Failed to push update to Outlook:",
      error,
    );
  }
}

/**
 * Push a delete to Outlook Calendar
 */
export async function pushDeleteToOutlook(
  tenant: CallyTenant,
  event: CalendarEvent,
): Promise<void> {
  if (!tenant.outlookCalendarConfig || !event.outlookCalendarEventId) return;
  if (tenant.outlookCalendarConfig.pushEvents === false) return;

  try {
    const { updatedConfig } = await getOutlookClient(
      tenant.outlookCalendarConfig,
    );

    if (updatedConfig !== tenant.outlookCalendarConfig) {
      await updateTenant(tenant.id, {
        outlookCalendarConfig: updatedConfig,
      });
    }

    await deleteOutlookEvent(updatedConfig, event.outlookCalendarEventId);

    console.log(
      "[DBG][outlook-calendar-sync] Pushed delete to Outlook:",
      event.outlookCalendarEventId,
    );
  } catch (error) {
    console.warn(
      "[DBG][outlook-calendar-sync] Failed to push delete to Outlook:",
      error,
    );
  }
}
