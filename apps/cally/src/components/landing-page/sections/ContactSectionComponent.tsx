// @ts-nocheck — WIP: depends on LandingPageConfig V2 types not yet implemented
"use client";

import type { ContactSection } from "@/types/landing-page";
import type { SectionComponentProps } from "./types";

type ContactProps = SectionComponentProps<ContactSection>;

/**
 * Contact Section Component
 *
 * Contact information and optional form.
 */
export default function ContactSectionComponent({
  section,
  isEditing = false,
  onUpdate,
}: ContactProps) {
  const {
    heading,
    subheading,
    email,
    phone,
    address,
    showForm = true,
    formFields = ["name", "email", "message"],
  } = section;

  const handleHeadingChange = (newHeading: string) => {
    onUpdate?.({ heading: newHeading });
  };

  const handleSubheadingChange = (newSubheading: string) => {
    onUpdate?.({ subheading: newSubheading });
  };

  const handleFieldChange = (field: keyof ContactSection, value: string) => {
    onUpdate?.({ [field]: value });
  };

  const sectionStyle: React.CSSProperties = {
    width: "100%",
    padding: "80px 8%",
    backgroundColor: "#f9fafb",
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: "1000px",
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

  const contentStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: showForm ? "1fr 1fr" : "1fr",
    gap: "48px",
    alignItems: "start",
  };

  const infoContainerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  };

  const infoItemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    gap: "16px",
  };

  const iconContainerStyle: React.CSSProperties = {
    width: "48px",
    height: "48px",
    backgroundColor: "#2563eb",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };

  const infoTextStyle: React.CSSProperties = {
    fontSize: "1rem",
    color: "#374151",
    lineHeight: 1.6,
  };

  const infoLabelStyle: React.CSSProperties = {
    fontSize: "0.875rem",
    color: "#6b7280",
    marginBottom: "4px",
  };

  const formContainerStyle: React.CSSProperties = {
    backgroundColor: "#ffffff",
    padding: "32px",
    borderRadius: "16px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "14px 16px",
    fontSize: "1rem",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    marginBottom: "16px",
    outline: "none",
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: "120px",
    resize: "vertical",
  };

  const submitButtonStyle: React.CSSProperties = {
    width: "100%",
    padding: "14px 24px",
    fontSize: "1rem",
    fontWeight: 600,
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "background 0.2s",
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
          @media (max-width: 768px) {
            .contact-content {
              grid-template-columns: 1fr !important;
            }
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
                {heading || "Get in Touch"}
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
                {subheading || "I'd love to hear from you"}
              </div>
            </>
          ) : (
            <>
              <h2 style={headingStyle}>{heading || "Get in Touch"}</h2>
              <p style={subheadingStyle}>
                {subheading || "I'd love to hear from you"}
              </p>
            </>
          )}
        </div>

        {/* Content */}
        <div className="contact-content" style={contentStyle}>
          {/* Contact Info */}
          <div style={infoContainerStyle}>
            {/* Email */}
            {(email || isEditing) && (
              <div style={infoItemStyle}>
                <div style={iconContainerStyle}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <div>
                  <div style={infoLabelStyle}>Email</div>
                  {isEditing ? (
                    <div
                      className="editable-field-dark"
                      contentEditable
                      suppressContentEditableWarning
                      style={{ ...infoTextStyle, ...editableStyle }}
                      onBlur={(e) =>
                        handleFieldChange(
                          "email",
                          e.currentTarget.textContent || "",
                        )
                      }
                    >
                      {email || "your@email.com"}
                    </div>
                  ) : (
                    <a
                      href={`mailto:${email}`}
                      style={{
                        ...infoTextStyle,
                        color: "#2563eb",
                        textDecoration: "none",
                      }}
                    >
                      {email}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Phone */}
            {(phone || isEditing) && (
              <div style={infoItemStyle}>
                <div style={iconContainerStyle}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                  >
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                <div>
                  <div style={infoLabelStyle}>Phone</div>
                  {isEditing ? (
                    <div
                      className="editable-field-dark"
                      contentEditable
                      suppressContentEditableWarning
                      style={{ ...infoTextStyle, ...editableStyle }}
                      onBlur={(e) =>
                        handleFieldChange(
                          "phone",
                          e.currentTarget.textContent || "",
                        )
                      }
                    >
                      {phone || "+1 (555) 000-0000"}
                    </div>
                  ) : (
                    <a
                      href={`tel:${phone}`}
                      style={{
                        ...infoTextStyle,
                        color: "#2563eb",
                        textDecoration: "none",
                      }}
                    >
                      {phone}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Address */}
            {(address || isEditing) && (
              <div style={infoItemStyle}>
                <div style={iconContainerStyle}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div>
                  <div style={infoLabelStyle}>Address</div>
                  {isEditing ? (
                    <div
                      className="editable-field-dark"
                      contentEditable
                      suppressContentEditableWarning
                      style={{ ...infoTextStyle, ...editableStyle }}
                      onBlur={(e) =>
                        handleFieldChange(
                          "address",
                          e.currentTarget.textContent || "",
                        )
                      }
                    >
                      {address || "123 Main St, City, Country"}
                    </div>
                  ) : (
                    <div style={infoTextStyle}>{address}</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Contact Form */}
          {showForm && (
            <div style={formContainerStyle}>
              {formFields.includes("name") && (
                <input
                  type="text"
                  placeholder="Your Name"
                  style={inputStyle}
                  disabled={isEditing}
                />
              )}
              {formFields.includes("email") && (
                <input
                  type="email"
                  placeholder="Your Email"
                  style={inputStyle}
                  disabled={isEditing}
                />
              )}
              {formFields.includes("phone") && (
                <input
                  type="tel"
                  placeholder="Your Phone"
                  style={inputStyle}
                  disabled={isEditing}
                />
              )}
              {formFields.includes("message") && (
                <textarea
                  placeholder="Your Message"
                  style={textareaStyle}
                  disabled={isEditing}
                />
              )}
              <button
                type="button"
                style={submitButtonStyle}
                disabled={isEditing}
              >
                Send Message
              </button>
              {isEditing && (
                <p
                  style={{
                    marginTop: "12px",
                    fontSize: "0.875rem",
                    color: "#9ca3af",
                    textAlign: "center",
                  }}
                >
                  Form preview - submissions are disabled in edit mode
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
