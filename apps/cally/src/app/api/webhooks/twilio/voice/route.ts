/**
 * POST /api/webhooks/twilio/voice
 * Twilio voice webhook - returns TwiML for call flow
 *
 * This is a public endpoint that Twilio calls when a call is answered.
 * It returns TwiML that tells Twilio what to do (play audio, speak, etc.)
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { generateAudioTwiml, generateSpeechTwiml } from "@/lib/twilio";

/**
 * POST - Handle Twilio voice webhook
 *
 * Query params:
 *   - audioUrl: URL of audio file to play
 *   - text: Text to speak (if no audioUrl)
 */
export async function POST(request: NextRequest) {
  console.log("[DBG][twilio-voice] Voice webhook called");

  try {
    const { searchParams } = new URL(request.url);
    const audioUrl = searchParams.get("audioUrl");
    const text = searchParams.get("text");

    let twiml: string;

    if (audioUrl) {
      // Play pre-generated audio file
      console.log("[DBG][twilio-voice] Playing audio from:", audioUrl);
      twiml = generateAudioTwiml(audioUrl);
    } else if (text) {
      // Use Twilio's built-in TTS
      console.log("[DBG][twilio-voice] Speaking text, length:", text.length);
      twiml = generateSpeechTwiml(text);
    } else {
      // Default fallback message
      console.log(
        "[DBG][twilio-voice] No audio or text provided, using fallback",
      );
      twiml = generateSpeechTwiml(
        "Hello, this is a test call from Cally. Goodbye!",
      );
    }

    console.log("[DBG][twilio-voice] Returning TwiML");

    // Return TwiML response
    return new NextResponse(twiml, {
      headers: {
        "Content-Type": "text/xml",
      },
    });
  } catch (error) {
    console.error("[DBG][twilio-voice] Error:", error);

    // Return error TwiML
    const errorTwiml = generateSpeechTwiml(
      "Sorry, there was an error processing your call. Please try again later.",
    );

    return new NextResponse(errorTwiml, {
      headers: {
        "Content-Type": "text/xml",
      },
    });
  }
}

/**
 * GET - Also handle GET requests (Twilio sometimes uses GET)
 */
export async function GET(request: NextRequest) {
  return POST(request);
}
