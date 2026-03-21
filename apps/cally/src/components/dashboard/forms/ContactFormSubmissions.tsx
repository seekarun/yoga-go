"use client";

import { useState, useEffect, useCallback } from "react";
import type { ContactSubmission, ContactFormConfig } from "@/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface ContactFormSubmissionsProps {
  formConfig: ContactFormConfig;
  onBack: () => void;
}

export default function ContactFormSubmissions({
  formConfig,
  onBack,
}: ContactFormSubmissionsProps) {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/data/app/contact-forms/${formConfig.id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setSubmissions(json.data);
      } else {
        setError(json.error || "Failed to load submissions");
      }
    } catch {
      setError("Failed to load submissions");
    } finally {
      setLoading(false);
    }
  }, [formConfig.id]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
          title="Back to forms"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <div>
          <h2 className="text-lg font-bold text-[var(--text-main)]">
            {formConfig.name}
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            {submissions.length} submission{submissions.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center py-12 text-[var(--text-muted)] text-sm">
          Loading submissions...
        </div>
      )}

      {!loading && submissions.length === 0 && (
        <div className="text-center py-12 text-[var(--text-muted)]">
          <svg
            className="w-12 h-12 mx-auto mb-3 opacity-30"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <p className="text-sm">No submissions yet</p>
          <p className="text-xs mt-1">
            Submissions will appear here when visitors fill out this form
          </p>
        </div>
      )}

      {!loading && submissions.length > 0 && (
        <div className="space-y-3">
          {submissions.map((sub) => {
            const isExpanded = expandedId === sub.id;
            return (
              <div
                key={sub.id}
                className="border border-[var(--color-border)] rounded-lg bg-white overflow-hidden"
              >
                {/* Summary row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center text-sm font-medium shrink-0">
                      {sub.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-main)] truncate">
                        {sub.name || "Anonymous"}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] truncate">
                        {sub.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-3 shrink-0">
                    {sub.flaggedAsSpam && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                        Spam
                      </span>
                    )}
                    <span className="text-xs text-[var(--text-muted)]">
                      {formatDate(sub.submittedAt)}
                    </span>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-[var(--color-border)]">
                    <div className="pt-3 space-y-2">
                      {sub.formFields ? (
                        // Show dynamic form fields
                        formConfig.fields.map((fieldDef) => {
                          const value = sub.formFields?.[fieldDef.id];
                          if (!value) return null;
                          return (
                            <div key={fieldDef.id}>
                              <p className="text-xs font-medium text-[var(--text-muted)] mb-0.5">
                                {fieldDef.name}
                              </p>
                              <p className="text-sm text-[var(--text-main)] whitespace-pre-wrap">
                                {value}
                              </p>
                            </div>
                          );
                        })
                      ) : (
                        // Fallback: show message
                        <div>
                          <p className="text-xs font-medium text-[var(--text-muted)] mb-0.5">
                            Message
                          </p>
                          <p className="text-sm text-[var(--text-main)] whitespace-pre-wrap">
                            {sub.message}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
