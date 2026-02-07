/**
 * GET /api/data/app/subscribers
 * List unified users (subscribers + visitors) for the authenticated tenant
 */

import { NextResponse } from "next/server";
import type { CallyUser } from "@/types";
import type { ApiResponse } from "@/types";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import * as subscriberRepository from "@/lib/repositories/subscriberRepository";
import { getTenantCalendarEvents } from "@/lib/repositories/calendarEventRepository";
import { getContactsByTenant } from "@/lib/repositories/contactRepository";
import { mergeSubscribersAndVisitors } from "@/lib/users/mergeUsers";

export async function GET() {
  console.log("[DBG][subscribers] GET called");

  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<ApiResponse<CallyUser[]>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(session.user.cognitoSub);
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
