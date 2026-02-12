/**
 * OpenAI Whisper Integration for CallyGo
 * Uses OpenAI's Whisper API to transcribe audio files
 */

const OPENAI_WHISPER_URL = "https://api.openai.com/v1/audio/transcriptions";

interface WhisperOptions {
  language?: string; // ISO 639-1 code, e.g. "en"
  prompt?: string; // Optional text to guide the model
  temperature?: number; // 0-1, default 0
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
 * Transcribe audio using OpenAI Whisper API
 * Returns the transcribed text
 *
 * Note: Whisper API has a 25MB file size limit
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  fileName: string,
  options: WhisperOptions = {},
): Promise<string> {
  console.log(
    "[DBG][openai-whisper] Transcribing audio, size:",
    audioBuffer.length,
    "bytes, file:",
    fileName,
  );

  const apiKey = getApiKey();

  // Validate file size (25MB limit)
  const maxSize = 25 * 1024 * 1024;
  if (audioBuffer.length > maxSize) {
    throw new Error(
      `Audio file too large: ${audioBuffer.length} bytes (max ${maxSize} bytes)`,
    );
  }

  // Build multipart form data
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(audioBuffer)], {
    type: getMimeType(fileName),
  });
  formData.append("file", blob, fileName);
  formData.append("model", "whisper-1");

  if (options.language) {
    formData.append("language", options.language);
  }
  if (options.prompt) {
    formData.append("prompt", options.prompt);
  }
  if (options.temperature !== undefined) {
    formData.append("temperature", options.temperature.toString());
  }

  console.log("[DBG][openai-whisper] Sending request to Whisper API...");

  const response = await fetch(OPENAI_WHISPER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      "[DBG][openai-whisper] API error:",
      response.status,
      errorText,
    );
    throw new Error(
      `OpenAI Whisper API error: ${response.status} - ${errorText}`,
    );
  }

  const result = (await response.json()) as { text: string };
  console.log(
    "[DBG][openai-whisper] Transcription complete, length:",
    result.text.length,
    "chars",
  );

  return result.text;
}

/**
 * Get MIME type from file extension
 */
function getMimeType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    webm: "audio/webm",
    mp3: "audio/mpeg",
    mp4: "audio/mp4",
    m4a: "audio/mp4",
    wav: "audio/wav",
    ogg: "audio/ogg",
    flac: "audio/flac",
  };
  return mimeTypes[ext || ""] || "audio/webm";
}
