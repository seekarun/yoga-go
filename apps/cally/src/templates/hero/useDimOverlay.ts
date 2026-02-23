"use client";

import { useEffect } from "react";

/**
 * Injects a fixed, semi-transparent overlay into document.body when `active` is true.
 * The overlay sits at z-index 9 so the selected section (z-index 10) appears above it.
 * pointer-events: none lets clicks pass through to trigger click-outside deselection.
 */
export function useDimOverlay(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.4)";
    overlay.style.zIndex = "9";
    overlay.style.pointerEvents = "none";
    overlay.style.opacity = "0";
    overlay.style.transition = "opacity 0.15s ease";
    document.body.appendChild(overlay);

    // Fade in on next frame
    requestAnimationFrame(() => {
      overlay.style.opacity = "1";
    });

    return () => {
      overlay.remove();
    };
  }, [active]);
}
