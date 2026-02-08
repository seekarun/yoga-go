"use client";

import { useState, useRef, useCallback } from "react";
import type { SectionOrderItem } from "@/types/landing-page";

interface SectionToolbarProps {
  heroEnabled: boolean;
  footerEnabled: boolean;
  sections: SectionOrderItem[];
  onHeroToggle: (enabled: boolean) => void;
  onFooterToggle: (enabled: boolean) => void;
  onSectionToggle: (sectionId: string, enabled: boolean) => void;
  onSectionMoveUp: (sectionId: string) => void;
  onSectionMoveDown: (sectionId: string) => void;
}

const SECTION_LABELS: Record<string, string> = {
  about: "About",
  features: "Features",
  testimonials: "Testimonials",
  faq: "FAQ",
};

export default function SectionToolbar({
  heroEnabled,
  footerEnabled,
  sections,
  onHeroToggle,
  onFooterToggle,
  onSectionToggle,
  onSectionMoveUp,
  onSectionMoveDown,
}: SectionToolbarProps) {
  const [collapsed, setCollapsed] = useState(false);
  // y=null means "use CSS centering"; once dragged, y becomes a pixel value
  const [position, setPosition] = useState<{ x: number; y: number | null }>({
    x: 12,
    y: null,
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, elX: 0, elY: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);

      // Resolve CSS-centered position to actual pixels on first drag
      let startY = position.y;
      if (startY === null && panelRef.current) {
        const parentRect =
          panelRef.current.offsetParent?.getBoundingClientRect();
        const panelRect = panelRef.current.getBoundingClientRect();
        if (parentRect) {
          startY = panelRect.top - parentRect.top;
        } else {
          startY = 0;
        }
      }

      dragStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        elX: position.x,
        elY: startY ?? 0,
      };

      const handleMouseMove = (ev: MouseEvent) => {
        const dx = ev.clientX - dragStartRef.current.mouseX;
        const dy = ev.clientY - dragStartRef.current.mouseY;
        setPosition({
          x: dragStartRef.current.elX + dx,
          y: dragStartRef.current.elY + dy,
        });
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [position],
  );

  const positionStyles: React.CSSProperties =
    position.y === null
      ? { top: "50%", transform: "translateY(-50%)" }
      : { top: `${position.y}px` };

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        style={{
          position: "absolute",
          left: `${position.x}px`,
          ...positionStyles,
          zIndex: 20,
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "8px 12px",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          fontSize: "0.75rem",
          fontWeight: 600,
          color: "#374151",
          writingMode: "vertical-rl",
          textOrientation: "mixed",
          letterSpacing: "0.05em",
        }}
      >
        Sections
      </button>
    );
  }

  const panelStyle: React.CSSProperties = {
    position: "absolute",
    left: `${position.x}px`,
    ...positionStyles,
    zIndex: 20,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "12px",
    boxShadow: isDragging
      ? "0 8px 24px rgba(0,0,0,0.18)"
      : "0 4px 16px rgba(0,0,0,0.1)",
    width: "180px",
    userSelect: "none",
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "8px",
    paddingBottom: "8px",
    borderBottom: "1px solid #e5e7eb",
    cursor: "grab",
  };

  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 0",
    fontSize: "0.8rem",
    color: "#374151",
  };

  const labelStyle: React.CSSProperties = {
    flex: 1,
    fontSize: "0.8rem",
    fontWeight: 500,
  };

  const toggleStyle = (enabled: boolean): React.CSSProperties => ({
    position: "relative",
    width: "32px",
    height: "18px",
    backgroundColor: enabled ? "#2563eb" : "#d1d5db",
    borderRadius: "9px",
    border: "none",
    cursor: "pointer",
    transition: "background-color 0.2s",
    flexShrink: 0,
  });

  const toggleKnobStyle = (enabled: boolean): React.CSSProperties => ({
    position: "absolute",
    top: "2px",
    left: enabled ? "16px" : "2px",
    width: "14px",
    height: "14px",
    backgroundColor: "#ffffff",
    borderRadius: "50%",
    transition: "left 0.2s",
    boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
  });

  const arrowBtnStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "2px",
    display: "flex",
    color: "#6b7280",
    flexShrink: 0,
  };

  const disabledArrowStyle: React.CSSProperties = {
    ...arrowBtnStyle,
    opacity: 0.3,
    cursor: "default",
  };

  return (
    <div ref={panelRef} style={panelStyle}>
      {/* Header — drag handle */}
      <div style={headerStyle} onMouseDown={handleMouseDown}>
        <span
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "#1a1a1a",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          {/* Drag grip icon */}
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="#9ca3af"
            stroke="none"
          >
            <circle cx="5" cy="4" r="2" />
            <circle cx="12" cy="4" r="2" />
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="5" cy="20" r="2" />
            <circle cx="12" cy="20" r="2" />
          </svg>
          Sections
        </span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "2px",
            display: "flex",
            color: "#9ca3af",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Hero - fixed at top, toggle only */}
      <div style={rowStyle}>
        <span style={labelStyle}>Hero</span>
        <button
          type="button"
          style={toggleStyle(heroEnabled)}
          onClick={() => onHeroToggle(!heroEnabled)}
        >
          <div style={toggleKnobStyle(heroEnabled)} />
        </button>
      </div>

      {/* Divider */}
      <div style={{ borderTop: "1px solid #e5e7eb", margin: "6px 0" }} />

      {/* Reorderable sections (about, features, testimonials, faq) */}
      {sections.map((section, index) => (
        <div key={section.id} style={rowStyle}>
          <span style={labelStyle}>
            {SECTION_LABELS[section.id] || section.id}
          </span>

          {/* Move up */}
          <button
            type="button"
            style={index === 0 ? disabledArrowStyle : arrowBtnStyle}
            onClick={() => index > 0 && onSectionMoveUp(section.id)}
            disabled={index === 0}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>

          {/* Move down */}
          <button
            type="button"
            style={
              index === sections.length - 1 ? disabledArrowStyle : arrowBtnStyle
            }
            onClick={() =>
              index < sections.length - 1 && onSectionMoveDown(section.id)
            }
            disabled={index === sections.length - 1}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Toggle */}
          <button
            type="button"
            style={toggleStyle(section.enabled)}
            onClick={() => onSectionToggle(section.id, !section.enabled)}
          >
            <div style={toggleKnobStyle(section.enabled)} />
          </button>
        </div>
      ))}

      {/* Divider */}
      <div style={{ borderTop: "1px solid #e5e7eb", margin: "6px 0" }} />

      {/* Footer - fixed at bottom, toggle only */}
      <div style={rowStyle}>
        <span style={labelStyle}>Footer</span>
        <button
          type="button"
          style={toggleStyle(footerEnabled)}
          onClick={() => onFooterToggle(!footerEnabled)}
        >
          <div style={toggleKnobStyle(footerEnabled)} />
        </button>
      </div>
    </div>
  );
}
