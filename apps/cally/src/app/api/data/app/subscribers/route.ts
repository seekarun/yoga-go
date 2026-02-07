/**
 * GET /api/data/app/subscribers
 * List subscribers for the authenticated tenant
 */

import { NextResponse } from "next/server";
import type { TenantSubscriber } from "@/types";
import type { ApiResponse } from "@/types";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import * as subscriberRepository from "@/lib/repositories/subscriberRepository";

export async function GET() {
  console.log("[DBG][subscribers] GET called");

  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<ApiResponse<TenantSubscriber[]>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(session.user.cognitoSub);
    if (!tenant) {
      return NextResponse.json<ApiResponse<TenantSubscriber[]>>(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const subscribers = await subscriberRepository.getSubscribersByTenant(
      tenant.id,
    );

    console.log(
      `[DBG][subscribers] Returning ${subscribers.length} subscribers for tenant ${tenant.id}`,
    );

    return NextResponse.json<ApiResponse<TenantSubscriber[]>>({
      success: true,
      data: subscribers,
    });
  } catch (error) {
    console.error("[DBG][subscribers] Error:", error);
    return NextResponse.json<ApiResponse<TenantSubscriber[]>>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch subscribers",
      },
      { status: 500 },
    );
  }
}
