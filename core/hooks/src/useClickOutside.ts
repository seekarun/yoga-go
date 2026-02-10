"use client";

import type { RefObject } from "react";
import { useEffect } from "react";

/**
 * Hook to detect clicks outside a referenced element and Escape key presses.
 * Useful for closing dropdowns, modals, and popovers.
 *
 * @param ref - React ref to the element to detect outside clicks for
 * @param handler - Callback invoked on outside click or Escape key
 * @param enabled - Whether the listener is active (default: true)
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  handler: () => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;

    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        handler();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handler();
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [ref, handler, enabled]);
}
