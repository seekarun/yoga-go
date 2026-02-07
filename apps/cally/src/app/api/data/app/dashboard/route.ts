/**
 * GET /api/data/app/dashboard
 * Returns dashboard stats: total users, upcoming appointments, completed appointments
 */

import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import * as subscriberRepository from "@/lib/repositories/subscriberRepository";
import { getTenantCalendarEvents } from "@/lib/repositories/calendarEventRepository";
import { getContactsByTenant } from "@/lib/repositories/contactRepository";
import { mergeSubscribersAndVisitors } from "@/lib/users/mergeUsers";
import { parseVisitorFromDescription } from "@/lib/email/bookingNotification";

interface DashboardStats {
  totalUsers: number;
  upcomingAppointments: number;
  completedAppointments: number;
}

export async function GET() {
  console.log("[DBG][dashboard] GET called");

  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<ApiResponse<DashboardStats>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(session.user.cognitoSub);
    if (!tenant) {
      return NextResponse.json<ApiResponse<DashboardStats>>(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const [subscribers, events, contacts] = await Promise.all([
      subscriberRepository.getSubscribersByTenant(tenant.id),
      getTenantCalendarEvents(tenant.id),
      getContactsByTenant(tenant.id),
    ]);

    // Total users
    const users = mergeSubscribersAndVisitors(subscribers, events, contacts);
    const totalUsers = users.length;

    // Filter booking events only
    const bookingEvents = events.filter(
      (e) =>
        e.title.startsWith("Booking:") &&
        parseVisitorFromDescription(e.description) !== null,
    );

    const now = new Date().toISOString();
    const upcomingAppointments = bookingEvents.filter(
      (e) => e.startTime > now && e.status !== "cancelled",
    ).length;
    const completedAppointments = bookingEvents.filter(
      (e) => e.startTime <= now || e.status === "completed",
    ).length;

    console.log(
      `[DBG][dashboard] Stats: ${totalUsers} users, ${upcomingAppointments} upcoming, ${completedAppointments} completed`,
    );

    return NextResponse.json<ApiResponse<DashboardStats>>({
      success: true,
      data: { totalUsers, upcomingAppointments, completedAppointments },
    });
  } catch (error) {
    console.error("[DBG][dashboard] Error:", error);
    return NextResponse.json<ApiResponse<DashboardStats>>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch dashboard stats",
      },
      { status: 500 },
    );
  }
}
