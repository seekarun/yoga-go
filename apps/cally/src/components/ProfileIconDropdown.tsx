"use client";

import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useClickOutside } from "@core/hooks";
import { useVisitorTimezone } from "@/hooks/useVisitorTimezone";
import TimezoneSelector from "./TimezoneSelector";

interface ProfileIconDropdownProps {
  tenantId: string;
}

/**
 * Floating profile icon (top-left) for authenticated users on tenant landing pages.
 * Shows a dropdown with user info, timezone selector, and sign out button.
 */
export default function ProfileIconDropdown({
  tenantId,
}: ProfileIconDropdownProps) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [timezone, setTimezone] = useVisitorTimezone();

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  useClickOutside(dropdownRef, handleClose, isOpen);

  const handleSignOut = useCallback(() => {
    logout(`/${tenantId}`);
  }, [logout, tenantId]);

  // Don't render while loading
  if (isLoading) {
    return null;
  }

  // Show "Sign In" link for guests
  if (!isAuthenticated || !user) {
    return (
      <div className="fixed top-4 right-4 z-40">
        <a
          href={`/${tenantId}/signup?mode=signin`}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-colors shadow-lg"
        >
          Sign in
        </a>
      </div>
    );
  }

  const initials = user.profile.name
    ? user.profile.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div ref={dropdownRef} className="fixed top-4 right-4 z-40">
      {/* Avatar button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-semibold shadow-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 overflow-hidden"
        aria-label="Profile menu"
      >
        {user.profile.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar is user-provided URL, dimensions are fixed
          <img
            src={user.profile.avatar}
            alt={user.profile.name || "Avatar"}
            className="w-full h-full object-cover"
          />
        ) : (
          initials
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-12 right-0 w-72 bg-white rounded-xl shadow-xl border border-gray-200 py-3 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* User info */}
          <div className="px-4 pb-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {user.profile.name}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {user.profile.email}
            </p>
          </div>

          {/* Timezone selector */}
          <div className="px-4 py-3 border-b border-gray-100">
            <TimezoneSelector value={timezone} onChange={setTimezone} />
          </div>

          {/* Sign out */}
          <div className="px-4 pt-2">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full text-left text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md px-2 py-1.5 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
