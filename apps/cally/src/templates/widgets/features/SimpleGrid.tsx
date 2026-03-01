"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
} from "react";
import { createPortal } from "react-dom";
import type { FeatureCard, SectionStyleOverrides } from "@/types/landing-page";
import type { WidgetBrandConfig } from "../types";
import ResizableText from "../../hero/ResizableText";
import TextToolbar from "../../hero/TextToolbar";

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
  onCardStyleChange?: (cardId: string, patch: Partial<FeatureCard>) => void;
}

const SCOPE = "w-ft-sg";

/** Selection state for card-level text editing */
type CardTextSelection =
  | { type: "title"; cardId: string }
  | { type: "desc"; cardId: string }
  | null;

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
  onCardStyleChange,
}: SimpleGridProps) {
  const [headingSelected, setHeadingSelected] = useState(false);
  const [subheadingSelected, setSubheadingSelected] = useState(false);
  const [cardSel, setCardSel] = useState<CardTextSelection>(null);

  const sectionRef = useRef<HTMLElement>(null);
  const cardTextRefs = useRef<Map<string, HTMLElement>>(new Map());
  const portalRef = useRef<HTMLDivElement>(null);

  const [portalPos, setPortalPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const getAnchorEl = useCallback((): HTMLElement | null => {
    if (!cardSel) return null;
    const key = `${cardSel.cardId}-${cardSel.type}`;
    return cardTextRefs.current.get(key) || null;
  }, [cardSel]);

  // Click-outside handler
  useEffect(() => {
    if (!isEditing) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (portalRef.current && portalRef.current.contains(target)) return;
      if (sectionRef.current && !sectionRef.current.contains(target)) {
        setHeadingSelected(false);
        setSubheadingSelected(false);
        setCardSel(null);
        return;
      }
      if (cardSel) {
        const anchor = getAnchorEl();
        if (anchor && !anchor.contains(target)) {
          setCardSel(null);
        }
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isEditing, cardSel, getAnchorEl]);

  // Measure anchor position for portal toolbar
  useLayoutEffect(() => {
    if (!cardSel) {
      setPortalPos(null);
      return;
    }
    const el = getAnchorEl();
    if (!el) {
      setPortalPos(null);
      return;
    }
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setPortalPos({ top: rect.top, left: rect.left, width: rect.width });
    };
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [cardSel, getAnchorEl]);

  const emitOverride = useCallback(
    (patch: Partial<SectionStyleOverrides>) => {
      onStyleOverrideChange?.({ ...styleOverrides, ...patch });
    },
    [styleOverrides, onStyleOverrideChange],
  );

  const primary = brand.primaryColor || "#6366f1";

  const headingStyle: React.CSSProperties = {
    fontSize: styleOverrides?.headingFontSize ?? "clamp(1.5rem, 3vw, 2rem)",
    fontWeight: styleOverrides?.headingFontWeight ?? 700,
    fontStyle: styleOverrides?.headingFontStyle ?? "normal",
    color: styleOverrides?.headingTextColor ?? "#1a1a1a",
    textAlign: styleOverrides?.headingTextAlign ?? "left",
    fontFamily:
      styleOverrides?.headingFontFamily || brand.headerFont || "inherit",
    lineHeight: 1.15,
    margin: "0 0 8px",
  };

  const subheadingStyle: React.CSSProperties = {
    fontSize: styleOverrides?.subheadingFontSize ?? "1rem",
    fontWeight: styleOverrides?.subheadingFontWeight ?? "normal",
    fontStyle: styleOverrides?.subheadingFontStyle ?? "normal",
    color: styleOverrides?.subheadingTextColor ?? "#6b7280",
    textAlign: styleOverrides?.subheadingTextAlign ?? "left",
    fontFamily:
      styleOverrides?.subheadingFontFamily || brand.bodyFont || "inherit",
    margin: "0 0 40px",
  };

  // Render floating portal toolbar for card text selection
  const renderPortalToolbar = () => {
    if (!isEditing || !cardSel || !portalPos) return null;
    const card = cards.find((c) => c.id === cardSel.cardId);
    if (!card) return null;

    let toolbarContent: React.ReactNode = null;

    if (cardSel.type === "title") {
      toolbarContent = (
        <TextToolbar
          fontSize={card.titleFontSize ?? 17}
          fontFamily={card.titleFontFamily ?? ""}
          fontWeight={card.titleFontWeight ?? "bold"}
          fontStyle={card.titleFontStyle ?? "normal"}
          color={card.titleColor ?? "#1a1a1a"}
          textAlign={card.titleTextAlign ?? "left"}
          onFontSizeChange={(v) =>
            onCardStyleChange?.(card.id, { titleFontSize: v })
          }
          onFontFamilyChange={(v) =>
            onCardStyleChange?.(card.id, { titleFontFamily: v })
          }
          onFontWeightChange={(v) =>
            onCardStyleChange?.(card.id, { titleFontWeight: v })
          }
          onFontStyleChange={(v) =>
            onCardStyleChange?.(card.id, { titleFontStyle: v })
          }
          onColorChange={(v) => onCardStyleChange?.(card.id, { titleColor: v })}
          onTextAlignChange={(v) =>
            onCardStyleChange?.(card.id, { titleTextAlign: v })
          }
        />
      );
    } else if (cardSel.type === "desc") {
      toolbarContent = (
        <TextToolbar
          fontSize={card.descFontSize ?? 15}
          fontFamily={card.descFontFamily ?? ""}
          fontWeight={card.descFontWeight ?? "normal"}
          fontStyle={card.descFontStyle ?? "normal"}
          color={card.descColor ?? "#6b7280"}
          textAlign={card.descTextAlign ?? "left"}
          onFontSizeChange={(v) =>
            onCardStyleChange?.(card.id, { descFontSize: v })
          }
          onFontFamilyChange={(v) =>
            onCardStyleChange?.(card.id, { descFontFamily: v })
          }
          onFontWeightChange={(v) =>
            onCardStyleChange?.(card.id, { descFontWeight: v })
          }
          onFontStyleChange={(v) =>
            onCardStyleChange?.(card.id, { descFontStyle: v })
          }
          onColorChange={(v) => onCardStyleChange?.(card.id, { descColor: v })}
          onTextAlignChange={(v) =>
            onCardStyleChange?.(card.id, { descTextAlign: v })
          }
        />
      );
    }

    if (!toolbarContent) return null;

    return createPortal(
      <div
        ref={portalRef}
        style={{
          position: "fixed",
          top: portalPos.top,
          left: portalPos.left,
          width: portalPos.width,
          height: 0,
          zIndex: 9999,
        }}
      >
        {toolbarContent}
      </div>,
      document.body,
    );
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
          font-family: ${brand.headerFont || "inherit"};
          color: #1a1a1a;
        }

        .${SCOPE}-subheading {
          font-size: 1rem;
          color: #6b7280;
          margin: 0 0 40px;
          font-family: ${brand.bodyFont || "inherit"};
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
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .${SCOPE}-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0;
          line-height: 1.3;
          font-family: ${brand.headerFont || "inherit"};
        }

        .${SCOPE}-desc {
          font-size: 0.95rem;
          color: #6b7280;
          line-height: 1.7;
          margin: 0;
          font-family: ${brand.bodyFont || "inherit"};
        }

        .${SCOPE}-text-el--selected {
          outline: 2px solid #3b82f6;
          outline-offset: 4px;
          border-radius: 6px;
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
                setCardSel(null);
              }}
              onDeselect={() => setHeadingSelected(false)}
              toolbarProps={{
                fontSize: styleOverrides?.headingFontSize ?? 28,
                fontFamily: styleOverrides?.headingFontFamily ?? "",
                fontWeight: styleOverrides?.headingFontWeight ?? "bold",
                fontStyle: styleOverrides?.headingFontStyle ?? "normal",
                color: styleOverrides?.headingTextColor ?? "#1a1a1a",
                textAlign: styleOverrides?.headingTextAlign ?? "left",
                onFontSizeChange: (v) => emitOverride({ headingFontSize: v }),
                onFontFamilyChange: (v) =>
                  emitOverride({ headingFontFamily: v }),
                onFontWeightChange: (v) =>
                  emitOverride({ headingFontWeight: v }),
                onFontStyleChange: (v) => emitOverride({ headingFontStyle: v }),
                onColorChange: (v) => emitOverride({ headingTextColor: v }),
                onTextAlignChange: (v) => emitOverride({ headingTextAlign: v }),
              }}
            />
          ) : (
            heading && <h2 className={`${SCOPE}-heading`}>{heading}</h2>
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
                setCardSel(null);
              }}
              onDeselect={() => setSubheadingSelected(false)}
              toolbarProps={{
                fontSize: styleOverrides?.subheadingFontSize ?? 16,
                fontFamily: styleOverrides?.subheadingFontFamily ?? "",
                fontWeight: styleOverrides?.subheadingFontWeight ?? "normal",
                fontStyle: styleOverrides?.subheadingFontStyle ?? "normal",
                color: styleOverrides?.subheadingTextColor ?? "#6b7280",
                textAlign: styleOverrides?.subheadingTextAlign ?? "left",
                onFontSizeChange: (v) =>
                  emitOverride({ subheadingFontSize: v }),
                onFontFamilyChange: (v) =>
                  emitOverride({ subheadingFontFamily: v }),
                onFontWeightChange: (v) =>
                  emitOverride({ subheadingFontWeight: v }),
                onFontStyleChange: (v) =>
                  emitOverride({ subheadingFontStyle: v }),
                onColorChange: (v) => emitOverride({ subheadingTextColor: v }),
                onTextAlignChange: (v) =>
                  emitOverride({ subheadingTextAlign: v }),
              }}
            />
          ) : (
            subheading && <p className={`${SCOPE}-subheading`}>{subheading}</p>
          )}
        </div>
      )}

      <div className={`${SCOPE}-grid`}>
        {cards.map((card) => {
          const isTitleSel =
            cardSel?.type === "title" && cardSel.cardId === card.id;
          const isDescSel =
            cardSel?.type === "desc" && cardSel.cardId === card.id;

          const titleStyle: React.CSSProperties = {
            ...(card.titleFontSize ? { fontSize: card.titleFontSize } : {}),
            ...(card.titleFontWeight
              ? { fontWeight: card.titleFontWeight }
              : {}),
            ...(card.titleFontStyle ? { fontStyle: card.titleFontStyle } : {}),
            ...(card.titleColor ? { color: card.titleColor } : {}),
            ...(card.titleTextAlign ? { textAlign: card.titleTextAlign } : {}),
            ...(card.titleFontFamily
              ? { fontFamily: card.titleFontFamily }
              : {}),
            ...(isEditing
              ? { cursor: "text", outline: "none", border: "none" }
              : {}),
          };

          const descStyle: React.CSSProperties = {
            ...(card.descFontSize ? { fontSize: card.descFontSize } : {}),
            ...(card.descFontWeight ? { fontWeight: card.descFontWeight } : {}),
            ...(card.descFontStyle ? { fontStyle: card.descFontStyle } : {}),
            ...(card.descColor ? { color: card.descColor } : {}),
            ...(card.descTextAlign ? { textAlign: card.descTextAlign } : {}),
            ...(card.descFontFamily ? { fontFamily: card.descFontFamily } : {}),
            ...(isEditing
              ? { cursor: "text", outline: "none", border: "none" }
              : {}),
          };

          return (
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
                <h3
                  ref={(el) => {
                    if (el) cardTextRefs.current.set(`${card.id}-title`, el);
                    else cardTextRefs.current.delete(`${card.id}-title`);
                  }}
                  className={`${SCOPE}-title${isTitleSel ? ` ${SCOPE}-text-el--selected` : ""}`}
                  contentEditable
                  suppressContentEditableWarning
                  style={titleStyle}
                  onBlur={(e) =>
                    onCardChange?.(
                      card.id,
                      "title",
                      (e.currentTarget.innerText || "").replace(/\n$/, ""),
                    )
                  }
                  onClick={() => {
                    setCardSel({ type: "title", cardId: card.id });
                    setHeadingSelected(false);
                    setSubheadingSelected(false);
                  }}
                >
                  {card.title}
                </h3>
              ) : (
                <h3 className={`${SCOPE}-title`} style={titleStyle}>
                  {card.title}
                </h3>
              )}
              {isEditing ? (
                <p
                  ref={(el) => {
                    if (el) cardTextRefs.current.set(`${card.id}-desc`, el);
                    else cardTextRefs.current.delete(`${card.id}-desc`);
                  }}
                  className={`${SCOPE}-desc${isDescSel ? ` ${SCOPE}-text-el--selected` : ""}`}
                  contentEditable
                  suppressContentEditableWarning
                  style={descStyle}
                  onBlur={(e) =>
                    onCardChange?.(
                      card.id,
                      "description",
                      (e.currentTarget.innerText || "").replace(/\n$/, ""),
                    )
                  }
                  onClick={() => {
                    setCardSel({ type: "desc", cardId: card.id });
                    setHeadingSelected(false);
                    setSubheadingSelected(false);
                  }}
                >
                  {card.description}
                </p>
              ) : (
                <p className={`${SCOPE}-desc`} style={descStyle}>
                  {card.description}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {renderPortalToolbar()}
    </section>
  );
}
