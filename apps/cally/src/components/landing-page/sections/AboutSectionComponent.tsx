// @ts-nocheck — WIP: depends on LandingPageConfig V2 types not yet implemented
"use client";

import type { AboutSection } from "@/types/landing-page";
import type { SectionComponentProps } from "./types";

type AboutProps = SectionComponentProps<AboutSection>;

/**
 * About Section Component
 *
 * Image and paragraph about the business/person.
 * Supports left or right image layout.
 */
export default function AboutSectionComponent({
  section,
  isEditing = false,
  onUpdate,
  onImageClick,
}: AboutProps) {
  const {
    heading,
    paragraph,
    image,
    imagePosition,
    imageZoom,
    layout = "image-left",
  } = section;

  const handleHeadingChange = (newHeading: string) => {
    onUpdate?.({ heading: newHeading });
  };

  const handleParagraphChange = (newParagraph: string) => {
    onUpdate?.({ paragraph: newParagraph });
  };

  const sectionStyle: React.CSSProperties = {
    width: "100%",
    padding: "80px 20px",
    backgroundColor: "#ffffff",
    color: "#1a1a1a",
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: "1000px",
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    gap: "60px",
    flexWrap: "wrap",
    justifyContent: "center",
    flexDirection: layout === "image-right" ? "row-reverse" : "row",
  };

  const imageContainerStyle: React.CSSProperties = {
    position: "relative",
    width: "320px",
    height: "320px",
    borderRadius: "16px",
    overflow: "hidden",
    flexShrink: 0,
    backgroundColor: "#f3f4f6",
  };

  const imageStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    backgroundImage: image ? `url(${image})` : undefined,
    backgroundPosition: imagePosition || "50% 50%",
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
    backgroundColor: image ? undefined : "#e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transform: image ? `scale(${(imageZoom || 100) / 100})` : undefined,
  };

  const textContainerStyle: React.CSSProperties = {
    flex: 1,
    minWidth: "280px",
    maxWidth: "500px",
  };

  const headingStyle: React.CSSProperties = {
    fontSize: "clamp(1.5rem, 3vw, 2rem)",
    fontWeight: 700,
    color: "#1a1a1a",
    marginBottom: "20px",
  };

  const paragraphStyle: React.CSSProperties = {
    fontSize: "1.1rem",
    lineHeight: 1.8,
    color: "#4b5563",
    textAlign: "left",
  };

  const editableStyle: React.CSSProperties = isEditing
    ? {
        cursor: "text",
        outline: "none",
        borderRadius: "4px",
        padding: "12px",
        transition: "background 0.2s, outline 0.2s",
      }
    : {};

  return (
    <section style={sectionStyle}>
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
      <div style={containerStyle}>
        {/* Image */}
        <div style={imageContainerStyle}>
          <div style={imageStyle}>
            {!image && (
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
              onClick={() => onImageClick?.("image")}
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

        {/* Text Content */}
        <div style={textContainerStyle}>
          {isEditing ? (
            <>
              {heading !== undefined && (
                <div
                  className="editable-field-dark"
                  contentEditable
                  suppressContentEditableWarning
                  style={{ ...headingStyle, ...editableStyle }}
                  onBlur={(e) =>
                    handleHeadingChange(e.currentTarget.textContent || "")
                  }
                >
                  {heading || "About Me"}
                </div>
              )}
              <div
                className="editable-field-dark"
                contentEditable
                suppressContentEditableWarning
                style={{ ...paragraphStyle, ...editableStyle }}
                onBlur={(e) =>
                  handleParagraphChange(e.currentTarget.textContent || "")
                }
              >
                {paragraph}
              </div>
            </>
          ) : (
            <>
              {heading && <h2 style={headingStyle}>{heading}</h2>}
              <p style={paragraphStyle}>{paragraph}</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
