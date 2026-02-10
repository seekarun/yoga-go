"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { FeedbackRequest } from "@/types";

type TabFilter = "all" | "pending" | "submitted" | "approved";

export default function FeedbackDashboardPage() {
  const params = useParams();
  const expertId = params.expertId as string;

  const [feedback, setFeedback] = useState<FeedbackRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");

  const fetchFeedback = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/data/app/feedback");
      const json = await res.json();
      if (json.success && json.data) {
        setFeedback(json.data);
      } else {
        setError(json.error || "Failed to load feedback");
      }
    } catch {
      setError("Failed to load feedback");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const handleApprove = async (item: FeedbackRequest) => {
    try {
      const res = await fetch(`/api/data/app/feedback/${item.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ createdAt: item.createdAt }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? { ...f, approved: true, approvedAt: new Date().toISOString() }
              : f,
          ),
        );
      }
    } catch {
      console.error("[DBG][feedbackDashboard] Failed to approve");
    }
  };

  const handleRemind = async (item: FeedbackRequest) => {
    try {
      const res = await fetch(`/api/data/app/feedback/${item.id}/remind`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ createdAt: item.createdAt }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? {
                  ...f,
                  remindCount: json.data.remindCount,
                  lastRemindedAt: new Date().toISOString(),
                }
              : f,
          ),
        );
      }
    } catch {
      console.error("[DBG][feedbackDashboard] Failed to send reminder");
    }
  };

  const handleRevoke = async (item: FeedbackRequest) => {
    try {
      const res = await fetch(`/api/data/app/feedback/${item.id}/approve`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ createdAt: item.createdAt }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? { ...f, approved: false, approvedAt: undefined }
              : f,
          ),
        );
      }
    } catch {
      console.error("[DBG][feedbackDashboard] Failed to revoke");
    }
  };

  const filtered = feedback.filter((item) => {
    if (activeTab === "pending") return item.status === "pending";
    if (activeTab === "submitted")
      return item.status === "submitted" && !item.approved;
    if (activeTab === "approved") return item.approved;
    return true;
  });

  const tabs: { id: TabFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: feedback.length },
    {
      id: "pending",
      label: "Pending",
      count: feedback.filter((f) => f.status === "pending").length,
    },
    {
      id: "submitted",
      label: "Submitted",
      count: feedback.filter((f) => f.status === "submitted" && !f.approved)
        .length,
    },
    {
      id: "approved",
      label: "Approved",
      count: feedback.filter((f) => f.approved).length,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" />
        <span className="ml-3 text-[var(--text-muted)]">
          Loading feedback...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-[var(--text-main)] mb-6">
        Reviews
      </h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-white text-[var(--text-main)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs opacity-60">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Feedback List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-lg border border-[var(--color-border)] p-8 text-center">
          <svg
            className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
          <p className="text-[var(--text-muted)]">
            {activeTab === "all"
              ? "No feedback requests yet. Request feedback from the user file page."
              : `No ${activeTab} feedback.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <FeedbackCard
              key={item.id}
              item={item}
              expertId={expertId}
              onApprove={handleApprove}
              onRevoke={handleRevoke}
              onRemind={handleRemind}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FeedbackCard({
  item,
  expertId,
  onApprove,
  onRevoke,
  onRemind,
}: {
  item: FeedbackRequest;
  expertId: string;
  onApprove: (item: FeedbackRequest) => void;
  onRevoke: (item: FeedbackRequest) => void;
  onRemind: (item: FeedbackRequest) => void;
}) {
  const [reminding, setReminding] = useState(false);

  const handleRemind = async () => {
    setReminding(true);
    await onRemind(item);
    setReminding(false);
  };
  return (
    <div className="bg-white rounded-lg border border-[var(--color-border)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Name & Email */}
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/srv/${expertId}/users/${encodeURIComponent(item.recipientEmail)}`}
              className="font-medium text-[var(--text-main)] hover:text-[var(--color-primary)] hover:underline transition-colors"
            >
              {item.recipientName}
            </Link>
            <span className="text-sm text-[var(--text-muted)]">
              {item.recipientEmail}
            </span>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2 mb-2">
            <StatusBadge item={item} />
            <span className="text-xs text-[var(--text-muted)]">
              Requested {formatDate(item.createdAt)}
            </span>
            {item.remindCount ? (
              <span className="text-xs text-[var(--text-muted)]">
                Reminded {item.remindCount}x
                {item.lastRemindedAt && (
                  <>, last {formatDate(item.lastRemindedAt)}</>
                )}
              </span>
            ) : null}
            {item.submittedAt && (
              <span className="text-xs text-[var(--text-muted)]">
                Submitted {formatDate(item.submittedAt)}
              </span>
            )}
          </div>

          {/* Rating Stars */}
          {item.rating && (
            <div className="flex items-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill={star <= item.rating! ? "#f59e0b" : "#d1d5db"}
                  stroke="none"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ))}
            </div>
          )}

          {/* Message */}
          {item.message && (
            <p className="text-sm text-[var(--text-main)] line-clamp-3 mb-2">
              &ldquo;{item.message}&rdquo;
            </p>
          )}

          {/* Consent info */}
          {item.status === "submitted" && (
            <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              {item.consentToShowcase ? (
                <>
                  <svg
                    className="w-3.5 h-3.5 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Consented to showcase
                </>
              ) : (
                <>
                  <svg
                    className="w-3.5 h-3.5 text-gray-400"
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
                  Did not consent to showcase
                </>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex flex-col gap-2">
          {item.status === "pending" && (
            <button
              type="button"
              onClick={handleRemind}
              disabled={reminding}
              className="px-3 py-1.5 bg-purple-50 text-purple-700 text-sm font-medium rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors disabled:opacity-50"
            >
              {reminding ? "Sending..." : "Remind"}
            </button>
          )}
          {item.status === "submitted" &&
            item.consentToShowcase &&
            !item.approved && (
              <button
                type="button"
                onClick={() => onApprove(item)}
                className="px-3 py-1.5 bg-green-50 text-green-700 text-sm font-medium rounded-lg border border-green-200 hover:bg-green-100 transition-colors"
              >
                Approve
              </button>
            )}
          {item.approved && (
            <button
              type="button"
              onClick={() => onRevoke(item)}
              className="px-3 py-1.5 bg-red-50 text-red-700 text-sm font-medium rounded-lg border border-red-200 hover:bg-red-100 transition-colors"
            >
              Revoke
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ item }: { item: FeedbackRequest }) {
  if (item.approved) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700">
        Approved
      </span>
    );
  }
  if (item.status === "submitted") {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700">
        Submitted
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-50 text-yellow-700">
      Pending
    </span>
  );
}

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
