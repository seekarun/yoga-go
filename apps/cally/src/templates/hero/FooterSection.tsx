"use client";

import type { FooterConfig } from "@/types/landing-page";

interface FooterSectionProps {
  footer: FooterConfig;
  isEditing?: boolean;
  onTextChange?: (text: string) => void;
  onLinkChange?: (index: number, field: "label" | "url", value: string) => void;
  onAddLink?: () => void;
  onRemoveLink?: (index: number) => void;
}

export default function FooterSection({
  footer,
  isEditing = false,
  onTextChange,
  onLinkChange,
  onAddLink,
  onRemoveLink,
}: FooterSectionProps) {
  const sectionStyle: React.CSSProperties = {
    width: "100%",
    padding: "40px 8%",
    backgroundColor: "#1a1a1a",
    color: "#9ca3af",
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: "1200px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px",
  };

  const linksRowStyle: React.CSSProperties = {
    display: "flex",
    gap: "24px",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
  };

  const linkStyle: React.CSSProperties = {
    color: "var(--brand-300, #d1d5db)",
    fontSize: "0.85rem",
    textDecoration: "none",
    transition: "color 0.2s",
  };

  const textStyle: React.CSSProperties = {
    fontSize: "0.85rem",
    color: "#6b7280",
    textAlign: "center",
  };

  const poweredByStyle: React.CSSProperties = {
    fontSize: "0.75rem",
    color: "#4b5563",
    marginTop: "8px",
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

  const linkEditContainerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "4px 8px",
    borderRadius: "4px",
    border: "1px solid #374151",
  };

  return (
    <footer style={sectionStyle}>
      {isEditing && (
        <style>{`
          .editable-footer:focus {
            background: rgba(255, 255, 255, 0.1) !important;
            outline: 2px solid rgba(255, 255, 255, 0.5) !important;
          }
          .editable-footer:hover:not(:focus) {
            background: rgba(255, 255, 255, 0.05);
          }
          .footer-link-input {
            background: transparent;
            border: none;
            color: #d1d5db;
            font-size: 0.85rem;
            outline: none;
            padding: 2px 4px;
            width: 100px;
          }
          .footer-link-input:focus {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 2px;
          }
        `}</style>
      )}
      <div style={containerStyle}>
        {/* Links */}
        {((footer.links && footer.links.length > 0) || isEditing) && (
          <div style={linksRowStyle}>
            {(footer.links || []).map((link, index) =>
              isEditing ? (
                <div key={index} style={linkEditContainerStyle}>
                  <input
                    className="footer-link-input"
                    defaultValue={link.label}
                    placeholder="Label"
                    onBlur={(e) =>
                      onLinkChange?.(index, "label", e.target.value)
                    }
                  />
                  <span style={{ color: "#4b5563" }}>|</span>
                  <input
                    className="footer-link-input"
                    defaultValue={link.url}
                    placeholder="URL"
                    style={{ width: "140px" }}
                    onBlur={(e) => onLinkChange?.(index, "url", e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveLink?.(index)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "2px",
                      display: "flex",
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2"
                    >
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={linkStyle}
                >
                  {link.label}
                </a>
              ),
            )}
            {isEditing && (footer.links || []).length < 6 && (
              <button
                type="button"
                onClick={onAddLink}
                style={{
                  background: "none",
                  border: "1px dashed #4b5563",
                  borderRadius: "4px",
                  color: "#6b7280",
                  fontSize: "0.8rem",
                  padding: "4px 12px",
                  cursor: "pointer",
                }}
              >
                + Add Link
              </button>
            )}
          </div>
        )}

        {/* Footer Text */}
        {isEditing ? (
          <div
            className="editable-footer"
            contentEditable
            suppressContentEditableWarning
            style={{ ...textStyle, ...editableStyle, color: "#9ca3af" }}
            onBlur={(e) => onTextChange?.(e.currentTarget.textContent || "")}
          >
            {footer.text || "\u00a9 2026 All rights reserved."}
          </div>
        ) : (
          <p style={textStyle}>
            {footer.text || "\u00a9 2026 All rights reserved."}
          </p>
        )}

        {/* Powered By */}
        {footer.showPoweredBy !== false && (
          <div style={poweredByStyle}>Powered by Cally</div>
        )}
      </div>
    </footer>
  );
}
