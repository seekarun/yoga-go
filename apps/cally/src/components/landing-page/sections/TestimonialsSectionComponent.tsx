"use client";

import type { TestimonialsSection, Testimonial } from "@/types/landing-page";
import type { SectionComponentProps } from "./types";

type TestimonialsProps = SectionComponentProps<TestimonialsSection>;

/**
 * Testimonials Section Component
 *
 * Customer quotes and reviews with optional ratings.
 * Supports grid, carousel, or single layouts.
 */
export default function TestimonialsSectionComponent({
  section,
  isEditing = false,
  onUpdate,
  onImageClick,
}: TestimonialsProps) {
  const { heading, subheading, testimonials, layout = "grid" } = section;

  const handleHeadingChange = (newHeading: string) => {
    onUpdate?.({ heading: newHeading });
  };

  const handleSubheadingChange = (newSubheading: string) => {
    onUpdate?.({ subheading: newSubheading });
  };

  const handleTestimonialChange = (
    id: string,
    field: keyof Testimonial,
    value: string | number,
  ) => {
    const updated = testimonials.map((t) =>
      t.id === id ? { ...t, [field]: value } : t,
    );
    onUpdate?.({ testimonials: updated });
  };

  const handleAddTestimonial = () => {
    const newTestimonial: Testimonial = {
      id: `testimonial-${Date.now()}`,
      quote: "Add your testimonial quote here.",
      authorName: "Client Name",
      authorTitle: "Title",
      rating: 5,
    };
    onUpdate?.({ testimonials: [...testimonials, newTestimonial] });
  };

  const handleRemoveTestimonial = (id: string) => {
    if (testimonials.length <= 1) return;
    onUpdate?.({ testimonials: testimonials.filter((t) => t.id !== id) });
  };

  const sectionStyle: React.CSSProperties = {
    width: "100%",
    padding: "80px 8%",
    backgroundColor: "#f9fafb",
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
    color: "#1a1a1a",
    marginBottom: "12px",
  };

  const subheadingStyle: React.CSSProperties = {
    fontSize: "1.1rem",
    color: "#6b7280",
    maxWidth: "600px",
    margin: "0 auto",
  };

  const gridStyle: React.CSSProperties = {
    display: layout === "single" ? "flex" : "grid",
    gridTemplateColumns:
      layout === "grid" ? "repeat(auto-fit, minmax(300px, 1fr))" : undefined,
    gap: "24px",
    justifyContent: layout === "single" ? "center" : undefined,
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    padding: "32px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    maxWidth: layout === "single" ? "600px" : undefined,
    width: layout === "single" ? "100%" : undefined,
  };

  const quoteStyle: React.CSSProperties = {
    fontSize: layout === "single" ? "1.25rem" : "1rem",
    lineHeight: 1.7,
    color: "#374151",
    marginBottom: "24px",
    fontStyle: "italic",
  };

  const authorStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  };

  const avatarStyle: React.CSSProperties = {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    backgroundColor: "#e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  };

  const authorNameStyle: React.CSSProperties = {
    fontWeight: 600,
    color: "#1a1a1a",
    marginBottom: "2px",
  };

  const authorTitleStyle: React.CSSProperties = {
    fontSize: "0.875rem",
    color: "#6b7280",
  };

  const starsStyle: React.CSSProperties = {
    marginBottom: "16px",
    display: "flex",
    gap: "4px",
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

  const addCardStyle: React.CSSProperties = {
    backgroundColor: "transparent",
    borderRadius: "16px",
    border: "2px dashed #e5e7eb",
    minHeight: "200px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "border-color 0.2s, background 0.2s",
  };

  const renderStars = (rating: number = 5) => {
    return Array.from({ length: 5 }, (_, i) => (
      <svg
        key={i}
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={i < rating ? "#fbbf24" : "none"}
        stroke="#fbbf24"
        strokeWidth="2"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ));
  };

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
          .testimonial-card:hover .delete-btn {
            opacity: 1;
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
                className="editable-field-dark"
                contentEditable
                suppressContentEditableWarning
                style={{
                  ...headingStyle,
                  ...editableStyle,
                  display: "inline-block",
                }}
                onBlur={(e) =>
                  handleHeadingChange(e.currentTarget.textContent || "")
                }
              >
                {heading || "What Clients Say"}
              </div>
              <div
                className="editable-field-dark"
                contentEditable
                suppressContentEditableWarning
                style={{ ...subheadingStyle, ...editableStyle }}
                onBlur={(e) =>
                  handleSubheadingChange(e.currentTarget.textContent || "")
                }
              >
                {subheading || "Hear from people who've worked with me"}
              </div>
            </>
          ) : (
            <>
              <h2 style={headingStyle}>{heading || "What Clients Say"}</h2>
              <p style={subheadingStyle}>
                {subheading || "Hear from people who've worked with me"}
              </p>
            </>
          )}
        </div>

        {/* Testimonials Grid */}
        <div style={gridStyle}>
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="testimonial-card"
              style={{ ...cardStyle, position: "relative" }}
            >
              {isEditing && testimonials.length > 1 && (
                <button
                  type="button"
                  className="delete-btn"
                  onClick={() => handleRemoveTestimonial(testimonial.id)}
                  style={{
                    position: "absolute",
                    top: "12px",
                    right: "12px",
                    width: "28px",
                    height: "28px",
                    backgroundColor: "#ef4444",
                    borderRadius: "50%",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: 0,
                    transition: "opacity 0.2s",
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

              {/* Rating Stars */}
              {testimonial.rating && (
                <div style={starsStyle}>{renderStars(testimonial.rating)}</div>
              )}

              {/* Quote */}
              {isEditing ? (
                <div
                  className="editable-field-dark"
                  contentEditable
                  suppressContentEditableWarning
                  style={{ ...quoteStyle, ...editableStyle }}
                  onBlur={(e) =>
                    handleTestimonialChange(
                      testimonial.id,
                      "quote",
                      e.currentTarget.textContent || "",
                    )
                  }
                >
                  &ldquo;{testimonial.quote}&rdquo;
                </div>
              ) : (
                <p style={quoteStyle}>&ldquo;{testimonial.quote}&rdquo;</p>
              )}

              {/* Author */}
              <div style={authorStyle}>
                <div style={avatarStyle}>
                  {testimonial.authorImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={testimonial.authorImage}
                      alt={testimonial.authorName}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#9ca3af"
                      strokeWidth="1.5"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  )}
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() =>
                        onImageClick?.(`testimonial-${testimonial.id}`)
                      }
                      style={{
                        position: "absolute",
                        width: "100%",
                        height: "100%",
                        backgroundColor: "rgba(0,0,0,0.4)",
                        border: "none",
                        borderRadius: "50%",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: 0,
                        transition: "opacity 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        ((e.target as HTMLElement).style.opacity = "1")
                      }
                      onMouseLeave={(e) =>
                        ((e.target as HTMLElement).style.opacity = "0")
                      }
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                      >
                        <rect
                          x="3"
                          y="3"
                          width="18"
                          height="18"
                          rx="2"
                          ry="2"
                        />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </button>
                  )}
                </div>
                <div>
                  {isEditing ? (
                    <>
                      <div
                        className="editable-field-dark"
                        contentEditable
                        suppressContentEditableWarning
                        style={{ ...authorNameStyle, ...editableStyle }}
                        onBlur={(e) =>
                          handleTestimonialChange(
                            testimonial.id,
                            "authorName",
                            e.currentTarget.textContent || "",
                          )
                        }
                      >
                        {testimonial.authorName}
                      </div>
                      <div
                        className="editable-field-dark"
                        contentEditable
                        suppressContentEditableWarning
                        style={{ ...authorTitleStyle, ...editableStyle }}
                        onBlur={(e) =>
                          handleTestimonialChange(
                            testimonial.id,
                            "authorTitle",
                            e.currentTarget.textContent || "",
                          )
                        }
                      >
                        {testimonial.authorTitle || "Client"}
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={authorNameStyle}>
                        {testimonial.authorName}
                      </div>
                      <div style={authorTitleStyle}>
                        {testimonial.authorTitle || "Client"}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Add Testimonial Button */}
          {isEditing && testimonials.length < 6 && (
            <button
              type="button"
              className="add-testimonial-btn"
              style={addCardStyle}
              onClick={handleAddTestimonial}
            >
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#9ca3af"
                strokeWidth="1.5"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v8M8 12h8" />
              </svg>
              <span
                style={{
                  marginTop: "12px",
                  color: "#6b7280",
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
