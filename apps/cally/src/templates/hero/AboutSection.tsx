"use client";

import type { AboutConfig } from "@/types/landing-page";

interface AboutSectionProps {
  about: AboutConfig;
  isEditing?: boolean;
  variant?: "light" | "dark" | "gray";
  onParagraphChange?: (paragraph: string) => void;
  onImageClick?: () => void;
}

export default function AboutSection({
  about,
  isEditing = false,
  variant = "light",
  onParagraphChange,
  onImageClick,
}: AboutSectionProps) {
  const colors = {
    light: {
      bg: "#ffffff",
      text: "#4b5563",
      imageBg: "#f3f4f6",
      imagePlaceholder: "#9ca3af",
    },
    dark: {
      bg: "#111111",
      text: "#cccccc",
      imageBg: "#222222",
      imagePlaceholder: "#666666",
    },
    gray: {
      bg: "#fafafa",
      text: "#666666",
      imageBg: "#f3f4f6",
      imagePlaceholder: "#9ca3af",
    },
  };

  const theme = colors[variant];

  const sectionStyle: React.CSSProperties = {
    width: "100%",
    padding: "80px 20px",
    backgroundColor: theme.bg,
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: "1000px",
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    gap: "60px",
    flexWrap: "wrap",
    justifyContent: "center",
  };

  const imageContainerStyle: React.CSSProperties = {
    position: "relative",
    width: "320px",
    height: "320px",
    borderRadius: "16px",
    overflow: "hidden",
    flexShrink: 0,
    backgroundColor: theme.imageBg,
  };

  const imageStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    backgroundImage: about.image ? `url(${about.image})` : undefined,
    backgroundPosition: about.imagePosition || "50% 50%",
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
    backgroundColor: about.image ? undefined : theme.imageBg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transform: about.image
      ? `scale(${(about.imageZoom || 100) / 100})`
      : undefined,
  };

  const textStyle: React.CSSProperties = {
    flex: 1,
    minWidth: "280px",
    maxWidth: "500px",
  };

  const paragraphStyle: React.CSSProperties = {
    fontSize: "1.1rem",
    lineHeight: 1.8,
    color: theme.text,
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

  const editableClass =
    variant === "dark" ? "editable-field-light" : "editable-field-dark";

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
          .editable-field-light:focus {
            background: rgba(255, 255, 255, 0.1) !important;
            outline: 2px solid rgba(255, 255, 255, 0.5) !important;
          }
          .editable-field-light:hover:not(:focus) {
            background: rgba(255, 255, 255, 0.05);
          }
        `}</style>
      )}
      <div style={containerStyle}>
        {/* About Image */}
        <div style={imageContainerStyle}>
          <div style={imageStyle}>
            {!about.image && (
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke={theme.imagePlaceholder}
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
              onClick={onImageClick}
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
        <div style={textStyle}>
          {isEditing ? (
            <div
              className={editableClass}
              contentEditable
              suppressContentEditableWarning
              style={{ ...paragraphStyle, ...editableStyle }}
              onBlur={(e) =>
                onParagraphChange?.(e.currentTarget.textContent || "")
              }
            >
              {about.paragraph}
            </div>
          ) : (
            <p style={paragraphStyle}>{about.paragraph}</p>
          )}
        </div>
      </div>
    </section>
  );
}
