"use client";

import type { HeroTemplateProps } from "./types";
import FeaturesSection from "./FeaturesSection";

/**
 * Split Template
 * Half image, half content side-by-side layout
 */
export default function SplitTemplate({
  config,
  isEditing = false,
  onTitleChange,
  onSubtitleChange,
  onButtonClick,
  onAboutParagraphChange,
  onAboutImageClick,
  onFeaturesHeadingChange,
  onFeaturesSubheadingChange,
  onFeatureCardChange,
  onFeatureCardImageClick,
  onAddFeatureCard,
  onRemoveFeatureCard,
}: HeroTemplateProps) {
  const {
    title,
    subtitle,
    backgroundImage,
    imagePosition,
    imageZoom,
    button,
    about,
    features,
  } = config;

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

  // About section styles - Split theme (reversed layout)
  const aboutSectionStyle: React.CSSProperties = {
    width: "100%",
    display: "flex",
    flexDirection: "row",
    minHeight: "60vh",
  };

  const aboutTextSide: React.CSSProperties = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    padding: "60px 8%",
    backgroundColor: "#ffffff",
    color: "#1a1a1a",
  };

  const aboutImageSide: React.CSSProperties = {
    flex: 1,
    position: "relative",
    backgroundColor: "#f3f4f6",
    minHeight: "400px",
  };

  const aboutImageStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
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

  const aboutParagraphStyle: React.CSSProperties = {
    fontSize: "1.1rem",
    lineHeight: 1.8,
    color: "#4b5563",
    textAlign: "left",
    maxWidth: "450px",
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
                <button type="button" style={buttonStyle}>
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

      {/* About Section */}
      {about && (
        <div style={aboutSectionStyle}>
          {/* About Image Side */}
          <div style={aboutImageSide}>
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
                  zIndex: 1,
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

          {/* About Text Side */}
          <div style={aboutTextSide}>
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
      )}

      {/* Features Section */}
      {features && features.cards.length > 0 && (
        <FeaturesSection
          features={features}
          isEditing={isEditing}
          variant="light"
          onHeadingChange={onFeaturesHeadingChange}
          onSubheadingChange={onFeaturesSubheadingChange}
          onCardChange={onFeatureCardChange}
          onCardImageClick={onFeatureCardImageClick}
          onAddCard={onAddFeatureCard}
          onRemoveCard={onRemoveFeatureCard}
        />
      )}
    </>
  );
}
