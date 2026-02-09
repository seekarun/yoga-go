/**
 * Recording Start Route
 * POST /api/data/app/calendar/events/[eventId]/recording/start
 *
 * Calls 100ms Recording API with transcription enabled.
 * Creates a transcript record with status "recording".
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
  console.log("[DBG][recording/start] POST called for event:", eventId);

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

    // Call 100ms Recording API with transcription config
    const managementToken = await generateManagementToken();
    const hmsResponse = await fetch(
      `https://api.100ms.live/v2/recordings/room/${event.hmsRoomId}/start`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${managementToken}`,
        },
        body: JSON.stringify({
          transcription: {
            enabled: true,
            output_modes: ["txt", "json"],
            summary: {
              enabled: true,
              context: "professional meeting or consultation",
              sections: [
                { title: "Summary", format: "paragraph" },
                { title: "Key Points", format: "bullets" },
                { title: "Action Items", format: "bullets" },
              ],
            },
          },
        }),
      },
    );

    if (!hmsResponse.ok) {
      const hmsError = await hmsResponse.text();
      console.error(
        "[DBG][recording/start] 100ms API error:",
        hmsResponse.status,
        hmsError,
      );
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: `Failed to start recording: ${hmsResponse.status}`,
        },
        { status: 502 },
      );
    }

    console.log(
      "[DBG][recording/start] 100ms recording started for room:",
      event.hmsRoomId,
    );

    // Create transcript record with "recording" status
    const existing = await transcriptRepository.getTranscript(
      tenantId,
      eventId,
    );

    if (existing) {
      // Update existing transcript to recording status
      await transcriptRepository.updateTranscriptStatus(
        tenantId,
        eventId,
        "recording",
        { transcriptionSource: "100ms" },
      );
    } else {
      // Create new transcript record
      await transcriptRepository.createTranscript(tenantId, {
        eventId,
        eventTitle: event.title,
        eventDate: event.startTime.substring(0, 10),
        audioFileKey: "", // No local audio file — 100ms handles it
        audioFileSizeBytes: 0,
      });
      // Update to recording status with source
      await transcriptRepository.updateTranscriptStatus(
        tenantId,
        eventId,
        "recording",
        { transcriptionSource: "100ms" },
      );
    }

    return NextResponse.json<ApiResponse<{ message: string }>>({
      success: true,
      data: { message: "Recording started with transcription" },
    });
  } catch (err) {
    console.error("[DBG][recording/start] Error:", err);
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
