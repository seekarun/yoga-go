/**
 * GET /api/cron/mark-completed
 * Cron job to mark past scheduled events as completed.
 *
 * Runs daily at 2 AM UTC via Vercel Cron.
 * Finds all events where date < today and status === "scheduled",
 * and updates their status to "completed".
 */
import { NextResponse } from "next/server";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, Tables, EntityType } from "@/lib/dynamodb";
import type { CallyTenant } from "@/lib/repositories/tenantRepository";
import {
  getCalendarEventsByDateRange,
  updateCalendarEventStatus,
} from "@/lib/repositories/calendarEventRepository";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Get all tenants (scan for entityType = TENANT)
 */
async function getAllTenants(): Promise<CallyTenant[]> {
  console.log("[DBG][mark-completed] Scanning all tenants");

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
  console.log("[DBG][mark-completed] Found", tenants.length, "tenants");
  return tenants;
}

/**
 * GET - Cron job handler
 */
export async function GET(request: Request) {
  console.log("[DBG][mark-completed] Cron job triggered");

  // Verify Vercel Cron secret
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      console.warn("[DBG][mark-completed] Unauthorized cron request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const startTime = Date.now();
  const results = {
    tenantsProcessed: 0,
    eventsChecked: 0,
    eventsCompleted: 0,
    errors: 0,
  };

  try {
    const tenants = await getAllTenants();
    const today = new Date().toISOString().substring(0, 10);

    // Look back up to 30 days for any past scheduled events
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .substring(0, 10);

    // Yesterday is the last date we want to mark as completed
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .substring(0, 10);

    for (const tenant of tenants) {
      results.tenantsProcessed++;

      try {
        // Get events from 30 days ago to yesterday
        const events = await getCalendarEventsByDateRange(
          tenant.id,
          thirtyDaysAgo,
          yesterday,
        );

        // Filter to scheduled events (these are "past" and should be completed)
        const scheduledPastEvents = events.filter(
          (e) => e.status === "scheduled" && e.date < today,
        );
        results.eventsChecked += scheduledPastEvents.length;

        for (const event of scheduledPastEvents) {
          try {
            await updateCalendarEventStatus(
              tenant.id,
              event.date,
              event.id,
              "completed",
            );
            results.eventsCompleted++;
            console.log(
              `[DBG][mark-completed] Marked event ${event.id} as completed for tenant ${tenant.id}`,
            );
          } catch (error) {
            console.error(
              `[DBG][mark-completed] Failed to update event ${event.id}:`,
              error,
            );
            results.errors++;
          }
        }
      } catch (error) {
        console.error(
          `[DBG][mark-completed] Failed to process tenant ${tenant.id}:`,
          error,
        );
        results.errors++;
      }
    }

    const durationMs = Date.now() - startTime;
    console.log(
      "[DBG][mark-completed] Cron job completed in",
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
    console.error("[DBG][mark-completed] Cron job error:", error);
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
