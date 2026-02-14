"use client";

import { useEffect, useRef } from "react";
import { useVapiVoice } from "@/hooks/useVapiVoice";
import type { VoiceStatus, TranscriptEntry } from "@/hooks/useVapiVoice";

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Status indicator with pulsing dot and label.
 */
function StatusIndicator({ status }: { status: VoiceStatus }) {
  const config: Record<VoiceStatus, { color: string; label: string }> = {
    idle: { color: "bg-gray-400", label: "Ready" },
    connecting: { color: "bg-yellow-400", label: "Connecting..." },
    connected: { color: "bg-green-400", label: "Connected" },
    speaking: { color: "bg-blue-400", label: "AI Speaking" },
    listening: { color: "bg-green-400", label: "Listening" },
    error: { color: "bg-red-400", label: "Error" },
  };

  const { color, label } = config[status];
  const isPulsing = status === "connecting" || status === "listening";

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
        {isPulsing && (
          <div
            className={`absolute inset-0 w-2.5 h-2.5 rounded-full ${color} animate-ping`}
          />
        )}
      </div>
      <span className="text-sm text-white/80">{label}</span>
    </div>
  );
}

/**
 * Volume visualizer — simple bar animation reacting to volume level.
 */
function VolumeVisualizer({
  level,
  status,
}: {
  level: number;
  status: VoiceStatus;
}) {
  const isActive = status === "speaking" || status === "listening";
  const barCount = 5;

  return (
    <div className="flex items-center justify-center gap-1 h-16">
      {Array.from({ length: barCount }).map((_, i) => {
        const threshold = (i + 1) / barCount;
        const active = isActive && level >= threshold * 0.5;
        const height = active ? Math.max(16, level * 64) : 8;

        return (
          <div
            key={i}
            className={`w-1.5 rounded-full transition-all duration-150 ${
              active ? "bg-[var(--color-primary,#6366f1)]" : "bg-gray-300"
            }`}
            style={{ height: `${height}px` }}
          />
        );
      })}
    </div>
  );
}

/**
 * Transcript entry display.
 */
function TranscriptBubble({ entry }: { entry: TranscriptEntry }) {
  const isUser = entry.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
          isUser
            ? "bg-[var(--color-primary,#6366f1)] text-white rounded-br-none"
            : "bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm"
        } ${!entry.isFinal ? "opacity-60" : ""}`}
      >
        {entry.text}
      </div>
    </div>
  );
}

export default function VoiceAssistantModal({
  isOpen,
  onClose,
}: VoiceAssistantModalProps) {
  const {
    status,
    start,
    stop,
    toggleMute,
    isMuted,
    transcript,
    volumeLevel,
    error,
  } = useVapiVoice();

  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const handleClose = () => {
    stop();
    onClose();
  };

  const handleToggleCall = () => {
    if (status === "idle" || status === "error") {
      start();
    } else {
      stop();
    }
  };

  const isCallActive =
    status === "connecting" ||
    status === "connected" ||
    status === "speaking" ||
    status === "listening";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[var(--color-primary,#6366f1)] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold">Talk to your AI Assistant</h2>
              <StatusIndicator status={status} />
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Volume Visualizer */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
          <VolumeVisualizer level={volumeLevel} status={status} />
        </div>

        {/* Transcript Area */}
        <div className="h-64 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {transcript.length === 0 && !isCallActive && (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-gray-400">
                Click &quot;Start Conversation&quot; to begin
              </p>
            </div>
          )}
          {transcript.length === 0 && isCallActive && (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-gray-400">
                Listening... Speak to your assistant
              </p>
            </div>
          )}
          {transcript
            .filter((e) => e.isFinal)
            .map((entry) => (
              <TranscriptBubble key={entry.id} entry={entry} />
            ))}
          <div ref={transcriptEndRef} />
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-2 bg-red-50 border-t border-red-100">
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Controls */}
        <div className="p-4 border-t border-gray-200 bg-white flex items-center justify-center gap-4">
          {/* Mute Toggle */}
          {isCallActive && (
            <button
              onClick={toggleMute}
              className={`p-3 rounded-full transition-colors ${
                isMuted
                  ? "bg-red-100 text-red-600 hover:bg-red-200"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              )}
            </button>
          )}

          {/* Start / End Call */}
          <button
            onClick={handleToggleCall}
            disabled={status === "connecting"}
            className={`px-6 py-3 rounded-full font-semibold text-sm transition-colors ${
              isCallActive
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-[var(--color-primary,#6366f1)] text-white hover:bg-[var(--color-primary-hover,#4f46e5)]"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {status === "connecting"
              ? "Connecting..."
              : isCallActive
                ? "End Conversation"
                : "Start Conversation"}
          </button>
        </div>
      </div>
    </div>
  );
}
