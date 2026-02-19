"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { EmailAddress } from "@/types";
import type { CallyUser } from "@/types";

interface EmailChipInputProps {
  label: string;
  addresses: EmailAddress[];
  onChange: (addresses: EmailAddress[]) => void;
  disabled?: boolean;
  suggestions?: CallyUser[];
  onInputChange?: (value: string) => void;
}

export default function EmailChipInput({
  label,
  addresses,
  onChange,
  disabled,
  suggestions = [],
  onInputChange,
}: EmailChipInputProps) {
  const [input, setInput] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addAddress = useCallback(
    (email?: string, name?: string) => {
      const trimmed = (email || input).trim();
      if (!trimmed) return;
      if (!trimmed.includes("@")) return;
      if (addresses.some((a) => a.email === trimmed)) {
        setInput("");
        setShowDropdown(false);
        onInputChange?.("");
        return;
      }
      onChange([...addresses, { email: trimmed, name }]);
      setInput("");
      setShowDropdown(false);
      setHighlightIndex(-1);
      onInputChange?.("");
    },
    [input, addresses, onChange, onInputChange],
  );

  const handleInputChange = (value: string) => {
    setInput(value);
    setHighlightIndex(-1);
    onInputChange?.(value);
    setShowDropdown(value.length >= 2);
  };

  const handleSelectSuggestion = (contact: CallyUser) => {
    addAddress(contact.email, contact.name || undefined);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showDropdown && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0,
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1,
        );
        return;
      }
      if (e.key === "Enter" && highlightIndex >= 0) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[highlightIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowDropdown(false);
        setHighlightIndex(-1);
        return;
      }
    }

    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      e.preventDefault();
      addAddress();
    }
    if (e.key === "Backspace" && input === "" && addresses.length > 0) {
      onChange(addresses.slice(0, -1));
    }
  };

  const removeAddress = (index: number) => {
    onChange(addresses.filter((_, i) => i !== index));
  };

  // Click-outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
        setHighlightIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex items-start gap-2 relative" ref={containerRef}>
      <label className="text-sm text-gray-500 pt-1.5 w-12 flex-shrink-0">
        {label}:
      </label>
      <div className="flex-1 relative">
        <div className="flex flex-wrap gap-1.5 items-center border border-gray-200 rounded-lg px-2 py-1.5 min-h-[36px] focus-within:ring-2 focus-within:ring-[var(--color-primary)] focus-within:border-transparent">
          {addresses.map((addr, idx) => (
            <span
              key={addr.email}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-sm rounded-full"
            >
              <span className="truncate max-w-[180px]">
                {addr.name || addr.email}
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeAddress(idx)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <svg
                    className="w-3.5 h-3.5"
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
              )}
            </span>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              // Delay to allow click on suggestion
              setTimeout(() => addAddress(), 150);
            }}
            placeholder={addresses.length === 0 ? "Type email + Enter" : ""}
            className="flex-1 min-w-[120px] outline-none text-sm py-0.5 bg-transparent"
            disabled={disabled}
          />
        </div>

        {/* Autocomplete dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-[240px] overflow-y-auto">
            {suggestions.map((contact, idx) => (
              <button
                key={contact.email}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectSuggestion(contact);
                }}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                  idx === highlightIndex
                    ? "bg-[var(--color-primary)] text-white"
                    : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 flex-shrink-0">
                  {(contact.name || contact.email).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  {contact.name && (
                    <p
                      className={`truncate font-medium ${idx === highlightIndex ? "text-white" : "text-gray-800"}`}
                    >
                      {contact.name}
                    </p>
                  )}
                  <p
                    className={`truncate text-xs ${idx === highlightIndex ? "text-white/80" : "text-gray-500"}`}
                  >
                    {contact.email}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
