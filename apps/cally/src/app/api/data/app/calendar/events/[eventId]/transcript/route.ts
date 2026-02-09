/**
 * Transcript Route for Cally
 * GET /api/data/app/calendar/events/[eventId]/transcript - Get transcript
 * POST /api/data/app/calendar/events/[eventId]/transcript - Queue for processing
 */

import { NextResponse } from "next/server";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import type { ApiResponse, MeetingTranscript } from "@/types";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import * as transcriptRepository from "@/lib/repositories/transcriptRepository";

const sqsClient = new SQSClient({
  region: process.env.AWS_REGION || "ap-southeast-2",
});

const SQS_QUEUE_URL = process.env.TRANSCRIPTION_QUEUE_URL || "";

interface RouteParams {
  params: Promise<{
    eventId: string;
  }>;
}

/**
 * GET - Get transcript data for an event
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { eventId } = await params;
  console.log("[DBG][transcript] GET called for event:", eventId);

  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<ApiResponse<MeetingTranscript>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(session.user.cognitoSub);
    if (!tenant) {
      return NextResponse.json<ApiResponse<MeetingTranscript>>(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const transcript = await transcriptRepository.getTranscript(
      tenant.id,
      eventId,
    );

    if (!transcript) {
      return NextResponse.json<ApiResponse<MeetingTranscript>>(
        { success: false, error: "Transcript not found" },
        { status: 404 },
      );
    }

    return NextResponse.json<ApiResponse<MeetingTranscript>>({
      success: true,
      data: transcript,
    });
  } catch (err) {
    console.error("[DBG][transcript] GET error:", err);
    return NextResponse.json<ApiResponse<MeetingTranscript>>(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST - Queue transcript for processing (upload complete → start transcription)
 */
export async function POST(_request: Request, { params }: RouteParams) {
  const { eventId } = await params;
  console.log("[DBG][transcript] POST called for event:", eventId);

  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<ApiResponse<MeetingTranscript>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(session.user.cognitoSub);
    if (!tenant) {
      return NextResponse.json<ApiResponse<MeetingTranscript>>(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const tenantId = tenant.id;

    // Get existing transcript record
    const transcript = await transcriptRepository.getTranscript(
      tenantId,
      eventId,
    );
    if (!transcript) {
      return NextResponse.json<ApiResponse<MeetingTranscript>>(
        { success: false, error: "Transcript not found. Upload first." },
        { status: 404 },
      );
    }

    // Only queue if in uploading status
    if (transcript.status !== "uploading") {
      return NextResponse.json<ApiResponse<MeetingTranscript>>(
        {
          success: false,
          error: `Cannot queue transcript in "${transcript.status}" status`,
        },
        { status: 400 },
      );
    }

    // Send SQS message
    if (!SQS_QUEUE_URL) {
      console.error("[DBG][transcript] TRANSCRIPTION_QUEUE_URL not configured");
      return NextResponse.json<ApiResponse<MeetingTranscript>>(
        {
          success: false,
          error: "Transcription service not configured",
        },
        { status: 503 },
      );
    }

    console.log("[DBG][transcript] Sending SQS message for event:", eventId);

    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: SQS_QUEUE_URL,
        MessageBody: JSON.stringify({
          tenantId,
          eventId,
          audioFileKey: transcript.audioFileKey,
        }),
      }),
    );

    // Update status to queued
    await transcriptRepository.updateTranscriptStatus(
      tenantId,
      eventId,
      "queued",
    );

    const updated = await transcriptRepository.getTranscript(tenantId, eventId);

    console.log("[DBG][transcript] Transcript queued for processing");

    return NextResponse.json<ApiResponse<MeetingTranscript>>({
      success: true,
      data: updated!,
    });
  } catch (err) {
    console.error("[DBG][transcript] POST error:", err);
    return NextResponse.json<ApiResponse<MeetingTranscript>>(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
