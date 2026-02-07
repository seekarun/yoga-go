"use client";

import type { CTASection } from "@/types/landing-page";
import type { SectionComponentProps } from "./types";

type CTAProps = SectionComponentProps<CTASection>;

/**
 * CTA (Call to Action) Section Component
 *
 * Prominent action section with heading, subheading, and button.
 */
export default function CTASectionComponent({
  section,
  isEditing = false,
  onUpdate,
  onButtonClick,
}: CTAProps) {
  const { heading, subheading, button, backgroundColor } = section;

  const handleHeadingChange = (newHeading: string) => {
    onUpdate?.({ heading: newHeading });
  };

  const handleSubheadingChange = (newSubheading: string) => {
    onUpdate?.({ subheading: newSubheading });
  };

  const sectionStyle: React.CSSProperties = {
    width: "100%",
    padding: "80px 8%",
    backgroundColor: backgroundColor || "#2563eb",
    textAlign: "center",
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: "800px",
    margin: "0 auto",
  };

  const headingStyle: React.CSSProperties = {
    fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
    fontWeight: 700,
    color: "#ffffff",
    marginBottom: "16px",
  };

  const subheadingStyle: React.CSSProperties = {
    fontSize: "1.2rem",
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: "32px",
    maxWidth: "600px",
    margin: "0 auto 32px",
    lineHeight: 1.6,
  };

  const buttonStyle: React.CSSProperties = {
    padding: "16px 40px",
    fontSize: "1.1rem",
    fontWeight: 600,
    backgroundColor: "#ffffff",
    color: backgroundColor || "#2563eb",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "transform 0.2s, box-shadow 0.2s",
    boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
    position: "relative",
  };

  const editableStyle: React.CSSProperties = isEditing
    ? {
        cursor: "text",
        outline: "none",
        borderRadius: "4px",
        padding: "8px 12px",
        transition: "background 0.2s, border 0.2s",
      }
    : {};

  return (
    <section style={sectionStyle}>
      {isEditing && (
        <style>{`
          .editable-field-light:focus {
            background: rgba(255, 255, 255, 0.15) !important;
            outline: 2px solid rgba(255, 255, 255, 0.5) !important;
          }
          .editable-field-light:hover:not(:focus) {
            background: rgba(255, 255, 255, 0.1);
          }
          .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.2);
          }
        `}</style>
      )}
      <div style={containerStyle}>
        {/* Heading */}
        {isEditing ? (
          <div
            className="editable-field-light"
            contentEditable
            suppressContentEditableWarning
            style={{ ...headingStyle, ...editableStyle }}
            onBlur={(e) =>
              handleHeadingChange(e.currentTarget.textContent || "")
            }
          >
            {heading}
          </div>
        ) : (
          <h2 style={headingStyle}>{heading}</h2>
        )}

        {/* Subheading */}
        {(subheading || isEditing) &&
          (isEditing ? (
            <div
              className="editable-field-light"
              contentEditable
              suppressContentEditableWarning
              style={{ ...subheadingStyle, ...editableStyle }}
              onBlur={(e) =>
                handleSubheadingChange(e.currentTarget.textContent || "")
              }
            >
              {subheading || "Add a compelling message here"}
            </div>
          ) : (
            subheading && <p style={subheadingStyle}>{subheading}</p>
          ))}

        {/* Button */}
        {button && (
          <button
            type="button"
            className="cta-button"
            style={buttonStyle}
            onClick={onButtonClick}
          >
            {button.label}
            {isEditing && (
              <span
                style={{
                  position: "absolute",
                  top: "-8px",
                  right: "-8px",
                  width: "24px",
                  height: "24px",
                  backgroundColor: "#1e40af",
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
            )}
          </button>
        )}
      </div>
    </section>
  );
}
