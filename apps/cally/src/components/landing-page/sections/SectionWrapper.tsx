"use client";

import type { SectionWrapperProps } from "./types";

/**
 * SectionWrapper Component
 *
 * Wraps each section with reorder controls, edit/delete buttons when in edit mode.
 */
export default function SectionWrapper({
  section,
  isEditing = false,
  index,
  totalSections,
  onMoveUp,
  onMoveDown,
  onDelete,
  children,
}: SectionWrapperProps) {
  if (!isEditing) {
    return <>{children}</>;
  }

  const isFirst = index === 0;
  const isLast = index === totalSections - 1;
  const isHero = section.type === "hero";

  const wrapperStyle: React.CSSProperties = {
    position: "relative",
  };

  const controlsStyle: React.CSSProperties = {
    position: "absolute",
    top: "8px",
    left: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    zIndex: 100,
    opacity: 0,
    transition: "opacity 0.2s",
  };

  const buttonStyle: React.CSSProperties = {
    width: "32px",
    height: "32px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.2s, transform 0.1s",
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
  };

  const moveButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: "#ffffff",
  };

  const deleteButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: "#ef4444",
  };

  const disabledStyle: React.CSSProperties = {
    opacity: 0.4,
    cursor: "not-allowed",
  };

  const labelStyle: React.CSSProperties = {
    position: "absolute",
    top: "8px",
    right: "8px",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    color: "#ffffff",
    padding: "4px 12px",
    borderRadius: "4px",
    fontSize: "0.75rem",
    fontWeight: 500,
    textTransform: "capitalize",
    zIndex: 100,
    opacity: 0,
    transition: "opacity 0.2s",
  };

  return (
    <div
      style={wrapperStyle}
      className="section-wrapper"
      onMouseEnter={(e) => {
        const controls = e.currentTarget.querySelector(
          ".section-controls",
        ) as HTMLElement;
        const label = e.currentTarget.querySelector(
          ".section-label",
        ) as HTMLElement;
        if (controls) controls.style.opacity = "1";
        if (label) label.style.opacity = "1";
      }}
      onMouseLeave={(e) => {
        const controls = e.currentTarget.querySelector(
          ".section-controls",
        ) as HTMLElement;
        const label = e.currentTarget.querySelector(
          ".section-label",
        ) as HTMLElement;
        if (controls) controls.style.opacity = "0";
        if (label) label.style.opacity = "0";
      }}
    >
      {/* Section Label */}
      <div className="section-label" style={labelStyle}>
        {section.type}
      </div>

      {/* Reorder / Delete Controls */}
      <div className="section-controls" style={controlsStyle}>
        {/* Move Up */}
        <button
          type="button"
          style={{
            ...moveButtonStyle,
            ...(isFirst ? disabledStyle : {}),
          }}
          onClick={onMoveUp}
          disabled={isFirst}
          title="Move up"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#374151"
            strokeWidth="2"
          >
            <path d="M18 15l-6-6-6 6" />
          </svg>
        </button>

        {/* Move Down */}
        <button
          type="button"
          style={{
            ...moveButtonStyle,
            ...(isLast ? disabledStyle : {}),
          }}
          onClick={onMoveDown}
          disabled={isLast}
          title="Move down"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#374151"
            strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {/* Delete (not allowed for hero) */}
        {!isHero && (
          <button
            type="button"
            style={deleteButtonStyle}
            onClick={onDelete}
            title="Delete section"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2"
            >
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
        )}
      </div>

      {children}
    </div>
  );
}
