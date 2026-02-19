"use client";

import { useRef, useLayoutEffect, type ReactNode } from "react";

interface ToolbarContainerProps {
  children: ReactNode;
  zIndex?: number;
  /** "above" (default) renders above the anchor; "below" renders below it */
  placement?: "above" | "below";
}

/**
 * Shared floating toolbar shell.
 * Positions itself centered above its parent, then adjusts
 * horizontally after mount so it never overflows the viewport.
 */
export default function ToolbarContainer({
  children,
  zIndex = 50,
  placement = "above",
}: ToolbarContainerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Reset to default centered position before measuring
    el.style.transform = "translateX(-50%)";

    const rect = el.getBoundingClientRect();
    const margin = 8;

    if (rect.left < margin) {
      const shift = margin - rect.left;
      el.style.transform = `translateX(calc(-50% + ${shift}px))`;
    } else if (rect.right > window.innerWidth - margin) {
      const shift = rect.right - (window.innerWidth - margin);
      el.style.transform = `translateX(calc(-50% - ${shift}px))`;
    }
  });

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        ...(placement === "below"
          ? { top: "100%", marginTop: "12px" }
          : { bottom: "100%", marginBottom: "12px" }),
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: "#ffffff",
        borderRadius: "10px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
        zIndex,
        display: "flex",
        alignItems: "center",
        padding: "6px 10px",
        gap: "8px",
        whiteSpace: "nowrap",
        fontSize: "12px",
        color: "#374151",
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}
