"use client";

import type { HeroTemplateProps } from "./types";
import SectionsRenderer from "./SectionsRenderer";

/**
 * Split Template
 * Half image, half content side-by-side layout
 */
export default function SplitTemplate(props: HeroTemplateProps) {
  const {
    config,
    isEditing = false,
    onTitleChange,
    onSubtitleChange,
    onButtonClick,
  } = props;
  const { title, subtitle, backgroundImage, imagePosition, imageZoom, button } =
    config;

  const containerStyle: React.CSSProperties = {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    flexDirection: "row",
  };

  const contentSide: React.CSSProperties = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "60px 8%",
    background: "#fafafa",
    color: "#1a1a1a",
  };

  const imageSide: React.CSSProperties = {
    flex: 1,
    position: "relative",
    backgroundColor: backgroundImage ? "#000" : undefined,
    minHeight: "100vh",
    overflow: "hidden",
  };

  const imageSideBackground: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    backgroundImage: backgroundImage
      ? `url(${backgroundImage})`
      : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    backgroundPosition: imagePosition || "50% 50%",
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
    transform: backgroundImage
      ? `scale(${(imageZoom || 100) / 100})`
      : undefined,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: "clamp(2rem, 4vw, 3.5rem)",
    fontWeight: 700,
    marginBottom: "20px",
    lineHeight: 1.15,
    color: "#1a1a1a",
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: "clamp(1rem, 1.8vw, 1.2rem)",
    fontWeight: 400,
    color: "#666",
    maxWidth: "450px",
    lineHeight: 1.7,
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
    padding: "16px 40px",
    fontSize: "1rem",
    fontWeight: 600,
    backgroundColor: "#1a1a1a",
    color: "#ffffff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "transform 0.2s, background 0.2s",
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
          <div style={contentSide}>
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
          <div style={imageSide}>
            <div style={imageSideBackground} />
          </div>
        </div>
      )}

      {/* Dynamic Sections */}
      <SectionsRenderer {...props} variant="light" />
    </>
  );
}
