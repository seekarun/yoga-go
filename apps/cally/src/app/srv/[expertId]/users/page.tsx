"use client";

import { useState, useEffect, useCallback } from "react";
import type { TenantSubscriber } from "@/types";

/**
 * Users management page - displays tenant subscribers
 */
export default function UsersPage() {
  const [subscribers, setSubscribers] = useState<TenantSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSubscribers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/data/app/subscribers");
      const data = await res.json();
      if (data.success) {
        setSubscribers(data.data || []);
      } else {
        setError(data.error || "Failed to load subscribers");
      }
    } catch {
      setError("Failed to load subscribers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  return (
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)]">Users</h1>
          <p className="text-[var(--text-muted)] mt-1">
            Manage your audience and subscribers.
          </p>
        </div>
        {!loading && subscribers.length > 0 && (
          <span className="inline-flex items-center rounded-full bg-[var(--color-primary)]/10 px-3 py-1 text-sm font-medium text-[var(--color-primary)]">
            {subscribers.length} subscriber{subscribers.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

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
      ) : subscribers.length === 0 ? (
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
            No subscribers yet
          </h3>
          <p className="text-[var(--text-muted)]">
            Visitors who sign up from booking emails will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-[var(--color-border)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-gray-50/50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  Source
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  Signed Up
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {subscribers.map((subscriber) => (
                <tr
                  key={subscriber.email}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {subscriber.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element -- small avatar from external source
                        <img
                          src={subscriber.avatar}
                          alt=""
                          className="h-8 w-8 rounded-full"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-sm font-medium text-[var(--color-primary)]">
                          {subscriber.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm font-medium text-[var(--text-main)]">
                        {subscriber.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-muted)]">
                    {subscriber.email}
                  </td>
                  <td className="px-4 py-3">
                    <SourceBadge source={subscriber.source} />
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-muted)]">
                    {formatDate(subscriber.subscribedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SourceBadge({ source }: { source: string }) {
  const label =
    source === "booking_email"
      ? "Booking"
      : source === "google"
        ? "Google"
        : "Direct";

  const colorClass =
    source === "google"
      ? "bg-blue-50 text-blue-700"
      : source === "booking_email"
        ? "bg-amber-50 text-amber-700"
        : "bg-gray-100 text-gray-600";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {label}
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
