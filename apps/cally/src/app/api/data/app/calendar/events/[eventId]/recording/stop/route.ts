/**
 * Recording Stop Route
 * POST /api/data/app/calendar/events/[eventId]/recording/stop
 *
 * Calls 100ms Recording API to stop recording.
 * Updates transcript status to "processing".
 */

import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import * as calendarEventRepository from "@/lib/repositories/calendarEventRepository";
import * as transcriptRepository from "@/lib/repositories/transcriptRepository";
import { generateManagementToken } from "@/lib/100ms-auth";

interface RouteParams {
  params: Promise<{
    eventId: string;
  }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const { eventId } = await params;
  console.log("[DBG][recording/stop] POST called for event:", eventId);

  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(session.user.cognitoSub);
    if (!tenant) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const tenantId = tenant.id;

    // Look up event
    const event = await calendarEventRepository.getCalendarEventByIdOnly(
      tenantId,
      eventId,
    );
    if (!event) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Event not found" },
        { status: 404 },
      );
    }

    if (!event.hmsRoomId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Event has no video conference room" },
        { status: 400 },
      );
    }

    // Call 100ms Recording API to stop
    const managementToken = await generateManagementToken();
    const hmsResponse = await fetch(
      `https://api.100ms.live/v2/recordings/room/${event.hmsRoomId}/stop`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${managementToken}`,
        },
      },
    );

    if (!hmsResponse.ok) {
      const hmsError = await hmsResponse.text();
      console.error(
        "[DBG][recording/stop] 100ms API error:",
        hmsResponse.status,
        hmsError,
      );
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: `Failed to stop recording: ${hmsResponse.status}`,
        },
        { status: 502 },
      );
    }

    console.log(
      "[DBG][recording/stop] 100ms recording stopped for room:",
      event.hmsRoomId,
    );

    // Update transcript status to processing
    const existing = await transcriptRepository.getTranscript(
      tenantId,
      eventId,
    );
    if (existing) {
      await transcriptRepository.updateTranscriptStatus(
        tenantId,
        eventId,
        "processing",
      );
    }

    return NextResponse.json<ApiResponse<{ message: string }>>({
      success: true,
      data: { message: "Recording stopped, transcription processing" },
    });
  } catch (err) {
    console.error("[DBG][recording/stop] Error:", err);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
