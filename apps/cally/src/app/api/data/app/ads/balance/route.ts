/**
 * Ad Balance API Route (Authenticated)
 * GET /api/data/app/ads/balance - Get current balance + recent transactions
 */

import { NextResponse } from "next/server";
import type { ApiResponse, AdCredit, AdTransaction } from "@/types";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import {
  getAdCredit,
  getAdTransactions,
} from "@/lib/repositories/adCampaignRepository";

interface BalanceResponse {
  credit: AdCredit;
  recentTransactions: AdTransaction[];
}

export async function GET(): Promise<
  NextResponse<ApiResponse<BalanceResponse>>
> {
  console.log("[DBG][ads/balance] GET called");

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

    const credit = (await getAdCredit(tenant.id)) || {
      tenantId: tenant.id,
      balanceCents: 0,
      totalPurchasedCents: 0,
      totalSpentCents: 0,
      updatedAt: new Date().toISOString(),
    };

    const recentTransactions = await getAdTransactions(tenant.id, 10);

    return NextResponse.json({
      success: true,
      data: { credit, recentTransactions },
    });
  } catch (error) {
    console.error("[DBG][ads/balance] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch balance" },
      { status: 500 },
    );
  }
}
