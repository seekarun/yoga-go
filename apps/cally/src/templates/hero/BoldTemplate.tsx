"use client";

import type { HeroTemplateProps } from "./types";
import FeaturesSection from "./FeaturesSection";

/**
 * Bold Template
 * Large typography with strong visual impact
 */
export default function BoldTemplate({
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
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "40px 20px",
    position: "relative",
    backgroundColor: "#000000",
    backgroundImage: backgroundImage
      ? `linear-gradient(rgba(0, 0, 0, 0.65), rgba(0, 0, 0, 0.65)), url(${backgroundImage})`
      : undefined,
    backgroundPosition: imagePosition || "50% 50%",
    backgroundSize: backgroundImage ? `${imageZoom || 100}%` : undefined,
    backgroundRepeat: "no-repeat",
    color: "#ffffff",
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

  // About section styles - Bold theme
  const aboutSectionStyle: React.CSSProperties = {
    width: "100%",
    padding: "100px 20px",
    backgroundColor: "#111111",
    color: "#ffffff",
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
    width: "350px",
    height: "350px",
    overflow: "hidden",
    flexShrink: 0,
    backgroundColor: "#222222",
  };

  const aboutImageStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    backgroundImage: about?.image ? `url(${about.image})` : undefined,
    backgroundPosition: about?.imagePosition || "50% 50%",
    backgroundSize: about?.image ? `${about?.imageZoom || 100}%` : undefined,
    backgroundRepeat: "no-repeat",
    backgroundColor: about?.image ? undefined : "#333333",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const aboutTextStyle: React.CSSProperties = {
    flex: 1,
    minWidth: "280px",
    maxWidth: "500px",
  };

  const aboutParagraphStyle: React.CSSProperties = {
    fontSize: "1.1rem",
    lineHeight: 1.9,
    color: "#cccccc",
    textAlign: "left",
    letterSpacing: "0.02em",
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
            .editable-field-light:focus {
              background: rgba(255, 255, 255, 0.1) !important;
              outline: 2px solid rgba(255, 255, 255, 0.5) !important;
            }
            .editable-field-light:hover:not(:focus) {
              background: rgba(255, 255, 255, 0.05);
            }
          `}</style>
        )}
        {isEditing ? (
          <>
            <div
              className="editable-field-light"
              contentEditable
              suppressContentEditableWarning
              style={{ ...titleStyle, ...editableBaseStyle }}
              onBlur={(e) => onTitleChange?.(e.currentTarget.textContent || "")}
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
              <button type="button" style={buttonStyle}>
                {button.label}
              </button>
            )}
          </>
        )}
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
                    stroke="#666666"
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
                    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
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
                  className="editable-field-light"
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

      {/* Features Section */}
      {features && features.cards.length > 0 && (
        <FeaturesSection
          features={features}
          isEditing={isEditing}
          variant="dark"
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
