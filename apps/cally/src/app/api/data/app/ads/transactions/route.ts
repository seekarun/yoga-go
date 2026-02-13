/**
 * Ad Transaction History API Route (Authenticated)
 * GET /api/data/app/ads/transactions - List transaction history
 */

import { NextResponse } from "next/server";
import type { ApiResponse, AdTransaction } from "@/types";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import { getAdTransactions } from "@/lib/repositories/adCampaignRepository";

export async function GET(): Promise<
  NextResponse<ApiResponse<AdTransaction[]>>
> {
  console.log("[DBG][ads/transactions] GET called");

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

    const transactions = await getAdTransactions(tenant.id);

    console.log(
      `[DBG][ads/transactions] Returning ${transactions.length} transactions`,
    );

    return NextResponse.json({ success: true, data: transactions });
  } catch (error) {
    console.error("[DBG][ads/transactions] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch transactions" },
      { status: 500 },
    );
  }
}
