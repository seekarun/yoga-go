"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type {
  CustomFontType,
  FeatureCard,
  SectionStyleOverrides,
} from "@/types/landing-page";
import type { WidgetBrandConfig } from "../types";
import ResizableText from "../../hero/ResizableText";
import { fontForRole } from "../../hero/fontUtils";
import { getSectionTheme } from "../sectionTheme";

interface SimpleGridProps {
  heading?: string;
  subheading?: string;
  cards: FeatureCard[];
  brand: WidgetBrandConfig;
  isEditing?: boolean;
  onHeadingChange?: (heading: string) => void;
  onSubheadingChange?: (subheading: string) => void;
  onStyleOverrideChange?: (overrides: SectionStyleOverrides) => void;
  styleOverrides?: SectionStyleOverrides;
  onCardChange?: (
    cardId: string,
    field: "title" | "description",
    value: string,
  ) => void;
  onAddCustomFontType?: (ft: CustomFontType) => void;
}

const SCOPE = "w-ft-sg";

/**
 * Features: Simple Grid
 *
 * Clean 4-column layout with a small icon, bold title, and description
 * per card. No background colours or images — text-only minimal design.
 */
export default function SimpleGrid({
  heading,
  subheading,
  cards,
  brand,
  isEditing,
  onHeadingChange,
  onSubheadingChange,
  onStyleOverrideChange,
  styleOverrides,
  onCardChange,
  onAddCustomFontType,
}: SimpleGridProps) {
  const t = getSectionTheme(brand.colorMode);
  const [headingSelected, setHeadingSelected] = useState(false);
  const [subheadingSelected, setSubheadingSelected] = useState(false);
  const [cardTextSel, setCardTextSel] = useState<{
    type: "title" | "desc";
    cardId: string;
  } | null>(null);

  const sectionRef = useRef<HTMLElement>(null);

  // Click-outside handler
  useEffect(() => {
    if (!isEditing) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (sectionRef.current && !sectionRef.current.contains(target)) {
        setHeadingSelected(false);
        setSubheadingSelected(false);
        setCardTextSel(null);
        return;
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isEditing]);

  const emitOverride = useCallback(
    (patch: Partial<SectionStyleOverrides>) => {
      onStyleOverrideChange?.({ ...styleOverrides, ...patch });
    },
    [styleOverrides, onStyleOverrideChange],
  );

  const primary = brand.primaryColor || "#6366f1";

  const headingRole = styleOverrides?.headingTypography || "sub-header";
  const headingResolved = fontForRole(headingRole, brand);
  const headingStyle: React.CSSProperties = {
    fontSize: headingResolved.size,
    fontWeight: headingResolved.weight ?? 700,
    color: headingResolved.color ?? t.heading,
    textAlign: styleOverrides?.headingTextAlign ?? "left",
    fontFamily: headingResolved.font || "inherit",
    lineHeight: 1.15,
    margin: "0 0 8px",
  };

  const subheadingRole = styleOverrides?.subheadingTypography || "body";
  const subheadingResolved = fontForRole(subheadingRole, brand);
  const subheadingStyle: React.CSSProperties = {
    fontSize: subheadingResolved.size,
    fontWeight: subheadingResolved.weight ?? "normal",
    color: subheadingResolved.color ?? t.body,
    textAlign: styleOverrides?.subheadingTextAlign ?? "left",
    fontFamily: subheadingResolved.font || "inherit",
    margin: "0 0 40px",
  };

  const innerSubHeader = fontForRole("sub-header", brand);
  const innerBody = fontForRole("body", brand);

  // Card-level typography (shared across all cards, configurable via toolbar)
  const cardTitleRole = styleOverrides?.cardTitleTypography || "sub-header";
  const cardTitleFont = fontForRole(cardTitleRole, brand);
  const cardTitleStyle: React.CSSProperties = {
    fontSize: cardTitleFont.size,
    fontWeight: cardTitleFont.weight ?? 700,
    color: cardTitleFont.color || t.heading,
    fontFamily: cardTitleFont.font || "inherit",
    lineHeight: 1.3,
    margin: 0,
  };

  const cardDescRole = styleOverrides?.cardDescTypography || "body";
  const cardDescFont = fontForRole(cardDescRole, brand);
  const cardDescStyle: React.CSSProperties = {
    fontSize: cardDescFont.size,
    color: cardDescFont.color || t.body,
    fontFamily: cardDescFont.font || "inherit",
    lineHeight: 1.7,
    margin: 0,
  };

  return (
    <section ref={sectionRef} className={SCOPE}>
      <style>{`
        .${SCOPE} {
          padding: 64px 24px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .${SCOPE}-header {
          margin-bottom: 40px;
        }

        .${SCOPE}-heading {
          font-size: clamp(1.5rem, 3vw, 2rem);
          font-weight: 700;
          margin: 0 0 8px;
          font-family: ${innerSubHeader.font || "inherit"};
          color: ${innerSubHeader.color || t.heading};
        }

        .${SCOPE}-subheading {
          font-size: 1rem;
          color: ${innerBody.color || t.body};
          margin: 0 0 40px;
          font-family: ${innerBody.font || "inherit"};
        }

        .${SCOPE}-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 40px;
        }

        .${SCOPE}-card {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .${SCOPE}-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: ${t.iconBg};
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .${SCOPE}-title {
          font-size: ${cardTitleFont.size}px;
          font-weight: ${cardTitleFont.weight ?? 700};
          color: ${cardTitleFont.color || t.heading};
          margin: 0;
          line-height: 1.3;
          font-family: ${cardTitleFont.font || "inherit"};
        }

        .${SCOPE}-desc {
          font-size: ${cardDescFont.size}px;
          color: ${cardDescFont.color || t.body};
          line-height: 1.7;
          margin: 0;
          font-family: ${cardDescFont.font || "inherit"};
        }

        @media (max-width: 900px) {
          .${SCOPE}-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 32px;
          }
        }

        @media (max-width: 500px) {
          .${SCOPE}-grid {
            grid-template-columns: 1fr;
            gap: 28px;
          }
        }
      `}</style>

      {(heading || subheading || isEditing) && (
        <div className={`${SCOPE}-header`}>
          {isEditing ? (
            <ResizableText
              text={heading || "Section Heading"}
              isEditing
              onTextChange={onHeadingChange}
              textStyle={headingStyle}
              selected={headingSelected}
              onSelect={() => {
                setHeadingSelected(true);
                setSubheadingSelected(false);
                setCardTextSel(null);
              }}
              onDeselect={() => setHeadingSelected(false)}
              toolbarProps={{
                typographyRole:
                  styleOverrides?.headingTypography || "sub-header",
                onTypographyRoleChange: (v) =>
                  emitOverride({ headingTypography: v }),
                textAlign: styleOverrides?.headingTextAlign ?? "left",
                onTextAlignChange: (v) => emitOverride({ headingTextAlign: v }),
                customFontTypes: brand.customFontTypes,
                onAddCustomFontType,
              }}
            />
          ) : (
            heading && (
              <h2 className={`${SCOPE}-heading`} style={headingStyle}>
                {heading}
              </h2>
            )
          )}
          {isEditing ? (
            <ResizableText
              text={subheading || "Section Subheading"}
              isEditing
              onTextChange={onSubheadingChange}
              textStyle={subheadingStyle}
              selected={subheadingSelected}
              onSelect={() => {
                setSubheadingSelected(true);
                setHeadingSelected(false);
                setCardTextSel(null);
              }}
              onDeselect={() => setSubheadingSelected(false)}
              toolbarProps={{
                typographyRole: styleOverrides?.subheadingTypography || "body",
                onTypographyRoleChange: (v) =>
                  emitOverride({ subheadingTypography: v }),
                textAlign: styleOverrides?.subheadingTextAlign ?? "left",
                onTextAlignChange: (v) =>
                  emitOverride({ subheadingTextAlign: v }),
                customFontTypes: brand.customFontTypes,
                onAddCustomFontType,
              }}
            />
          ) : (
            subheading && (
              <p className={`${SCOPE}-subheading`} style={subheadingStyle}>
                {subheading}
              </p>
            )
          )}
        </div>
      )}

      <div className={`${SCOPE}-grid`}>
        {cards.map((card) => (
          <div key={card.id} className={`${SCOPE}-card`}>
            <div className={`${SCOPE}-icon`}>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke={primary}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            {isEditing ? (
              <ResizableText
                text={card.title || "Card Title"}
                isEditing
                onTextChange={(text) => onCardChange?.(card.id, "title", text)}
                textStyle={cardTitleStyle}
                selected={
                  cardTextSel?.type === "title" &&
                  cardTextSel.cardId === card.id
                }
                onSelect={() => {
                  setCardTextSel({ type: "title", cardId: card.id });
                  setHeadingSelected(false);
                  setSubheadingSelected(false);
                }}
                onDeselect={() => {
                  if (
                    cardTextSel?.type === "title" &&
                    cardTextSel.cardId === card.id
                  )
                    setCardTextSel(null);
                }}
                toolbarProps={{
                  typographyRole: cardTitleRole,
                  onTypographyRoleChange: (v) =>
                    emitOverride({ cardTitleTypography: v }),
                  textAlign: "left",
                  onTextAlignChange: () => {},
                  customFontTypes: brand.customFontTypes,
                  onAddCustomFontType,
                }}
              />
            ) : (
              <h3 className={`${SCOPE}-title`} style={cardTitleStyle}>
                {card.title}
              </h3>
            )}
            {isEditing ? (
              <ResizableText
                text={card.description || "Card description"}
                isEditing
                onTextChange={(text) =>
                  onCardChange?.(card.id, "description", text)
                }
                textStyle={cardDescStyle}
                selected={
                  cardTextSel?.type === "desc" && cardTextSel.cardId === card.id
                }
                onSelect={() => {
                  setCardTextSel({ type: "desc", cardId: card.id });
                  setHeadingSelected(false);
                  setSubheadingSelected(false);
                }}
                onDeselect={() => {
                  if (
                    cardTextSel?.type === "desc" &&
                    cardTextSel.cardId === card.id
                  )
                    setCardTextSel(null);
                }}
                toolbarProps={{
                  typographyRole: cardDescRole,
                  onTypographyRoleChange: (v) =>
                    emitOverride({ cardDescTypography: v }),
                  textAlign: "left",
                  onTextAlignChange: () => {},
                  customFontTypes: brand.customFontTypes,
                  onAddCustomFontType,
                }}
              />
            ) : (
              <p className={`${SCOPE}-desc`} style={cardDescStyle}>
                {card.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
