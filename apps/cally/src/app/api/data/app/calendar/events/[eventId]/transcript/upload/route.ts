/**
 * Transcript Upload Route for CallyGo
 * POST /api/data/app/calendar/events/[eventId]/transcript/upload
 *
 * Generates a presigned S3 PUT URL for uploading audio,
 * then creates a transcript record in DynamoDB.
 */

import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client } from "@aws-sdk/client-s3";
import type { ApiResponse, MeetingTranscript } from "@/types";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import * as calendarEventRepository from "@/lib/repositories/calendarEventRepository";
import * as transcriptRepository from "@/lib/repositories/transcriptRepository";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-southeast-2",
});

const S3_BUCKET = process.env.S3_AUDIO_BUCKET || "cally-audio-files";

interface RouteParams {
  params: Promise<{
    eventId: string;
  }>;
}

interface UploadResponse {
  presignedUrl: string;
  audioFileKey: string;
  transcript: MeetingTranscript;
}

/**
 * POST - Generate presigned URL for audio upload and create transcript record
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { eventId } = await params;
  console.log("[DBG][transcript/upload] POST called for event:", eventId);

  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<ApiResponse<UploadResponse>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(session.user.cognitoSub);
    if (!tenant) {
      return NextResponse.json<ApiResponse<UploadResponse>>(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const tenantId = tenant.id;

    // Parse request body
    const body = (await request.json()) as {
      fileSizeBytes: number;
      fileName?: string;
    };

    if (!body.fileSizeBytes || body.fileSizeBytes <= 0) {
      return NextResponse.json<ApiResponse<UploadResponse>>(
        { success: false, error: "fileSizeBytes is required" },
        { status: 400 },
      );
    }

    // 25MB limit for Whisper API
    const maxSize = 25 * 1024 * 1024;
    if (body.fileSizeBytes > maxSize) {
      return NextResponse.json<ApiResponse<UploadResponse>>(
        {
          success: false,
          error: `File too large. Maximum ${maxSize} bytes (25MB)`,
        },
        { status: 400 },
      );
    }

    // Find the event to get title and date
    const event = await calendarEventRepository.getCalendarEventByIdOnly(
      tenantId,
      eventId,
    );
    if (!event) {
      return NextResponse.json<ApiResponse<UploadResponse>>(
        { success: false, error: "Event not found" },
        { status: 404 },
      );
    }

    // Generate S3 key
    const timestamp = Date.now();
    const ext = body.fileName?.split(".").pop() || "webm";
    const audioFileKey = `transcripts/${tenantId}/${eventId}/${timestamp}.${ext}`;

    console.log(
      "[DBG][transcript/upload] Generating presigned URL for:",
      audioFileKey,
    );

    // Generate presigned PUT URL (valid for 10 minutes)
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: audioFileKey,
      ContentType: `audio/${ext}`,
    });
    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 600,
    });

    // Create transcript record
    const transcript = await transcriptRepository.createTranscript(tenantId, {
      eventId,
      eventTitle: event.title,
      eventDate: event.startTime.substring(0, 10),
      audioFileKey,
      audioFileSizeBytes: body.fileSizeBytes,
    });

    console.log(
      "[DBG][transcript/upload] Presigned URL generated, transcript created",
    );

    return NextResponse.json<ApiResponse<UploadResponse>>({
      success: true,
      data: {
        presignedUrl,
        audioFileKey,
        transcript,
      },
    });
  } catch (err) {
    console.error("[DBG][transcript/upload] Error:", err);
    return NextResponse.json<ApiResponse<UploadResponse>>(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
