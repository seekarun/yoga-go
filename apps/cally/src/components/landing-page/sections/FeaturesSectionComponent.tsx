"use client";

import type { FeaturesSection, FeatureCard } from "@/types/landing-page";
import type { SectionComponentProps } from "./types";

type FeaturesProps = SectionComponentProps<FeaturesSection>;

/**
 * Features Section Component
 *
 * Heading with feature cards grid.
 * Supports light, dark, and gray themes.
 */
export default function FeaturesSectionComponent({
  section,
  isEditing = false,
  onUpdate,
  onImageClick,
}: FeaturesProps) {
  const { heading, subheading, cards, theme = "light" } = section;

  const colors = {
    light: {
      bg: "#ffffff",
      heading: "#1a1a1a",
      subheading: "#6b7280",
      cardBg: "#f9fafb",
      cardTitle: "#1a1a1a",
      cardText: "#4b5563",
      cardBorder: "#e5e7eb",
      imageBg: "#e5e7eb",
    },
    dark: {
      bg: "#1a1a1a",
      heading: "#ffffff",
      subheading: "#9ca3af",
      cardBg: "#262626",
      cardTitle: "#ffffff",
      cardText: "#9ca3af",
      cardBorder: "#374151",
      imageBg: "#374151",
    },
    gray: {
      bg: "#f3f4f6",
      heading: "#1a1a1a",
      subheading: "#6b7280",
      cardBg: "#ffffff",
      cardTitle: "#1a1a1a",
      cardText: "#4b5563",
      cardBorder: "#e5e7eb",
      imageBg: "#e5e7eb",
    },
  };

  const themeColors = colors[theme];

  const handleHeadingChange = (newHeading: string) => {
    onUpdate?.({ heading: newHeading });
  };

  const handleSubheadingChange = (newSubheading: string) => {
    onUpdate?.({ subheading: newSubheading });
  };

  const handleCardChange = (
    cardId: string,
    field: "title" | "description",
    value: string,
  ) => {
    const updatedCards = cards.map((card) =>
      card.id === cardId ? { ...card, [field]: value } : card,
    );
    onUpdate?.({ cards: updatedCards });
  };

  const handleAddCard = () => {
    const newCard: FeatureCard = {
      id: `feature-${Date.now()}`,
      title: "New Feature",
      description: "Describe this feature here.",
    };
    onUpdate?.({ cards: [...cards, newCard] });
  };

  const handleRemoveCard = (cardId: string) => {
    if (cards.length <= 1) return;
    onUpdate?.({ cards: cards.filter((card) => card.id !== cardId) });
  };

  const sectionStyle: React.CSSProperties = {
    width: "100%",
    padding: "80px 8%",
    backgroundColor: themeColors.bg,
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
    color: themeColors.heading,
    marginBottom: "12px",
  };

  const subheadingStyle: React.CSSProperties = {
    fontSize: "1.1rem",
    color: themeColors.subheading,
    maxWidth: "600px",
    margin: "0 auto",
  };

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "24px",
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: themeColors.cardBg,
    borderRadius: "12px",
    overflow: "hidden",
    border: `1px solid ${themeColors.cardBorder}`,
    transition: "transform 0.2s, box-shadow 0.2s",
  };

  const cardImageContainerStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    paddingTop: "56.25%", // 16:9 aspect ratio
    backgroundColor: themeColors.imageBg,
    overflow: "hidden",
  };

  const cardContentStyle: React.CSSProperties = {
    padding: "20px",
  };

  const cardTitleStyle: React.CSSProperties = {
    fontSize: "1.1rem",
    fontWeight: 600,
    color: themeColors.cardTitle,
    marginBottom: "8px",
  };

  const cardDescStyle: React.CSSProperties = {
    fontSize: "0.95rem",
    color: themeColors.cardText,
    lineHeight: 1.6,
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
    theme === "dark" ? "editable-field-light" : "editable-field-dark";

  const addCardStyle: React.CSSProperties = {
    backgroundColor: "transparent",
    borderRadius: "12px",
    border: `2px dashed ${themeColors.cardBorder}`,
    minHeight: "200px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "border-color 0.2s, background 0.2s",
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
          .editable-field-light:focus {
            background: rgba(255, 255, 255, 0.1) !important;
            outline: 2px solid rgba(255, 255, 255, 0.5) !important;
          }
          .editable-field-light:hover:not(:focus) {
            background: rgba(255, 255, 255, 0.05);
          }
          .feature-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }
          .add-card-btn:hover {
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
                  handleHeadingChange(e.currentTarget.textContent || "")
                }
              >
                {heading || "What I Offer"}
              </div>
              <div
                className={editableClass}
                contentEditable
                suppressContentEditableWarning
                style={{ ...subheadingStyle, ...editableStyle }}
                onBlur={(e) =>
                  handleSubheadingChange(e.currentTarget.textContent || "")
                }
              >
                {subheading || "Services tailored to your needs"}
              </div>
            </>
          ) : (
            <>
              <h2 style={headingStyle}>{heading || "What I Offer"}</h2>
              <p style={subheadingStyle}>
                {subheading || "Services tailored to your needs"}
              </p>
            </>
          )}
        </div>

        {/* Cards Grid */}
        <div style={gridStyle}>
          {cards.map((card) => (
            <div key={card.id} className="feature-card" style={cardStyle}>
              {/* Card Image */}
              <div style={cardImageContainerStyle}>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: card.image
                      ? `url(${card.image})`
                      : undefined,
                    backgroundPosition: card.imagePosition || "50% 50%",
                    backgroundSize: "cover",
                    backgroundRepeat: "no-repeat",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: card.image
                      ? `scale(${(card.imageZoom || 100) / 100})`
                      : undefined,
                  }}
                >
                  {!card.image && (
                    <svg
                      width="40"
                      height="40"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={themeColors.subheading}
                      strokeWidth="1.5"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  )}
                </div>
                {isEditing && (
                  <>
                    {/* Image edit button */}
                    <button
                      type="button"
                      onClick={() => onImageClick?.(`card-${card.id}`)}
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        width: "32px",
                        height: "32px",
                        backgroundColor: "white",
                        borderRadius: "50%",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                        zIndex: 1,
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#374151"
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
                    {/* Remove card button */}
                    {cards.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCard(card.id)}
                        style={{
                          position: "absolute",
                          top: "8px",
                          left: "8px",
                          width: "32px",
                          height: "32px",
                          backgroundColor: "#ef4444",
                          borderRadius: "50%",
                          border: "none",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                          zIndex: 1,
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="2"
                        >
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Card Content */}
              <div style={cardContentStyle}>
                {isEditing ? (
                  <>
                    <div
                      className={editableClass}
                      contentEditable
                      suppressContentEditableWarning
                      style={{ ...cardTitleStyle, ...editableStyle }}
                      onBlur={(e) =>
                        handleCardChange(
                          card.id,
                          "title",
                          e.currentTarget.textContent || "",
                        )
                      }
                    >
                      {card.title}
                    </div>
                    <div
                      className={editableClass}
                      contentEditable
                      suppressContentEditableWarning
                      style={{ ...cardDescStyle, ...editableStyle }}
                      onBlur={(e) =>
                        handleCardChange(
                          card.id,
                          "description",
                          e.currentTarget.textContent || "",
                        )
                      }
                    >
                      {card.description}
                    </div>
                  </>
                ) : (
                  <>
                    <h3 style={cardTitleStyle}>{card.title}</h3>
                    <p style={cardDescStyle}>{card.description}</p>
                  </>
                )}
              </div>
            </div>
          ))}

          {/* Add Card Button (only in edit mode) */}
          {isEditing && cards.length < 6 && (
            <button
              type="button"
              className="add-card-btn"
              style={addCardStyle}
              onClick={handleAddCard}
            >
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke={themeColors.subheading}
                strokeWidth="1.5"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v8M8 12h8" />
              </svg>
              <span
                style={{
                  marginTop: "12px",
                  color: themeColors.subheading,
                  fontSize: "0.9rem",
                }}
              >
                Add Feature
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
