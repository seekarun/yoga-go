"use client";

import { useState, useRef, useCallback } from "react";
import { useClickOutside } from "@core/hooks";
import { useVisitorInfo } from "@/hooks/useVisitorInfo";
import { useVisitorTimezone } from "@/hooks/useVisitorTimezone";
import TimezoneSelector from "./TimezoneSelector";

interface ProfileIconDropdownProps {
  tenantId: string;
  inline?: boolean;
  colorMode?: "light" | "dark";
}

/**
 * Profile icon for visitors on tenant landing pages.
 * Shows visitor info from localStorage (name, email, timezone) if previously submitted a form.
 * For first-time visitors with no stored info, renders nothing.
 */
export default function ProfileIconDropdown({
  tenantId: _tenantId,
  inline = false,
  colorMode: _colorMode = "dark",
}: ProfileIconDropdownProps) {
  const { visitorInfo } = useVisitorInfo();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [timezone, setTimezone] = useVisitorTimezone();

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  useClickOutside(dropdownRef, handleClose, isOpen);

  // Don't show anything for first-time visitors with no stored info
  if (!visitorInfo.name && !visitorInfo.email) {
    return null;
  }

  const initials = visitorInfo.name
    ? visitorInfo.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div
      ref={dropdownRef}
      className={inline ? "relative" : "fixed top-4 right-4 z-40"}
    >
      {/* Avatar button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-semibold shadow-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 overflow-hidden"
        aria-label="Profile menu"
      >
        {initials}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-12 right-0 w-72 bg-white rounded-xl shadow-xl border border-gray-200 py-3 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Visitor info */}
          <div className="px-4 pb-3 border-b border-gray-100">
            {visitorInfo.name && (
              <p className="text-sm font-semibold text-gray-900 truncate">
                {visitorInfo.name}
              </p>
            )}
            {visitorInfo.email && (
              <p className="text-xs text-gray-500 truncate">
                {visitorInfo.email}
              </p>
            )}
          </div>

          {/* Timezone selector */}
          <div className="px-4 py-3">
            <TimezoneSelector value={timezone} onChange={setTimezone} />
          </div>
        </div>
      )}
    </div>
  );
}
