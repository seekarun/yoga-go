"use client";

import { useState } from "react";
import type {
  FAQConfig,
  BrandFont,
  SectionStyleOverrides,
  TenantLandingPageData,
} from "@/types/landing-page";
import type { ColorPalette } from "@/lib/colorPalette";
import SectionToolbar from "./SectionToolbar";
import BgDragOverlay from "./BgDragOverlay";
import { useSectionToolbar } from "./useSectionToolbar";

interface FAQSectionProps {
  faq: FAQConfig;
  tenantData?: TenantLandingPageData;
  isEditing?: boolean;
  variant?: "light" | "dark" | "gray";
  brandFonts?: { headerFont?: BrandFont; bodyFont?: BrandFont };
  onHeadingChange?: (heading: string) => void;
  onSubheadingChange?: (subheading: string) => void;
  onItemChange?: (
    itemId: string,
    field: "question" | "answer",
    value: string,
  ) => void;
  onAddItem?: () => void;
  onRemoveItem?: (itemId: string) => void;
  onStyleOverrideChange?: (o: SectionStyleOverrides) => void;
  onBgImageClick?: () => void;
  palette?: ColorPalette;
  customColors?: { name: string; hex: string }[];
  onCustomColorsChange?: (colors: { name: string; hex: string }[]) => void;
}

export default function FAQSection({
  faq,
  isEditing = false,
  variant = "light",
  brandFonts,
  onHeadingChange,
  onSubheadingChange,
  onItemChange,
  onAddItem,
  onRemoveItem,
  onStyleOverrideChange,
  onBgImageClick,
  palette,
  customColors,
  onCustomColorsChange,
}: FAQSectionProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const colors = {
    light: {
      bg: "#ffffff",
      heading: "#1a1a1a",
      subheading: "#6b7280",
      itemBg: "#f9fafb",
      itemBorder: "#e5e7eb",
      question: "#1a1a1a",
      answer: "#4b5563",
      icon: "var(--brand-500, #6b7280)",
    },
    dark: {
      bg: "#1a1a1a",
      heading: "#ffffff",
      subheading: "#9ca3af",
      itemBg: "#262626",
      itemBorder: "#374151",
      question: "#ffffff",
      answer: "#d1d5db",
      icon: "var(--brand-500, #9ca3af)",
    },
    gray: {
      bg: "#f3f4f6",
      heading: "#1a1a1a",
      subheading: "#6b7280",
      itemBg: "#ffffff",
      itemBorder: "#e5e7eb",
      question: "#1a1a1a",
      answer: "#4b5563",
      icon: "var(--brand-500, #6b7280)",
    },
  };

  const theme = colors[variant];

  const {
    sectionRef,
    sectionSelected,
    showHandles,
    sectionClickHandler,
    toolbarProps,
    bgLayerStyle,
    overlayStyle,
    bgDragOverlayProps,
    contentContainerStyle,
    sectionStyle,
  } = useSectionToolbar({
    isEditing,
    overrides: faq.styleOverrides,
    onStyleOverrideChange,
    defaultBg: theme.bg,
    onBgImageClick,
    palette,
    customColors,
    onCustomColorsChange,
  });

  const toggleItem = (id: string) => {
    if (isEditing) return;
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: "800px",
    margin: "0 auto",
  };

  const headerStyle: React.CSSProperties = {
    textAlign: "center",
    marginBottom: "48px",
  };

  const headingStyle: React.CSSProperties = {
    fontSize: brandFonts?.headerFont?.size
      ? `${brandFonts.headerFont.size}px`
      : "clamp(1.75rem, 3vw, 2.5rem)",
    fontWeight: 700,
    color: theme.heading,
    marginBottom: "12px",
    fontFamily: brandFonts?.headerFont?.family || undefined,
  };

  const subheadingStyle: React.CSSProperties = {
    fontSize: brandFonts?.bodyFont?.size
      ? `${brandFonts.bodyFont.size}px`
      : "1.1rem",
    color: theme.subheading,
    maxWidth: "600px",
    margin: "0 auto",
    fontFamily: brandFonts?.bodyFont?.family || undefined,
  };

  const itemStyle: React.CSSProperties = {
    backgroundColor: theme.itemBg,
    borderRadius: "8px",
    border: `1px solid ${theme.itemBorder}`,
    marginBottom: "12px",
    overflow: "hidden",
    position: "relative",
  };

  const questionRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 24px",
    cursor: isEditing ? "default" : "pointer",
    gap: "16px",
  };

  const questionStyle: React.CSSProperties = {
    fontSize: "1rem",
    fontWeight: 600,
    color: theme.question,
    flex: 1,
    fontFamily: brandFonts?.bodyFont?.family || undefined,
  };

  const answerStyle: React.CSSProperties = {
    fontSize: "0.95rem",
    color: theme.answer,
    lineHeight: 1.7,
    padding: "0 24px 20px",
    fontFamily: brandFonts?.bodyFont?.family || undefined,
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

  const addItemStyle: React.CSSProperties = {
    backgroundColor: "transparent",
    borderRadius: "8px",
    border: `2px dashed ${theme.itemBorder}`,
    padding: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    cursor: "pointer",
    transition: "border-color 0.2s, background 0.2s",
    width: "100%",
  };

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      style={sectionStyle}
      onClick={showHandles ? sectionClickHandler : undefined}
    >
      {showHandles && sectionSelected && (
        <div style={{ position: "absolute", top: 8, left: "50%", zIndex: 50 }}>
          <SectionToolbar {...toolbarProps} />
        </div>
      )}
      {bgLayerStyle && <div style={bgLayerStyle} />}
      {overlayStyle && <div style={overlayStyle} />}
      <BgDragOverlay {...bgDragOverlayProps} />
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
          .add-faq-btn:hover {
            border-color: #9ca3af;
            background: rgba(0, 0, 0, 0.02);
          }
        `}</style>
      )}
      <div style={{ ...contentContainerStyle, ...containerStyle }}>
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
                {faq.heading || "Frequently Asked Questions"}
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
                {faq.subheading || "Everything you need to know"}
              </div>
            </>
          ) : (
            <>
              <h2 style={headingStyle}>
                {faq.heading || "Frequently Asked Questions"}
              </h2>
              <p style={subheadingStyle}>
                {faq.subheading || "Everything you need to know"}
              </p>
            </>
          )}
        </div>

        {/* FAQ Items */}
        <div>
          {faq.items.map((item) => {
            const isOpen = isEditing || openItems.has(item.id);
            return (
              <div key={item.id} style={itemStyle}>
                {/* Remove button */}
                {isEditing && faq.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveItem?.(item.id)}
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

                {/* Question */}
                <div
                  style={questionRowStyle}
                  onClick={() => toggleItem(item.id)}
                >
                  {isEditing ? (
                    <div
                      className={editableClass}
                      contentEditable
                      suppressContentEditableWarning
                      style={{ ...questionStyle, ...editableStyle }}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={(e) =>
                        onItemChange?.(
                          item.id,
                          "question",
                          e.currentTarget.textContent || "",
                        )
                      }
                    >
                      {item.question}
                    </div>
                  ) : (
                    <span style={questionStyle}>{item.question}</span>
                  )}
                  {!isEditing && (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={theme.icon}
                      strokeWidth="2"
                      style={{
                        flexShrink: 0,
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s",
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  )}
                </div>

                {/* Answer */}
                {isOpen && (
                  <div style={answerStyle}>
                    {isEditing ? (
                      <div
                        className={editableClass}
                        contentEditable
                        suppressContentEditableWarning
                        style={{ ...editableStyle, lineHeight: 1.7 }}
                        onBlur={(e) =>
                          onItemChange?.(
                            item.id,
                            "answer",
                            e.currentTarget.textContent || "",
                          )
                        }
                      >
                        {item.answer}
                      </div>
                    ) : (
                      <p style={{ margin: 0 }}>{item.answer}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add FAQ Item */}
          {isEditing && faq.items.length < 10 && (
            <button
              type="button"
              className="add-faq-btn"
              style={addItemStyle}
              onClick={onAddItem}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke={theme.subheading}
                strokeWidth="1.5"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v8M8 12h8" />
              </svg>
              <span style={{ color: theme.subheading, fontSize: "0.9rem" }}>
                Add Question
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
