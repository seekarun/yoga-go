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
import ImageToolbar from "../../hero/ImageToolbar";
import TextToolbar from "../../hero/TextToolbar";
import { bgFilterToCSS } from "../../hero/layoutOptions";
import { processRemoveBackground } from "../../hero/removeBackgroundUtil";

interface UnevenGridProps {
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
  onCardImageClick?: (cardId: string) => void;
  onCardImagePositionChange?: (cardId: string, position: string) => void;
  onCardImageZoomChange?: (cardId: string, zoom: number) => void;
  onCardStyleChange?: (cardId: string, patch: Partial<FeatureCard>) => void;
}

const SCOPE = "w-ft-ug";

function getPastelTints(primary: string): string[] {
  const hex = primary.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) || 180;
  const g = parseInt(hex.substring(2, 4), 16) || 180;
  const b = parseInt(hex.substring(4, 6), 16) || 180;
  const mix = (ratio: number) => {
    const mr = Math.round(r * ratio + 255 * (1 - ratio));
    const mg = Math.round(g * ratio + 255 * (1 - ratio));
    const mb = Math.round(b * ratio + 255 * (1 - ratio));
    return `rgb(${mr}, ${mg}, ${mb})`;
  };
  return [mix(0.12), mix(0.15), mix(0.1), mix(0.18)];
}

function parsePosition(pos?: string): { x: number; y: number } {
  if (!pos) return { x: 50, y: 50 };
  const parts = pos.split(/\s+/).map((p) => parseInt(p, 10));
  return { x: parts[0] ?? 50, y: parts[1] ?? 50 };
}

/** Selection state for card-level editing */
type CardSelection =
  | { type: "image"; cardId: string }
  | { type: "title"; cardId: string }
  | { type: "desc"; cardId: string }
  | null;

export default function UnevenGrid({
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
  onCardImageClick,
  onCardImagePositionChange,
  onCardImageZoomChange,
  onCardStyleChange,
}: UnevenGridProps) {
  const [headingSelected, setHeadingSelected] = useState(false);
  const [subheadingSelected, setSubheadingSelected] = useState(false);
  const [cardSel, setCardSel] = useState<CardSelection>(null);

  // Remove-BG state — tracks the currently-selected card's image
  const [removingBg, setRemovingBg] = useState(false);
  const [bgRemovedCardId, setBgRemovedCardId] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);

  const sectionRef = useRef<HTMLElement>(null);
  const imgColRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const cardTextRefs = useRef<Map<string, HTMLElement>>(new Map());
  const portalRef = useRef<HTMLDivElement>(null);

  // Portal position tracking
  const [portalPos, setPortalPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  // Get the anchor element for current selection
  const getAnchorEl = useCallback((): HTMLElement | null => {
    if (!cardSel) return null;
    if (cardSel.type === "image") {
      return imgColRefs.current.get(cardSel.cardId) || null;
    }
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

  const handleRemoveBg = useCallback(
    async (cardId: string, imageUrl: string) => {
      if (removingBg) return;
      setOriginalImageUrl(imageUrl);
      setBgRemovedCardId(cardId);
      setRemovingBg(true);
      try {
        const newUrl = await processRemoveBackground(imageUrl, "UnevenGrid");
        onCardStyleChange?.(cardId, { image: newUrl });
      } catch (err) {
        console.error("[DBG][UnevenGrid] Remove BG failed:", err);
        setOriginalImageUrl(null);
        setBgRemovedCardId(null);
      } finally {
        setRemovingBg(false);
      }
    },
    [removingBg, onCardStyleChange],
  );

  const handleUndoRemoveBg = useCallback(
    (cardId: string) => {
      if (!originalImageUrl || bgRemovedCardId !== cardId) return;
      onCardStyleChange?.(cardId, { image: originalImageUrl });
      setOriginalImageUrl(null);
      setBgRemovedCardId(null);
    },
    [originalImageUrl, bgRemovedCardId, onCardStyleChange],
  );

  const cardBg =
    brand.secondaryColor || getPastelTints(brand.primaryColor || "#6366f1")[0];
  const items = cards.length >= 4 ? cards.slice(0, 4) : cards;

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

  // Render floating portal toolbar for card selection
  const renderPortalToolbar = () => {
    if (!isEditing || !cardSel || !portalPos) return null;
    const card = items.find((c) => c.id === cardSel.cardId);
    if (!card) return null;

    let toolbarContent: React.ReactNode = null;

    if (cardSel.type === "image" && card.image) {
      const pos = parsePosition(card.imagePosition);
      toolbarContent = (
        <ImageToolbar
          borderRadius={0}
          positionX={pos.x}
          positionY={pos.y}
          zoom={card.imageZoom || 100}
          filter={card.imageFilter}
          onBorderRadiusChange={() => {}}
          onPositionChange={(x, y) =>
            onCardImagePositionChange?.(card.id, `${x}% ${y}%`)
          }
          onZoomChange={(v) => onCardImageZoomChange?.(card.id, v)}
          onFilterChange={(v) =>
            onCardStyleChange?.(card.id, {
              imageFilter: v === "none" ? undefined : v,
            })
          }
          onReplaceImage={() => onCardImageClick?.(card.id)}
          onRemoveBgClick={() => handleRemoveBg(card.id, card.image!)}
          removingBg={removingBg && bgRemovedCardId === card.id}
          bgRemoved={bgRemovedCardId === card.id && !removingBg}
          onUndoRemoveBg={() => handleUndoRemoveBg(card.id)}
        />
      );
    } else if (cardSel.type === "title") {
      toolbarContent = (
        <TextToolbar
          fontSize={card.titleFontSize ?? 24}
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
          color={card.descColor ?? "#4a4a4a"}
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
        .${SCOPE}-heading {
          font-size: clamp(1.5rem, 3vw, 2rem);
          font-weight: 700;
          margin: 0 0 8px;
          font-family: ${brand.headerFont || "inherit"};
          color: #1a1a1a;
        }
        .${SCOPE}-header { margin-bottom: 40px; }
        .${SCOPE}-subheading {
          font-size: 1rem;
          color: #6b7280;
          margin: 0 0 40px;
          font-family: ${brand.bodyFont || "inherit"};
        }
        .${SCOPE}-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          grid-template-rows: auto auto;
          gap: 16px;
        }
        .${SCOPE}-card {
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
          min-height: 220px;
          background: ${cardBg};
        }
        .${SCOPE}-card--0 { grid-row: 1 / 3; grid-column: 1; }
        .${SCOPE}-card--1 { grid-row: 1; grid-column: 2; aspect-ratio: 1; }
        .${SCOPE}-card--1 .${SCOPE}-card-img-col { order: -1; margin-top: 0; }
        .${SCOPE}-card--1 .${SCOPE}-card-text { padding: 16px 24px 24px; }
        .${SCOPE}-card--2 { grid-row: 1; grid-column: 3; aspect-ratio: 1; }
        .${SCOPE}-card--2 .${SCOPE}-card-img-col { order: -1; margin-top: 0; }
        .${SCOPE}-card--2 .${SCOPE}-card-text { padding: 16px 24px 24px; }
        .${SCOPE}-card--3 {
          grid-row: 2; grid-column: 2 / 4;
          flex-direction: row; align-items: center; gap: 24px;
        }
        .${SCOPE}-card--3 .${SCOPE}-card-text { padding: 24px; flex: 1; }
        .${SCOPE}-card--3 .${SCOPE}-card-img-col {
          width: 45%; height: 100%; flex-shrink: 0; order: 1; margin-top: 0;
        }
        .${SCOPE}-card--3 .${SCOPE}-card-img {
          width: 100%; height: 100%; max-height: none; object-fit: cover; margin-top: 0;
        }
        .${SCOPE}-card-text { padding: 24px 24px 0; }
        .${SCOPE}-card-title {
          font-size: clamp(1.3rem, 2.5vw, 1.8rem);
          font-weight: 800; color: #1a1a1a; margin: 0 0 8px;
          font-family: ${brand.headerFont || "inherit"}; line-height: 1.15;
        }
        .${SCOPE}-card-desc {
          font-size: 0.95rem; color: #4a4a4a; line-height: 1.6; margin: 0;
          font-family: ${brand.bodyFont || "inherit"};
        }
        .${SCOPE}-card-text-el--selected {
          outline: 2px solid #3b82f6;
          outline-offset: 4px;
          border-radius: 6px;
        }
        .${SCOPE}-card-img-col {
          position: relative; flex: 1; overflow: hidden; margin-top: 16px;
        }
        .${SCOPE}-card-img-col--selected {
          outline: 2px solid #3b82f6; outline-offset: -2px;
        }
        .${SCOPE}-card-img {
          width: 100%; height: 100%; object-fit: cover; display: block; border-radius: 0;
        }
        @media (max-width: 768px) {
          .${SCOPE}-grid { grid-template-columns: 1fr; grid-template-rows: auto; }
          .${SCOPE}-card--0, .${SCOPE}-card--1, .${SCOPE}-card--2, .${SCOPE}-card--3 {
            grid-row: auto; grid-column: auto;
          }
          .${SCOPE}-card { min-height: 180px; }
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
        {items.map((card, i) => {
          const pos = parsePosition(card.imagePosition);
          // MIN_POSITION_SCALE ensures both X and Y sliders have effect
          const MIN_POSITION_SCALE = 1.05;
          const cardUserScale = (card.imageZoom || 100) / 100;
          const zoomScale = Math.max(MIN_POSITION_SCALE, cardUserScale);
          const isTitleSel =
            cardSel?.type === "title" && cardSel.cardId === card.id;
          const isDescSel =
            cardSel?.type === "desc" && cardSel.cardId === card.id;
          const isImgSel =
            cardSel?.type === "image" && cardSel.cardId === card.id;

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
            <div key={card.id} className={`${SCOPE}-card ${SCOPE}-card--${i}`}>
              <div className={`${SCOPE}-card-text`}>
                {isEditing ? (
                  <h3
                    ref={(el) => {
                      if (el) cardTextRefs.current.set(`${card.id}-title`, el);
                      else cardTextRefs.current.delete(`${card.id}-title`);
                    }}
                    className={`${SCOPE}-card-title${isTitleSel ? ` ${SCOPE}-card-text-el--selected` : ""}`}
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
                  <h3 className={`${SCOPE}-card-title`} style={titleStyle}>
                    {card.title}
                  </h3>
                )}
                {isEditing ? (
                  <p
                    ref={(el) => {
                      if (el) cardTextRefs.current.set(`${card.id}-desc`, el);
                      else cardTextRefs.current.delete(`${card.id}-desc`);
                    }}
                    className={`${SCOPE}-card-desc${isDescSel ? ` ${SCOPE}-card-text-el--selected` : ""}`}
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
                  <p className={`${SCOPE}-card-desc`} style={descStyle}>
                    {card.description}
                  </p>
                )}
              </div>
              {card.image && (
                <div
                  ref={(el) => {
                    if (el) imgColRefs.current.set(card.id, el);
                    else imgColRefs.current.delete(card.id);
                  }}
                  className={`${SCOPE}-card-img-col${isImgSel ? ` ${SCOPE}-card-img-col--selected` : ""}`}
                  onClick={
                    isEditing
                      ? () => {
                          setCardSel({ type: "image", cardId: card.id });
                          setHeadingSelected(false);
                          setSubheadingSelected(false);
                        }
                      : undefined
                  }
                  style={isEditing ? { cursor: "pointer" } : undefined}
                >
                  <div
                    className={`${SCOPE}-card-img`}
                    role="img"
                    aria-label={card.title}
                    style={{
                      backgroundImage: `url(${card.image})`,
                      backgroundPosition: `${pos.x}% ${pos.y}%`,
                      backgroundSize: "cover",
                      backgroundRepeat: "no-repeat",
                      transform: `scale(${zoomScale})`,
                      transformOrigin: `${pos.x}% ${pos.y}%`,
                      filter: bgFilterToCSS(card.imageFilter) || "none",
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {renderPortalToolbar()}
    </section>
  );
}
