/**
 * GET /api/data/app/subscribers
 * List unified users (subscribers + visitors) for the authenticated tenant
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { CallyUser } from "@/types";
import type { ApiResponse } from "@/types";
import { auth } from "@/auth";
import { getMobileAuthResult } from "@/lib/mobile-auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import * as subscriberRepository from "@/lib/repositories/subscriberRepository";
import { getTenantCalendarEvents } from "@/lib/repositories/calendarEventRepository";
import { getContactsByTenant } from "@/lib/repositories/contactRepository";
import { mergeSubscribersAndVisitors } from "@/lib/users/mergeUsers";

export async function GET(request: NextRequest) {
  console.log("[DBG][subscribers] GET called");

  try {
    // Try mobile auth (Bearer token) first, then fall back to cookie auth
    const mobileAuth = await getMobileAuthResult(request);
    let cognitoSub: string | undefined;

    if (mobileAuth.session) {
      cognitoSub = mobileAuth.session.cognitoSub;
    } else if (mobileAuth.tokenExpired) {
      return NextResponse.json<ApiResponse<CallyUser[]>>(
        { success: false, error: "Token expired" },
        { status: 401 },
      );
    } else {
      const session = await auth();
      cognitoSub = session?.user?.cognitoSub;
    }

    if (!cognitoSub) {
      return NextResponse.json<ApiResponse<CallyUser[]>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(cognitoSub);
    if (!tenant) {
      return NextResponse.json<ApiResponse<CallyUser[]>>(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const [subscribers, events, contacts] = await Promise.all([
      subscriberRepository.getSubscribersByTenant(tenant.id),
      getTenantCalendarEvents(tenant.id),
      getContactsByTenant(tenant.id),
    ]);

    const users = mergeSubscribersAndVisitors(subscribers, events, contacts);

    console.log(
      `[DBG][subscribers] Returning ${users.length} users (${subscribers.length} subscribers + visitors) for tenant ${tenant.id}`,
    );

    return NextResponse.json<ApiResponse<CallyUser[]>>({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("[DBG][subscribers] Error:", error);
    return NextResponse.json<ApiResponse<CallyUser[]>>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch users",
      },
      { status: 500 },
    );
  }
}
