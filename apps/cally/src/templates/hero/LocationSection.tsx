"use client";

import type { LocationConfig, BrandFont } from "@/types/landing-page";

interface LocationSectionProps {
  location: LocationConfig;
  address?: string;
  isEditing?: boolean;
  variant?: "light" | "dark" | "gray";
  brandFonts?: { headerFont?: BrandFont; bodyFont?: BrandFont };
  onHeadingChange?: (heading: string) => void;
  onSubheadingChange?: (subheading: string) => void;
}

/**
 * Shared Location Section Component
 * Displays a Google Maps embed with the tenant's business address
 */
export default function LocationSection({
  location,
  address,
  isEditing = false,
  variant = "light",
  brandFonts,
  onHeadingChange,
  onSubheadingChange,
}: LocationSectionProps) {
  const colors = {
    light: {
      bg: "#ffffff",
      heading: "#1a1a1a",
      subheading: "#6b7280",
      placeholderBg: "#f3f4f6",
      placeholderText: "#9ca3af",
      buttonBg: "var(--brand-500, #667eea)",
      buttonText: "#ffffff",
    },
    dark: {
      bg: "#1a1a1a",
      heading: "#ffffff",
      subheading: "#9ca3af",
      placeholderBg: "#262626",
      placeholderText: "#6b7280",
      buttonBg: "var(--brand-500, #667eea)",
      buttonText: "#ffffff",
    },
    gray: {
      bg: "#f3f4f6",
      heading: "#1a1a1a",
      subheading: "#6b7280",
      placeholderBg: "#e5e7eb",
      placeholderText: "#9ca3af",
      buttonBg: "var(--brand-500, #667eea)",
      buttonText: "#ffffff",
    },
  };

  const theme = colors[variant];

  const sectionStyle: React.CSSProperties = {
    width: "100%",
    padding: "80px 8%",
    backgroundColor: theme.bg,
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: "1440px",
    margin: "0 auto",
  };

  const headerStyle: React.CSSProperties = {
    textAlign: "center",
    marginBottom: "48px",
  };

  const headingStyle: React.CSSProperties = {
    fontFamily: brandFonts?.headerFont?.family || undefined,
    fontSize: brandFonts?.headerFont?.size
      ? `${brandFonts.headerFont.size}px`
      : "clamp(1.75rem, 3vw, 2.5rem)",
    fontWeight: 700,
    color: theme.heading,
    marginBottom: "12px",
  };

  const subheadingStyle: React.CSSProperties = {
    fontFamily: brandFonts?.bodyFont?.family || undefined,
    fontSize: brandFonts?.bodyFont?.size
      ? `${brandFonts.bodyFont.size}px`
      : "1.1rem",
    color: theme.subheading,
    maxWidth: "600px",
    margin: "0 auto",
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

  const mapContainerStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: "12px",
    overflow: "hidden",
    aspectRatio: "16/9",
    maxHeight: "450px",
  };

  const iframeStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    border: 0,
  };

  const placeholderStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: "12px",
    aspectRatio: "16/9",
    maxHeight: "450px",
    backgroundColor: theme.placeholderBg,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
  };

  const buttonContainerStyle: React.CSSProperties = {
    textAlign: "center",
    marginTop: "24px",
  };

  const buttonStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 24px",
    backgroundColor: theme.buttonBg,
    color: theme.buttonText,
    borderRadius: "8px",
    border: "none",
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "none",
    transition: "opacity 0.2s",
  };

  const mapSrc = address
    ? `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed`
    : "";

  const directionsUrl = address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
    : "";

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
                {location.heading || "Visit Us"}
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
                {location.subheading || "Find us at our location"}
              </div>
            </>
          ) : (
            <>
              <h2 style={headingStyle}>{location.heading || "Visit Us"}</h2>
              <p style={subheadingStyle}>
                {location.subheading || "Find us at our location"}
              </p>
            </>
          )}
        </div>

        {/* Map or Placeholder */}
        {address ? (
          <>
            <div style={mapContainerStyle}>
              <iframe
                src={mapSrc}
                style={iframeStyle}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Business location map"
              />
            </div>
            <div style={buttonContainerStyle}>
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={buttonStyle}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                Get Directions
              </a>
            </div>
          </>
        ) : (
          <div style={placeholderStyle}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke={theme.placeholderText}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <p
              style={{
                color: theme.placeholderText,
                fontSize: "0.95rem",
                textAlign: "center",
                maxWidth: "300px",
              }}
            >
              Set your address in Preferences to display the map
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
