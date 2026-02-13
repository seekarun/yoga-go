"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import type { EmailWithThread } from "@/types";

type FilterType = "all" | "unread" | "starred";

export default function AiInboxPage() {
  const params = useParams();
  const expertId = params.expertId as string;
  const [emails, setEmails] = useState<EmailWithThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastKey, setLastKey] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailWithThread | null>(
    null,
  );

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

        if (filter === "unread") {
          queryParams.set("unreadOnly", "true");
        } else if (filter === "starred") {
          queryParams.set("starredOnly", "true");
        }

        if (searchQuery) {
          queryParams.set("search", searchQuery);
        }

        if (append && lastKey) {
          queryParams.set("lastKey", lastKey);
        }

        console.log(
          "[DBG][ai-inbox] Fetching AI inbox emails with params:",
          queryParams.toString(),
        );

        const response = await fetch(
          `/api/data/app/inbox/cal?${queryParams.toString()}`,
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
        } else {
          setError(data.error || "Failed to load AI inbox");
        }
      } catch (err) {
        console.error("[DBG][ai-inbox] Error fetching emails:", err);
        setError("Failed to load AI inbox");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filter, searchQuery, lastKey],
  );

  useEffect(() => {
    setLastKey(undefined);
    fetchEmails(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, searchQuery]);

  const handleEmailClick = (email: EmailWithThread) => {
    setSelectedEmail(email);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" />
        <span className="ml-3 text-gray-600">Loading AI inbox...</span>
      </div>
    );
  }

  return (
    <div className="px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-main)]">
          AI Assistant Inbox
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Emails sent to your{" "}
          <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
            cal@
          </code>{" "}
          address appear here
        </p>
      </div>

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

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Filter Tabs */}
            <div className="flex gap-2">
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
                  {f === "all" ? "All" : f === "unread" ? "Unread" : "Starred"}
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
                  placeholder="Search AI inbox..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
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
              </div>
            </div>
          </div>
        </div>

        {/* Email List */}
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
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <p className="text-gray-500">
                {filter === "unread"
                  ? "No unread emails"
                  : filter === "starred"
                    ? "No starred emails"
                    : "No emails yet"}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Emails sent to your cal@ address will appear here
              </p>
            </div>
          ) : (
            emails.map((email) => {
              const hasUnread =
                email.threadHasUnread || (!email.isRead && !email.isOutgoing);
              const displayDate = email.threadLatestAt || email.receivedAt;
              const isThread = email.threadCount && email.threadCount > 1;

              return (
                <div
                  key={email.id}
                  onClick={() => handleEmailClick(email)}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    hasUnread ? "bg-blue-50" : ""
                  } ${selectedEmail?.id === email.id ? "ring-2 ring-[var(--color-primary)] ring-inset" : ""}`}
                >
                  <div className="flex items-start gap-3">
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
                            {email.from.name || email.from.email}
                          </p>
                          {isThread && (
                            <span className="flex-shrink-0 px-1.5 py-0.5 text-xs font-medium bg-gray-200 text-gray-600 rounded">
                              {email.threadCount}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {formatDate(displayDate)}
                        </span>
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

                      {email.attachments && email.attachments.length > 0 && (
                        <div className="flex items-center gap-1 mt-1.5">
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
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Load More */}
        {hasMore && (
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

      {/* Selected Email Detail */}
      {selectedEmail && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--text-main)]">
              {selectedEmail.subject || "(no subject)"}
            </h2>
            <button
              onClick={() => setSelectedEmail(null)}
              className="text-gray-400 hover:text-gray-600"
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
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <span className="font-medium">
              {selectedEmail.from.name || selectedEmail.from.email}
            </span>
            {selectedEmail.from.name && (
              <span className="text-gray-400">
                &lt;{selectedEmail.from.email}&gt;
              </span>
            )}
            <span className="text-gray-400 ml-auto">
              {new Date(selectedEmail.receivedAt).toLocaleString()}
            </span>
          </div>
          <div className="text-sm text-gray-600 mb-2">
            <span className="text-gray-400">To: </span>
            {selectedEmail.to.map((t) => t.name || t.email).join(", ")}
          </div>
          <hr className="my-4" />
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
            {selectedEmail.bodyText || "(no content)"}
          </div>
        </div>
      )}

      {/* Link to main inbox */}
      <div className="mt-4 text-center">
        <a
          href={`/srv/${expertId}/inbox`}
          className="text-sm text-[var(--color-primary)] hover:underline"
        >
          Go to main inbox
        </a>
      </div>
    </div>
  );
}
