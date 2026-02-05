/**
 * OpenAI Text-to-Speech Integration for Cally
 * Uses OpenAI's TTS API to convert text to speech
 */

import type { TtsVoice } from "@/types/phone-calling";

const OPENAI_TTS_URL = "https://api.openai.com/v1/audio/speech";

/**
 * OpenAI TTS Model options
 */
type TtsModel = "tts-1" | "tts-1-hd";

/**
 * Audio format options
 */
type AudioFormat = "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm";

interface TtsOptions {
  voice?: TtsVoice;
  model?: TtsModel;
  format?: AudioFormat;
  speed?: number; // 0.25 to 4.0
}

/**
 * Get OpenAI API key from environment
 */
function getApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  return apiKey;
}

/**
 * Generate speech audio from text using OpenAI TTS
 * Returns audio as a Buffer
 */
export async function generateSpeech(
  text: string,
  options: TtsOptions = {},
): Promise<Buffer> {
  console.log("[DBG][openai-tts] Generating speech, text length:", text.length);

  const apiKey = getApiKey();
  const {
    voice = "nova",
    model = "tts-1",
    format = "mp3",
    speed = 1.0,
  } = options;

  // Validate speed
  const clampedSpeed = Math.min(4.0, Math.max(0.25, speed));

  // OpenAI TTS has a max input of 4096 characters
  const truncatedText = text.slice(0, 4096);
  if (text.length > 4096) {
    console.warn(
      "[DBG][openai-tts] Text truncated from",
      text.length,
      "to 4096 characters",
    );
  }

  console.log("[DBG][openai-tts] Using voice:", voice, "model:", model);

  const response = await fetch(OPENAI_TTS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: truncatedText,
      voice,
      response_format: format,
      speed: clampedSpeed,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[DBG][openai-tts] API error:", response.status, errorText);
    throw new Error(`OpenAI TTS API error: ${response.status} - ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  console.log(
    "[DBG][openai-tts] Generated audio, size:",
    buffer.length,
    "bytes",
  );

  return buffer;
}

/**
 * Generate speech and return as base64 encoded string
 * Useful for embedding in responses
 */
export async function generateSpeechBase64(
  text: string,
  options: TtsOptions = {},
): Promise<string> {
  const buffer = await generateSpeech(text, options);
  return buffer.toString("base64");
}

/**
 * Estimate the duration of speech based on text length
 * Approximate: ~150 words per minute at normal speed
 */
export function estimateSpeechDuration(
  text: string,
  speed: number = 1.0,
): number {
  const wordCount = text.split(/\s+/).length;
  const minutesAtNormalSpeed = wordCount / 150;
  const seconds = (minutesAtNormalSpeed * 60) / speed;
  return Math.ceil(seconds);
}

/**
 * Check if text is within TTS limits
 */
export function isWithinTtsLimits(text: string): boolean {
  return text.length <= 4096;
}

/**
 * Split long text into chunks suitable for TTS
 * Tries to split at sentence boundaries
 */
export function splitTextForTts(
  text: string,
  maxLength: number = 4096,
): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  let currentChunk = "";

  // Split by sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length <= maxLength) {
      currentChunk += sentence;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      // If single sentence is too long, split by words
      if (sentence.length > maxLength) {
        const words = sentence.split(/\s+/);
        currentChunk = "";
        for (const word of words) {
          if ((currentChunk + " " + word).length <= maxLength) {
            currentChunk += (currentChunk ? " " : "") + word;
          } else {
            if (currentChunk) {
              chunks.push(currentChunk.trim());
            }
            currentChunk = word;
          }
        }
      } else {
        currentChunk = sentence;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Get content type for audio format
 */
export function getAudioContentType(format: AudioFormat): string {
  const contentTypes: Record<AudioFormat, string> = {
    mp3: "audio/mpeg",
    opus: "audio/opus",
    aac: "audio/aac",
    flac: "audio/flac",
    wav: "audio/wav",
    pcm: "audio/L16",
  };
  return contentTypes[format] || "audio/mpeg";
}
