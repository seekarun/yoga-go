"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { SurveyFlowBuilder } from "@core/components";
import { inferSurveyAnswer } from "@/lib/survey-infer";
import "@xyflow/react/dist/style.css";
import type {
  Survey,
  SurveyQuestion,
  SurveyStatus,
  SurveyResponse,
  ApiResponse,
  EditorLayout,
} from "@/types";

const AUTO_SAVE_DELAY = 1500;

type ActiveTab = "builder" | "responses";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SurveyBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;
  const surveyId = params.surveyId as string;

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("builder");
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [responsesLoading, setResponsesLoading] = useState(false);

  // Title editing
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  // Auto-save refs
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const savedIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);
  const questionsRef = useRef<SurveyQuestion[]>([]);
  const editorLayoutRef = useRef<EditorLayout>({});

  const fetchSurvey = useCallback(async () => {
    try {
      const res = await fetch(`/api/data/app/surveys/${surveyId}`);
      const json: ApiResponse<Survey> = await res.json();
      if (json.success && json.data) {
        setSurvey(json.data);
        questionsRef.current = json.data.questions;
        editorLayoutRef.current = json.data.editorLayout ?? {};
        setTitleDraft(json.data.title);
      } else {
        setError(json.error || "Survey not found");
      }
    } catch {
      setError("Failed to load survey");
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    fetchSurvey();
  }, [fetchSurvey]);

  const fetchResponses = useCallback(async () => {
    setResponsesLoading(true);
    try {
      const res = await fetch(`/api/data/app/surveys/${surveyId}/responses`);
      const json: ApiResponse<SurveyResponse[]> = await res.json();
      if (json.success && json.data) {
        setResponses(json.data);
      }
    } catch {
      console.error("[DBG][surveyBuilder] Failed to fetch responses");
    } finally {
      setResponsesLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    if (activeTab === "responses") {
      fetchResponses();
    }
  }, [activeTab, fetchResponses]);

  /** Auto-save to backend */
  const performAutoSave = useCallback(async () => {
    if (!survey?.createdAt) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/data/app/surveys/${surveyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          createdAt: survey.createdAt,
          title: survey.title,
          questions: questionsRef.current,
          editorLayout: editorLayoutRef.current,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSaved(true);
        if (savedIndicatorTimeoutRef.current) {
          clearTimeout(savedIndicatorTimeoutRef.current);
        }
        savedIndicatorTimeoutRef.current = setTimeout(
          () => setSaved(false),
          2000,
        );
      }
    } catch {
      console.error("[DBG][surveyBuilder] Auto-save failed");
    } finally {
      setSaving(false);
    }
  }, [survey?.createdAt, survey?.title, surveyId]);

  /** Trigger auto-save on question changes */
  const handleQuestionsChange = useCallback(
    (updated: SurveyQuestion[], layout: EditorLayout) => {
      questionsRef.current = updated;
      editorLayoutRef.current = layout;
      setSurvey((prev) =>
        prev ? { ...prev, questions: updated, editorLayout: layout } : prev,
      );

      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
        return;
      }

      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      autoSaveTimeoutRef.current = setTimeout(() => {
        performAutoSave();
      }, AUTO_SAVE_DELAY);
    },
    [performAutoSave],
  );

  /** Title save */
  const handleTitleSave = async () => {
    if (!survey?.createdAt || !titleDraft.trim()) return;
    setEditingTitle(false);
    setSurvey((prev) => (prev ? { ...prev, title: titleDraft.trim() } : prev));

    try {
      await fetch(`/api/data/app/surveys/${surveyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          createdAt: survey.createdAt,
          title: titleDraft.trim(),
        }),
      });
    } catch {
      console.error("[DBG][surveyBuilder] Title save failed");
    }
  };

  /** Status change */
  const handleStatusChange = async (newStatus: SurveyStatus) => {
    if (!survey?.createdAt) return;
    try {
      const res = await fetch(`/api/data/app/surveys/${surveyId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          createdAt: survey.createdAt,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSurvey((prev) =>
          prev
            ? { ...prev, status: newStatus, isActive: newStatus === "active" }
            : prev,
        );
      }
    } catch {
      console.error("[DBG][surveyBuilder] Status change failed");
    }
  };

  /** Duplicate survey as a new draft */
  const handleDuplicate = async () => {
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
      console.error("[DBG][surveyBuilder] Duplicate failed");
    }
  };

  /** Delete survey */
  const handleDelete = async () => {
    if (!survey?.createdAt) return;
    if (!window.confirm("Are you sure you want to delete this survey?")) return;

    try {
      const res = await fetch(`/api/data/app/surveys/${surveyId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ createdAt: survey.createdAt }),
      });
      const json = await res.json();
      if (json.success) {
        router.push(`/srv/${expertId}/surveys`);
      }
    } catch {
      console.error("[DBG][surveyBuilder] Delete failed");
    }
  };

  // Public survey URL
  const publicUrl =
    survey?.status === "active"
      ? `${typeof window !== "undefined" ? window.location.origin : ""}/${expertId}/survey/${surveyId}`
      : null;

  /* ─── Loading / Error ─── */

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <p style={{ color: "var(--text-muted, #6b7280)" }}>Loading survey...</p>
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <p style={{ color: "#ef4444" }}>{error || "Survey not found"}</p>
      </div>
    );
  }

  const isReadOnly = survey.status !== "draft";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 64px)",
      }}
    >
      {/* ─── Header ─── */}
      <div
        style={{
          padding: "12px 20px",
          borderBottom: "1px solid var(--color-border, #e5e7eb)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        {/* Left: Back + Title */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flex: 1,
            minWidth: 0,
          }}
        >
          <button
            onClick={() => router.push(`/srv/${expertId}/surveys`)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              color: "var(--text-muted, #6b7280)",
            }}
            title="Back to surveys"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          {editingTitle ? (
            <input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTitleSave();
                if (e.key === "Escape") {
                  setTitleDraft(survey.title);
                  setEditingTitle(false);
                }
              }}
              style={{
                fontSize: "18px",
                fontWeight: 700,
                border: "1px solid var(--color-border, #e5e7eb)",
                borderRadius: "6px",
                padding: "4px 8px",
                flex: 1,
                minWidth: 0,
              }}
              autoFocus
            />
          ) : (
            <h1
              onClick={() => {
                if (!isReadOnly) setEditingTitle(true);
              }}
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "var(--text-main, #1f2937)",
                cursor: isReadOnly ? "default" : "pointer",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={isReadOnly ? undefined : "Click to edit title"}
            >
              {survey.title}
            </h1>
          )}

          {/* Save indicator */}
          {saving && (
            <span
              style={{ fontSize: "12px", color: "var(--text-muted, #6b7280)" }}
            >
              Saving...
            </span>
          )}
          {saved && !saving && (
            <span style={{ fontSize: "12px", color: "#16a34a" }}>Saved</span>
          )}
        </div>

        {/* Right: Status controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: 600,
              background:
                survey.status === "active"
                  ? "#dcfce7"
                  : survey.status === "closed"
                    ? "#fef3c7"
                    : "#f3f4f6",
              color:
                survey.status === "active"
                  ? "#16a34a"
                  : survey.status === "closed"
                    ? "#d97706"
                    : "#6b7280",
              textTransform: "capitalize",
            }}
          >
            {survey.status}
          </span>

          {survey.status === "draft" && (
            <button
              onClick={() => handleStatusChange("active")}
              style={actionBtnStyle}
            >
              Activate
            </button>
          )}
          {survey.status === "active" && (
            <button
              onClick={() => handleStatusChange("closed")}
              style={{ ...actionBtnStyle, background: "#f59e0b" }}
            >
              Close
            </button>
          )}
          {survey.status === "closed" && (
            <>
              <button
                onClick={() => handleStatusChange("active")}
                style={actionBtnStyle}
              >
                Reactivate
              </button>
              <button
                onClick={() => handleStatusChange("archived")}
                style={{ ...actionBtnStyle, background: "#6b7280" }}
              >
                Archive
              </button>
            </>
          )}

          <button
            onClick={handleDuplicate}
            style={{
              ...actionBtnStyle,
              background: "transparent",
              color: "var(--text-main, #1f2937)",
              border: "1px solid var(--color-border, #e5e7eb)",
            }}
            title="Create an editable copy of this survey"
          >
            Duplicate
          </button>

          <button
            onClick={handleDelete}
            style={{
              ...actionBtnStyle,
              background: "transparent",
              color: "#dc2626",
              border: "1px solid #fecaca",
            }}
          >
            Delete
          </button>
        </div>
      </div>

      {/* Public URL bar */}
      {publicUrl && (
        <div
          style={{
            padding: "8px 20px",
            background: "#f0fdf4",
            borderBottom: "1px solid var(--color-border, #e5e7eb)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "13px",
          }}
        >
          <span style={{ fontWeight: 600, color: "#16a34a" }}>Share link:</span>
          <code
            style={{
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: "#333",
            }}
          >
            {publicUrl}
          </code>
          <button
            onClick={() => navigator.clipboard.writeText(publicUrl)}
            style={{
              padding: "4px 10px",
              fontSize: "12px",
              border: "1px solid #86efac",
              borderRadius: "6px",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Copy
          </button>
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--color-border, #e5e7eb)",
          paddingLeft: "20px",
          flexShrink: 0,
        }}
      >
        {(["builder", "responses"] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: 600,
              border: "none",
              background: "none",
              cursor: "pointer",
              borderBottom:
                activeTab === tab
                  ? "2px solid var(--color-primary, #6366f1)"
                  : "2px solid transparent",
              color:
                activeTab === tab
                  ? "var(--color-primary, #6366f1)"
                  : "var(--text-muted, #6b7280)",
              textTransform: "capitalize",
            }}
          >
            {tab}
            {tab === "responses" && (
              <span style={{ marginLeft: "6px", opacity: 0.6 }}>
                ({survey.responseCount ?? 0})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {activeTab === "builder" && (
          <SurveyFlowBuilder
            questions={survey.questions}
            editorLayout={survey.editorLayout ?? {}}
            onChange={handleQuestionsChange}
            readOnly={isReadOnly}
            onInfer={inferSurveyAnswer}
          />
        )}

        {activeTab === "responses" && (
          <div style={{ padding: "20px", overflowY: "auto", height: "100%" }}>
            {responsesLoading && (
              <p style={{ color: "var(--text-muted, #6b7280)" }}>
                Loading responses...
              </p>
            )}

            {!responsesLoading && responses.length === 0 && (
              <p
                style={{
                  color: "var(--text-muted, #6b7280)",
                  textAlign: "center",
                  padding: "40px 0",
                }}
              >
                No responses yet.
              </p>
            )}

            {responses.map((resp) => (
              <div
                key={resp.id}
                style={{
                  marginBottom: "16px",
                  padding: "16px",
                  border: "1px solid var(--color-border, #e5e7eb)",
                  borderRadius: "10px",
                  background: "#fff",
                }}
              >
                {/* Response header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "12px",
                    fontSize: "13px",
                    color: "var(--text-muted, #6b7280)",
                  }}
                >
                  <span>
                    {resp.contactInfo?.name ||
                      resp.contactInfo?.email ||
                      "Anonymous"}
                  </span>
                  <span>{formatDate(resp.submittedAt)}</span>
                </div>

                {/* Answers */}
                {resp.answers.map((a) => {
                  const q = survey.questions.find((q) => q.id === a.questionId);
                  const optionLabel =
                    q?.type === "multiple-choice"
                      ? q.options?.find((o) => o.id === a.answer)?.label
                      : undefined;

                  return (
                    <div key={a.questionId} style={{ marginBottom: "10px" }}>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "var(--text-main, #1f2937)",
                          marginBottom: "2px",
                        }}
                      >
                        {q?.questionText || a.questionId}
                      </div>
                      <div
                        style={{
                          fontSize: "14px",
                          color: "var(--text-main, #1f2937)",
                          padding: "6px 10px",
                          background: "#f9fafb",
                          borderRadius: "6px",
                        }}
                      >
                        {optionLabel || a.answer}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const actionBtnStyle: React.CSSProperties = {
  padding: "6px 14px",
  fontSize: "13px",
  fontWeight: 600,
  background: "var(--color-primary, #6366f1)",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};
