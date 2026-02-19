"use client";

import { useState } from "react";
import { TEMPLATES } from "@/types/landing-page";
import type { TemplateInfo } from "@/types/landing-page";

export default function TemplatesTab() {
  // Local copy so toggles reflect immediately without a page reload
  const [templates, setTemplates] = useState<TemplateInfo[]>([...TEMPLATES]);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleToggle = async (templateId: string, currentStatus: string) => {
    const newStatus =
      currentStatus === "published" ? "development" : "published";

    try {
      setToggling(templateId);
      setError(null);
      setSuccess(null);

      const res = await fetch("/api/supa/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed: ${res.status}`);
      }

      // Update local state
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === templateId ? { ...t, status: newStatus } : t,
        ),
      );
      setSuccess(
        `"${templateId}" is now ${newStatus === "published" ? "live" : "in development"}`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to toggle template",
      );
    } finally {
      setToggling(null);
    }
  };

  const publishedCount = templates.filter(
    (t) => t.status === "published",
  ).length;
  const devCount = templates.filter((t) => t.status === "development").length;

  return (
    <div>
      <h2 style={{ color: "var(--text-main)", marginBottom: "0.5rem" }}>
        Templates ({templates.length})
      </h2>
      <p
        style={{
          color: "var(--text-muted, #6b7280)",
          fontSize: "0.875rem",
          marginBottom: "1.5rem",
        }}
      >
        <span style={liveBadge}>{publishedCount} live</span>
        <span style={devBadge}>{devCount} in development</span>
        <span style={{ marginLeft: "0.75rem" }}>
          Changes update the source file — commit &amp; deploy to go live.
        </span>
      </p>

      {/* Feedback */}
      {error && (
        <div style={errorBox}>
          {error}
          <button onClick={() => setError(null)} style={dismissBtn}>
            Dismiss
          </button>
        </div>
      )}
      {success && (
        <div style={successBox}>
          {success}
          <button onClick={() => setSuccess(null)} style={dismissSuccessBtn}>
            Dismiss
          </button>
        </div>
      )}

      {/* Template cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "1rem",
        }}
      >
        {templates.map((template) => {
          const isPublished = template.status === "published";
          const isToggling = toggling === template.id;

          return (
            <div key={template.id} style={cardStyle(isPublished)}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "0.5rem",
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "1rem",
                      color: "var(--text-main, #111827)",
                    }}
                  >
                    {template.name}
                  </div>
                  <code
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted, #6b7280)",
                    }}
                  >
                    {template.id}
                  </code>
                </div>
                <span style={isPublished ? statusLive : statusDev}>
                  {isPublished ? "Live" : "Dev"}
                </span>
              </div>

              <p
                style={{
                  margin: "0 0 1rem 0",
                  fontSize: "0.813rem",
                  color: "var(--text-muted, #6b7280)",
                  lineHeight: 1.4,
                }}
              >
                {template.description}
              </p>

              <button
                onClick={() => handleToggle(template.id, template.status)}
                disabled={isToggling}
                style={toggleBtn(isPublished, isToggling)}
              >
                {isToggling
                  ? "Updating..."
                  : isPublished
                    ? "Move to Development"
                    : "Go Live"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Style constants ───────────────────────────────────────────── */

const cardStyle = (isPublished: boolean): React.CSSProperties => ({
  padding: "1.25rem",
  borderRadius: "0.5rem",
  border: `2px solid ${isPublished ? "#bbf7d0" : "var(--color-border, #e5e7eb)"}`,
  background: isPublished ? "#f0fdf4" : "#fff",
});

const statusLive: React.CSSProperties = {
  padding: "0.125rem 0.625rem",
  borderRadius: "9999px",
  fontSize: "0.75rem",
  fontWeight: 600,
  background: "#dcfce7",
  color: "#166534",
};

const statusDev: React.CSSProperties = {
  padding: "0.125rem 0.625rem",
  borderRadius: "9999px",
  fontSize: "0.75rem",
  fontWeight: 600,
  background: "#f3f4f6",
  color: "#6b7280",
};

const liveBadge: React.CSSProperties = {
  display: "inline-block",
  padding: "0.125rem 0.5rem",
  borderRadius: "0.25rem",
  fontSize: "0.75rem",
  fontWeight: 600,
  background: "#dcfce7",
  color: "#166534",
  marginRight: "0.5rem",
};

const devBadge: React.CSSProperties = {
  display: "inline-block",
  padding: "0.125rem 0.5rem",
  borderRadius: "0.25rem",
  fontSize: "0.75rem",
  fontWeight: 600,
  background: "#f3f4f6",
  color: "#6b7280",
};

const toggleBtn = (
  isPublished: boolean,
  isToggling: boolean,
): React.CSSProperties => ({
  width: "100%",
  padding: "0.5rem",
  borderRadius: "0.375rem",
  fontSize: "0.813rem",
  fontWeight: 600,
  cursor: isToggling ? "not-allowed" : "pointer",
  border: "none",
  background: isPublished ? "#fee2e2" : "#dcfce7",
  color: isPublished ? "#991b1b" : "#166534",
  opacity: isToggling ? 0.6 : 1,
});

const errorBox: React.CSSProperties = {
  padding: "1rem",
  marginBottom: "1rem",
  background: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "0.5rem",
  color: "#991b1b",
};

const successBox: React.CSSProperties = {
  padding: "1rem",
  marginBottom: "1rem",
  background: "#f0fdf4",
  border: "1px solid #bbf7d0",
  borderRadius: "0.5rem",
  color: "#166534",
};

const dismissBtn: React.CSSProperties = {
  marginLeft: "1rem",
  background: "none",
  border: "none",
  color: "#991b1b",
  cursor: "pointer",
  textDecoration: "underline",
};

const dismissSuccessBtn: React.CSSProperties = {
  marginLeft: "1rem",
  background: "none",
  border: "none",
  color: "#166534",
  cursor: "pointer",
  textDecoration: "underline",
};
