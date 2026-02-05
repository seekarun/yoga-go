/**
 * POST /api/webhooks/twilio/status
 * Twilio status callback webhook - receives call status updates
 *
 * This is a public endpoint that Twilio calls to report call status changes.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  getTenantById,
  updateTenant,
} from "@/lib/repositories/tenantRepository";
import type { CallStatus } from "@/types/phone-calling";
import { DEFAULT_PHONE_CONFIG } from "@/types/phone-calling";

/**
 * Parse Twilio form data
 */
async function parseTwilioFormData(
  request: NextRequest,
): Promise<Record<string, string>> {
  const formData = await request.formData();
  const data: Record<string, string> = {};
  formData.forEach((value, key) => {
    data[key] = value.toString();
  });
  return data;
}

/**
 * POST - Handle Twilio status callback
 *
 * Twilio sends these fields:
 *   - CallSid: Unique call identifier
 *   - CallStatus: queued, ringing, in-progress, completed, busy, failed, no-answer, canceled
 *   - CallDuration: Duration in seconds (only for completed calls)
 *   - To: Phone number called
 *   - From: Twilio phone number
 *
 * Query params:
 *   - tenantId: The tenant ID for this call
 *   - callType: "briefing" or "custom"
 */
export async function POST(request: NextRequest) {
  console.log("[DBG][twilio-status] Status callback received");

  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const callType = searchParams.get("callType");

    // Parse Twilio form data
    const twilioData = await parseTwilioFormData(request);

    const callSid = twilioData.CallSid;
    const callStatus = twilioData.CallStatus as CallStatus;
    const callDuration = twilioData.CallDuration;

    console.log(
      "[DBG][twilio-status] Call:",
      callSid,
      "Status:",
      callStatus,
      "Duration:",
      callDuration,
    );

    if (!tenantId) {
      console.warn("[DBG][twilio-status] Missing tenantId in callback");
      return NextResponse.json({ success: true }); // Still return success to Twilio
    }

    // Get tenant
    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      console.warn("[DBG][twilio-status] Tenant not found:", tenantId);
      return NextResponse.json({ success: true });
    }

    const phoneConfig = tenant.phoneConfig || DEFAULT_PHONE_CONFIG;

    // Update tenant with call status
    if (callType === "briefing") {
      await updateTenant(tenantId, {
        phoneConfig: {
          ...phoneConfig,
          lastBriefingCallStatus: callStatus,
          lastBriefingCallSid: callSid,
          // Update lastBriefingCallAt on completion
          lastBriefingCallAt:
            callStatus === "completed"
              ? new Date().toISOString()
              : phoneConfig.lastBriefingCallAt,
        },
      });
      console.log(
        "[DBG][twilio-status] Updated briefing call status for tenant:",
        tenantId,
      );
    }

    // Log call completion
    if (callStatus === "completed") {
      console.log(
        "[DBG][twilio-status] Call completed - Tenant:",
        tenantId,
        "Type:",
        callType,
        "Duration:",
        callDuration,
        "seconds",
      );
    } else if (
      ["failed", "busy", "no-answer", "canceled"].includes(callStatus)
    ) {
      console.warn(
        "[DBG][twilio-status] Call failed/unsuccessful - Tenant:",
        tenantId,
        "Status:",
        callStatus,
      );
    }

    // Always return success to Twilio (even if we had errors processing)
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DBG][twilio-status] Error processing callback:", error);
    // Still return success to Twilio to avoid retries
    return NextResponse.json({ success: true });
  }
}

/**
 * GET - Endpoint discovery (returns info about the webhook)
 */
export async function GET() {
  return NextResponse.json({
    webhook: "twilio-status",
    description: "Receives call status updates from Twilio",
    supportedEvents: [
      "queued",
      "ringing",
      "in-progress",
      "completed",
      "busy",
      "failed",
      "no-answer",
      "canceled",
    ],
  });
}
