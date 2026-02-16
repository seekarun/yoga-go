"use client";

import type { HeroTemplateProps } from "./types";
import SectionsRenderer from "./SectionsRenderer";

/**
 * Minimal Template
 * Clean and simple with pure white background.
 * Intentionally ignores: backgroundImage, imagePosition, imageZoom
 * (image data has no visual effect — hero is always white)
 */
export default function MinimalTemplate(props: HeroTemplateProps) {
  const {
    config,
    isEditing = false,
    onTitleChange,
    onSubtitleChange,
    onButtonClick,
  } = props;
  const { title, subtitle, button } = config;

  const containerStyle: React.CSSProperties = {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "40px 20px",
    position: "relative",
    overflow: "hidden",
    color: "#1a1a1a",
    backgroundColor: "#ffffff",
  };

  const contentStyle: React.CSSProperties = {
    position: "relative",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: "clamp(2rem, 4vw, 3rem)",
    fontWeight: 500,
    fontFamily: config.theme?.headerFont?.family || undefined,
    marginBottom: "16px",
    lineHeight: 1.2,
    color: "#1a1a1a",
    letterSpacing: "-0.01em",
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: "clamp(1rem, 1.8vw, 1.1rem)",
    fontWeight: 400,
    fontFamily: config.theme?.bodyFont?.family || undefined,
    color: "#666",
    maxWidth: "500px",
    lineHeight: 1.6,
  };

  const dividerStyle: React.CSSProperties = {
    width: "40px",
    height: "1px",
    background: "#ddd",
    margin: "30px 0",
  };

  const editableBaseStyle: React.CSSProperties = isEditing
    ? {
        cursor: "text",
        outline: "none",
        borderRadius: "4px",
        padding: "8px 12px",
        transition: "background 0.2s, outline 0.2s",
      }
    : {};

  const buttonStyle: React.CSSProperties = {
    marginTop: "32px",
    padding: "14px 36px",
    fontSize: "0.95rem",
    fontWeight: 500,
    backgroundColor: "var(--brand-500, #1a1a1a)",
    color: "var(--brand-500-contrast, #ffffff)",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    transition: "background 0.2s",
  };

  const editButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    position: "relative",
  };

  return (
    <>
      {/* Hero Section */}
      {config.heroEnabled !== false && (
        <div style={containerStyle}>
          {isEditing && (
            <style>{`
              .editable-field-dark:focus {
                background: rgba(0, 0, 0, 0.05) !important;
                outline: 2px solid rgba(0, 0, 0, 0.3) !important;
              }
              .editable-field-dark:hover:not(:focus) {
                background: rgba(0, 0, 0, 0.02);
              }
            `}</style>
          )}
          {/* Content Layer */}
          <div style={contentStyle}>
            {isEditing ? (
              <>
                <div
                  className="editable-field-dark"
                  contentEditable
                  suppressContentEditableWarning
                  style={{ ...titleStyle, ...editableBaseStyle }}
                  onBlur={(e) =>
                    onTitleChange?.(e.currentTarget.textContent || "")
                  }
                >
                  {title}
                </div>
                <div style={dividerStyle} />
                <div
                  className="editable-field-dark"
                  contentEditable
                  suppressContentEditableWarning
                  style={{ ...subtitleStyle, ...editableBaseStyle }}
                  onBlur={(e) =>
                    onSubtitleChange?.(e.currentTarget.textContent || "")
                  }
                >
                  {subtitle}
                </div>
                {button && (
                  <button
                    type="button"
                    onClick={onButtonClick}
                    style={editButtonStyle}
                  >
                    {button.label}
                    <span
                      style={{
                        position: "absolute",
                        top: "-8px",
                        right: "-8px",
                        width: "24px",
                        height: "24px",
                        backgroundColor: "#2563eb",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </span>
                  </button>
                )}
              </>
            ) : (
              <>
                <h1 style={titleStyle}>{title}</h1>
                <div style={dividerStyle} />
                <p style={subtitleStyle}>{subtitle}</p>
                {button && (
                  <button
                    type="button"
                    style={buttonStyle}
                    onClick={onButtonClick}
                  >
                    {button.label}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Dynamic Sections */}
      <SectionsRenderer {...props} variant="light" />
    </>
  );
}
