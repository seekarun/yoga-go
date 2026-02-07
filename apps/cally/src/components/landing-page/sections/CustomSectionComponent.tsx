"use client";

import type { CustomSection } from "@/types/landing-page";
import type { SectionComponentProps } from "./types";

type CustomProps = SectionComponentProps<CustomSection>;

/**
 * Custom Section Component
 *
 * Flexible content block for arbitrary content.
 */
export default function CustomSectionComponent({
  section,
  isEditing = false,
  onUpdate,
}: CustomProps) {
  const { heading, content, backgroundColor, textColor } = section;

  const handleHeadingChange = (newHeading: string) => {
    onUpdate?.({ heading: newHeading });
  };

  const handleContentChange = (newContent: string) => {
    onUpdate?.({ content: newContent });
  };

  const sectionStyle: React.CSSProperties = {
    width: "100%",
    padding: "80px 8%",
    backgroundColor: backgroundColor || "#ffffff",
    color: textColor || "#1a1a1a",
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: "900px",
    margin: "0 auto",
  };

  const headingStyle: React.CSSProperties = {
    fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
    fontWeight: 700,
    marginBottom: "24px",
    textAlign: "center",
  };

  const contentStyle: React.CSSProperties = {
    fontSize: "1.1rem",
    lineHeight: 1.8,
    whiteSpace: "pre-wrap",
  };

  const editableStyle: React.CSSProperties = isEditing
    ? {
        cursor: "text",
        outline: "none",
        borderRadius: "4px",
        padding: "8px 12px",
        transition: "background 0.2s, outline 0.2s",
      }
    : {};

  const isDarkBg =
    backgroundColor &&
    (backgroundColor.startsWith("#1") ||
      backgroundColor.startsWith("#2") ||
      backgroundColor.startsWith("#3") ||
      backgroundColor.includes("dark"));

  const editableClass = isDarkBg
    ? "editable-field-light"
    : "editable-field-dark";

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
            background: rgba(255, 255, 255, 0.15) !important;
            outline: 2px solid rgba(255, 255, 255, 0.5) !important;
          }
          .editable-field-light:hover:not(:focus) {
            background: rgba(255, 255, 255, 0.1);
          }
        `}</style>
      )}
      <div style={containerStyle}>
        {/* Heading */}
        {(heading || isEditing) &&
          (isEditing ? (
            <div
              className={editableClass}
              contentEditable
              suppressContentEditableWarning
              style={{ ...headingStyle, ...editableStyle }}
              onBlur={(e) =>
                handleHeadingChange(e.currentTarget.textContent || "")
              }
            >
              {heading || "Custom Section"}
            </div>
          ) : (
            heading && <h2 style={headingStyle}>{heading}</h2>
          ))}

        {/* Content */}
        {isEditing ? (
          <div
            className={editableClass}
            contentEditable
            suppressContentEditableWarning
            style={{ ...contentStyle, ...editableStyle }}
            onBlur={(e) =>
              handleContentChange(e.currentTarget.textContent || "")
            }
          >
            {content ||
              "Add your custom content here. This can be any text you want."}
          </div>
        ) : (
          <div style={contentStyle}>{content}</div>
        )}

        {isEditing && (
          <div
            style={{
              marginTop: "24px",
              padding: "16px",
              backgroundColor: "rgba(0,0,0,0.05)",
              borderRadius: "8px",
              fontSize: "0.875rem",
              color: "#6b7280",
            }}
          >
            <strong>Tip:</strong> This is a flexible content block. You can add
            any text content here. Use the AI assistant to generate rich content
            for this section.
          </div>
        )}
      </div>
    </section>
  );
}
