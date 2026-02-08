"use client";

import type { HeroTemplateProps } from "./types";
import SectionsRenderer from "./SectionsRenderer";

/**
 * Bold Template
 * Large typography with strong visual impact
 */
export default function BoldTemplate(props: HeroTemplateProps) {
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
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "40px 20px",
    position: "relative",
    overflow: "hidden",
    color: "#ffffff",
  };

  const backgroundStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    backgroundColor: "#000000",
    backgroundImage: backgroundImage
      ? `linear-gradient(rgba(0, 0, 0, 0.65), rgba(0, 0, 0, 0.65)), url(${backgroundImage})`
      : undefined,
    backgroundPosition: imagePosition || "50% 50%",
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
    transform: backgroundImage
      ? `scale(${(imageZoom || 100) / 100})`
      : undefined,
    zIndex: 0,
  };

  const contentStyle: React.CSSProperties = {
    position: "relative",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: "clamp(3.5rem, 10vw, 8rem)",
    fontWeight: 900,
    marginBottom: "24px",
    lineHeight: 0.95,
    letterSpacing: "-0.03em",
    textTransform: "uppercase",
    maxWidth: "90%",
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: "clamp(1rem, 2vw, 1.3rem)",
    fontWeight: 300,
    opacity: 0.8,
    maxWidth: "600px",
    lineHeight: 1.6,
    letterSpacing: "0.05em",
  };

  const editableBaseStyle: React.CSSProperties = isEditing
    ? {
        cursor: "text",
        outline: "none",
        borderRadius: "4px",
        padding: "8px 16px",
        transition: "background 0.2s, outline 0.2s",
      }
    : {};

  const buttonStyle: React.CSSProperties = {
    marginTop: "40px",
    padding: "18px 48px",
    fontSize: "1rem",
    fontWeight: 700,
    backgroundColor: "#ffffff",
    color: "#000000",
    border: "none",
    borderRadius: "0",
    cursor: "pointer",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
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
          {/* Background Layer */}
          <div style={backgroundStyle} />

          {isEditing && (
            <style>{`
              .editable-field-light:focus {
                background: rgba(255, 255, 255, 0.1) !important;
                outline: 2px solid rgba(255, 255, 255, 0.5) !important;
              }
              .editable-field-light:hover:not(:focus) {
                background: rgba(255, 255, 255, 0.05);
              }
            `}</style>
          )}
          {/* Content Layer */}
          <div style={contentStyle}>
            {isEditing ? (
              <>
                <div
                  className="editable-field-light"
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
                  className="editable-field-light"
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
        </div>
      )}

      {/* Dynamic Sections */}
      <SectionsRenderer {...props} variant="dark" />
    </>
  );
}
