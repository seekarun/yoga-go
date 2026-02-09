"use client";

/**
 * useAudioCapture Hook
 *
 * Captures microphone audio using MediaRecorder API
 * Format: WebM/Opus (good compression, Whisper-compatible)
 */

import { useState, useRef, useCallback } from "react";

interface AudioCaptureState {
  isCapturing: boolean;
  audioBlob: Blob | null;
  error: string | null;
  durationSeconds: number;
}

interface AudioCaptureActions {
  startCapture: () => Promise<void>;
  stopCapture: () => void;
  stopAndGetBlob: () => Promise<Blob | null>;
  resetCapture: () => void;
}

export type UseAudioCaptureReturn = AudioCaptureState & AudioCaptureActions;

export function useAudioCapture(): UseAudioCaptureReturn {
  const [isCapturing, setIsCapturing] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const blobResolverRef = useRef<((blob: Blob) => void) | null>(null);

  const startCapture = useCallback(async () => {
    console.log("[DBG][useAudioCapture] Starting capture...");
    setError(null);
    setAudioBlob(null);
    setDurationSeconds(0);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      // Prefer WebM/Opus, fallback to what's available
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";

      const recorder = new MediaRecorder(stream, {
        mimeType: mimeType || undefined,
      });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        console.log(
          "[DBG][useAudioCapture] Recording stopped, chunks:",
          chunksRef.current.length,
        );
        const blob = new Blob(chunksRef.current, {
          type: mimeType || "audio/webm",
        });
        setAudioBlob(blob);
        setIsCapturing(false);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());

        // Clear duration interval
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }

        // Resolve pending promise from stopAndGetBlob
        if (blobResolverRef.current) {
          blobResolverRef.current(blob);
          blobResolverRef.current = null;
        }

        console.log(
          "[DBG][useAudioCapture] Audio blob created, size:",
          blob.size,
          "bytes",
        );
      };

      recorder.onerror = (event) => {
        console.error("[DBG][useAudioCapture] Recorder error:", event);
        setError("Recording error occurred");
        setIsCapturing(false);
      };

      // Record in 1-second chunks for reliability
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      startTimeRef.current = Date.now();
      setIsCapturing(true);

      // Update duration every second
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setDurationSeconds(elapsed);
      }, 1000);

      console.log(
        "[DBG][useAudioCapture] Capture started with mime:",
        mimeType,
      );
    } catch (err) {
      console.error("[DBG][useAudioCapture] Failed to start capture:", err);
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError("Microphone permission denied");
      } else {
        setError("Failed to start audio capture");
      }
    }
  }, []);

  const stopCapture = useCallback(() => {
    console.log("[DBG][useAudioCapture] Stopping capture...");
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const stopAndGetBlob = useCallback((): Promise<Blob | null> => {
    console.log("[DBG][useAudioCapture] stopAndGetBlob called");
    if (
      !mediaRecorderRef.current ||
      mediaRecorderRef.current.state === "inactive"
    ) {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      blobResolverRef.current = resolve;
      mediaRecorderRef.current!.stop();
    });
  }, []);

  const resetCapture = useCallback(() => {
    setAudioBlob(null);
    setError(null);
    setDurationSeconds(0);
    chunksRef.current = [];
  }, []);

  return {
    isCapturing,
    audioBlob,
    error,
    durationSeconds,
    startCapture,
    stopCapture,
    stopAndGetBlob,
    resetCapture,
  };
}
