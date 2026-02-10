"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Survey, SurveyStatus } from "@/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: SurveyStatus }) {
  const colors: Record<SurveyStatus, { bg: string; text: string }> = {
    draft: { bg: "#f3f4f6", text: "#6b7280" },
    active: { bg: "#dcfce7", text: "#16a34a" },
    closed: { bg: "#fef3c7", text: "#d97706" },
    archived: { bg: "#fee2e2", text: "#dc2626" },
  };
  const c = colors[status];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: "12px",
        fontSize: "12px",
        fontWeight: 600,
        background: c.bg,
        color: c.text,
        textTransform: "capitalize",
      }}
    >
      {status}
    </span>
  );
}

export default function SurveysListPage() {
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;

  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [duplicating, setDuplicating] = useState<string | null>(null);

  const fetchSurveys = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/data/app/surveys");
      const json = await res.json();
      if (json.success && json.data) {
        setSurveys(json.data);
      } else {
        setError(json.error || "Failed to load surveys");
      }
    } catch {
      setError("Failed to load surveys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  const handleDuplicate = async (e: React.MouseEvent, surveyId: string) => {
    e.stopPropagation();
    setDuplicating(surveyId);
    try {
      const res = await fetch(`/api/data/app/surveys/${surveyId}/duplicate`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success && json.data) {
        router.push(`/srv/${expertId}/surveys/${json.data.id}`);
      } else {
        setError(json.error || "Failed to duplicate survey");
      }
    } catch {
      setError("Failed to duplicate survey");
    } finally {
      setDuplicating(null);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/data/app/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled Survey" }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        router.push(`/srv/${expertId}/surveys/${json.data.id}`);
      } else {
        setError(json.error || "Failed to create survey");
      }
    } catch {
      setError("Failed to create survey");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <h1
          style={{
            fontSize: "24px",
            fontWeight: "700",
            color: "var(--text-main, #1f2937)",
          }}
        >
          Surveys
        </h1>
        <button
          onClick={handleCreate}
          disabled={creating}
          style={{
            padding: "10px 20px",
            fontSize: "14px",
            fontWeight: 600,
            background: "var(--color-primary, #6366f1)",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: creating ? "not-allowed" : "pointer",
            opacity: creating ? 0.6 : 1,
          }}
        >
          {creating ? "Creating..." : "+ Create Survey"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: "12px 16px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            color: "#dc2626",
            fontSize: "14px",
            marginBottom: "16px",
          }}
        >
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <p style={{ color: "var(--text-muted, #6b7280)", textAlign: "center" }}>
          Loading surveys...
        </p>
      )}

      {/* Empty state */}
      {!loading && surveys.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "var(--text-muted, #6b7280)",
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={{ margin: "0 auto 16px", opacity: 0.4 }}
          >
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p style={{ fontSize: "16px", marginBottom: "8px" }}>
            No surveys yet
          </p>
          <p style={{ fontSize: "14px" }}>
            Create your first survey to start collecting responses.
          </p>
        </div>
      )}

      {/* Survey cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {surveys.map((survey) => (
          <div
            key={survey.id}
            role="button"
            tabIndex={0}
            onClick={() => router.push(`/srv/${expertId}/surveys/${survey.id}`)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                router.push(`/srv/${expertId}/surveys/${survey.id}`);
              }
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              background: "#fff",
              border: "1px solid var(--color-border, #e5e7eb)",
              borderRadius: "10px",
              cursor: "pointer",
              textAlign: "left",
              transition: "box-shadow 0.15s",
              width: "100%",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "4px",
                }}
              >
                <span
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "var(--text-main, #1f2937)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {survey.title}
                </span>
                <StatusBadge status={survey.status} />
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "16px",
                  fontSize: "13px",
                  color: "var(--text-muted, #6b7280)",
                }}
              >
                <span>
                  {survey.questions.length} question
                  {survey.questions.length !== 1 ? "s" : ""}
                </span>
                <span>
                  {survey.responseCount ?? 0} response
                  {(survey.responseCount ?? 0) !== 1 ? "s" : ""}
                </span>
                {survey.createdAt && (
                  <span>{formatDate(survey.createdAt)}</span>
                )}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <button
                type="button"
                onClick={(e) => handleDuplicate(e, survey.id)}
                disabled={duplicating === survey.id}
                style={{
                  background: "none",
                  border: "1px solid var(--color-border, #e5e7eb)",
                  borderRadius: "6px",
                  padding: "4px 8px",
                  cursor: duplicating === survey.id ? "not-allowed" : "pointer",
                  opacity: duplicating === survey.id ? 0.5 : 1,
                  fontSize: "12px",
                  color: "var(--text-muted, #6b7280)",
                  fontWeight: 500,
                }}
                title="Duplicate survey"
              >
                {duplicating === survey.id ? "..." : "Duplicate"}
              </button>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-muted, #6b7280)"
                strokeWidth="2"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
