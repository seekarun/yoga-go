"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { CallyUser, UserType } from "@/types";
import Modal, { ModalHeader, ModalFooter } from "@/components/Modal";
import { PrimaryButton, SecondaryButton } from "@/components/Button";
import { useToast } from "@/components/Toast";

type FilterType = "all" | UserType;

/**
 * Users management page - displays subscribers and visitors in a unified list
 */
export default function UsersPage() {
  const { expertId } = useParams<{ expertId: string }>();
  const [users, setUsers] = useState<CallyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [hideAnonymous, setHideAnonymous] = useState(false);

  const { showToast } = useToast();

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/data/app/subscribers");
      const data = await res.json();
      if (data.success) {
        setUsers(data.data || []);
      } else {
        setError(data.error || "Failed to load users");
      }
    } catch {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const counts = useMemo(
    () => ({
      all: users.length,
      registered: users.filter((u) => u.userType === "registered").length,
      visitor: users.filter((u) => u.userType === "visitor").length,
      contact: users.filter((u) => u.userType === "contact").length,
      anonymous: users.filter((u) => u.anonymous).length,
    }),
    [users],
  );

  const filteredUsers = useMemo(() => {
    let result = users;

    if (hideAnonymous) {
      result = result.filter((u) => !u.anonymous);
    }

    if (activeFilter !== "all") {
      result = result.filter((u) => u.userType === activeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
      );
    }

    return result;
  }, [users, activeFilter, searchQuery, hideAnonymous]);

  const visibleEmails = useMemo(
    () => new Set(filteredUsers.map((u) => u.email)),
    [filteredUsers],
  );

  const allVisibleSelected =
    filteredUsers.length > 0 &&
    filteredUsers.every((u) => selectedEmails.has(u.email));

  const toggleSelectAll = () => {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const email of visibleEmails) {
          next.delete(email);
        }
      } else {
        for (const email of visibleEmails) {
          next.add(email);
        }
      }
      return next;
    });
  };

  const toggleSelect = (email: string) => {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(email)) {
        next.delete(email);
      } else {
        next.add(email);
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedEmails(new Set());

  const handleSendComplete = (sentCount: number) => {
    showToast(
      `Email sent to ${sentCount} user${sentCount !== 1 ? "s" : ""}`,
      "success",
    );
    setShowComposeModal(false);
    clearSelection();
  };

  return (
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)]">Users</h1>
          <p className="text-[var(--text-muted)] mt-1">
            Registered subscribers and booking visitors.
          </p>
        </div>
        {!loading && users.length > 0 && (
          <span className="inline-flex items-center rounded-full bg-[var(--color-primary)]/10 px-3 py-1 text-sm font-medium text-[var(--color-primary)]">
            {users.length} user{users.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Filter pills and search */}
      {!loading && users.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            <FilterPill
              label="All"
              count={counts.all}
              active={activeFilter === "all"}
              onClick={() => setActiveFilter("all")}
            />
            <FilterPill
              label="Registered"
              count={counts.registered}
              active={activeFilter === "registered"}
              onClick={() => setActiveFilter("registered")}
            />
            <FilterPill
              label="Visitors"
              count={counts.visitor}
              active={activeFilter === "visitor"}
              onClick={() => setActiveFilter("visitor")}
            />
            <FilterPill
              label="Contacts"
              count={counts.contact}
              active={activeFilter === "contact"}
              onClick={() => setActiveFilter("contact")}
            />
          </div>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-white px-3 py-1.5 text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          />
          {counts.anonymous > 0 && (
            <label className="ml-auto flex items-center gap-1.5 text-sm text-[var(--text-muted)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hideAnonymous}
                onChange={(e) => setHideAnonymous(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
              />
              Hide anonymous ({counts.anonymous})
            </label>
          )}
        </div>
      )}

      {/* Selection toolbar */}
      {selectedEmails.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 px-4 py-2">
          <span className="text-sm font-medium text-[var(--text-main)]">
            {selectedEmails.size} selected
          </span>
          <PrimaryButton
            size="default"
            onClick={() => setShowComposeModal(true)}
          >
            Email Selected
          </PrimaryButton>
          <button
            onClick={clearSelection}
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg bg-gray-100"
            />
          ))}
        </div>
      ) : users.length === 0 ? (
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
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          <h3 className="text-lg font-medium text-[var(--text-main)] mb-2">
            No users yet
          </h3>
          <p className="text-[var(--text-muted)]">
            Visitors who book appointments or sign up will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-gray-50/50">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  Bookings
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  {/* View */}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filteredUsers.map((user) => (
                <tr
                  key={user.email}
                  className={`hover:bg-gray-50/50 transition-colors ${user.anonymous ? "opacity-60" : ""}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedEmails.has(user.email)}
                      onChange={() => toggleSelect(user.email)}
                      className="h-4 w-4 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/srv/${expertId}/users/${encodeURIComponent(user.email)}`}
                      className="flex items-center gap-3 group"
                    >
                      {user.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element -- small avatar from external source
                        <img
                          src={user.avatar}
                          alt=""
                          className="h-8 w-8 rounded-full"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-sm font-medium text-[var(--color-primary)]">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm font-medium text-[var(--text-main)] group-hover:text-[var(--color-primary)] transition-colors">
                        {user.name}
                      </span>
                      {user.anonymous && (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                          Anonymous
                        </span>
                      )}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-muted)]">
                    {user.email}
                  </td>
                  <td className="px-4 py-3">
                    <TypeBadge userType={user.userType} />
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-muted)]">
                    {user.userType === "registered"
                      ? user.subscribedAt
                        ? formatDate(user.subscribedAt)
                        : "—"
                      : user.userType === "contact"
                        ? user.lastContactDate
                          ? formatDate(user.lastContactDate)
                          : "—"
                        : user.lastBookingDate
                          ? formatDate(user.lastBookingDate)
                          : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-muted)]">
                    {user.totalBookings || 0}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/srv/${expertId}/users/${encodeURIComponent(user.email)}`}
                      className="text-sm text-[var(--color-primary)] hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Compose email modal */}
      <ComposeEmailModal
        isOpen={showComposeModal}
        onClose={() => setShowComposeModal(false)}
        emails={Array.from(selectedEmails)}
        onSendComplete={handleSendComplete}
      />
    </div>
  );
}

// =============================================
// Compose Email Modal
// =============================================

function ComposeEmailModal({
  isOpen,
  onClose,
  emails,
  onSendComplete,
}: {
  isOpen: boolean;
  onClose: () => void;
  emails: string[];
  onSendComplete: (sentCount: number) => void;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  const handleClose = () => {
    if (!sending) {
      setSubject("");
      setBody("");
      setSendError("");
      onClose();
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) return;

    setSending(true);
    setSendError("");

    try {
      const res = await fetch("/api/data/app/subscribers/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails, subject, body }),
      });
      const data = await res.json();

      if (data.success) {
        const sentCount = data.data?.sent ?? emails.length;
        setSubject("");
        setBody("");
        setSendError("");
        onSendComplete(sentCount);
      } else {
        setSendError(data.error || "Failed to send emails");
      }
    } catch {
      setSendError("Failed to send emails. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      maxWidth="max-w-2xl"
      closeOnBackdropClick={!sending}
      closeOnEscape={!sending}
    >
      <ModalHeader onClose={handleClose}>Compose Email</ModalHeader>

      <p className="mb-4 text-sm text-[var(--text-muted)]">
        Sending to {emails.length} user{emails.length !== 1 ? "s" : ""}
      </p>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="email-subject"
            className="mb-1 block text-sm font-medium text-[var(--text-main)]"
          >
            Subject
          </label>
          <input
            id="email-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject..."
            disabled={sending}
            className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-50"
          />
        </div>

        <div>
          <label
            htmlFor="email-body"
            className="mb-1 block text-sm font-medium text-[var(--text-main)]"
          >
            Message
          </label>
          <textarea
            id="email-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message..."
            rows={8}
            disabled={sending}
            className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-50 resize-y"
          />
        </div>
      </div>

      {sendError && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {sendError}
        </div>
      )}

      <ModalFooter>
        <SecondaryButton onClick={handleClose} disabled={sending}>
          Cancel
        </SecondaryButton>
        <PrimaryButton
          onClick={handleSend}
          loading={sending}
          disabled={!subject.trim() || !body.trim()}
        >
          Send
        </PrimaryButton>
      </ModalFooter>
    </Modal>
  );
}

// =============================================
// Helper Components
// =============================================

function FilterPill({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors ${
        active
          ? "bg-[var(--color-primary)] text-white"
          : "bg-gray-100 text-[var(--text-muted)] hover:bg-gray-200"
      }`}
    >
      {label}
      <span
        className={`inline-flex items-center justify-center rounded-full px-1.5 text-xs ${
          active ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function TypeBadge({ userType }: { userType: string }) {
  const styles: Record<string, string> = {
    registered: "bg-emerald-50 text-emerald-700",
    visitor: "bg-amber-50 text-amber-700",
    contact: "bg-blue-50 text-blue-700",
  };
  const labels: Record<string, string> = {
    registered: "Registered",
    visitor: "Visitor",
    contact: "Contact",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[userType] || "bg-gray-100 text-gray-600"}`}
    >
      {labels[userType] || userType}
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
