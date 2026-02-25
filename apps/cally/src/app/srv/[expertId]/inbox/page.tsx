"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type {
  EmailWithThread,
  EmailDraft,
  EmailLabel,
  EmailSignatureConfig,
} from "@/types";
import { useNotificationContextOptional } from "@/contexts/NotificationContext";
import EmailComposer from "@/components/inbox/EmailComposer";
import BulkActionBar from "@/components/inbox/BulkActionBar";
import LabelPicker from "@/components/inbox/LabelPicker";
import LabelManager from "@/components/inbox/LabelManager";
import AdvancedSearchPanel from "@/components/inbox/AdvancedSearchPanel";
import {
  parseSearchQuery,
  serializeSearchQuery,
} from "@/lib/searchQueryParser";

type FilterType = "all" | "unread" | "starred";
type FolderType = "inbox" | "sent" | "drafts" | "archive" | "trash";

function ActiveFilterChips({
  searchQuery,
  onUpdate,
}: {
  searchQuery: string;
  onUpdate: (query: string) => void;
}) {
  const parsed = parseSearchQuery(searchQuery);
  const chips: { label: string; key: string }[] = [];

  if (parsed.from) chips.push({ label: `From: ${parsed.from}`, key: "from" });
  if (parsed.to) chips.push({ label: `To: ${parsed.to}`, key: "to" });
  if (parsed.hasAttachment)
    chips.push({ label: "Has attachment", key: "hasAttachment" });
  if (parsed.after)
    chips.push({ label: `After: ${parsed.after}`, key: "after" });
  if (parsed.before)
    chips.push({ label: `Before: ${parsed.before}`, key: "before" });
  if (parsed.label)
    chips.push({ label: `Label: ${parsed.label}`, key: "label" });

  if (chips.length === 0) return null;

  const removeFilter = (key: string) => {
    const updated = { ...parsed, [key]: undefined };
    if (key === "hasAttachment") updated.hasAttachment = undefined;
    onUpdate(serializeSearchQuery(updated));
  };

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-xs text-gray-700 rounded-full"
        >
          {chip.label}
          <button
            type="button"
            onClick={() => removeFilter(chip.key)}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-3 h-3"
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
        </span>
      ))}
    </div>
  );
}

export default function InboxPage() {
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;
  const notifContext = useNotificationContextOptional();
  const [emails, setEmails] = useState<EmailWithThread[]>([]);
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [folder, setFolder] = useState<FolderType>("inbox");
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastKey, setLastKey] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [editingDraft, setEditingDraft] = useState<EmailDraft | null>(null);

  // Labels state
  const [labels, setLabels] = useState<EmailLabel[]>([]);
  const [activeLabelId, setActiveLabelId] = useState<string | undefined>(
    undefined,
  );
  const [showLabelManager, setShowLabelManager] = useState(false);
  const [labelPickerEmailId, setLabelPickerEmailId] = useState<string | null>(
    null,
  );

  // Advanced search state
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Email setup check
  const [emailReady, setEmailReady] = useState<boolean | null>(null);

  // Settings / signature state
  const [showSettings, setShowSettings] = useState(false);
  const [signature, setSignature] = useState<EmailSignatureConfig>({
    text: "",
    html: "",
    enabled: false,
  });
  const [sigSaving, setSigSaving] = useState(false);
  const [sigMessage, setSigMessage] = useState<string | null>(null);

  // Fetch labels + signature + email status on mount
  useEffect(() => {
    fetch("/api/data/app/domain/status")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setEmailReady(!!data.data?.emailConfig?.domainEmail);
        } else {
          setEmailReady(false);
        }
      })
      .catch(() => setEmailReady(false));

    fetch("/api/data/app/inbox/labels")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          setLabels(data.data);
        }
      })
      .catch((err) => {
        console.log("[DBG][inbox] Failed to fetch labels:", err);
      });

    fetch("/api/data/app/inbox/signature")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          setSignature(data.data);
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveSignature = async () => {
    setSigSaving(true);
    setSigMessage(null);
    try {
      const res = await fetch("/api/data/app/inbox/signature", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signature),
      });
      const data = await res.json();
      if (data.success) {
        setSignature(data.data);
        setSigMessage("Signature saved");
        setTimeout(() => setSigMessage(null), 3000);
      } else {
        setSigMessage("Failed to save signature");
      }
    } catch {
      setSigMessage("Failed to save signature");
    } finally {
      setSigSaving(false);
    }
  };

  // Debounce search query changes
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery]);

  const fetchEmails = useCallback(
    async (append = false) => {
      try {
        if (!append) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const queryParams = new URLSearchParams();
        queryParams.set("limit", "20");

        if (folder !== "drafts") {
          queryParams.set("folder", folder);
        }

        if (filter === "unread") {
          queryParams.set("unreadOnly", "true");
        } else if (filter === "starred") {
          queryParams.set("starredOnly", "true");
        }

        // Parse search query into structured params
        if (debouncedQuery) {
          const parsed = parseSearchQuery(debouncedQuery);
          if (parsed.freeText) {
            queryParams.set("search", parsed.freeText);
          }
          if (parsed.from) {
            queryParams.set("from", parsed.from);
          }
          if (parsed.to) {
            queryParams.set("to", parsed.to);
          }
          if (parsed.hasAttachment) {
            queryParams.set("hasAttachment", "true");
          }
          if (parsed.after) {
            queryParams.set("after", parsed.after);
          }
          if (parsed.before) {
            queryParams.set("before", parsed.before);
          }
          // Resolve label name to labelId
          if (parsed.label) {
            const matchedLabel = labels.find(
              (l) => l.name.toLowerCase() === parsed.label!.toLowerCase(),
            );
            if (matchedLabel) {
              queryParams.set("labelId", matchedLabel.id);
            }
          }
        }

        if (activeLabelId) {
          queryParams.set("labelId", activeLabelId);
        }

        if (append && lastKey) {
          queryParams.set("lastKey", lastKey);
        }

        console.log(
          "[DBG][inbox] Fetching emails with params:",
          queryParams.toString(),
        );

        if (folder === "drafts") {
          const response = await fetch("/api/data/app/inbox/drafts");
          const data = await response.json();
          if (data.success && data.data) {
            setDrafts(data.data.drafts || []);
            setEmails([]);
          }
        } else {
          const response = await fetch(
            `/api/data/app/inbox?${queryParams.toString()}`,
          );
          const data = await response.json();

          if (data.success && data.data) {
            if (append) {
              setEmails((prev) => [...prev, ...data.data.emails]);
            } else {
              setEmails(data.data.emails);
            }
            setUnreadCount(data.data.unreadCount || 0);
            setLastKey(data.data.lastKey);
            setHasMore(!!data.data.lastKey);
            setDrafts([]);
          } else {
            setError(data.error || "Failed to load emails");
          }
        }
      } catch (err) {
        console.error("[DBG][inbox] Error fetching emails:", err);
        setError("Failed to load emails");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filter, debouncedQuery, lastKey, folder, activeLabelId, labels],
  );

  useEffect(() => {
    setLastKey(undefined);
    setSelectedIds(new Set());
    fetchEmails(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, debouncedQuery, folder, activeLabelId]);

  // Auto-refresh inbox when new email notifications arrive
  const prevUnreadEmailCountRef = useRef(0);
  useEffect(() => {
    const currentCount = notifContext?.unreadEmailCount ?? 0;
    if (
      currentCount > prevUnreadEmailCountRef.current &&
      prevUnreadEmailCountRef.current > 0
    ) {
      console.log(
        "[DBG][inbox] New email notification detected, auto-refreshing",
      );
      fetchEmails(false);
    }
    prevUnreadEmailCountRef.current = currentCount;
  }, [notifContext?.unreadEmailCount, fetchEmails]);

  const handleEmailClick = async (email: EmailWithThread) => {
    if (!email.isRead && !email.isOutgoing) {
      try {
        await fetch(`/api/data/app/inbox/${email.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isRead: true }),
        });
        setEmails((prev) =>
          prev.map((e) => (e.id === email.id ? { ...e, isRead: true } : e)),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.log("[DBG][inbox] Failed to mark as read:", err);
      }
    }
    router.push(`/srv/${expertId}/inbox/${email.id}`);
  };

  const handleDraftClick = (draft: EmailDraft) => {
    setEditingDraft(draft);
    setShowCompose(true);
  };

  const handleToggleStar = async (
    e: React.MouseEvent,
    email: EmailWithThread,
  ) => {
    e.stopPropagation();
    try {
      await fetch(`/api/data/app/inbox/${email.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isStarred: !email.isStarred }),
      });
      setEmails((prev) =>
        prev.map((em) =>
          em.id === email.id ? { ...em, isStarred: !em.isStarred } : em,
        ),
      );
    } catch (err) {
      console.log("[DBG][inbox] Failed to toggle star:", err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, email: EmailWithThread) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this email?")) {
      return;
    }
    try {
      const response = await fetch(`/api/data/app/inbox/${email.id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (data.success) {
        setEmails((prev) => prev.filter((em) => em.id !== email.id));
        if (!email.isRead && !email.isOutgoing) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } else {
        alert("Failed to delete email");
      }
    } catch (err) {
      console.log("[DBG][inbox] Failed to delete email:", err);
      alert("Failed to delete email");
    }
  };

  const handleArchive = async (e: React.MouseEvent, email: EmailWithThread) => {
    e.stopPropagation();
    try {
      await fetch(`/api/data/app/inbox/${email.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: true }),
      });
      setEmails((prev) => prev.filter((em) => em.id !== email.id));
    } catch (err) {
      console.log("[DBG][inbox] Failed to archive:", err);
    }
  };

  const handleRestore = async (e: React.MouseEvent, email: EmailWithThread) => {
    e.stopPropagation();
    try {
      await fetch(`/api/data/app/inbox/${email.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      });
      setEmails((prev) => prev.filter((em) => em.id !== email.id));
    } catch (err) {
      console.log("[DBG][inbox] Failed to restore:", err);
    }
  };

  const handleUnarchive = async (
    e: React.MouseEvent,
    email: EmailWithThread,
  ) => {
    e.stopPropagation();
    try {
      await fetch(`/api/data/app/inbox/${email.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: false }),
      });
      setEmails((prev) => prev.filter((em) => em.id !== email.id));
    } catch (err) {
      console.log("[DBG][inbox] Failed to unarchive:", err);
    }
  };

  const handleDeleteDraft = async (e: React.MouseEvent, draft: EmailDraft) => {
    e.stopPropagation();
    if (!confirm("Delete this draft?")) return;
    try {
      await fetch(`/api/data/app/inbox/drafts/${draft.id}`, {
        method: "DELETE",
      });
      setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
    } catch (err) {
      console.log("[DBG][inbox] Failed to delete draft:", err);
    }
  };

  // Label toggle for single email
  const handleToggleEmailLabel = async (emailId: string, labelId: string) => {
    const email = emails.find((e) => e.id === emailId);
    if (!email) return;

    const currentLabels = email.labels || [];
    const hasLabel = currentLabels.includes(labelId);
    const newLabels = hasLabel
      ? currentLabels.filter((l) => l !== labelId)
      : [...currentLabels, labelId];

    try {
      await fetch(`/api/data/app/inbox/${emailId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labels: newLabels }),
      });
      setEmails((prev) =>
        prev.map((e) => (e.id === emailId ? { ...e, labels: newLabels } : e)),
      );
    } catch (err) {
      console.log("[DBG][inbox] Failed to toggle label:", err);
    }
  };

  // Bulk action handler
  const handleBulkAction = async (action: string, labelId?: string) => {
    const emailIds = Array.from(selectedIds);
    if (emailIds.length === 0) return;

    try {
      const res = await fetch("/api/data/app/inbox/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailIds, action, labelId }),
      });
      const data = await res.json();
      if (data.success) {
        console.log(
          "[DBG][inbox] Bulk action result:",
          data.data.success,
          "success,",
          data.data.failed,
          "failed",
        );
        setSelectedIds(new Set());
        fetchEmails(false);
      }
    } catch (err) {
      console.log("[DBG][inbox] Bulk action failed:", err);
    }
  };

  // Selection helpers
  const handleToggleSelect = (e: React.MouseEvent, emailId: string) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(emailId)) {
        next.delete(emailId);
      } else {
        next.add(emailId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === emails.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(emails.map((e) => e.id)));
    }
  };

  // Get common labels across selected emails for bulk label picker
  const getSelectedEmailsLabels = (): string[] => {
    if (selectedIds.size === 0) return [];
    const selected = emails.filter((e) => selectedIds.has(e.id));
    if (selected.length === 0) return [];
    // Return labels that ALL selected emails have
    const first = selected[0].labels || [];
    return first.filter((labelId) =>
      selected.every((e) => (e.labels || []).includes(labelId)),
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  // Compose overlay
  if (showCompose) {
    return (
      <div className="px-6 lg:px-8 py-6">
        <EmailComposer
          mode={editingDraft?.mode || "compose"}
          initialTo={editingDraft?.to}
          initialCc={editingDraft?.cc}
          initialBcc={editingDraft?.bcc}
          initialSubject={editingDraft?.subject}
          initialBody={editingDraft?.bodyText}
          originalEmailId={
            editingDraft?.replyToEmailId || editingDraft?.forwardOfEmailId
          }
          draftId={editingDraft?.id}
          onSent={() => {
            setShowCompose(false);
            setEditingDraft(null);
            fetchEmails(false);
          }}
          onCancel={() => {
            setShowCompose(false);
            setEditingDraft(null);
          }}
        />
      </div>
    );
  }

  if (emailReady === false) {
    return (
      <div className="px-6 lg:px-8 py-20 text-center">
        <svg
          className="w-16 h-16 mx-auto text-gray-300 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Email not set up yet
        </h2>
        <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
          To use the inbox, you need to configure a custom domain and enable
          email first.
        </p>
        <Link
          href={`/srv/${expertId}/settings/domain`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 text-sm font-medium"
        >
          Set up Domain & Email
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
      </div>
    );
  }

  if (loading || emailReady === null) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" />
        <span className="ml-3 text-gray-600">Loading inbox...</span>
      </div>
    );
  }

  return (
    <div className="px-6 lg:px-8 py-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400 text-xl">!</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Folder Tabs + Compose */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 overflow-x-auto">
          {(
            [
              { key: "inbox", label: "Inbox" },
              { key: "sent", label: "Sent" },
              { key: "drafts", label: "Drafts" },
              { key: "archive", label: "Archive" },
              { key: "trash", label: "Trash" },
            ] as { key: FolderType; label: string }[]
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => setFolder(f.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                folder === f.key
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {f.label}
              {f.key === "inbox" && unreadCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-white/20 text-xs rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
          <button
            onClick={() => setShowSettings(true)}
            className={`p-1.5 rounded-lg transition-colors ${
              showSettings
                ? "bg-[var(--color-primary)] text-white"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            }`}
            title="Email Settings"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>
        <button
          onClick={() => {
            setEditingDraft(null);
            setShowCompose(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 text-sm font-medium flex-shrink-0"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Compose
        </button>
      </div>

      {/* Label filter pills */}
      {labels.length > 0 && folder !== "drafts" && (
        <div className="flex items-center gap-2 mb-4 overflow-x-auto">
          <span className="text-xs text-gray-500 flex-shrink-0">Labels:</span>
          {labels.map((label) => (
            <button
              key={label.id}
              onClick={() =>
                setActiveLabelId(
                  activeLabelId === label.id ? undefined : label.id,
                )
              }
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full transition-colors whitespace-nowrap border ${
                activeLabelId === label.id
                  ? "border-transparent text-white"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
              style={
                activeLabelId === label.id
                  ? { backgroundColor: label.color }
                  : undefined
              }
            >
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${activeLabelId === label.id ? "bg-white/50" : ""}`}
                style={
                  activeLabelId !== label.id
                    ? { backgroundColor: label.color }
                    : undefined
                }
              />
              {label.name}
            </button>
          ))}
          <button
            onClick={() => setShowLabelManager(true)}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 flex-shrink-0"
          >
            Manage
          </button>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow mb-6">
        {folder !== "drafts" && (
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Select All + Filter Tabs */}
              <div className="flex items-center gap-2">
                {emails.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="flex items-center justify-center w-5 h-5 border border-gray-300 rounded transition-colors hover:border-gray-400"
                    title={
                      selectedIds.size === emails.length
                        ? "Deselect all"
                        : "Select all"
                    }
                  >
                    {selectedIds.size === emails.length &&
                      emails.length > 0 && (
                        <svg
                          className="w-3.5 h-3.5 text-[var(--color-primary)]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    {selectedIds.size > 0 &&
                      selectedIds.size < emails.length && (
                        <span className="w-2.5 h-0.5 bg-[var(--color-primary)] rounded" />
                      )}
                  </button>
                )}
                {(["all", "unread", "starred"] as FilterType[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      filter === f
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {f === "all"
                      ? "All"
                      : f === "unread"
                        ? "Unread"
                        : "Starred"}
                    {f === "unread" && unreadCount > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 bg-white/20 text-xs rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search emails... (try from: to: has:attachment)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  />
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  {/* Advanced search toggle */}
                  <button
                    type="button"
                    onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${
                      showAdvancedSearch
                        ? "text-[var(--color-primary)]"
                        : "text-gray-400 hover:text-gray-600"
                    }`}
                    title="Advanced search"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                      />
                    </svg>
                  </button>
                </div>

                {/* Active filter chips */}
                <ActiveFilterChips
                  searchQuery={searchQuery}
                  onUpdate={setSearchQuery}
                />

                {/* Advanced search panel */}
                {showAdvancedSearch && (
                  <AdvancedSearchPanel
                    {...parseSearchQuery(searchQuery)}
                    labelName={parseSearchQuery(searchQuery).label || ""}
                    hasAttachment={
                      parseSearchQuery(searchQuery).hasAttachment || false
                    }
                    after={parseSearchQuery(searchQuery).after || ""}
                    before={parseSearchQuery(searchQuery).before || ""}
                    from={parseSearchQuery(searchQuery).from || ""}
                    to={parseSearchQuery(searchQuery).to || ""}
                    labels={labels}
                    onApply={(fields) => {
                      const parsed = parseSearchQuery(searchQuery);
                      const newQuery = serializeSearchQuery({
                        from: fields.from || undefined,
                        to: fields.to || undefined,
                        hasAttachment: fields.hasAttachment || undefined,
                        after: fields.after || undefined,
                        before: fields.before || undefined,
                        label: fields.labelName || undefined,
                        freeText: parsed.freeText,
                      });
                      setSearchQuery(newQuery);
                    }}
                    onClose={() => setShowAdvancedSearch(false)}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && folder !== "drafts" && (
          <BulkActionBar
            selectedCount={selectedIds.size}
            folder={folder}
            labels={labels}
            selectedLabels={getSelectedEmailsLabels()}
            onAction={handleBulkAction}
            onDeselectAll={() => setSelectedIds(new Set())}
            onManageLabels={() => setShowLabelManager(true)}
          />
        )}

        {/* Drafts List */}
        {folder === "drafts" ? (
          <div className="divide-y divide-gray-100">
            {drafts.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-500">No drafts</p>
              </div>
            ) : (
              drafts.map((draft) => (
                <div
                  key={draft.id}
                  onClick={() => handleDraftClick(draft)}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col gap-1 flex-shrink-0 mt-0.5">
                      <button
                        onClick={(e) => handleDeleteDraft(e, draft)}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                        title="Delete draft"
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-gray-700 truncate">
                          <span className="text-red-500 font-medium">
                            Draft
                          </span>
                          {" - "}
                          {draft.to.length > 0
                            ? draft.to.map((t) => t.name || t.email).join(", ")
                            : "(no recipients)"}
                        </p>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {formatDate(draft.lastSavedAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5 truncate">
                        {draft.subject || "(no subject)"}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5 truncate">
                        {draft.bodyText?.substring(0, 100) || "(no content)"}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Email List */
          <div className="divide-y divide-gray-100">
            {emails.length === 0 ? (
              <div className="p-12 text-center">
                <svg
                  className="w-12 h-12 mx-auto text-gray-300 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-gray-500">
                  {folder === "trash"
                    ? "Trash is empty"
                    : folder === "archive"
                      ? "No archived emails"
                      : folder === "sent"
                        ? "No sent emails"
                        : filter === "unread"
                          ? "No unread emails"
                          : filter === "starred"
                            ? "No starred emails"
                            : activeLabelId
                              ? "No emails with this label"
                              : "No emails yet"}
                </p>
                {folder === "inbox" && !activeLabelId && (
                  <p className="text-sm text-gray-400 mt-1">
                    Emails sent to your domain email will appear here
                  </p>
                )}
              </div>
            ) : (
              emails.map((email) => {
                const hasUnread =
                  email.threadHasUnread || (!email.isRead && !email.isOutgoing);
                const displayDate = email.threadLatestAt || email.receivedAt;
                const isThread = email.threadCount && email.threadCount > 1;
                const isSelected = selectedIds.has(email.id);
                const emailLabels = (email.labels || [])
                  .map((lid) => labels.find((l) => l.id === lid))
                  .filter(Boolean) as EmailLabel[];

                return (
                  <div
                    key={email.id}
                    onClick={() => handleEmailClick(email)}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-blue-50"
                        : hasUnread
                          ? "bg-blue-50/50"
                          : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox + Action Buttons */}
                      <div className="flex flex-col gap-1 flex-shrink-0 mt-0.5">
                        {/* Selection checkbox */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleSelect(e, email.id)}
                          className="flex items-center justify-center w-5 h-5 border border-gray-300 rounded transition-colors hover:border-gray-400"
                        >
                          {isSelected && (
                            <svg
                              className="w-3.5 h-3.5 text-[var(--color-primary)]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </button>

                        <button
                          onClick={(e) => handleToggleStar(e, email)}
                          title={email.isStarred ? "Unstar" : "Star"}
                        >
                          <svg
                            className={`w-5 h-5 ${
                              email.isStarred
                                ? "text-yellow-400 fill-current"
                                : "text-gray-300"
                            }`}
                            fill={email.isStarred ? "currentColor" : "none"}
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                            />
                          </svg>
                        </button>
                        {/* Folder-specific actions */}
                        {folder === "trash" ? (
                          <button
                            onClick={(e) => handleRestore(e, email)}
                            className="text-gray-300 hover:text-green-500 transition-colors"
                            title="Restore"
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
                                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                              />
                            </svg>
                          </button>
                        ) : folder === "archive" ? (
                          <button
                            onClick={(e) => handleUnarchive(e, email)}
                            className="text-gray-300 hover:text-blue-500 transition-colors"
                            title="Unarchive"
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
                                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                              />
                            </svg>
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={(e) => handleArchive(e, email)}
                              className="text-gray-300 hover:text-blue-500 transition-colors"
                              title="Archive"
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
                                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => handleDelete(e, email)}
                              className="text-gray-300 hover:text-red-500 transition-colors"
                              title="Delete"
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
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>

                      {/* Email Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <p
                              className={`text-sm truncate ${
                                hasUnread
                                  ? "font-semibold text-gray-900"
                                  : "text-gray-700"
                              }`}
                            >
                              {email.isOutgoing ? (
                                <>
                                  <span className="text-gray-400">To: </span>
                                  {email.to[0]?.name || email.to[0]?.email}
                                </>
                              ) : (
                                email.from.name || email.from.email
                              )}
                            </p>
                            {isThread && (
                              <span className="flex-shrink-0 px-1.5 py-0.5 text-xs font-medium bg-gray-200 text-gray-600 rounded">
                                {email.threadCount}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Label dots */}
                            {emailLabels.length > 0 && (
                              <div className="flex items-center gap-0.5">
                                {emailLabels.map((label) => (
                                  <span
                                    key={label.id}
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: label.color }}
                                    title={label.name}
                                  />
                                ))}
                              </div>
                            )}
                            <span className="text-xs text-gray-500">
                              {formatDate(displayDate)}
                            </span>
                          </div>
                        </div>
                        <p
                          className={`text-sm mt-0.5 truncate ${
                            hasUnread
                              ? "font-medium text-gray-800"
                              : "text-gray-600"
                          }`}
                        >
                          {email.subject || "(no subject)"}
                        </p>
                        <p className="text-sm text-gray-500 mt-0.5 truncate">
                          {(isThread && email.threadMessages?.length
                            ? email.threadMessages[
                                email.threadMessages.length - 1
                              ].bodyText
                            : email.bodyText
                          )?.substring(0, 100) || "(no content)"}
                        </p>

                        <div className="flex items-center gap-2 mt-1.5">
                          {email.attachments &&
                            email.attachments.length > 0 && (
                              <div className="flex items-center gap-1">
                                <svg
                                  className="w-4 h-4 text-gray-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                                  />
                                </svg>
                                <span className="text-xs text-gray-500">
                                  {email.attachments.length} attachment
                                  {email.attachments.length !== 1 ? "s" : ""}
                                </span>
                              </div>
                            )}
                          {/* Label button */}
                          {labels.length > 0 && (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLabelPickerEmailId(
                                    labelPickerEmailId === email.id
                                      ? null
                                      : email.id,
                                  );
                                }}
                                className="text-gray-300 hover:text-gray-500 transition-colors"
                                title="Labels"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                                  />
                                </svg>
                              </button>
                              {labelPickerEmailId === email.id && (
                                <LabelPicker
                                  labels={labels}
                                  selectedLabels={email.labels || []}
                                  onToggle={(labelId) =>
                                    handleToggleEmailLabel(email.id, labelId)
                                  }
                                  onManageLabels={() => {
                                    setLabelPickerEmailId(null);
                                    setShowLabelManager(true);
                                  }}
                                  onClose={() => setLabelPickerEmailId(null)}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Load More */}
        {hasMore && folder !== "drafts" && (
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={() => fetchEmails(true)}
              disabled={loadingMore}
              className="w-full py-2 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              {loadingMore ? "Loading..." : "Load more"}
            </button>
          </div>
        )}
      </div>

      {/* Label Manager Modal */}
      {showLabelManager && (
        <LabelManager
          labels={labels}
          onClose={() => setShowLabelManager(false)}
          onCreated={(label) => setLabels((prev) => [...prev, label])}
          onUpdated={(label) =>
            setLabels((prev) =>
              prev.map((l) => (l.id === label.id ? label : l)),
            )
          }
          onDeleted={(labelId) => {
            setLabels((prev) => prev.filter((l) => l.id !== labelId));
            if (activeLabelId === labelId) setActiveLabelId(undefined);
          }}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Email Settings
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
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
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Automatically append a signature to outgoing emails.
                </p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={signature.enabled}
                    onChange={(e) =>
                      setSignature((s) => ({
                        ...s,
                        enabled: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 text-[var(--color-primary)] rounded focus:ring-[var(--color-primary)]"
                  />
                  <span className="text-sm text-gray-700">Enabled</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Signature Text
                </label>
                <textarea
                  value={signature.text}
                  onChange={(e) =>
                    setSignature((s) => ({
                      ...s,
                      text: e.target.value,
                      html: e.target.value.replace(/\n/g, "<br>"),
                    }))
                  }
                  rows={4}
                  placeholder="e.g. John Smith&#10;CEO, Acme Inc.&#10;(555) 123-4567"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-y"
                />
              </div>

              {signature.text && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Preview:</p>
                  <div className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                    <div
                      className="text-sm text-gray-600 border-t border-gray-300 pt-2"
                      style={{ whiteSpace: "pre-line" }}
                    >
                      {signature.text}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveSignature}
                  disabled={sigSaving}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 text-sm font-medium disabled:opacity-50"
                >
                  {sigSaving ? "Saving..." : "Save Signature"}
                </button>
                {sigMessage && (
                  <span
                    className={`text-sm ${
                      sigMessage.includes("Failed")
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {sigMessage}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
