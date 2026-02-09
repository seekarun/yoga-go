/**
 * 100ms Webhook Route
 * POST /api/webhooks/100ms
 *
 * Handles webhook events from 100ms, specifically:
 * - transcription.success: Downloads transcript + summary, stores in DynamoDB
 * - transcription.failure: Updates transcript status to failed
 */

import { NextResponse } from "next/server";
import * as calendarEventRepository from "@/lib/repositories/calendarEventRepository";
import * as transcriptRepository from "@/lib/repositories/transcriptRepository";
import type { SpeakerSegment } from "@/types";

interface HmsTranscriptStatement {
  speaker: string;
  sentence: string;
  start: number;
  end: number;
}

interface HmsTranscriptJson {
  statements: HmsTranscriptStatement[];
}

interface HmsSummarySection {
  title: string;
  format: string;
  point?: string;
  bullets?: string[];
}

interface HmsSummaryJson {
  sections: HmsSummarySection[];
}

interface HmsWebhookPayload {
  type: string;
  data: {
    room_id: string;
    session_id?: string;
    duration?: number;
    transcript_json_presigned_url?: string;
    transcript_txt_presigned_url?: string;
    summary_json_presigned_url?: string;
    message?: string;
  };
}

/**
 * Download JSON from a presigned URL
 */
async function downloadJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(
        "[DBG][webhook/100ms] Failed to download from presigned URL:",
        res.status,
      );
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error("[DBG][webhook/100ms] Error downloading JSON:", err);
    return null;
  }
}

/**
 * Format transcript statements into speaker-labeled text
 */
function formatTranscriptText(statements: HmsTranscriptStatement[]): string {
  return statements.map((s) => `${s.speaker}: ${s.sentence}`).join("\n");
}

/**
 * Convert 100ms statements to SpeakerSegment[]
 */
function toSpeakerSegments(
  statements: HmsTranscriptStatement[],
): SpeakerSegment[] {
  return statements.map((s) => ({
    speaker: s.speaker,
    text: s.sentence,
    startTime: s.start,
    endTime: s.end,
  }));
}

/**
 * Format 100ms summary sections into readable text
 */
function formatSummary(sections: HmsSummarySection[]): string {
  return sections
    .map((section) => {
      const header = `## ${section.title}`;
      if (section.point) {
        return `${header}\n${section.point}`;
      }
      if (section.bullets && section.bullets.length > 0) {
        const bulletList = section.bullets.map((b) => `- ${b}`).join("\n");
        return `${header}\n${bulletList}`;
      }
      return header;
    })
    .join("\n\n");
}

const HMS_WEBHOOK_SECRET = process.env.HMS_WEBHOOK_SECRET;

export async function POST(request: Request) {
  console.log("[DBG][webhook/100ms] Webhook received");

  // Verify shared-secret header configured in 100ms Dashboard
  if (HMS_WEBHOOK_SECRET) {
    const incomingSecret = request.headers.get("x-100ms-webhook-secret");
    if (incomingSecret !== HMS_WEBHOOK_SECRET) {
      console.error("[DBG][webhook/100ms] Invalid webhook secret");
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
  } else {
    console.warn(
      "[DBG][webhook/100ms] HMS_WEBHOOK_SECRET not set — skipping verification",
    );
  }

  try {
    const payload: HmsWebhookPayload = await request.json();
    const { type, data } = payload;

    console.log(
      "[DBG][webhook/100ms] Event type:",
      type,
      "room_id:",
      data.room_id,
    );

    if (type === "transcription.success") {
      return handleTranscriptionSuccess(data);
    }

    if (type === "transcription.failure") {
      return handleTranscriptionFailure(data);
    }

    // Acknowledge other events we don't handle
    console.log("[DBG][webhook/100ms] Ignoring event type:", type);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DBG][webhook/100ms] Error processing webhook:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function handleTranscriptionSuccess(
  data: HmsWebhookPayload["data"],
): Promise<NextResponse> {
  console.log(
    "[DBG][webhook/100ms] Handling transcription.success for room:",
    data.room_id,
  );

  // Look up event by hmsRoomId
  const event = await calendarEventRepository.getCalendarEventByHmsRoomId(
    data.room_id,
  );
  if (!event) {
    console.error(
      "[DBG][webhook/100ms] No event found for room_id:",
      data.room_id,
    );
    return NextResponse.json({ success: true }); // Ack to avoid retries
  }

  const tenantId = event.expertId; // expertId is the tenantId
  const eventId = event.id;

  // Download transcript JSON (speaker-labeled segments)
  let transcriptText = "";
  let speakerSegments: SpeakerSegment[] = [];

  if (data.transcript_json_presigned_url) {
    const transcriptJson = await downloadJson<HmsTranscriptJson>(
      data.transcript_json_presigned_url,
    );
    if (transcriptJson?.statements) {
      transcriptText = formatTranscriptText(transcriptJson.statements);
      speakerSegments = toSpeakerSegments(transcriptJson.statements);
      console.log(
        "[DBG][webhook/100ms] Parsed",
        transcriptJson.statements.length,
        "transcript statements",
      );
    }
  }

  // Download summary JSON
  let summary = "";
  if (data.summary_json_presigned_url) {
    const summaryJson = await downloadJson<HmsSummaryJson>(
      data.summary_json_presigned_url,
    );
    if (summaryJson?.sections) {
      summary = formatSummary(summaryJson.sections);
      console.log(
        "[DBG][webhook/100ms] Parsed summary with",
        summaryJson.sections.length,
        "sections",
      );
    }
  }

  // Check if transcript record exists, create if not
  const existing = await transcriptRepository.getTranscript(tenantId, eventId);
  if (!existing) {
    await transcriptRepository.createTranscript(tenantId, {
      eventId,
      eventTitle: event.title,
      eventDate: event.startTime.substring(0, 10),
      audioFileKey: "",
      audioFileSizeBytes: 0,
    });
  }

  // Update transcript with results
  await transcriptRepository.updateTranscriptStatus(
    tenantId,
    eventId,
    "completed",
    {
      transcriptText,
      summary,
      speakerSegments,
      transcriptionSource: "100ms",
      audioDurationSeconds: data.duration,
      completedAt: new Date().toISOString(),
    },
  );

  console.log("[DBG][webhook/100ms] Transcript saved for event:", eventId);

  return NextResponse.json({ success: true });
}

async function handleTranscriptionFailure(
  data: HmsWebhookPayload["data"],
): Promise<NextResponse> {
  console.log(
    "[DBG][webhook/100ms] Handling transcription.failure for room:",
    data.room_id,
  );

  const event = await calendarEventRepository.getCalendarEventByHmsRoomId(
    data.room_id,
  );
  if (!event) {
    console.error(
      "[DBG][webhook/100ms] No event found for room_id:",
      data.room_id,
    );
    return NextResponse.json({ success: true });
  }

  const tenantId = event.expertId;
  const eventId = event.id;

  const existing = await transcriptRepository.getTranscript(tenantId, eventId);
  if (existing) {
    await transcriptRepository.updateTranscriptStatus(
      tenantId,
      eventId,
      "failed",
      {
        errorMessage: data.message || "100ms transcription failed",
        transcriptionSource: "100ms",
      },
    );
  }

  console.log(
    "[DBG][webhook/100ms] Transcript marked as failed for event:",
    eventId,
  );

  return NextResponse.json({ success: true });
}
