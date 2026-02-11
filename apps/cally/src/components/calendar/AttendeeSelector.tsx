"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { EventAttendee } from "@/types";

interface AttendeeSelectorProps {
  selectedAttendees: EventAttendee[];
  onChange: (attendees: EventAttendee[]) => void;
}

interface UserOption {
  email: string;
  name: string;
}

export default function AttendeeSelector({
  selectedAttendees,
  onChange,
}: AttendeeSelectorProps) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fetch users on mount
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/data/app/subscribers");
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setUsers(
          data.data
            .filter(
              (u: UserOption) =>
                u.email && u.name && !u.email.includes("anonymous"),
            )
            .map((u: UserOption) => ({ email: u.email, name: u.name })),
        );
      }
    } catch (err) {
      console.error("[DBG][AttendeeSelector] Failed to fetch users:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedEmails = new Set(selectedAttendees.map((a) => a.email));

  const filteredUsers = users.filter((u) => {
    if (selectedEmails.has(u.email)) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  });

  const handleSelect = (user: UserOption) => {
    onChange([...selectedAttendees, { email: user.email, name: user.name }]);
    setQuery("");
    setIsOpen(false);
  };

  const handleRemove = (email: string) => {
    onChange(selectedAttendees.filter((a) => a.email !== email));
  };

  return (
    <div ref={wrapperRef}>
      <label className="block text-sm font-medium mb-1 text-gray-700">
        Attendees
      </label>

      {/* Selected attendees as pills */}
      {selectedAttendees.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedAttendees.map((attendee) => (
            <span
              key={attendee.email}
              className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium"
            >
              {attendee.name}
              <button
                type="button"
                onClick={() => handleRemove(attendee.email)}
                className="ml-0.5 text-indigo-400 hover:text-indigo-700"
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
      )}

      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={
            isLoading ? "Loading users..." : "Search by name or email..."
          }
          disabled={isLoading}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#6366f1)] focus:border-transparent disabled:opacity-50"
        />

        {/* Dropdown */}
        {isOpen && filteredUsers.length > 0 && (
          <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filteredUsers.slice(0, 20).map((user) => (
              <li key={user.email}>
                <button
                  type="button"
                  onClick={() => handleSelect(user)}
                  className="w-full text-left px-3 py-2 hover:bg-indigo-50 flex flex-col"
                >
                  <span className="text-sm font-medium text-gray-900">
                    {user.name}
                  </span>
                  <span className="text-xs text-gray-500">{user.email}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {isOpen && !isLoading && filteredUsers.length === 0 && query && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-500">
            No matching users found
          </div>
        )}
      </div>
    </div>
  );
}
