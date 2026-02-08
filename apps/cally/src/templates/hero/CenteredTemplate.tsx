"use client";

import type { HeroTemplateProps } from "./types";
import SectionsRenderer from "./SectionsRenderer";

/**
 * Centered Template
 * Classic centered layout with title and subtitle over the background
 */
export default function CenteredTemplate(props: HeroTemplateProps) {
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
    color: "#ffffff",
  };

  const backgroundStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    backgroundColor: backgroundImage ? "#000" : undefined,
    backgroundImage: backgroundImage
      ? `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${backgroundImage})`
      : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
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
    fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
    fontWeight: 700,
    marginBottom: "20px",
    lineHeight: 1.1,
    textShadow: "0 2px 10px rgba(0,0,0,0.3)",
    maxWidth: "900px",
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: "clamp(1.1rem, 2.5vw, 1.5rem)",
    fontWeight: 400,
    opacity: 0.95,
    maxWidth: "700px",
    lineHeight: 1.6,
    textShadow: "0 1px 5px rgba(0,0,0,0.2)",
  };

  const editableBaseStyle: React.CSSProperties = isEditing
    ? {
        cursor: "text",
        outline: "none",
        borderRadius: "4px",
        padding: "8px 12px",
        transition: "background 0.2s, border 0.2s",
      }
    : {};

  const buttonStyle: React.CSSProperties = {
    marginTop: "32px",
    padding: "16px 40px",
    fontSize: "1.1rem",
    fontWeight: 600,
    backgroundColor: "#ffffff",
    color: "#1a1a1a",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "transform 0.2s, box-shadow 0.2s",
    boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
  };

  const editButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    position: "relative",
  };

  // About section styles
  const aboutSectionStyle: React.CSSProperties = {
    width: "100%",
    padding: "80px 20px",
    backgroundColor: "#ffffff",
    color: "#1a1a1a",
  };

  const aboutContainerStyle: React.CSSProperties = {
    maxWidth: "1000px",
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    gap: "60px",
    flexWrap: "wrap",
    justifyContent: "center",
  };

  const aboutImageContainerStyle: React.CSSProperties = {
    position: "relative",
    width: "320px",
    height: "320px",
    borderRadius: "16px",
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
    maxWidth: "500px",
  };

  const aboutParagraphStyle: React.CSSProperties = {
    fontSize: "1.1rem",
    lineHeight: 1.8,
    color: "#4b5563",
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
            .editable-field-light:focus {
              background: rgba(255, 255, 255, 0.1) !important;
              outline: 2px solid rgba(255, 255, 255, 0.5) !important;
            }
            .editable-field-light:hover:not(:focus) {
              background: rgba(255, 255, 255, 0.05);
            }
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
                  className="edit-button"
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
      <SectionsRenderer {...props} variant="gray" />
    </>
  );
}
