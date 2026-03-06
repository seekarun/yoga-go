"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
} from "react";
import { createPortal } from "react-dom";
import type {
  CustomFontType,
  FeatureCard,
  SectionStyleOverrides,
} from "@/types/landing-page";
import type { WidgetBrandConfig } from "../types";
import ResizableText from "../../hero/ResizableText";
import { fontForRole } from "../../hero/fontUtils";
import ImageToolbar from "../../hero/ImageToolbar";
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
  onAddCustomFontType?: (ft: CustomFontType) => void;
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
type CardSelection = { type: "image"; cardId: string } | null;
type CardTextSelection = {
  type: "title" | "desc";
  cardId: string;
} | null;

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
  onAddCustomFontType,
}: UnevenGridProps) {
  const [headingSelected, setHeadingSelected] = useState(false);
  const [subheadingSelected, setSubheadingSelected] = useState(false);
  const [cardSel, setCardSel] = useState<CardSelection>(null);
  const [cardTextSel, setCardTextSel] = useState<CardTextSelection>(null);

  // Remove-BG state — tracks the currently-selected card's image
  const [removingBg, setRemovingBg] = useState(false);
  const [bgRemovedCardId, setBgRemovedCardId] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);

  const sectionRef = useRef<HTMLElement>(null);
  const imgColRefs = useRef<Map<string, HTMLDivElement>>(new Map());
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
    return imgColRefs.current.get(cardSel.cardId) || null;
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
        setCardTextSel(null);
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

  const headingRole = styleOverrides?.headingTypography || "sub-header";
  const headingResolved = fontForRole(headingRole, brand);
  const headingStyle: React.CSSProperties = {
    fontSize: headingResolved.size,
    fontWeight: headingResolved.weight ?? 700,
    color: headingResolved.color ?? "#1a1a1a",
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
    color: subheadingResolved.color ?? "#6b7280",
    textAlign: styleOverrides?.subheadingTextAlign ?? "left",
    fontFamily: subheadingResolved.font || "inherit",
    margin: "0 0 40px",
  };

  // Base resolved fonts for CSS template literals (section heading/subheading)
  const innerSubHeader = fontForRole("sub-header", brand);
  const innerBody = fontForRole("body", brand);

  // Card-level typography (shared across all cards, configurable via toolbar)
  const cardTitleRole = styleOverrides?.cardTitleTypography || "sub-header";
  const cardTitleFont = fontForRole(cardTitleRole, brand);
  const cardTitleStyle: React.CSSProperties = {
    fontSize: cardTitleFont.size,
    fontWeight: cardTitleFont.weight ?? 800,
    color: cardTitleFont.color || "#1a1a1a",
    fontFamily: cardTitleFont.font || "inherit",
    lineHeight: 1.15,
    margin: "0 0 8px",
  };

  const cardDescRole = styleOverrides?.cardDescTypography || "body";
  const cardDescFont = fontForRole(cardDescRole, brand);
  const cardDescStyle: React.CSSProperties = {
    fontSize: cardDescFont.size,
    fontWeight: cardDescFont.weight ?? "normal",
    color: cardDescFont.color || "#4a4a4a",
    fontFamily: cardDescFont.font || "inherit",
    lineHeight: 1.6,
    margin: 0,
  };

  // Render floating portal toolbar for card image selection
  const renderPortalToolbar = () => {
    if (!isEditing || !cardSel || !portalPos) return null;
    if (cardSel.type !== "image") return null;
    const card = items.find((c) => c.id === cardSel.cardId);
    if (!card || !card.image) return null;

    const pos = parsePosition(card.imagePosition);
    const toolbarContent = (
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
          font-family: ${innerSubHeader.font || "inherit"};
          color: ${innerSubHeader.color || "#1a1a1a"};
        }
        .${SCOPE}-header { margin-bottom: 40px; }
        .${SCOPE}-subheading {
          font-size: 1rem;
          color: ${innerBody.color || "#6b7280"};
          margin: 0 0 40px;
          font-family: ${innerBody.font || "inherit"};
        }
        .${SCOPE}-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          grid-template-rows: auto auto;
          gap: ${brand.cardStyle?.margin ?? 16}px;
        }
        .${SCOPE}-card {
          border-radius: ${brand.cardStyle?.borderRadius ?? 20}px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: ${isEditing ? "visible" : "hidden"};
          min-height: 220px;
          background: ${brand.cardStyle?.bgColor || cardBg};
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
        .${SCOPE}-card-text { padding: ${brand.cardStyle?.padding ?? 24}px ${brand.cardStyle?.padding ?? 24}px 0; }
        .${SCOPE}-card-title {
          font-size: ${cardTitleFont.size}px;
          font-weight: ${cardTitleFont.weight ?? 800}; color: ${cardTitleFont.color || "#1a1a1a"}; margin: 0 0 8px;
          font-family: ${cardTitleFont.font || "inherit"}; line-height: 1.15;
        }
        .${SCOPE}-card-desc {
          font-size: ${cardDescFont.size}px; color: ${cardDescFont.color || "#4a4a4a"}; line-height: 1.6; margin: 0;
          font-family: ${cardDescFont.font || "inherit"};
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
                setCardSel(null);
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
        {items.map((card, i) => {
          const pos = parsePosition(card.imagePosition);
          // MIN_POSITION_SCALE ensures both X and Y sliders have effect
          const MIN_POSITION_SCALE = 1.05;
          const cardUserScale = (card.imageZoom || 100) / 100;
          const zoomScale = Math.max(MIN_POSITION_SCALE, cardUserScale);
          const isImgSel =
            cardSel?.type === "image" && cardSel.cardId === card.id;

          return (
            <div key={card.id} className={`${SCOPE}-card ${SCOPE}-card--${i}`}>
              <div className={`${SCOPE}-card-text`}>
                {isEditing ? (
                  <ResizableText
                    text={card.title || "Card Title"}
                    isEditing
                    onTextChange={(text) =>
                      onCardChange?.(card.id, "title", text)
                    }
                    textStyle={cardTitleStyle}
                    selected={
                      cardTextSel?.type === "title" &&
                      cardTextSel.cardId === card.id
                    }
                    onSelect={() => {
                      setCardTextSel({ type: "title", cardId: card.id });
                      setHeadingSelected(false);
                      setSubheadingSelected(false);
                      setCardSel(null);
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
                  <h3 className={`${SCOPE}-card-title`} style={cardTitleStyle}>
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
                      cardTextSel?.type === "desc" &&
                      cardTextSel.cardId === card.id
                    }
                    onSelect={() => {
                      setCardTextSel({ type: "desc", cardId: card.id });
                      setHeadingSelected(false);
                      setSubheadingSelected(false);
                      setCardSel(null);
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
                  <p className={`${SCOPE}-card-desc`} style={cardDescStyle}>
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
