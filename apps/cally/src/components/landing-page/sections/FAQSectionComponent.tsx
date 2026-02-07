"use client";

import { useState } from "react";
import type { FAQSection, FAQItem } from "@/types/landing-page";
import type { SectionComponentProps } from "./types";

type FAQProps = SectionComponentProps<FAQSection>;

/**
 * FAQ Section Component
 *
 * Frequently asked questions with accordion-style expand/collapse.
 */
export default function FAQSectionComponent({
  section,
  isEditing = false,
  onUpdate,
}: FAQProps) {
  const { heading, subheading, items } = section;
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleHeadingChange = (newHeading: string) => {
    onUpdate?.({ heading: newHeading });
  };

  const handleSubheadingChange = (newSubheading: string) => {
    onUpdate?.({ subheading: newSubheading });
  };

  const handleItemChange = (
    id: string,
    field: "question" | "answer",
    value: string,
  ) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, [field]: value } : item,
    );
    onUpdate?.({ items: updated });
  };

  const handleAddItem = () => {
    const newItem: FAQItem = {
      id: `faq-${Date.now()}`,
      question: "New question?",
      answer: "Add your answer here.",
    };
    onUpdate?.({ items: [...items, newItem] });
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    onUpdate?.({ items: items.filter((item) => item.id !== id) });
  };

  const toggleExpand = (id: string) => {
    if (!isEditing) {
      setExpandedId(expandedId === id ? null : id);
    }
  };

  const sectionStyle: React.CSSProperties = {
    width: "100%",
    padding: "80px 8%",
    backgroundColor: "#ffffff",
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

  const itemStyle: React.CSSProperties = {
    borderBottom: "1px solid #e5e7eb",
    position: "relative",
  };

  const questionStyle: React.CSSProperties = {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 0",
    backgroundColor: "transparent",
    border: "none",
    cursor: isEditing ? "text" : "pointer",
    textAlign: "left",
  };

  const questionTextStyle: React.CSSProperties = {
    fontSize: "1.1rem",
    fontWeight: 600,
    color: "#1a1a1a",
    flex: 1,
    paddingRight: "16px",
  };

  const answerStyle = (expanded: boolean): React.CSSProperties => ({
    maxHeight: expanded || isEditing ? "500px" : "0",
    overflow: "hidden",
    transition: "max-height 0.3s ease",
    paddingBottom: expanded || isEditing ? "20px" : "0",
  });

  const answerTextStyle: React.CSSProperties = {
    fontSize: "1rem",
    lineHeight: 1.7,
    color: "#4b5563",
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

  const addItemStyle: React.CSSProperties = {
    marginTop: "24px",
    padding: "20px",
    backgroundColor: "transparent",
    border: "2px dashed #e5e7eb",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    cursor: "pointer",
    transition: "border-color 0.2s, background 0.2s",
    width: "100%",
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
          .faq-item:hover .delete-btn {
            opacity: 1;
          }
          .add-faq-btn:hover {
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
                {heading || "Frequently Asked Questions"}
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
                {subheading || "Find answers to common questions"}
              </div>
            </>
          ) : (
            <>
              <h2 style={headingStyle}>
                {heading || "Frequently Asked Questions"}
              </h2>
              <p style={subheadingStyle}>
                {subheading || "Find answers to common questions"}
              </p>
            </>
          )}
        </div>

        {/* FAQ Items */}
        <div>
          {items.map((item) => {
            const isExpanded = expandedId === item.id || isEditing;
            return (
              <div key={item.id} className="faq-item" style={itemStyle}>
                {isEditing && items.length > 1 && (
                  <button
                    type="button"
                    className="delete-btn"
                    onClick={() => handleRemoveItem(item.id)}
                    style={{
                      position: "absolute",
                      top: "16px",
                      right: "0",
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
                      zIndex: 10,
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
                  style={questionStyle}
                  onClick={() => toggleExpand(item.id)}
                  role={isEditing ? undefined : "button"}
                  tabIndex={isEditing ? undefined : 0}
                  onKeyDown={(e) => {
                    if (!isEditing && (e.key === "Enter" || e.key === " ")) {
                      toggleExpand(item.id);
                    }
                  }}
                >
                  {isEditing ? (
                    <div
                      className="editable-field-dark"
                      contentEditable
                      suppressContentEditableWarning
                      style={{ ...questionTextStyle, ...editableStyle }}
                      onBlur={(e) =>
                        handleItemChange(
                          item.id,
                          "question",
                          e.currentTarget.textContent || "",
                        )
                      }
                    >
                      {item.question}
                    </div>
                  ) : (
                    <span style={questionTextStyle}>{item.question}</span>
                  )}
                  {!isEditing && (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#6b7280"
                      strokeWidth="2"
                      style={{
                        transform: isExpanded ? "rotate(180deg)" : "rotate(0)",
                        transition: "transform 0.3s ease",
                        flexShrink: 0,
                      }}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  )}
                </div>

                {/* Answer */}
                <div style={answerStyle(isExpanded)}>
                  {isEditing ? (
                    <div
                      className="editable-field-dark"
                      contentEditable
                      suppressContentEditableWarning
                      style={{ ...answerTextStyle, ...editableStyle }}
                      onBlur={(e) =>
                        handleItemChange(
                          item.id,
                          "answer",
                          e.currentTarget.textContent || "",
                        )
                      }
                    >
                      {item.answer}
                    </div>
                  ) : (
                    <p style={answerTextStyle}>{item.answer}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add FAQ Item Button */}
        {isEditing && items.length < 10 && (
          <button
            type="button"
            className="add-faq-btn"
            style={addItemStyle}
            onClick={handleAddItem}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9ca3af"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v8M8 12h8" />
            </svg>
            <span style={{ color: "#6b7280", fontSize: "0.9rem" }}>
              Add Question
            </span>
          </button>
        )}
      </div>
    </section>
  );
}
