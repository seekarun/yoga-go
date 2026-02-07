// @ts-nocheck — WIP: depends on LandingPageConfig V2 types not yet implemented
"use client";

import type { PricingSection, PricingTier } from "@/types/landing-page";
import type { SectionComponentProps } from "./types";

type PricingProps = SectionComponentProps<PricingSection>;

/**
 * Pricing Section Component
 *
 * Service pricing tiers with features list and CTA buttons.
 */
export default function PricingSectionComponent({
  section,
  isEditing = false,
  onUpdate,
}: PricingProps) {
  const { heading, subheading, tiers } = section;

  const handleHeadingChange = (newHeading: string) => {
    onUpdate?.({ heading: newHeading });
  };

  const handleSubheadingChange = (newSubheading: string) => {
    onUpdate?.({ subheading: newSubheading });
  };

  const handleTierChange = (
    id: string,
    field: keyof PricingTier,
    value: unknown,
  ) => {
    const updated = tiers.map((tier) =>
      tier.id === id ? { ...tier, [field]: value } : tier,
    );
    onUpdate?.({ tiers: updated });
  };

  const handleFeatureChange = (
    tierId: string,
    featureIndex: number,
    value: string,
  ) => {
    const updated = tiers.map((tier) => {
      if (tier.id !== tierId) return tier;
      const newFeatures = [...tier.features];
      newFeatures[featureIndex] = value;
      return { ...tier, features: newFeatures };
    });
    onUpdate?.({ tiers: updated });
  };

  const handleAddFeature = (tierId: string) => {
    const updated = tiers.map((tier) => {
      if (tier.id !== tierId) return tier;
      return { ...tier, features: [...tier.features, "New feature"] };
    });
    onUpdate?.({ tiers: updated });
  };

  const handleRemoveFeature = (tierId: string, featureIndex: number) => {
    const updated = tiers.map((tier) => {
      if (tier.id !== tierId || tier.features.length <= 1) return tier;
      const newFeatures = tier.features.filter((_, i) => i !== featureIndex);
      return { ...tier, features: newFeatures };
    });
    onUpdate?.({ tiers: updated });
  };

  const handleAddTier = () => {
    const newTier: PricingTier = {
      id: `tier-${Date.now()}`,
      name: "New Plan",
      price: "$0",
      period: "/month",
      features: ["Feature 1", "Feature 2"],
      ctaLabel: "Get Started",
      ctaAction: "booking",
    };
    onUpdate?.({ tiers: [...tiers, newTier] });
  };

  const handleRemoveTier = (id: string) => {
    if (tiers.length <= 1) return;
    onUpdate?.({ tiers: tiers.filter((tier) => tier.id !== id) });
  };

  const sectionStyle: React.CSSProperties = {
    width: "100%",
    padding: "80px 8%",
    backgroundColor: "#1a1a1a",
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
    color: "#ffffff",
    marginBottom: "12px",
  };

  const subheadingStyle: React.CSSProperties = {
    fontSize: "1.1rem",
    color: "#9ca3af",
    maxWidth: "600px",
    margin: "0 auto",
  };

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "24px",
    alignItems: "start",
  };

  const tierStyle = (highlighted: boolean): React.CSSProperties => ({
    backgroundColor: highlighted ? "#2563eb" : "#262626",
    borderRadius: "16px",
    padding: "32px",
    position: "relative",
    border: highlighted ? "2px solid #60a5fa" : "1px solid #374151",
    transform: highlighted ? "scale(1.02)" : undefined,
  });

  const tierNameStyle: React.CSSProperties = {
    fontSize: "1.25rem",
    fontWeight: 600,
    color: "#ffffff",
    marginBottom: "8px",
  };

  const priceContainerStyle: React.CSSProperties = {
    marginBottom: "24px",
  };

  const priceStyle: React.CSSProperties = {
    fontSize: "2.5rem",
    fontWeight: 700,
    color: "#ffffff",
  };

  const periodStyle: React.CSSProperties = {
    fontSize: "1rem",
    color: "#9ca3af",
  };

  const descriptionStyle: React.CSSProperties = {
    fontSize: "0.9rem",
    color: "#9ca3af",
    marginBottom: "16px",
  };

  const featureListStyle: React.CSSProperties = {
    listStyle: "none",
    padding: 0,
    margin: "0 0 24px 0",
  };

  const featureItemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 0",
    color: "#e5e7eb",
    fontSize: "0.95rem",
  };

  const ctaButtonStyle = (highlighted: boolean): React.CSSProperties => ({
    width: "100%",
    padding: "14px 24px",
    fontSize: "1rem",
    fontWeight: 600,
    backgroundColor: highlighted ? "#ffffff" : "transparent",
    color: highlighted ? "#1a1a1a" : "#ffffff",
    border: highlighted ? "none" : "1px solid #ffffff",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "transform 0.2s, box-shadow 0.2s",
  });

  const editableStyle: React.CSSProperties = isEditing
    ? {
        cursor: "text",
        outline: "none",
        borderRadius: "4px",
        padding: "4px 8px",
        transition: "background 0.2s, outline 0.2s",
      }
    : {};

  const addTierStyle: React.CSSProperties = {
    backgroundColor: "transparent",
    borderRadius: "16px",
    border: "2px dashed #374151",
    minHeight: "400px",
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
          .editable-field-light:focus {
            background: rgba(255, 255, 255, 0.1) !important;
            outline: 2px solid rgba(255, 255, 255, 0.5) !important;
          }
          .editable-field-light:hover:not(:focus) {
            background: rgba(255, 255, 255, 0.05);
          }
          .tier-card:hover .delete-btn {
            opacity: 1;
          }
          .add-tier-btn:hover {
            border-color: #6b7280;
            background: rgba(255, 255, 255, 0.02);
          }
          .feature-item:hover .remove-feature-btn {
            opacity: 1;
          }
        `}</style>
      )}
      <div style={containerStyle}>
        {/* Header */}
        <div style={headerStyle}>
          {isEditing ? (
            <>
              <div
                className="editable-field-light"
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
                {heading || "Pricing"}
              </div>
              <div
                className="editable-field-light"
                contentEditable
                suppressContentEditableWarning
                style={{ ...subheadingStyle, ...editableStyle }}
                onBlur={(e) =>
                  handleSubheadingChange(e.currentTarget.textContent || "")
                }
              >
                {subheading || "Choose the plan that works for you"}
              </div>
            </>
          ) : (
            <>
              <h2 style={headingStyle}>{heading || "Pricing"}</h2>
              <p style={subheadingStyle}>
                {subheading || "Choose the plan that works for you"}
              </p>
            </>
          )}
        </div>

        {/* Pricing Tiers */}
        <div style={gridStyle}>
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className="tier-card"
              style={tierStyle(!!tier.highlighted)}
            >
              {isEditing && tiers.length > 1 && (
                <button
                  type="button"
                  className="delete-btn"
                  onClick={() => handleRemoveTier(tier.id)}
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

              {/* Tier Name */}
              {isEditing ? (
                <div
                  className="editable-field-light"
                  contentEditable
                  suppressContentEditableWarning
                  style={{ ...tierNameStyle, ...editableStyle }}
                  onBlur={(e) =>
                    handleTierChange(
                      tier.id,
                      "name",
                      e.currentTarget.textContent || "",
                    )
                  }
                >
                  {tier.name}
                </div>
              ) : (
                <h3 style={tierNameStyle}>{tier.name}</h3>
              )}

              {/* Price */}
              <div style={priceContainerStyle}>
                {isEditing ? (
                  <span
                    className="editable-field-light"
                    contentEditable
                    suppressContentEditableWarning
                    style={{
                      ...priceStyle,
                      ...editableStyle,
                      display: "inline-block",
                    }}
                    onBlur={(e) =>
                      handleTierChange(
                        tier.id,
                        "price",
                        e.currentTarget.textContent || "",
                      )
                    }
                  >
                    {tier.price}
                  </span>
                ) : (
                  <span style={priceStyle}>{tier.price}</span>
                )}
                {tier.period &&
                  (isEditing ? (
                    <span
                      className="editable-field-light"
                      contentEditable
                      suppressContentEditableWarning
                      style={{
                        ...periodStyle,
                        ...editableStyle,
                        display: "inline-block",
                      }}
                      onBlur={(e) =>
                        handleTierChange(
                          tier.id,
                          "period",
                          e.currentTarget.textContent || "",
                        )
                      }
                    >
                      {tier.period}
                    </span>
                  ) : (
                    <span style={periodStyle}>{tier.period}</span>
                  ))}
              </div>

              {/* Description */}
              {(tier.description || isEditing) &&
                (isEditing ? (
                  <div
                    className="editable-field-light"
                    contentEditable
                    suppressContentEditableWarning
                    style={{ ...descriptionStyle, ...editableStyle }}
                    onBlur={(e) =>
                      handleTierChange(
                        tier.id,
                        "description",
                        e.currentTarget.textContent || "",
                      )
                    }
                  >
                    {tier.description || "Add description..."}
                  </div>
                ) : (
                  tier.description && (
                    <p style={descriptionStyle}>{tier.description}</p>
                  )
                ))}

              {/* Features List */}
              <ul style={featureListStyle}>
                {tier.features.map((feature, index) => (
                  <li
                    key={index}
                    className="feature-item"
                    style={{ ...featureItemStyle, position: "relative" }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={tier.highlighted ? "#93c5fd" : "#10b981"}
                      strokeWidth="2"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {isEditing ? (
                      <>
                        <span
                          className="editable-field-light"
                          contentEditable
                          suppressContentEditableWarning
                          style={{ ...editableStyle, flex: 1 }}
                          onBlur={(e) =>
                            handleFeatureChange(
                              tier.id,
                              index,
                              e.currentTarget.textContent || "",
                            )
                          }
                        >
                          {feature}
                        </span>
                        {tier.features.length > 1 && (
                          <button
                            type="button"
                            className="remove-feature-btn"
                            onClick={() => handleRemoveFeature(tier.id, index)}
                            style={{
                              position: "absolute",
                              right: "-8px",
                              width: "20px",
                              height: "20px",
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
                              width="10"
                              height="10"
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
                    ) : (
                      <span>{feature}</span>
                    )}
                  </li>
                ))}
                {isEditing && tier.features.length < 8 && (
                  <li>
                    <button
                      type="button"
                      onClick={() => handleAddFeature(tier.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 0",
                        color: "#9ca3af",
                        fontSize: "0.9rem",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 8v8M8 12h8" />
                      </svg>
                      Add feature
                    </button>
                  </li>
                )}
              </ul>

              {/* CTA Button */}
              {isEditing ? (
                <div
                  className="editable-field-light"
                  contentEditable
                  suppressContentEditableWarning
                  style={{
                    ...ctaButtonStyle(!!tier.highlighted),
                    ...editableStyle,
                    textAlign: "center",
                  }}
                  onBlur={(e) =>
                    handleTierChange(
                      tier.id,
                      "ctaLabel",
                      e.currentTarget.textContent || "",
                    )
                  }
                >
                  {tier.ctaLabel || "Get Started"}
                </div>
              ) : (
                <button
                  type="button"
                  style={ctaButtonStyle(!!tier.highlighted)}
                >
                  {tier.ctaLabel || "Get Started"}
                </button>
              )}
            </div>
          ))}

          {/* Add Tier Button */}
          {isEditing && tiers.length < 4 && (
            <button
              type="button"
              className="add-tier-btn"
              style={addTierStyle}
              onClick={handleAddTier}
            >
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6b7280"
                strokeWidth="1.5"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v8M8 12h8" />
              </svg>
              <span
                style={{
                  marginTop: "12px",
                  color: "#9ca3af",
                  fontSize: "0.9rem",
                }}
              >
                Add Pricing Tier
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
