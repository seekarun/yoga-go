"use client";

import type { HeroTemplateProps } from "./types";
import SectionsRenderer from "./SectionsRenderer";

/**
 * Minimal Template
 * Clean and simple with subtle background
 */
export default function MinimalTemplate(props: HeroTemplateProps) {
  const {
    config,
    isEditing = false,
    onTitleChange,
    onSubtitleChange,
    onButtonClick,
    onAboutParagraphChange,
    onAboutImageClick,
  } = props;
  const {
    title,
    subtitle,
    backgroundImage,
    imagePosition,
    imageZoom,
    button,
    about,
  } = config;

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
  };

  const backgroundStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    backgroundColor: "#ffffff",
    backgroundImage: backgroundImage
      ? `linear-gradient(rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.92)), url(${backgroundImage})`
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
    fontSize: "clamp(2rem, 4vw, 3rem)",
    fontWeight: 500,
    marginBottom: "16px",
    lineHeight: 1.2,
    color: "#1a1a1a",
    letterSpacing: "-0.01em",
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: "clamp(1rem, 1.8vw, 1.1rem)",
    fontWeight: 400,
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
    backgroundColor: "#1a1a1a",
    color: "#ffffff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    transition: "background 0.2s",
  };

  const editButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    position: "relative",
  };

  // About section styles - Minimal theme
  const aboutSectionStyle: React.CSSProperties = {
    width: "100%",
    padding: "80px 20px",
    backgroundColor: "#fafafa",
    color: "#1a1a1a",
  };

  const aboutContainerStyle: React.CSSProperties = {
    maxWidth: "900px",
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    gap: "50px",
    flexWrap: "wrap",
    justifyContent: "center",
  };

  const aboutImageContainerStyle: React.CSSProperties = {
    position: "relative",
    width: "280px",
    height: "280px",
    borderRadius: "50%",
    overflow: "hidden",
    flexShrink: 0,
    backgroundColor: "#f3f4f6",
  };

  const aboutImageStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    backgroundImage: about?.image ? `url(${about.image})` : undefined,
    backgroundPosition: about?.imagePosition || "50% 50%",
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
    backgroundColor: about?.image ? undefined : "#e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transform: about?.image
      ? `scale(${(about?.imageZoom || 100) / 100})`
      : undefined,
  };

  const aboutTextStyle: React.CSSProperties = {
    flex: 1,
    minWidth: "280px",
    maxWidth: "450px",
  };

  const aboutParagraphStyle: React.CSSProperties = {
    fontSize: "1rem",
    lineHeight: 1.8,
    color: "#666666",
    textAlign: "left",
  };

  const editableAboutStyle: React.CSSProperties = isEditing
    ? {
        cursor: "text",
        outline: "none",
        borderRadius: "4px",
        padding: "12px",
        transition: "background 0.2s, outline 0.2s",
      }
    : {};

  return (
    <>
      {/* Hero Section */}
      <div style={containerStyle}>
        {/* Background Layer */}
        <div style={backgroundStyle} />

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

      {/* About Section */}
      {about && (
        <div style={aboutSectionStyle}>
          <div style={aboutContainerStyle}>
            {/* About Image */}
            <div style={aboutImageContainerStyle}>
              <div style={aboutImageStyle}>
                {!about.image && (
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#9ca3af"
                    strokeWidth="1.5"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                )}
              </div>
              {isEditing && (
                <button
                  type="button"
                  onClick={onAboutImageClick}
                  style={{
                    position: "absolute",
                    top: "12px",
                    right: "12px",
                    width: "36px",
                    height: "36px",
                    backgroundColor: "white",
                    borderRadius: "50%",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#374151"
                    strokeWidth="2"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </button>
              )}
            </div>

            {/* About Text */}
            <div style={aboutTextStyle}>
              {isEditing ? (
                <div
                  className="editable-field-dark"
                  contentEditable
                  suppressContentEditableWarning
                  style={{ ...aboutParagraphStyle, ...editableAboutStyle }}
                  onBlur={(e) =>
                    onAboutParagraphChange?.(e.currentTarget.textContent || "")
                  }
                >
                  {about.paragraph}
                </div>
              ) : (
                <p style={aboutParagraphStyle}>{about.paragraph}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Sections */}
      <SectionsRenderer {...props} variant="light" />
    </>
  );
}
