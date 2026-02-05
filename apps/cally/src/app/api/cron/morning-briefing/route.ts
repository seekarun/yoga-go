/**
 * GET /api/cron/morning-briefing
 * Cron job to trigger morning briefing calls for all eligible tenants
 *
 * This endpoint is called by Vercel Cron at regular intervals (e.g., every 15 minutes).
 * It checks which tenants should receive a briefing call based on their configured time
 * and timezone, then triggers calls for eligible tenants.
 */
import { NextResponse } from "next/server";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, Tables } from "@/lib/dynamodb";
import { generateBriefingContent } from "@/lib/briefing-generator";
import { generateSpeech, getAudioContentType } from "@/lib/openai-tts";
import { makeCall } from "@/lib/twilio";
import type { PhoneConfig, DayOfWeek } from "@/types/phone-calling";
import { DEFAULT_PHONE_CONFIG } from "@/types/phone-calling";
import type { CallyTenant } from "@/lib/repositories/tenantRepository";
import { updateTenant } from "@/lib/repositories/tenantRepository";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";

// S3 client for storing audio files
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-southeast-2",
});
const AUDIO_BUCKET = process.env.S3_AUDIO_BUCKET || "cally-audio-files";

// Vercel Cron auth header
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Get base URL
 */
function getBaseUrl(): string {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }
  return "https://proj-cally.vercel.app";
}

/**
 * Get current time in a specific timezone
 */
function getCurrentTimeInTimezone(timezone: string): {
  hour: number;
  minute: number;
  dayOfWeek: DayOfWeek;
} {
  const now = new Date();
  try {
    const options: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: "numeric",
      weekday: "narrow",
      hour12: false,
      timeZone: timezone,
    };
    const parts = new Intl.DateTimeFormat("en-AU", options).formatToParts(now);
    const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0");
    const minute = parseInt(
      parts.find((p) => p.type === "minute")?.value || "0",
    );

    // Get day of week (need a different formatter)
    const dayFormatter = new Intl.DateTimeFormat("en-AU", {
      weekday: "long",
      timeZone: timezone,
    });
    const dayName = dayFormatter.format(now);
    const dayMap: Record<string, DayOfWeek> = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    };
    const dayOfWeek = dayMap[dayName] ?? 0;

    return { hour, minute, dayOfWeek };
  } catch {
    // Fallback to UTC
    return {
      hour: now.getUTCHours(),
      minute: now.getUTCMinutes(),
      dayOfWeek: now.getUTCDay() as DayOfWeek,
    };
  }
}

/**
 * Check if a tenant should receive a briefing call now
 */
function shouldCallNow(phoneConfig: PhoneConfig): boolean {
  if (!phoneConfig.morningBriefingEnabled) return false;
  if (!phoneConfig.phoneNumberVerified) return false;
  if (!phoneConfig.phoneNumber) return false;
  if (!phoneConfig.morningBriefingTime) return false;

  const timezone = phoneConfig.morningBriefingTimezone || "Australia/Sydney";
  const { hour, minute, dayOfWeek } = getCurrentTimeInTimezone(timezone);

  // Check if today is a scheduled day
  const scheduledDays = phoneConfig.morningBriefingDays || [1, 2, 3, 4, 5];
  if (!scheduledDays.includes(dayOfWeek)) return false;

  // Parse configured time
  const [configHour, configMinute] = phoneConfig.morningBriefingTime
    .split(":")
    .map(Number);

  // Allow a 15-minute window (cron runs every 15 mins)
  const currentMinutes = hour * 60 + minute;
  const configMinutes = configHour * 60 + configMinute;
  const diff = currentMinutes - configMinutes;

  // Call if within 0-15 minutes of configured time
  return diff >= 0 && diff < 15;
}

/**
 * Check if a call was already made today
 */
function wasCalledToday(phoneConfig: PhoneConfig): boolean {
  if (!phoneConfig.lastBriefingCallAt) return false;

  const lastCallDate = new Date(phoneConfig.lastBriefingCallAt);
  const timezone = phoneConfig.morningBriefingTimezone || "Australia/Sydney";

  try {
    const todayStr = new Date().toLocaleDateString("en-CA", {
      timeZone: timezone,
    });
    const lastCallStr = lastCallDate.toLocaleDateString("en-CA", {
      timeZone: timezone,
    });
    return todayStr === lastCallStr;
  } catch {
    // Fallback: compare dates in UTC
    const today = new Date();
    return (
      today.getUTCDate() === lastCallDate.getUTCDate() &&
      today.getUTCMonth() === lastCallDate.getUTCMonth() &&
      today.getUTCFullYear() === lastCallDate.getUTCFullYear()
    );
  }
}

/**
 * Upload audio to S3
 */
async function uploadAudioToS3(
  audioBuffer: Buffer,
  tenantId: string,
): Promise<string> {
  const fileName = `briefings/${tenantId}/cron-briefing-${nanoid()}.mp3`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: AUDIO_BUCKET,
      Key: fileName,
      Body: audioBuffer,
      ContentType: getAudioContentType("mp3"),
      // Public access is handled by bucket policy for briefings/* prefix
    }),
  );

  return `https://${AUDIO_BUCKET}.s3.${process.env.AWS_REGION || "ap-southeast-2"}.amazonaws.com/${fileName}`;
}

/**
 * Query all tenants with briefing enabled
 * Note: This is a scan operation - in production, you'd want a GSI for this
 */
async function getTenantsWithBriefingEnabled(): Promise<CallyTenant[]> {
  console.log("[DBG][cron-briefing] Querying tenants with briefing enabled");

  // Query all tenants from the TENANT# prefix
  // In production, you'd create a GSI for morningBriefingEnabled=true
  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: "begins_with(PK, :prefix)",
      FilterExpression: "entityType = :entityType",
      ExpressionAttributeValues: {
        ":prefix": "TENANT#",
        ":entityType": "TENANT",
      },
      ProjectionExpression: "id, #name, email, phoneConfig",
      ExpressionAttributeNames: {
        "#name": "name",
      },
    }),
  );

  // Filter to only tenants with briefing enabled
  const tenants = (result.Items || [])
    .filter((item) => {
      const phoneConfig = item.phoneConfig as PhoneConfig | undefined;
      return (
        phoneConfig?.morningBriefingEnabled && phoneConfig?.phoneNumberVerified
      );
    })
    .map((item) => item as CallyTenant);

  console.log(
    "[DBG][cron-briefing] Found",
    tenants.length,
    "tenants with briefing enabled",
  );
  return tenants;
}

/**
 * Trigger a briefing call for a tenant
 */
async function triggerBriefingCall(tenant: CallyTenant): Promise<boolean> {
  console.log("[DBG][cron-briefing] Triggering call for tenant:", tenant.id);

  const phoneConfig = tenant.phoneConfig || DEFAULT_PHONE_CONFIG;

  try {
    // Generate briefing content
    const briefingContent = await generateBriefingContent(
      tenant.id,
      tenant.name,
      phoneConfig,
    );

    // Generate TTS audio
    const audioBuffer = await generateSpeech(briefingContent.fullScript, {
      voice: phoneConfig.voiceId || "nova",
      model: "tts-1",
      format: "mp3",
    });

    // Upload audio to S3
    const audioUrl = await uploadAudioToS3(audioBuffer, tenant.id);

    // Build TwiML URL
    const baseUrl = getBaseUrl();
    const twimlUrl = `${baseUrl}/api/webhooks/twilio/voice?audioUrl=${encodeURIComponent(audioUrl)}`;
    const statusCallbackUrl = `${baseUrl}/api/webhooks/twilio/status?tenantId=${tenant.id}&callType=briefing`;

    // Make the call
    const callResult = await makeCall(
      phoneConfig.phoneNumber!,
      twimlUrl,
      statusCallbackUrl,
    );

    if (!callResult.success) {
      console.error(
        "[DBG][cron-briefing] Failed to call tenant:",
        tenant.id,
        callResult.error,
      );
      return false;
    }

    // Update tenant with call info
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
      "[DBG][cron-briefing] Call triggered for tenant:",
      tenant.id,
      "SID:",
      callResult.callSid,
    );
    return true;
  } catch (error) {
    console.error(
      "[DBG][cron-briefing] Error calling tenant:",
      tenant.id,
      error,
    );
    return false;
  }
}

/**
 * GET - Cron job handler
 */
export async function GET(request: Request) {
  console.log("[DBG][cron-briefing] Cron job triggered");

  // Verify Vercel Cron secret (if configured)
  if (CRON_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      console.warn("[DBG][cron-briefing] Unauthorized cron request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const startTime = Date.now();
  const results = {
    checked: 0,
    eligible: 0,
    called: 0,
    skipped: 0,
    errors: 0,
  };

  try {
    // Get all tenants with briefing enabled
    const tenants = await getTenantsWithBriefingEnabled();
    results.checked = tenants.length;

    // Process each tenant
    for (const tenant of tenants) {
      const phoneConfig = tenant.phoneConfig || DEFAULT_PHONE_CONFIG;

      // Check if this tenant should be called now
      if (!shouldCallNow(phoneConfig)) {
        results.skipped++;
        continue;
      }

      // Check if already called today
      if (wasCalledToday(phoneConfig)) {
        console.log(
          "[DBG][cron-briefing] Skipping tenant (already called today):",
          tenant.id,
        );
        results.skipped++;
        continue;
      }

      results.eligible++;

      // Trigger the call
      const success = await triggerBriefingCall(tenant);
      if (success) {
        results.called++;
      } else {
        results.errors++;
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      "[DBG][cron-briefing] Cron job completed in",
      duration,
      "ms",
      results,
    );

    return NextResponse.json({
      success: true,
      data: {
        ...results,
        durationMs: duration,
      },
    });
  } catch (error) {
    console.error("[DBG][cron-briefing] Cron job error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: results,
      },
      { status: 500 },
    );
  }
}
