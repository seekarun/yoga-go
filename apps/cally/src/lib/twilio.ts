/**
 * Twilio Integration for Cally
 * Handles phone verification and voice calls
 */

import twilio from "twilio";
import type { CallStatus } from "@/types/phone-calling";

// Twilio client singleton
let twilioClient: twilio.Twilio | null = null;

/**
 * Get Twilio configuration from environment
 */
function getTwilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
  const verifySid = process.env.TWILIO_VERIFY_SID;

  if (!accountSid || !authToken) {
    throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set");
  }

  return { accountSid, authToken, phoneNumber, verifySid };
}

/**
 * Get or create Twilio client
 */
function getClient(): twilio.Twilio {
  if (!twilioClient) {
    const { accountSid, authToken } = getTwilioConfig();
    twilioClient = twilio(accountSid, authToken);
    console.log("[DBG][twilio] Client initialized");
  }
  return twilioClient;
}

/**
 * Validate phone number format (E.164)
 */
export function isValidE164(phoneNumber: string): boolean {
  // E.164 format: + followed by 1-15 digits
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phoneNumber);
}

/**
 * Format phone number to E.164
 * Handles Australian numbers starting with 0
 */
export function formatToE164(
  phoneNumber: string,
  defaultCountry = "+61",
): string {
  // Remove all non-digit characters except +
  let cleaned = phoneNumber.replace(/[^\d+]/g, "");

  // If already starts with +, assume it's E.164
  if (cleaned.startsWith("+")) {
    return cleaned;
  }

  // Handle Australian numbers starting with 0
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
    return `${defaultCountry}${cleaned}`;
  }

  // Otherwise, prepend default country code
  return `${defaultCountry}${cleaned}`;
}

// ===================================================================
// PHONE VERIFICATION (Twilio Verify)
// ===================================================================

/**
 * Send SMS verification code
 */
export async function sendVerificationCode(
  phoneNumber: string,
): Promise<{ success: boolean; verificationSid?: string; error?: string }> {
  console.log("[DBG][twilio] Sending verification code to:", phoneNumber);

  try {
    const { verifySid } = getTwilioConfig();
    if (!verifySid) {
      throw new Error("TWILIO_VERIFY_SID must be set for phone verification");
    }

    const client = getClient();
    const verification = await client.verify.v2
      .services(verifySid)
      .verifications.create({
        to: phoneNumber,
        channel: "sms",
      });

    console.log("[DBG][twilio] Verification sent, SID:", verification.sid);
    return { success: true, verificationSid: verification.sid };
  } catch (error) {
    console.error("[DBG][twilio] Error sending verification:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Verify SMS code
 */
export async function verifyCode(
  phoneNumber: string,
  code: string,
): Promise<{ success: boolean; status?: string; error?: string }> {
  console.log("[DBG][twilio] Verifying code for:", phoneNumber);

  try {
    const { verifySid } = getTwilioConfig();
    if (!verifySid) {
      throw new Error("TWILIO_VERIFY_SID must be set for phone verification");
    }

    const client = getClient();
    const verificationCheck = await client.verify.v2
      .services(verifySid)
      .verificationChecks.create({
        to: phoneNumber,
        code: code,
      });

    console.log("[DBG][twilio] Verification status:", verificationCheck.status);

    if (verificationCheck.status === "approved") {
      return { success: true, status: "approved" };
    } else {
      return {
        success: false,
        status: verificationCheck.status,
        error: "Invalid verification code",
      };
    }
  } catch (error) {
    console.error("[DBG][twilio] Error verifying code:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

// ===================================================================
// VOICE CALLS
// ===================================================================

/**
 * Make an outbound call with TwiML URL
 * The TwiML URL should return the voice instructions
 */
export async function makeCall(
  toPhoneNumber: string,
  twimlUrl: string,
  statusCallbackUrl?: string,
): Promise<{ success: boolean; callSid?: string; error?: string }> {
  console.log("[DBG][twilio] Making call to:", toPhoneNumber);
  console.log("[DBG][twilio] TwiML URL:", twimlUrl);

  try {
    const { phoneNumber: fromNumber } = getTwilioConfig();
    if (!fromNumber) {
      throw new Error("TWILIO_PHONE_NUMBER must be set to make calls");
    }

    const client = getClient();
    const call = await client.calls.create({
      to: toPhoneNumber,
      from: fromNumber,
      url: twimlUrl,
      statusCallback: statusCallbackUrl,
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      statusCallbackMethod: "POST",
    });

    console.log("[DBG][twilio] Call initiated, SID:", call.sid);
    return { success: true, callSid: call.sid };
  } catch (error) {
    console.error("[DBG][twilio] Error making call:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Make a call with inline TwiML
 */
export async function makeCallWithTwiml(
  toPhoneNumber: string,
  twiml: string,
  statusCallbackUrl?: string,
): Promise<{ success: boolean; callSid?: string; error?: string }> {
  console.log("[DBG][twilio] Making call with inline TwiML to:", toPhoneNumber);

  try {
    const { phoneNumber: fromNumber } = getTwilioConfig();
    if (!fromNumber) {
      throw new Error("TWILIO_PHONE_NUMBER must be set to make calls");
    }

    const client = getClient();
    const call = await client.calls.create({
      to: toPhoneNumber,
      from: fromNumber,
      twiml: twiml,
      statusCallback: statusCallbackUrl,
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      statusCallbackMethod: "POST",
    });

    console.log("[DBG][twilio] Call initiated, SID:", call.sid);
    return { success: true, callSid: call.sid };
  } catch (error) {
    console.error("[DBG][twilio] Error making call:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * Get call details
 */
export async function getCallDetails(callSid: string): Promise<{
  success: boolean;
  status?: CallStatus;
  duration?: number;
  error?: string;
}> {
  console.log("[DBG][twilio] Getting call details for:", callSid);

  try {
    const client = getClient();
    const call = await client.calls(callSid).fetch();

    console.log("[DBG][twilio] Call status:", call.status);
    return {
      success: true,
      status: call.status as CallStatus,
      duration: call.duration ? parseInt(call.duration, 10) : undefined,
    };
  } catch (error) {
    console.error("[DBG][twilio] Error getting call details:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

// ===================================================================
// TWIML GENERATION
// ===================================================================

/**
 * Generate TwiML for playing audio from a URL
 */
export function generateAudioTwiml(audioUrl: string): string {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();
  response.play(audioUrl);
  response.hangup();
  return response.toString();
}

/**
 * Generate TwiML for text-to-speech (Twilio's built-in TTS)
 */
export function generateSpeechTwiml(
  text: string,
  voice = "Polly.Joanna" as const,
  language = "en-AU" as const,
): string {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();
  response.say({ voice, language }, text);
  response.hangup();
  return response.toString();
}

/**
 * Generate TwiML that redirects to another URL for voice instructions
 */
export function generateRedirectTwiml(url: string): string {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();
  response.redirect(url);
  return response.toString();
}

/**
 * Validate Twilio webhook signature
 */
export function validateWebhookSignature(
  signature: string,
  url: string,
  params: Record<string, string>,
): boolean {
  try {
    const { authToken } = getTwilioConfig();
    return twilio.validateRequest(authToken, signature, url, params);
  } catch (error) {
    console.error("[DBG][twilio] Error validating signature:", error);
    return false;
  }
}
