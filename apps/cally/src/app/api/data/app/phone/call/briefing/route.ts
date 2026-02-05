/**
 * POST /api/data/app/phone/call/briefing
 * Trigger a morning briefing call
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  updateTenant,
} from "@/lib/repositories/tenantRepository";
import { generateBriefingContent } from "@/lib/briefing-generator";
import { generateSpeech, getAudioContentType } from "@/lib/openai-tts";
import { makeCall } from "@/lib/twilio";
import { DEFAULT_PHONE_CONFIG } from "@/types/phone-calling";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";

// S3 client for storing audio files
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-southeast-2",
});
const AUDIO_BUCKET = process.env.S3_AUDIO_BUCKET || "cally-audio-files";

/**
 * Get the base URL for the app (for webhook URLs)
 */
function getBaseUrl(): string {
  // Use VERCEL_URL in production, localhost in development
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  // Check for custom BASE_URL
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }
  // Default to prod URL
  return "https://proj-cally.vercel.app";
}

/**
 * Upload audio to S3 and return public URL
 */
async function uploadAudioToS3(
  audioBuffer: Buffer,
  tenantId: string,
  callType: string,
): Promise<string> {
  const fileName = `briefings/${tenantId}/${callType}-${nanoid()}.mp3`;

  console.log("[DBG][briefing-call] Uploading audio to S3:", fileName);

  await s3Client.send(
    new PutObjectCommand({
      Bucket: AUDIO_BUCKET,
      Key: fileName,
      Body: audioBuffer,
      ContentType: getAudioContentType("mp3"),
      // Public access is handled by bucket policy for briefings/* prefix
    }),
  );

  const audioUrl = `https://${AUDIO_BUCKET}.s3.${process.env.AWS_REGION || "ap-southeast-2"}.amazonaws.com/${fileName}`;
  console.log("[DBG][briefing-call] Audio uploaded:", audioUrl);

  return audioUrl;
}

/**
 * POST - Trigger a briefing call
 */
export async function POST() {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const cognitoSub = session.user.cognitoSub;
    console.log(
      "[DBG][briefing-call] Triggering briefing call for user:",
      cognitoSub,
    );

    // Get tenant
    const tenant = await getTenantByUserId(cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const phoneConfig = tenant.phoneConfig || DEFAULT_PHONE_CONFIG;

    // Check if phone is verified
    if (!phoneConfig.phoneNumberVerified || !phoneConfig.phoneNumber) {
      return NextResponse.json(
        {
          success: false,
          error: "Phone number must be verified before making calls",
        },
        { status: 400 },
      );
    }

    // Generate briefing content
    const briefingContent = await generateBriefingContent(
      tenant.id,
      tenant.name,
      phoneConfig,
    );

    console.log(
      "[DBG][briefing-call] Generated briefing script, length:",
      briefingContent.fullScript.length,
    );

    // Generate TTS audio
    const audioBuffer = await generateSpeech(briefingContent.fullScript, {
      voice: phoneConfig.voiceId || "nova",
      model: "tts-1",
      format: "mp3",
    });

    // Upload audio to S3
    const audioUrl = await uploadAudioToS3(audioBuffer, tenant.id, "briefing");

    // Build TwiML URL that plays the audio
    const baseUrl = getBaseUrl();
    const twimlUrl = `${baseUrl}/api/webhooks/twilio/voice?audioUrl=${encodeURIComponent(audioUrl)}`;
    const statusCallbackUrl = `${baseUrl}/api/webhooks/twilio/status?tenantId=${tenant.id}&callType=briefing`;

    // Make the call
    const callResult = await makeCall(
      phoneConfig.phoneNumber,
      twimlUrl,
      statusCallbackUrl,
    );

    if (!callResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: callResult.error || "Failed to initiate call",
        },
        { status: 500 },
      );
    }

    // Update tenant with last call info
    const now = new Date().toISOString();
    await updateTenant(tenant.id, {
      phoneConfig: {
        ...phoneConfig,
        lastBriefingCallAt: now,
        lastBriefingCallStatus: "queued",
        lastBriefingCallSid: callResult.callSid,
      },
    });

    console.log(
      "[DBG][briefing-call] Call initiated, SID:",
      callResult.callSid,
    );

    return NextResponse.json({
      success: true,
      data: {
        callSid: callResult.callSid,
        phoneNumber: phoneConfig.phoneNumber,
        briefingContent: briefingContent.fullScript,
        audioUrl,
      },
    });
  } catch (error) {
    console.error("[DBG][briefing-call] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        success: false,
        error: `Failed to initiate briefing call: ${errorMessage}`,
      },
      { status: 500 },
    );
  }
}
