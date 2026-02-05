/**
 * POST /api/data/app/phone/call/custom
 * Trigger a custom call with a custom message
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import { generateCustomCallScript } from "@/lib/briefing-generator";
import { generateSpeech, getAudioContentType } from "@/lib/openai-tts";
import { makeCall } from "@/lib/twilio";
import { DEFAULT_PHONE_CONFIG } from "@/types/phone-calling";
import type { CustomCallRequest } from "@/types/phone-calling";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";

// S3 client for storing audio files
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-southeast-2",
});
const AUDIO_BUCKET = process.env.S3_AUDIO_BUCKET || "cally-audio-files";

/**
 * Get the base URL for the app (for webhook URLs)
 * Note: We use BASE_URL or hardcoded prod URL instead of VERCEL_URL
 * because VERCEL_URL points to preview deployments which have protection enabled
 */
function getBaseUrl(): string {
  // Check for custom BASE_URL first (allows override in dev/staging)
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }
  // Default to prod URL - Twilio webhooks need the public production URL
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

  console.log("[DBG][custom-call] Uploading audio to S3:", fileName);

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
  console.log("[DBG][custom-call] Audio uploaded:", audioUrl);

  return audioUrl;
}

/**
 * POST - Trigger a custom call
 */
export async function POST(request: NextRequest) {
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
      "[DBG][custom-call] Triggering custom call for user:",
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

    // Parse request body
    const body = (await request.json()) as CustomCallRequest;

    if (!body.message || body.message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Message is required" },
        { status: 400 },
      );
    }

    // Validate message length
    if (body.message.length > 2000) {
      return NextResponse.json(
        { success: false, error: "Message must be less than 2000 characters" },
        { status: 400 },
      );
    }

    // Generate call script
    const callScript = await generateCustomCallScript(
      body.message,
      tenant.name,
      body.enhanceWithAi || false,
    );

    console.log(
      "[DBG][custom-call] Generated script, length:",
      callScript.length,
    );

    // Generate TTS audio
    const audioBuffer = await generateSpeech(callScript, {
      voice: phoneConfig.voiceId || "nova",
      model: "tts-1",
      format: "mp3",
    });

    // Upload audio to S3
    const audioUrl = await uploadAudioToS3(audioBuffer, tenant.id, "custom");

    // Build TwiML URL that plays the audio
    const baseUrl = getBaseUrl();
    const twimlUrl = `${baseUrl}/api/webhooks/twilio/voice?audioUrl=${encodeURIComponent(audioUrl)}`;
    const statusCallbackUrl = `${baseUrl}/api/webhooks/twilio/status?tenantId=${tenant.id}&callType=custom`;

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

    console.log("[DBG][custom-call] Call initiated, SID:", callResult.callSid);

    return NextResponse.json({
      success: true,
      data: {
        callSid: callResult.callSid,
        phoneNumber: phoneConfig.phoneNumber,
        script: callScript,
        audioUrl,
      },
    });
  } catch (error) {
    console.error("[DBG][custom-call] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        success: false,
        error: `Failed to initiate custom call: ${errorMessage}`,
      },
      { status: 500 },
    );
  }
}
