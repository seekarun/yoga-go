"use client";

/**
 * useVapiVoice — React hook wrapping the @vapi-ai/web SDK.
 * Manages a voice conversation with the AI assistant via Vapi.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import type Vapi from "@vapi-ai/web";
import type { VapiAssistantConfig } from "@/lib/vapi";

export type VoiceStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "speaking"
  | "listening"
  | "error";

export interface TranscriptEntry {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
  isFinal: boolean;
}

interface UseVapiVoiceReturn {
  status: VoiceStatus;
  start: () => Promise<void>;
  stop: () => void;
  toggleMute: () => void;
  isMuted: boolean;
  transcript: TranscriptEntry[];
  volumeLevel: number;
  error: string | null;
}

/**
 * Lazily import and create the Vapi instance.
 * The @vapi-ai/web SDK uses daily-co which requires window.
 */
async function createVapiInstance(publicKey: string): Promise<Vapi> {
  const VapiClass = (await import("@vapi-ai/web")).default;
  return new VapiClass(publicKey);
}

/**
 * Extract a readable error message from Vapi's nested error objects.
 */
function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err !== "object" || err === null) return "Voice call error";

  // Vapi errors can be deeply nested: { error: { message: { ... }, error: { message: "..." } } }
  const obj = err as Record<string, unknown>;

  // Try error.error.message (Vapi API error)
  if (typeof obj.error === "object" && obj.error !== null) {
    const inner = obj.error as Record<string, unknown>;
    if (typeof inner.message === "string") return inner.message;
    if (typeof inner.error === "object" && inner.error !== null) {
      const deep = inner.error as Record<string, unknown>;
      if (typeof deep.message === "string") return deep.message;
    }
  }

  // Try top-level message
  if (typeof obj.message === "string") return obj.message;

  return "Voice call error";
}

export function useVapiVoice(): UseVapiVoiceReturn {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const vapiRef = useRef<Vapi | null>(null);
  const statusRef = useRef<VoiceStatus>("idle");

  // Keep statusRef in sync
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (vapiRef.current) {
        vapiRef.current.stop();
        vapiRef.current.removeAllListeners();
        vapiRef.current = null;
      }
    };
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setStatus("connecting");
    setTranscript([]);
    setVolumeLevel(0);
    setIsMuted(false);

    try {
      // Fetch assistant config from our API
      const response = await fetch("/api/data/app/ai/voice/start", {
        method: "POST",
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to start voice session");
      }

      const { assistantConfig, vapiPublicKey } = data.data as {
        assistantConfig: VapiAssistantConfig;
        vapiPublicKey: string;
      };

      // Create Vapi instance (lazy import for SSR safety)
      const vapi = await createVapiInstance(vapiPublicKey);
      vapiRef.current = vapi;

      // Set up event listeners
      vapi.on("call-start", () => {
        console.log("[DBG][useVapiVoice] Call started");
        setStatus("listening");
      });

      vapi.on("call-end", () => {
        console.log("[DBG][useVapiVoice] Call ended");
        setStatus("idle");
        setVolumeLevel(0);
      });

      vapi.on("speech-start", () => {
        if (statusRef.current !== "idle") {
          setStatus("speaking");
        }
      });

      vapi.on("speech-end", () => {
        if (statusRef.current !== "idle") {
          setStatus("listening");
        }
      });

      vapi.on("volume-level", (level: number) => {
        setVolumeLevel(level);
      });

      vapi.on("error", (err: unknown) => {
        console.error(
          "[DBG][useVapiVoice] Error:",
          JSON.stringify(err, null, 2),
        );
        setError(extractErrorMessage(err));
        setStatus("error");
      });

      vapi.on("call-start-failed", (event: unknown) => {
        console.error(
          "[DBG][useVapiVoice] Call start failed:",
          JSON.stringify(event, null, 2),
        );
      });

      // Vapi message event carries transcript and function call data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vapi.on("message", (message: any) => {
        if (message.type === "transcript") {
          const entry: TranscriptEntry = {
            id: `tr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            role: message.role === "user" ? "user" : "assistant",
            text: message.transcript,
            timestamp: new Date().toISOString(),
            isFinal: message.transcriptType === "final",
          };

          setTranscript((prev) => {
            // For partial transcripts, update the last entry of same role
            if (!entry.isFinal) {
              const lastIdx = prev.length - 1;
              if (
                lastIdx >= 0 &&
                prev[lastIdx].role === entry.role &&
                !prev[lastIdx].isFinal
              ) {
                const updated = [...prev];
                updated[lastIdx] = entry;
                return updated;
              }
            }
            return [...prev, entry];
          });
        }
      });

      // Start the call with the inline assistant config
      // Use type assertion since our config shape matches CreateAssistantDTO
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await vapi.start(assistantConfig as any);

      console.log("[DBG][useVapiVoice] Call starting...");
    } catch (err) {
      console.error(
        "[DBG][useVapiVoice] Start error:",
        JSON.stringify(err, null, 2),
      );
      setError(extractErrorMessage(err));
      setStatus("error");
    }
  }, []);

  const stop = useCallback(() => {
    if (vapiRef.current) {
      vapiRef.current.stop();
      vapiRef.current.removeAllListeners();
      vapiRef.current = null;
    }
    setStatus("idle");
    setVolumeLevel(0);
  }, []);

  const toggleMute = useCallback(() => {
    if (vapiRef.current) {
      const newMuted = !isMuted;
      vapiRef.current.setMuted(newMuted);
      setIsMuted(newMuted);
    }
  }, [isMuted]);

  return {
    status,
    start,
    stop,
    toggleMute,
    isMuted,
    transcript,
    volumeLevel,
    error,
  };
}
