"use client";

import { useState } from "react";
import type { SectionOrderItem } from "@/types/landing-page";

interface SectionToolbarProps {
  sections: SectionOrderItem[];
  aboutEnabled: boolean;
  onAboutToggle: (enabled: boolean) => void;
  onSectionToggle: (sectionId: string, enabled: boolean) => void;
  onSectionMoveUp: (sectionId: string) => void;
  onSectionMoveDown: (sectionId: string) => void;
}

const SECTION_LABELS: Record<string, string> = {
  features: "Features",
  testimonials: "Testimonials",
  faq: "FAQ",
};

export default function SectionToolbar({
  sections,
  aboutEnabled,
  onAboutToggle,
  onSectionToggle,
  onSectionMoveUp,
  onSectionMoveDown,
}: SectionToolbarProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        style={{
          position: "absolute",
          left: "12px",
          top: "50%",
          transform: "translateY(-50%)",
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
    left: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: 20,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "12px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
    width: "180px",
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "8px",
    paddingBottom: "8px",
    borderBottom: "1px solid #e5e7eb",
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

  const fixedLabelStyle: React.CSSProperties = {
    ...labelStyle,
    color: "#9ca3af",
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
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <span
          style={{ fontSize: "0.75rem", fontWeight: 700, color: "#1a1a1a" }}
        >
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

      {/* Hero - always first, no controls */}
      <div style={rowStyle}>
        <span style={fixedLabelStyle}>Hero</span>
        <span style={{ fontSize: "0.65rem", color: "#9ca3af" }}>Always</span>
      </div>

      {/* About - toggle only */}
      <div style={rowStyle}>
        <span style={labelStyle}>About</span>
        <button
          type="button"
          style={toggleStyle(aboutEnabled)}
          onClick={() => onAboutToggle(!aboutEnabled)}
        >
          <div style={toggleKnobStyle(aboutEnabled)} />
        </button>
      </div>

      {/* Divider */}
      <div style={{ borderTop: "1px solid #e5e7eb", margin: "6px 0" }} />

      {/* Reorderable sections */}
      {sections.map((section, index) => (
        <div key={section.id} style={rowStyle}>
          <span style={labelStyle}>{SECTION_LABELS[section.id]}</span>

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

      {/* Footer - always last, no controls */}
      <div style={rowStyle}>
        <span style={fixedLabelStyle}>Footer</span>
        <span style={{ fontSize: "0.65rem", color: "#9ca3af" }}>Always</span>
      </div>
    </div>
  );
}
