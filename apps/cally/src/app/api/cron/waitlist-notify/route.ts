/**
 * GET /api/cron/waitlist-notify
 * Cron job to handle waitlist expiry and cascade notifications.
 *
 * Runs every 5 minutes via Vercel Cron.
 *
 * Booking waitlist:
 * 1. Expired notifications: entries where status="notified" and expiresAt < now
 *    → Mark as "expired", then notify the next person in line (if slots still available).
 * 2. Past-date cleanup: entries for dates that have passed → mark as "expired".
 *
 * Webinar waitlist:
 * 3. Past webinar cleanup: if all sessions are in the past → mark as "expired".
 * 4. Expired notifications: if status="notified" and expiresAt < now → expire and cascade.
 */

import { NextResponse } from "next/server";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, Tables, EntityType } from "@/lib/dynamodb";
import { getTenantById } from "@/lib/repositories/tenantRepository";
import {
  updateWaitlistEntry,
  getNextWaitingEntry,
} from "@/lib/repositories/waitlistRepository";
import { getCalendarEventsByDateRange } from "@/lib/repositories/calendarEventRepository";
import { generateAvailableSlots } from "@/lib/booking/availability";
import { DEFAULT_BOOKING_CONFIG } from "@/types/booking";
import { getLandingPageUrl } from "@/lib/email/bookingNotification";
import { sendWaitlistSlotAvailableEmail } from "@/lib/email/waitlistNotificationEmail";
import {
  getActiveWebinarWaitlistItems,
  updateWebinarWaitlistEntry,
  getNextWaitingWebinarEntry,
} from "@/lib/repositories/webinarWaitlistRepository";
import { countWebinarSignups } from "@/lib/repositories/webinarSignupRepository";
import { getProductById } from "@/lib/repositories/productRepository";
import { expandWebinarSessions } from "@/lib/webinar/schedule";
import { sendWebinarWaitlistSlotAvailableEmail } from "@/lib/email/webinarWaitlistEmail";

const CRON_SECRET = process.env.CRON_SECRET;

interface ActiveWaitlistItem {
  tenantId: string;
  date: string;
  id: string;
  status: string;
  expiresAt?: string;
}

/**
 * Scan for all active waitlist entries (status = "notified" or "waiting")
 */
async function getActiveWaitlistEntries(): Promise<ActiveWaitlistItem[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: Tables.CORE,
      FilterExpression:
        "entityType = :entityType AND (#st = :waiting OR #st = :notified)",
      ExpressionAttributeValues: {
        ":entityType": EntityType.WAITLIST,
        ":waiting": "waiting",
        ":notified": "notified",
      },
      ExpressionAttributeNames: {
        "#st": "status",
        "#dt": "date",
      },
      ProjectionExpression: "tenantId, #dt, id, #st, expiresAt",
    }),
  );

  return (result.Items || []) as ActiveWaitlistItem[];
}

/**
 * Check if a date has available slots for a tenant
 */
async function hasAvailableSlots(
  tenantId: string,
  date: string,
): Promise<boolean> {
  const tenant = await getTenantById(tenantId);
  if (!tenant) return false;

  const bookingConfig = {
    ...DEFAULT_BOOKING_CONFIG,
    ...tenant.bookingConfig,
    weeklySchedule: {
      ...DEFAULT_BOOKING_CONFIG.weeklySchedule,
      ...tenant.bookingConfig?.weeklySchedule,
    },
  };

  const events = await getCalendarEventsByDateRange(tenantId, date, date);
  const activeEvents = events.filter(
    (e) => e.status === "scheduled" || e.status === "pending",
  );
  const slots = generateAvailableSlots(date, bookingConfig, activeEvents);
  return slots.some((s) => s.available);
}

/**
 * GET - Cron job handler
 */
export async function GET(request: Request) {
  console.log("[DBG][waitlist-notify] Cron job triggered");

  // Verify Vercel Cron secret
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      console.warn("[DBG][waitlist-notify] Unauthorized cron request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const startTime = Date.now();
  const results = {
    expired: 0,
    pastDateCleaned: 0,
    notified: 0,
    errors: 0,
    webinarExpired: 0,
    webinarPastCleaned: 0,
    webinarNotified: 0,
    webinarErrors: 0,
  };

  try {
    const entries = await getActiveWaitlistEntries();
    const now = new Date();
    const todayStr = now.toISOString().substring(0, 10);

    console.log(
      `[DBG][waitlist-notify] Processing ${entries.length} active entries`,
    );

    // Track dates we've already notified someone for (to avoid double-notify in same cron run)
    const notifiedDates = new Set<string>();

    for (const entry of entries) {
      try {
        // 1. Past-date cleanup
        if (entry.date < todayStr) {
          await updateWaitlistEntry(entry.tenantId, entry.date, entry.id, {
            status: "expired",
          });
          results.pastDateCleaned++;
          continue;
        }

        // 2. Handle expired notifications
        if (
          entry.status === "notified" &&
          entry.expiresAt &&
          new Date(entry.expiresAt) < now
        ) {
          await updateWaitlistEntry(entry.tenantId, entry.date, entry.id, {
            status: "expired",
          });
          results.expired++;

          // Notify next person in line if we haven't already for this tenant+date
          const key = `${entry.tenantId}:${entry.date}`;
          if (!notifiedDates.has(key)) {
            const slotsAvailable = await hasAvailableSlots(
              entry.tenantId,
              entry.date,
            );

            if (slotsAvailable) {
              const nextEntry = await getNextWaitingEntry(
                entry.tenantId,
                entry.date,
              );
              if (nextEntry) {
                const tenant = await getTenantById(entry.tenantId);
                if (tenant) {
                  const expiresAt = new Date(
                    now.getTime() + 10 * 60 * 1000,
                  ).toISOString();
                  await updateWaitlistEntry(
                    entry.tenantId,
                    entry.date,
                    nextEntry.id,
                    {
                      status: "notified",
                      notifiedAt: now.toISOString(),
                      expiresAt,
                    },
                  );

                  const landingPageUrl = getLandingPageUrl(tenant);
                  const bookingUrl = `${landingPageUrl}?date=${entry.date}&waitlist=${nextEntry.id}`;

                  await sendWaitlistSlotAvailableEmail({
                    visitorName: nextEntry.visitorName,
                    visitorEmail: nextEntry.visitorEmail,
                    date: entry.date,
                    tenant,
                    bookingUrl,
                  });

                  results.notified++;
                  notifiedDates.add(key);

                  console.log(
                    `[DBG][waitlist-notify] Notified ${nextEntry.visitorEmail} for ${entry.date}`,
                  );
                }
              }
            }
          }
        }
      } catch (err) {
        console.error(
          `[DBG][waitlist-notify] Error processing entry ${entry.id}:`,
          err,
        );
        results.errors++;
      }
    }

    // ─── WEBINAR WAITLIST PROCESSING ───────────────────────────────
    const webinarEntries = await getActiveWebinarWaitlistItems();
    console.log(
      `[DBG][waitlist-notify] Processing ${webinarEntries.length} active webinar waitlist entries`,
    );

    // Track products we've already notified someone for (avoid double-notify in same cron run)
    const notifiedProducts = new Set<string>();

    for (const wEntry of webinarEntries) {
      try {
        const product = await getProductById(wEntry.tenantId, wEntry.productId);
        if (!product || !product.webinarSchedule) {
          continue;
        }

        const tenant = await getTenantById(wEntry.tenantId);
        const timezone = tenant?.bookingConfig?.timezone || "Australia/Sydney";

        // 1. Past webinar cleanup — if all sessions are in the past, expire entry
        const sessions = expandWebinarSessions(
          product.webinarSchedule,
          timezone,
        );
        if (sessions.length > 0) {
          const lastSession = sessions[sessions.length - 1];
          const allSessionsPast = new Date(lastSession.endTime) < now;

          if (allSessionsPast) {
            await updateWebinarWaitlistEntry(
              wEntry.tenantId,
              wEntry.productId,
              wEntry.entryId,
              { status: "expired" },
            );
            results.webinarPastCleaned++;
            continue;
          }
        }

        // 2. Handle expired notifications — cascade to next person
        if (
          wEntry.status === "notified" &&
          wEntry.expiresAt &&
          new Date(wEntry.expiresAt) < now
        ) {
          await updateWebinarWaitlistEntry(
            wEntry.tenantId,
            wEntry.productId,
            wEntry.entryId,
            { status: "expired" },
          );
          results.webinarExpired++;

          // Cascade: notify the next person if spots available
          const productKey = `${wEntry.tenantId}:${wEntry.productId}`;
          if (!notifiedProducts.has(productKey)) {
            const hasSpotsAvailable =
              product.maxParticipants != null &&
              (await countWebinarSignups(wEntry.tenantId, wEntry.productId)) <
                product.maxParticipants;

            if (hasSpotsAvailable) {
              const nextEntry = await getNextWaitingWebinarEntry(
                wEntry.tenantId,
                wEntry.productId,
              );
              if (nextEntry && tenant) {
                const expiresAt = new Date(
                  now.getTime() + 10 * 60 * 1000,
                ).toISOString();
                await updateWebinarWaitlistEntry(
                  wEntry.tenantId,
                  wEntry.productId,
                  nextEntry.id,
                  {
                    status: "notified",
                    notifiedAt: now.toISOString(),
                    expiresAt,
                  },
                );

                const landingPageUrl = getLandingPageUrl(tenant);
                const signupUrl = `${landingPageUrl}/webinar/${wEntry.productId}`;

                await sendWebinarWaitlistSlotAvailableEmail({
                  visitorName: nextEntry.visitorName,
                  visitorEmail: nextEntry.visitorEmail,
                  webinarName: product.name,
                  tenant,
                  signupUrl,
                });

                results.webinarNotified++;
                notifiedProducts.add(productKey);

                console.log(
                  `[DBG][waitlist-notify] Webinar: notified ${nextEntry.visitorEmail} for product ${wEntry.productId}`,
                );
              }
            }
          }
        }
      } catch (err) {
        console.error(
          `[DBG][waitlist-notify] Webinar: error processing entry ${wEntry.entryId}:`,
          err,
        );
        results.webinarErrors++;
      }
    }

    const durationMs = Date.now() - startTime;
    console.log(
      "[DBG][waitlist-notify] Cron job completed in",
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
    console.error("[DBG][waitlist-notify] Cron job error:", error);
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
