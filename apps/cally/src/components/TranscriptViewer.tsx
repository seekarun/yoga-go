"use client";

/**
 * TranscriptViewer Component
 *
 * Displays transcript status, summary, topics, and full text.
 * Polls for status updates while processing.
 */

import { useEffect, useState, useCallback } from "react";
import type { MeetingTranscript, TranscriptStatus } from "@/types";

interface TranscriptViewerProps {
  eventId: string;
}

const STATUS_LABELS: Record<TranscriptStatus, string> = {
  uploading: "Uploading audio...",
  queued: "Queued for processing...",
  transcribing: "Transcribing audio...",
  summarizing: "Generating summary...",
  completed: "Transcript ready",
  failed: "Transcription failed",
};

const STATUS_COLORS: Record<TranscriptStatus, string> = {
  uploading: "#f59e0b",
  queued: "#8b5cf6",
  transcribing: "#3b82f6",
  summarizing: "#06b6d4",
  completed: "#22c55e",
  failed: "#ef4444",
};

export default function TranscriptViewer({ eventId }: TranscriptViewerProps) {
  const [transcript, setTranscript] = useState<MeetingTranscript | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullText, setShowFullText] = useState(false);

  const fetchTranscript = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/data/app/calendar/events/${eventId}/transcript`,
      );
      const data = await res.json();

      if (data.success) {
        setTranscript(data.data);
        setError(null);
      } else if (res.status === 404) {
        setTranscript(null);
        setError(null);
      } else {
        setError(data.error || "Failed to load transcript");
      }
    } catch (err) {
      console.error("[DBG][TranscriptViewer] Fetch error:", err);
      setError("Failed to load transcript");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  // Initial fetch
  useEffect(() => {
    fetchTranscript();
  }, [fetchTranscript]);

  // Poll for updates while processing
  useEffect(() => {
    if (!transcript) return;

    const isProcessing = [
      "uploading",
      "queued",
      "transcribing",
      "summarizing",
    ].includes(transcript.status);

    if (!isProcessing) return;

    const interval = setInterval(fetchTranscript, 5000);
    return () => clearInterval(interval);
  }, [transcript, fetchTranscript]);

  if (loading) {
    return (
      <div style={{ padding: "16px", color: "#6b7280", fontSize: "14px" }}>
        Loading transcript...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "16px", color: "#ef4444", fontSize: "14px" }}>
        {error}
      </div>
    );
  }

  if (!transcript) {
    return (
      <div
        style={{
          padding: "16px",
          color: "var(--text-muted, #6b7280)",
          fontSize: "14px",
        }}
      >
        No transcript available for this meeting.
      </div>
    );
  }

  return (
    <div
      style={{
        border: "1px solid var(--color-border, #e5e7eb)",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >
      {/* Status Header */}
      <div
        style={{
          padding: "12px 16px",
          background: "#f9fafb",
          borderBottom: "1px solid var(--color-border, #e5e7eb)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: STATUS_COLORS[transcript.status],
              animation:
                transcript.status !== "completed" &&
                transcript.status !== "failed"
                  ? "pulse 1.5s ease-in-out infinite"
                  : "none",
            }}
          />
          <span
            style={{
              fontSize: "14px",
              fontWeight: "500",
              color: STATUS_COLORS[transcript.status],
            }}
          >
            {STATUS_LABELS[transcript.status]}
          </span>
        </div>
        <span
          style={{
            fontSize: "12px",
            color: "var(--text-muted, #6b7280)",
          }}
        >
          {new Date(transcript.updatedAt).toLocaleString()}
        </span>
      </div>

      {/* Error Message */}
      {transcript.status === "failed" && transcript.errorMessage && (
        <div
          style={{
            padding: "12px 16px",
            background: "#fef2f2",
            borderBottom: "1px solid #fecaca",
            color: "#dc2626",
            fontSize: "13px",
          }}
        >
          {transcript.errorMessage}
        </div>
      )}

      {/* Summary */}
      {transcript.summary && (
        <div
          style={{
            padding: "16px",
            borderBottom: "1px solid var(--color-border, #e5e7eb)",
          }}
        >
          <h4
            style={{
              fontSize: "13px",
              fontWeight: "600",
              color: "var(--text-muted, #6b7280)",
              textTransform: "uppercase",
              marginBottom: "8px",
            }}
          >
            Summary
          </h4>
          <p
            style={{
              fontSize: "14px",
              lineHeight: "1.6",
              color: "var(--text-main, #111827)",
              margin: 0,
            }}
          >
            {transcript.summary}
          </p>
        </div>
      )}

      {/* Topics */}
      {transcript.topics && transcript.topics.length > 0 && (
        <div
          style={{
            padding: "16px",
            borderBottom: "1px solid var(--color-border, #e5e7eb)",
          }}
        >
          <h4
            style={{
              fontSize: "13px",
              fontWeight: "600",
              color: "var(--text-muted, #6b7280)",
              textTransform: "uppercase",
              marginBottom: "8px",
            }}
          >
            Topics
          </h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {transcript.topics.map((topic) => (
              <span
                key={topic}
                style={{
                  padding: "4px 10px",
                  background: "#f3f4f6",
                  borderRadius: "12px",
                  fontSize: "13px",
                  color: "var(--text-main, #111827)",
                }}
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Full Transcript (collapsible) */}
      {transcript.transcriptText && (
        <div style={{ padding: "16px" }}>
          <button
            onClick={() => setShowFullText(!showFullText)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "600",
              color: "var(--color-primary, #6366f1)",
              padding: 0,
              marginBottom: showFullText ? "12px" : 0,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="currentColor"
              style={{
                transform: showFullText ? "rotate(90deg)" : "none",
                transition: "transform 0.2s",
              }}
            >
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
            </svg>
            Full Transcript
          </button>
          {showFullText && (
            <div
              style={{
                fontSize: "14px",
                lineHeight: "1.8",
                color: "var(--text-main, #111827)",
                whiteSpace: "pre-wrap",
                maxHeight: "400px",
                overflowY: "auto",
                padding: "12px",
                background: "#f9fafb",
                borderRadius: "8px",
              }}
            >
              {transcript.transcriptText}
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}
