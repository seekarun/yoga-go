// @ts-nocheck — WIP: depends on LandingPageConfig V2 types not yet implemented
"use client";

import type { HeroSection } from "@/types/landing-page";
import type { SectionComponentProps } from "./types";

type HeroProps = SectionComponentProps<HeroSection>;

/**
 * Hero Section Component
 *
 * Main banner with title, subtitle, background image, and CTA button.
 * Supports multiple variants for different layouts.
 */
export default function HeroSectionComponent({
  section,
  isEditing = false,
  onUpdate,
  onImageClick,
  onButtonClick,
}: HeroProps) {
  const {
    title,
    subtitle,
    backgroundImage,
    imagePosition,
    imageZoom,
    button,
    variant = "centered",
  } = section;

  const handleTitleChange = (newTitle: string) => {
    onUpdate?.({ title: newTitle });
  };

  const handleSubtitleChange = (newSubtitle: string) => {
    onUpdate?.({ subtitle: newSubtitle });
  };

  // Variant-specific styles
  const getVariantStyles = () => {
    switch (variant) {
      case "split":
        return {
          textAlign: "left" as const,
          alignItems: "flex-start" as const,
          padding: "40px 5%",
          maxWidth: "50%",
        };
      default: // centered
        return {
          textAlign: "center" as const,
          alignItems: "center" as const,
          padding: "40px 20px",
        };
    }
  };

  const variantStyles = getVariantStyles();

  const containerStyle: React.CSSProperties = {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: variantStyles.alignItems,
    justifyContent: "center",
    textAlign: variantStyles.textAlign,
    padding: variantStyles.padding,
    position: "relative",
    overflow: "hidden",
    color: "#ffffff",
    ...(variantStyles.maxWidth ? { maxWidth: variantStyles.maxWidth } : {}),
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
    alignItems: variantStyles.alignItems,
    maxWidth: "900px",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
    fontWeight: 700,
    marginBottom: "20px",
    lineHeight: 1.1,
    textShadow: "0 2px 10px rgba(0,0,0,0.3)",
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
    position: "relative",
  };

  return (
    <div style={containerStyle}>
      {/* Background Layer */}
      <div style={backgroundStyle} />

      {/* Image Edit Button (only in edit mode) */}
      {isEditing && (
        <>
          <style>{`
            .editable-field-light:focus {
              background: rgba(255, 255, 255, 0.1) !important;
              outline: 2px solid rgba(255, 255, 255, 0.5) !important;
            }
            .editable-field-light:hover:not(:focus) {
              background: rgba(255, 255, 255, 0.05);
            }
          `}</style>
          <button
            type="button"
            onClick={() => onImageClick?.("backgroundImage")}
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              width: "44px",
              height: "44px",
              backgroundColor: "white",
              borderRadius: "50%",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              zIndex: 10,
            }}
          >
            <svg
              width="20"
              height="20"
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
        </>
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
                handleTitleChange(e.currentTarget.textContent || "")
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
                handleSubtitleChange(e.currentTarget.textContent || "")
              }
            >
              {subtitle}
            </div>
            {button && (
              <button type="button" onClick={onButtonClick} style={buttonStyle}>
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
              <button type="button" style={buttonStyle} onClick={onButtonClick}>
                {button.label}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
