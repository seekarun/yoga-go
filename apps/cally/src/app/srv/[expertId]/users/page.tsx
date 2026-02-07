"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { CallyUser, UserType } from "@/types";

type FilterType = "all" | UserType;

/**
 * Users management page - displays subscribers and visitors in a unified list
 */
export default function UsersPage() {
  const [users, setUsers] = useState<CallyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

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
    }),
    [users],
  );

  const filteredUsers = useMemo(
    () =>
      activeFilter === "all"
        ? users
        : users.filter((u) => u.userType === activeFilter),
    [users, activeFilter],
  );

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

      {/* Filter pills */}
      {!loading && users.length > 0 && (
        <div className="mb-4 flex gap-2">
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
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filteredUsers.map((user) => (
                <tr
                  key={user.email}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
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
                      <span className="text-sm font-medium text-[var(--text-main)]">
                        {user.name}
                      </span>
                    </div>
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
                      : user.lastBookingDate
                        ? formatDate(user.lastBookingDate)
                        : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-muted)]">
                    {user.totalBookings || 0}
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
