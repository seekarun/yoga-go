"use client";

import type { TestimonialsConfig } from "@/types/landing-page";

interface TestimonialsSectionProps {
  testimonials: TestimonialsConfig;
  isEditing?: boolean;
  variant?: "light" | "dark" | "gray";
  onHeadingChange?: (heading: string) => void;
  onSubheadingChange?: (subheading: string) => void;
  onTestimonialChange?: (
    testimonialId: string,
    field: "quote" | "authorName" | "authorTitle",
    value: string,
  ) => void;
  onAddTestimonial?: () => void;
  onRemoveTestimonial?: (testimonialId: string) => void;
}

export default function TestimonialsSection({
  testimonials,
  isEditing = false,
  variant = "light",
  onHeadingChange,
  onSubheadingChange,
  onTestimonialChange,
  onAddTestimonial,
  onRemoveTestimonial,
}: TestimonialsSectionProps) {
  const colors = {
    light: {
      bg: "#ffffff",
      heading: "#1a1a1a",
      subheading: "#6b7280",
      cardBg: "#f9fafb",
      cardBorder: "#e5e7eb",
      quote: "#374151",
      authorName: "#1a1a1a",
      authorTitle: "#6b7280",
      star: "var(--brand-500, #f59e0b)",
      starEmpty: "#d1d5db",
    },
    dark: {
      bg: "#1a1a1a",
      heading: "#ffffff",
      subheading: "#9ca3af",
      cardBg: "#262626",
      cardBorder: "#374151",
      quote: "#d1d5db",
      authorName: "#ffffff",
      authorTitle: "#9ca3af",
      star: "var(--brand-500, #f59e0b)",
      starEmpty: "#4b5563",
    },
    gray: {
      bg: "#f3f4f6",
      heading: "#1a1a1a",
      subheading: "#6b7280",
      cardBg: "#ffffff",
      cardBorder: "#e5e7eb",
      quote: "#374151",
      authorName: "#1a1a1a",
      authorTitle: "#6b7280",
      star: "var(--brand-500, #f59e0b)",
      starEmpty: "#d1d5db",
    },
  };

  const theme = colors[variant];

  const sectionStyle: React.CSSProperties = {
    width: "100%",
    padding: "80px 8%",
    backgroundColor: theme.bg,
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: "1200px",
    margin: "0 auto",
  };

  const headerStyle: React.CSSProperties = {
    textAlign: "center",
    marginBottom: "48px",
  };

  const headingStyle: React.CSSProperties = {
    fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
    fontWeight: 700,
    color: theme.heading,
    marginBottom: "12px",
  };

  const subheadingStyle: React.CSSProperties = {
    fontSize: "1.1rem",
    color: theme.subheading,
    maxWidth: "600px",
    margin: "0 auto",
  };

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "24px",
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: theme.cardBg,
    borderRadius: "12px",
    padding: "32px",
    border: `1px solid ${theme.cardBorder}`,
    position: "relative",
  };

  const quoteStyle: React.CSSProperties = {
    fontSize: "1rem",
    color: theme.quote,
    lineHeight: 1.7,
    marginBottom: "20px",
    fontStyle: "italic",
  };

  const authorNameStyle: React.CSSProperties = {
    fontSize: "0.95rem",
    fontWeight: 600,
    color: theme.authorName,
  };

  const authorTitleStyle: React.CSSProperties = {
    fontSize: "0.85rem",
    color: theme.authorTitle,
    marginTop: "2px",
  };

  const editableStyle: React.CSSProperties = isEditing
    ? {
        cursor: "text",
        outline: "none",
        borderRadius: "4px",
        padding: "4px 8px",
        transition: "background 0.2s, outline 0.2s",
      }
    : {};

  const editableClass =
    variant === "dark" ? "editable-field-light" : "editable-field-dark";

  const addCardStyle: React.CSSProperties = {
    backgroundColor: "transparent",
    borderRadius: "12px",
    border: `2px dashed ${theme.cardBorder}`,
    minHeight: "200px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "border-color 0.2s, background 0.2s",
  };

  const renderStars = (rating: number = 5) => (
    <div style={{ display: "flex", gap: "2px", marginBottom: "16px" }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={star <= rating ? theme.star : theme.starEmpty}
          stroke="none"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );

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
          .add-testimonial-btn:hover {
            border-color: #9ca3af;
            background: rgba(0, 0, 0, 0.02);
          }
        `}</style>
      )}
      <div style={containerStyle}>
        {/* Header */}
        <div style={headerStyle}>
          {isEditing ? (
            <>
              <div
                className={editableClass}
                contentEditable
                suppressContentEditableWarning
                style={{
                  ...headingStyle,
                  ...editableStyle,
                  display: "inline-block",
                }}
                onBlur={(e) =>
                  onHeadingChange?.(e.currentTarget.textContent || "")
                }
              >
                {testimonials.heading || "What People Say"}
              </div>
              <div
                className={editableClass}
                contentEditable
                suppressContentEditableWarning
                style={{ ...subheadingStyle, ...editableStyle }}
                onBlur={(e) =>
                  onSubheadingChange?.(e.currentTarget.textContent || "")
                }
              >
                {testimonials.subheading ||
                  "Hear from those who have worked with me"}
              </div>
            </>
          ) : (
            <>
              <h2 style={headingStyle}>
                {testimonials.heading || "What People Say"}
              </h2>
              <p style={subheadingStyle}>
                {testimonials.subheading ||
                  "Hear from those who have worked with me"}
              </p>
            </>
          )}
        </div>

        {/* Testimonials Grid */}
        <div style={gridStyle}>
          {testimonials.testimonials.map((testimonial) => (
            <div key={testimonial.id} style={cardStyle}>
              {/* Remove button */}
              {isEditing && testimonials.testimonials.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemoveTestimonial?.(testimonial.id)}
                  style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    width: "28px",
                    height: "28px",
                    backgroundColor: "#ef4444",
                    borderRadius: "50%",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1,
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              )}

              {renderStars(testimonial.rating)}

              {/* Quote */}
              {isEditing ? (
                <div
                  className={editableClass}
                  contentEditable
                  suppressContentEditableWarning
                  style={{ ...quoteStyle, ...editableStyle }}
                  onBlur={(e) =>
                    onTestimonialChange?.(
                      testimonial.id,
                      "quote",
                      e.currentTarget.textContent || "",
                    )
                  }
                >
                  {testimonial.quote}
                </div>
              ) : (
                <p style={quoteStyle}>&ldquo;{testimonial.quote}&rdquo;</p>
              )}

              {/* Author */}
              {isEditing ? (
                <div>
                  <div
                    className={editableClass}
                    contentEditable
                    suppressContentEditableWarning
                    style={{ ...authorNameStyle, ...editableStyle }}
                    onBlur={(e) =>
                      onTestimonialChange?.(
                        testimonial.id,
                        "authorName",
                        e.currentTarget.textContent || "",
                      )
                    }
                  >
                    {testimonial.authorName}
                  </div>
                  <div
                    className={editableClass}
                    contentEditable
                    suppressContentEditableWarning
                    style={{ ...authorTitleStyle, ...editableStyle }}
                    onBlur={(e) =>
                      onTestimonialChange?.(
                        testimonial.id,
                        "authorTitle",
                        e.currentTarget.textContent || "",
                      )
                    }
                  >
                    {testimonial.authorTitle || "Client"}
                  </div>
                </div>
              ) : (
                <div>
                  <div style={authorNameStyle}>{testimonial.authorName}</div>
                  {testimonial.authorTitle && (
                    <div style={authorTitleStyle}>
                      {testimonial.authorTitle}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Add Testimonial Button */}
          {isEditing && testimonials.testimonials.length < 8 && (
            <button
              type="button"
              className="add-testimonial-btn"
              style={addCardStyle}
              onClick={onAddTestimonial}
            >
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke={theme.subheading}
                strokeWidth="1.5"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v8M8 12h8" />
              </svg>
              <span
                style={{
                  marginTop: "12px",
                  color: theme.subheading,
                  fontSize: "0.9rem",
                }}
              >
                Add Testimonial
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
