"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { CallyUser, Email } from "@/types";

interface UserFileData {
  user: CallyUser;
  communications: Email[];
}

export default function UserFilePage() {
  const params = useParams();
  const expertId = params.expertId as string;
  const userEmail = params.userEmail as string;
  const decodedEmail = decodeURIComponent(userEmail);

  const [data, setData] = useState<UserFileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      console.log("[DBG][userFile] Fetching user file:", decodedEmail);

      const res = await fetch(
        `/api/data/app/users/${encodeURIComponent(decodedEmail)}`,
      );
      const json = await res.json();

      if (json.success && json.data) {
        setData(json.data);
      } else {
        setError(json.error || "Failed to load user");
      }
    } catch {
      setError("Failed to load user file");
    } finally {
      setLoading(false);
    }
  }, [decodedEmail]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" />
        <span className="ml-3 text-[var(--text-muted)]">
          Loading user file...
        </span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="px-6 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">{error || "User not found"}</p>
          <Link
            href={`/srv/${expertId}/users`}
            className="inline-block mt-4 text-sm text-[var(--color-primary)] hover:underline"
          >
            Back to Users
          </Link>
        </div>
      </div>
    );
  }

  const { user, communications } = data;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/srv/${expertId}/users`}
          className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors mb-4"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Users
        </Link>

        <div className="flex items-center gap-4">
          {user.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element -- small avatar from external source
            <img src={user.avatar} alt="" className="h-14 w-14 rounded-full" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-xl font-medium text-[var(--color-primary)]">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-main)]">
              {user.name}
            </h1>
            <p className="text-[var(--text-muted)]">{user.email}</p>
            <div className="mt-1 flex items-center gap-2">
              <TypeBadge userType={user.userType} />
              {user.subscribedAt && (
                <span className="text-xs text-[var(--text-muted)]">
                  Member since {formatDate(user.subscribedAt)}
                </span>
              )}
              {user.lastBookingDate && (
                <span className="text-xs text-[var(--text-muted)]">
                  Last booking {formatDate(user.lastBookingDate)}
                </span>
              )}
              {user.totalBookings ? (
                <span className="text-xs text-[var(--text-muted)]">
                  {user.totalBookings} booking
                  {user.totalBookings !== 1 ? "s" : ""}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Communications */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-main)] mb-4">
          Communications
          {communications.length > 0 && (
            <span className="ml-2 text-sm font-normal text-[var(--text-muted)]">
              ({communications.length})
            </span>
          )}
        </h2>

        {communications.length === 0 ? (
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
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <p className="text-[var(--text-muted)]">
              No communications yet with this user.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {communications.map((email) => (
              <CommunicationEntry
                key={email.id}
                email={email}
                expertId={expertId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CommunicationEntry({
  email,
  expertId,
}: {
  email: Email;
  expertId: string;
}) {
  const snippet =
    email.bodyText.length > 120
      ? email.bodyText.substring(0, 120) + "..."
      : email.bodyText;

  return (
    <Link
      href={`/srv/${expertId}/inbox/${email.id}`}
      className="block bg-white rounded-lg border border-[var(--color-border)] p-4 hover:border-[var(--color-primary)]/30 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <DirectionBadge isOutgoing={email.isOutgoing} />
            <span className="text-sm font-medium text-[var(--text-main)] truncate">
              {email.subject || "(no subject)"}
            </span>
          </div>
          <p className="text-sm text-[var(--text-muted)] line-clamp-2">
            {snippet}
          </p>
        </div>
        <span className="text-xs text-[var(--text-muted)] whitespace-nowrap flex-shrink-0">
          {formatDateTime(email.receivedAt)}
        </span>
      </div>
    </Link>
  );
}

function DirectionBadge({ isOutgoing }: { isOutgoing: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        isOutgoing ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"
      }`}
    >
      {isOutgoing ? "Sent" : "Received"}
    </span>
  );
}

function TypeBadge({ userType }: { userType: string }) {
  const isRegistered = userType === "registered";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        isRegistered
          ? "bg-emerald-50 text-emerald-700"
          : "bg-amber-50 text-amber-700"
      }`}
    >
      {isRegistered ? "Registered" : "Visitor"}
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

function formatDateTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
