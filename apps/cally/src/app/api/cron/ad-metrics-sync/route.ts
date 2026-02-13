/**
 * Ad Metrics Sync Cron Job
 * GET /api/cron/ad-metrics-sync
 * Runs every 6 hours: fetches fresh metrics from Meta for all active campaigns,
 * updates campaign records, adjusts balance for spend deltas, marks completed when budget exhausted.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getActiveCampaignsAllTenants,
  updateCampaignMetrics,
  adjustAdCreditBalance,
  createAdTransaction,
} from "@/lib/repositories/adCampaignRepository";
import { getMetaCampaignInsights } from "@/lib/meta-ads";

export async function GET(request: NextRequest) {
  console.log("[DBG][cron/ad-metrics-sync] Starting ad metrics sync");

  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const campaigns = await getActiveCampaignsAllTenants();
    console.log(
      `[DBG][cron/ad-metrics-sync] Found ${campaigns.length} active campaigns`,
    );

    let synced = 0;
    let completed = 0;
    let errors = 0;

    for (const campaign of campaigns) {
      try {
        if (!campaign.metaCampaignId) {
          console.log(
            `[DBG][cron/ad-metrics-sync] Skipping campaign ${campaign.id} - no Meta campaign ID`,
          );
          continue;
        }

        const metrics = await getMetaCampaignInsights(campaign.metaCampaignId);

        // Check if campaign budget is exhausted (90% threshold)
        const isCompleted = metrics.spendCents >= campaign.budgetCents * 0.9;

        // Calculate spend delta if previous metrics exist
        const previousSpend = campaign.metrics?.spendCents ?? 0;
        const spendDelta = metrics.spendCents - previousSpend;

        // Update campaign metrics and status
        const newStatus = isCompleted ? "completed" : undefined;
        await updateCampaignMetrics(
          campaign.tenantId,
          campaign.id,
          metrics,
          newStatus,
        );

        // If there was additional spend, record it (for tracking accuracy)
        if (spendDelta > 0) {
          const newBalance = await adjustAdCreditBalance(
            campaign.tenantId,
            0, // balance already deducted at approval time
            "totalSpentCents",
          );

          await createAdTransaction(campaign.tenantId, {
            type: "spend",
            amountCents: spendDelta,
            balanceAfterCents: newBalance,
            description: `Metrics sync: ${campaign.name}`,
            campaignId: campaign.id,
          });
        }

        synced++;
        if (isCompleted) completed++;

        console.log(
          `[DBG][cron/ad-metrics-sync] Synced campaign ${campaign.id}: ${metrics.clicks} clicks, $${(metrics.spendCents / 100).toFixed(2)} spent${isCompleted ? " (completed)" : ""}`,
        );
      } catch (err) {
        errors++;
        console.error(
          `[DBG][cron/ad-metrics-sync] Error syncing campaign ${campaign.id}:`,
          err,
        );
      }
    }

    console.log(
      `[DBG][cron/ad-metrics-sync] Sync complete: ${synced} synced, ${completed} completed, ${errors} errors`,
    );

    return NextResponse.json({
      success: true,
      data: {
        total: campaigns.length,
        synced,
        completed,
        errors,
      },
    });
  } catch (error) {
    console.error("[DBG][cron/ad-metrics-sync] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sync ad metrics" },
      { status: 500 },
    );
  }
}
