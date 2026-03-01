"use client";

import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useLayoutEffect,
} from "react";
import { createPortal } from "react-dom";
import type { Product, ProductImage } from "@/types";
import type {
  ProductsStyleOverrides,
  ProductCardStyleOverride,
} from "@/types/landing-page";
import type { WidgetBrandConfig } from "../types";
import { getContrastColor } from "@/lib/colorPalette";
import ResizableText from "../../hero/ResizableText";
import ImageToolbar from "../../hero/ImageToolbar";
import TextToolbar from "../../hero/TextToolbar";
import { bgFilterToCSS } from "../../hero/layoutOptions";
import { processRemoveBackground } from "../../hero/removeBackgroundUtil";

interface StaticEcomProps {
  products: Product[];
  heading?: string;
  subheading?: string;
  brand: WidgetBrandConfig;
  currency?: string;
  onBookProduct?: (productId: string) => void;
  onSignupWebinar?: (productId: string) => void;
  isEditing?: boolean;
  onHeadingChange?: (heading: string) => void;
  onSubheadingChange?: (subheading: string) => void;
  onStyleOverrideChange?: (overrides: ProductsStyleOverrides) => void;
  styleOverrides?: ProductsStyleOverrides;
  cardStyles?: Record<string, ProductCardStyleOverride>;
  onCardStyleChange?: (
    productId: string,
    patch: Partial<ProductCardStyleOverride>,
  ) => void;
}

const SCOPE = "w-pr-se";

const CURRENCY_SYMBOLS: Record<string, string> = {
  AUD: "$",
  USD: "$",
  GBP: "\u00a3",
  EUR: "\u20ac",
  INR: "\u20b9",
  NZD: "$",
  CAD: "$",
  SGD: "$",
};

function formatPrice(cents: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] || "$";
  const amount = cents / 100;
  return Number.isInteger(amount)
    ? `${symbol}${amount}`
    : `${symbol}${amount.toFixed(2)}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function parsePosition(pos?: string): { x: number; y: number } {
  if (!pos) return { x: 50, y: 50 };
  const parts = pos.split(/\s+/).map((p) => parseInt(p, 10));
  return { x: parts[0] ?? 50, y: parts[1] ?? 50 };
}

/** Selection state for card-level editing */
type CardSelection =
  | { type: "image"; productId: string }
  | { type: "name"; productId: string }
  | { type: "desc"; productId: string }
  | { type: "price"; productId: string }
  | null;

/**
 * Image carousel for ecom-style product cards.
 * Square aspect ratio, arrows + dots on hover.
 */
function ImageCarousel({
  images,
  fallbackImage,
  fallbackPosition,
  fallbackZoom,
  overridePosition,
  overrideZoom,
  overrideFilter,
  overrideImageUrl,
}: {
  images: ProductImage[];
  fallbackImage?: string;
  fallbackPosition?: string;
  fallbackZoom?: number;
  overridePosition?: string;
  overrideZoom?: number;
  overrideFilter?: string;
  overrideImageUrl?: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const slides = useMemo(
    () =>
      images.length > 0
        ? images
        : fallbackImage
          ? [
              {
                id: "legacy",
                url: fallbackImage,
                position: fallbackPosition,
                zoom: fallbackZoom,
              },
            ]
          : [],
    [images, fallbackImage, fallbackPosition, fallbackZoom],
  );

  const hasMultiple = slides.length > 1;

  const goNext = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    },
    [slides.length],
  );

  const goPrev = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
    },
    [slides.length],
  );

  if (slides.length === 0) {
    return (
      <div className={`${SCOPE}-img-placeholder`}>
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#bbb"
          strokeWidth="1.5"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
    );
  }

  const current = slides[currentIndex];
  const displayUrl = overrideImageUrl || current.url;
  const effectivePosition = overridePosition ?? current.position ?? "50% 50%";
  const pos = parsePosition(effectivePosition);
  // MIN_POSITION_SCALE ensures both X and Y sliders have effect
  const MIN_POSITION_SCALE = 1.05;
  const userScale = (overrideZoom ?? current.zoom ?? 100) / 100;
  const zoomScale = Math.max(MIN_POSITION_SCALE, userScale);

  return (
    <div className={`${SCOPE}-img-wrap`}>
      <div
        className={`${SCOPE}-img`}
        style={{
          backgroundImage: `url(${displayUrl})`,
          backgroundPosition: `${pos.x}% ${pos.y}%`,
          transform: `scale(${zoomScale})`,
          transformOrigin: `${pos.x}% ${pos.y}%`,
          filter: bgFilterToCSS(overrideFilter) || "none",
        }}
      />

      {/* Book / CTA icon button on the right side */}
      <button
        type="button"
        className={`${SCOPE}-img-action`}
        style={{ bottom: "16px", right: "16px" }}
        aria-label="Book now"
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path d="M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
        </svg>
      </button>

      {hasMultiple && (
        <>
          <button
            type="button"
            className={`${SCOPE}-img-arrow ${SCOPE}-img-arrow-left`}
            onClick={goPrev}
            aria-label="Previous image"
          >
            <svg width="14" height="14" viewBox="0 0 24 24">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            className={`${SCOPE}-img-arrow ${SCOPE}-img-arrow-right`}
            onClick={goNext}
            aria-label="Next image"
          >
            <svg width="14" height="14" viewBox="0 0 24 24">
              <polyline points="9 6 15 12 9 18" />
            </svg>
          </button>
          <div className={`${SCOPE}-img-dots`}>
            {slides.map((slide, idx) => (
              <button
                key={slide.id}
                type="button"
                className={`${SCOPE}-img-dot${idx === currentIndex ? " active" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                aria-label={`Go to image ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Products: Static Ecom Cards
 *
 * E-commerce inspired product cards with a soft sage/neutral palette.
 * Square image area with icon action buttons on the right edge,
 * product name + description line, price, and duration badge.
 * Based on a modern e-commerce card with floating action icons.
 */
export default function StaticEcom({
  products,
  heading,
  subheading,
  brand,
  currency = "AUD",
  onBookProduct,
  onSignupWebinar,
  isEditing,
  onHeadingChange,
  onSubheadingChange,
  onStyleOverrideChange,
  styleOverrides,
  cardStyles,
  onCardStyleChange,
}: StaticEcomProps) {
  const active = useMemo(() => products.filter((p) => p.isActive), [products]);
  const useCarousel = active.length > 3;

  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const [headingSelected, setHeadingSelected] = useState(false);
  const [subheadingSelected, setSubheadingSelected] = useState(false);
  const [cardSel, setCardSel] = useState<CardSelection>(null);

  // Remove-BG state
  const [removingBg, setRemovingBg] = useState(false);
  const [bgRemovedProductId, setBgRemovedProductId] = useState<string | null>(
    null,
  );
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);

  const sectionRef = useRef<HTMLElement>(null);
  const imgRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const cardTextRefs = useRef<Map<string, HTMLElement>>(new Map());
  const portalRef = useRef<HTMLDivElement>(null);

  const [portalPos, setPortalPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const getAnchorEl = useCallback((): HTMLElement | null => {
    if (!cardSel) return null;
    if (cardSel.type === "image") {
      return imgRefs.current.get(cardSel.productId) || null;
    }
    const key = `${cardSel.productId}-${cardSel.type}`;
    return cardTextRefs.current.get(key) || null;
  }, [cardSel]);

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
    (patch: Partial<ProductsStyleOverrides>) => {
      onStyleOverrideChange?.({ ...styleOverrides, ...patch });
    },
    [styleOverrides, onStyleOverrideChange],
  );

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  const scroll = useCallback((direction: "left" | "right") => {
    const el = trackRef.current;
    if (!el) return;
    const cardWidth = el.querySelector(`.${SCOPE}-card`)?.clientWidth || 320;
    el.scrollBy({
      left: direction === "left" ? -cardWidth - 24 : cardWidth + 24,
    });
  }, []);

  // Check arrows on mount and when products change
  useEffect(() => {
    updateArrows();
  }, [updateArrows, active.length]);

  const handleRemoveBg = useCallback(
    async (productId: string, imageUrl: string) => {
      if (removingBg) return;
      setOriginalImageUrl(imageUrl);
      setBgRemovedProductId(productId);
      setRemovingBg(true);
      try {
        const newUrl = await processRemoveBackground(imageUrl, "StaticEcom");
        onCardStyleChange?.(productId, { bgRemovedImageUrl: newUrl });
      } catch (err) {
        console.error("[DBG][StaticEcom] Remove BG failed:", err);
        setOriginalImageUrl(null);
        setBgRemovedProductId(null);
      } finally {
        setRemovingBg(false);
      }
    },
    [removingBg, onCardStyleChange],
  );

  const handleUndoRemoveBg = useCallback(
    (productId: string) => {
      if (!originalImageUrl || bgRemovedProductId !== productId) return;
      onCardStyleChange?.(productId, { bgRemovedImageUrl: undefined });
      setOriginalImageUrl(null);
      setBgRemovedProductId(null);
    },
    [originalImageUrl, bgRemovedProductId, onCardStyleChange],
  );

  if (active.length === 0) return null;

  const headingStyle: React.CSSProperties = {
    fontSize: styleOverrides?.headingFontSize ?? "clamp(1.75rem, 3vw, 2.5rem)",
    fontWeight: styleOverrides?.headingFontWeight ?? 700,
    fontStyle: styleOverrides?.headingFontStyle ?? "normal",
    color: styleOverrides?.headingTextColor ?? "#1a1a1a",
    textAlign: styleOverrides?.headingTextAlign ?? "center",
    fontFamily:
      styleOverrides?.headingFontFamily || brand.headerFont || "inherit",
    lineHeight: 1.15,
    margin: "0 0 12px",
  };

  const subheadingStyle: React.CSSProperties = {
    fontSize: styleOverrides?.subheadingFontSize ?? "1.1rem",
    fontWeight: styleOverrides?.subheadingFontWeight ?? "normal",
    fontStyle: styleOverrides?.subheadingFontStyle ?? "normal",
    color: styleOverrides?.subheadingTextColor ?? "#6b7280",
    textAlign: styleOverrides?.subheadingTextAlign ?? "center",
    fontFamily:
      styleOverrides?.subheadingFontFamily || brand.bodyFont || "inherit",
    maxWidth: 600,
    margin: "0 auto",
  };

  const primary = brand.primaryColor || "#6366f1";
  const secondary = brand.secondaryColor || primary;
  const badgeText = getContrastColor(secondary);

  const renderPortalToolbar = () => {
    if (!isEditing || !cardSel || !portalPos) return null;
    const product = active.find((p) => p.id === cardSel.productId);
    if (!product) return null;
    const cs = cardStyles?.[product.id];

    let toolbarContent: React.ReactNode = null;

    if (cardSel.type === "image") {
      const pos = parsePosition(cs?.imagePosition ?? product.imagePosition);
      const imgUrl = product.images?.[0]?.url || product.image;
      toolbarContent = (
        <ImageToolbar
          borderRadius={0}
          positionX={pos.x}
          positionY={pos.y}
          zoom={cs?.imageZoom ?? product.imageZoom ?? 100}
          filter={cs?.imageFilter}
          onBorderRadiusChange={() => {}}
          onPositionChange={(x, y) =>
            onCardStyleChange?.(product.id, {
              imagePosition: `${x}% ${y}%`,
            })
          }
          onZoomChange={(v) =>
            onCardStyleChange?.(product.id, { imageZoom: v })
          }
          onFilterChange={(v) =>
            onCardStyleChange?.(product.id, {
              imageFilter: v === "none" ? undefined : v,
            })
          }
          onReplaceImage={() => {}}
          onRemoveBgClick={
            imgUrl ? () => handleRemoveBg(product.id, imgUrl) : undefined
          }
          removingBg={removingBg && bgRemovedProductId === product.id}
          bgRemoved={bgRemovedProductId === product.id && !removingBg}
          onUndoRemoveBg={() => handleUndoRemoveBg(product.id)}
        />
      );
    } else if (cardSel.type === "name") {
      toolbarContent = (
        <TextToolbar
          fontSize={cs?.nameFontSize ?? 17}
          fontFamily={cs?.nameFontFamily ?? ""}
          fontWeight={cs?.nameFontWeight ?? "bold"}
          fontStyle={cs?.nameFontStyle ?? "normal"}
          color={cs?.nameColor ?? "#1a1a1a"}
          textAlign={cs?.nameTextAlign ?? "left"}
          onFontSizeChange={(v) =>
            onCardStyleChange?.(product.id, { nameFontSize: v })
          }
          onFontFamilyChange={(v) =>
            onCardStyleChange?.(product.id, { nameFontFamily: v })
          }
          onFontWeightChange={(v) =>
            onCardStyleChange?.(product.id, { nameFontWeight: v })
          }
          onFontStyleChange={(v) =>
            onCardStyleChange?.(product.id, { nameFontStyle: v })
          }
          onColorChange={(v) =>
            onCardStyleChange?.(product.id, { nameColor: v })
          }
          onTextAlignChange={(v) =>
            onCardStyleChange?.(product.id, { nameTextAlign: v })
          }
        />
      );
    } else if (cardSel.type === "desc") {
      toolbarContent = (
        <TextToolbar
          fontSize={cs?.descFontSize ?? 14}
          fontFamily={cs?.descFontFamily ?? ""}
          fontWeight={cs?.descFontWeight ?? "normal"}
          fontStyle={cs?.descFontStyle ?? "normal"}
          color={cs?.descColor ?? "#374151"}
          textAlign={cs?.descTextAlign ?? "left"}
          onFontSizeChange={(v) =>
            onCardStyleChange?.(product.id, { descFontSize: v })
          }
          onFontFamilyChange={(v) =>
            onCardStyleChange?.(product.id, { descFontFamily: v })
          }
          onFontWeightChange={(v) =>
            onCardStyleChange?.(product.id, { descFontWeight: v })
          }
          onFontStyleChange={(v) =>
            onCardStyleChange?.(product.id, { descFontStyle: v })
          }
          onColorChange={(v) =>
            onCardStyleChange?.(product.id, { descColor: v })
          }
          onTextAlignChange={(v) =>
            onCardStyleChange?.(product.id, { descTextAlign: v })
          }
        />
      );
    } else if (cardSel.type === "price") {
      toolbarContent = (
        <TextToolbar
          fontSize={cs?.priceFontSize ?? 18}
          fontFamily=""
          fontWeight="bold"
          fontStyle="normal"
          color={cs?.priceColor ?? "#1a1a1a"}
          textAlign="left"
          onFontSizeChange={(v) =>
            onCardStyleChange?.(product.id, { priceFontSize: v })
          }
          onColorChange={(v) =>
            onCardStyleChange?.(product.id, { priceColor: v })
          }
          onFontFamilyChange={() => {}}
          onFontWeightChange={() => {}}
          onFontStyleChange={() => {}}
          onTextAlignChange={() => {}}
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

  const renderCards = () =>
    active.map((product) => {
      const isWebinar = product.productType === "webinar";
      const cs = cardStyles?.[product.id];

      const isNameSel =
        cardSel?.type === "name" && cardSel.productId === product.id;
      const isDescSel =
        cardSel?.type === "desc" && cardSel.productId === product.id;
      const isPriceSel =
        cardSel?.type === "price" && cardSel.productId === product.id;
      const isImgSel =
        cardSel?.type === "image" && cardSel.productId === product.id;

      const nameStyle: React.CSSProperties = {
        ...(cs?.nameFontSize ? { fontSize: cs.nameFontSize } : {}),
        ...(cs?.nameFontWeight ? { fontWeight: cs.nameFontWeight } : {}),
        ...(cs?.nameFontStyle ? { fontStyle: cs.nameFontStyle } : {}),
        ...(cs?.nameColor ? { color: cs.nameColor } : {}),
        ...(cs?.nameTextAlign ? { textAlign: cs.nameTextAlign } : {}),
        ...(cs?.nameFontFamily ? { fontFamily: cs.nameFontFamily } : {}),
      };

      const descStyle: React.CSSProperties = {
        ...(cs?.descFontSize ? { fontSize: cs.descFontSize } : {}),
        ...(cs?.descFontWeight ? { fontWeight: cs.descFontWeight } : {}),
        ...(cs?.descFontStyle ? { fontStyle: cs.descFontStyle } : {}),
        ...(cs?.descColor ? { color: cs.descColor } : {}),
        ...(cs?.descTextAlign ? { textAlign: cs.descTextAlign } : {}),
        ...(cs?.descFontFamily ? { fontFamily: cs.descFontFamily } : {}),
      };

      const priceStyle: React.CSSProperties = {
        ...(cs?.priceFontSize ? { fontSize: cs.priceFontSize } : {}),
        ...(cs?.priceColor ? { color: cs.priceColor } : {}),
      };

      return (
        <div key={product.id} className={`${SCOPE}-card`}>
          <div style={{ position: "relative" }}>
            <div className={`${SCOPE}-badge`}>
              {formatDuration(product.durationMinutes)}
            </div>
            <div
              ref={(el) => {
                if (el) imgRefs.current.set(product.id, el);
                else imgRefs.current.delete(product.id);
              }}
              className={isImgSel ? `${SCOPE}-img-col--selected` : undefined}
              onClick={
                isEditing
                  ? () => {
                      setCardSel({
                        type: "image",
                        productId: product.id,
                      });
                      setHeadingSelected(false);
                      setSubheadingSelected(false);
                    }
                  : undefined
              }
              style={isEditing ? { cursor: "pointer" } : undefined}
            >
              <ImageCarousel
                images={product.images || []}
                fallbackImage={product.image}
                fallbackPosition={product.imagePosition}
                fallbackZoom={product.imageZoom}
                overridePosition={cs?.imagePosition}
                overrideZoom={cs?.imageZoom}
                overrideFilter={cs?.imageFilter}
                overrideImageUrl={cs?.bgRemovedImageUrl}
              />
            </div>
          </div>
          <div className={`${SCOPE}-body`}>
            <div className={`${SCOPE}-row-top`}>
              <h3
                ref={(el) => {
                  if (el) cardTextRefs.current.set(`${product.id}-name`, el);
                  else cardTextRefs.current.delete(`${product.id}-name`);
                }}
                className={`${SCOPE}-name${isNameSel ? ` ${SCOPE}-card-text--selected` : ""}`}
                style={nameStyle}
                onClick={
                  isEditing
                    ? () => {
                        setCardSel({
                          type: "name",
                          productId: product.id,
                        });
                        setHeadingSelected(false);
                        setSubheadingSelected(false);
                      }
                    : undefined
                }
              >
                {product.name}
              </h3>
            </div>
            {product.description && (
              <p
                ref={(el) => {
                  if (el) cardTextRefs.current.set(`${product.id}-desc`, el);
                  else cardTextRefs.current.delete(`${product.id}-desc`);
                }}
                className={`${SCOPE}-desc${isDescSel ? ` ${SCOPE}-card-text--selected` : ""}`}
                style={descStyle}
                onClick={
                  isEditing
                    ? () => {
                        setCardSel({
                          type: "desc",
                          productId: product.id,
                        });
                        setHeadingSelected(false);
                        setSubheadingSelected(false);
                      }
                    : undefined
                }
              >
                {product.description}
              </p>
            )}
            <div className={`${SCOPE}-price-row`}>
              <span
                ref={(el) => {
                  if (el) cardTextRefs.current.set(`${product.id}-price`, el);
                  else cardTextRefs.current.delete(`${product.id}-price`);
                }}
                className={`${SCOPE}-price${isPriceSel ? ` ${SCOPE}-card-text--selected` : ""}`}
                style={priceStyle}
                onClick={
                  isEditing
                    ? () => {
                        setCardSel({
                          type: "price",
                          productId: product.id,
                        });
                        setHeadingSelected(false);
                        setSubheadingSelected(false);
                      }
                    : undefined
                }
              >
                {product.price > 0
                  ? formatPrice(product.price, currency)
                  : "Free"}
              </span>
            </div>
            <button
              type="button"
              className={`${SCOPE}-btn`}
              onClick={() =>
                isWebinar
                  ? onSignupWebinar?.(product.id)
                  : onBookProduct?.(product.id)
              }
            >
              {isWebinar ? "Register" : "Book Now"}
            </button>
          </div>
        </div>
      );
    });

  return (
    <section className={SCOPE} ref={sectionRef}>
      <style>{`
        .${SCOPE} {
          padding: 80px 24px;
        }
        .${SCOPE}-header {
          text-align: center;
          margin-bottom: 48px;
        }
        .${SCOPE}-heading {
          font-size: clamp(1.75rem, 3vw, 2.5rem);
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 12px;
          font-family: ${brand.headerFont || "inherit"};
        }
        .${SCOPE}-subheading {
          font-size: 1.1rem;
          color: #6b7280;
          max-width: 600px;
          margin: 0 auto;
          font-family: ${brand.bodyFont || "inherit"};
        }

        /* ---- grid layout (<=3 products) ---- */
        .${SCOPE}-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 24px;
          max-width: 1200px;
          margin: 0 auto;
        }

        /* ---- carousel layout (>3 products) ---- */
        .${SCOPE}-carousel {
          position: relative;
          max-width: 1200px;
          margin: 0 auto;
        }
        .${SCOPE}-track {
          display: flex;
          gap: 24px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          scroll-behavior: smooth;
        }
        .${SCOPE}-track::-webkit-scrollbar {
          display: none;
        }

        /* ---- carousel arrows ---- */
        .${SCOPE}-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid #e5e7eb;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 4;
          transition: opacity 0.2s, box-shadow 0.2s;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .${SCOPE}-arrow:hover {
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        }
        .${SCOPE}-arrow svg {
          fill: none;
          stroke: #374151;
          stroke-width: 2.5;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .${SCOPE}-arrow-left {
          left: -22px;
        }
        .${SCOPE}-arrow-right {
          right: -22px;
        }

        /* ---- card ---- */
        .${SCOPE}-card {
          background: transparent;
          border-radius: 20px;
          overflow: hidden;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
          display: flex;
          flex-direction: column;
        }
        .${SCOPE}-carousel .${SCOPE}-card {
          min-width: 300px;
          max-width: 340px;
          flex-shrink: 0;
          scroll-snap-align: start;
        }
        .${SCOPE}-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
        }

        /* ---- image area (square) ---- */
        .${SCOPE}-img-col--selected {
          outline: 2px solid #3b82f6;
          outline-offset: -2px;
          border-radius: 20px;
        }
        .${SCOPE}-img-wrap {
          position: relative;
          width: 100%;
          padding-top: 100%;
          background: #eaeae5;
          overflow: hidden;
          border-radius: 20px;
        }
        .${SCOPE}-img {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-repeat: no-repeat;
          transition: background-image 0.3s ease;
        }
        .${SCOPE}-img-placeholder {
          width: 100%;
          padding-top: 100%;
          background: #eaeae5;
          border-radius: 20px;
          position: relative;
        }
        .${SCOPE}-img-placeholder svg {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }

        /* floating action icon */
        .${SCOPE}-img-action {
          position: absolute;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(4px);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 3;
          transition: background 0.2s, transform 0.15s;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }
        .${SCOPE}-img-action svg {
          fill: none;
          stroke: #374151;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .${SCOPE}-img-action:hover {
          background: #fff;
          transform: scale(1.08);
        }

        /* duration badge */
        .${SCOPE}-badge {
          position: absolute;
          top: 14px;
          left: 14px;
          padding: 5px 14px;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          color: ${badgeText};
          background: ${secondary};
          z-index: 3;
          font-family: ${brand.bodyFont || "inherit"};
          letter-spacing: 0.02em;
        }

        /* carousel arrows */
        .${SCOPE}-img-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.4);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s;
          z-index: 2;
        }
        .${SCOPE}-img-arrow svg {
          fill: none;
          stroke: #fff;
          stroke-width: 2.5;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .${SCOPE}-img-wrap:hover .${SCOPE}-img-arrow {
          opacity: 1;
        }
        .${SCOPE}-img-arrow:hover {
          background: rgba(0, 0, 0, 0.6);
        }
        .${SCOPE}-img-arrow-left {
          left: 10px;
        }
        .${SCOPE}-img-arrow-right {
          right: 10px;
        }

        /* carousel dots */
        .${SCOPE}-img-dots {
          position: absolute;
          bottom: 10px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 6px;
          z-index: 2;
        }
        .${SCOPE}-img-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          border: none;
          padding: 0;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.5);
          transition: background 0.2s, width 0.2s;
        }
        .${SCOPE}-img-dot.active {
          background: #fff;
          width: 18px;
          border-radius: 4px;
        }

        /* ---- card body ---- */
        .${SCOPE}-body {
          padding: 16px 20px 20px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .${SCOPE}-row-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 4px;
        }
        .${SCOPE}-name {
          font-size: 1.05rem;
          font-weight: 600;
          color: #1a1a1a;
          margin: 0;
          font-family: ${brand.headerFont || "inherit"};
          line-height: 1.3;
        }
        .${SCOPE}-desc {
          font-size: 0.85rem;
          font-weight: 500;
          color: #374151;
          margin: 0 0 12px;
          flex: 1;
          font-family: ${brand.bodyFont || "inherit"};
          line-height: 1.6;
        }
        .${SCOPE}-card-text--selected {
          outline: 2px solid #3b82f6;
          outline-offset: 4px;
          border-radius: 6px;
        }
        .${SCOPE}-price-row {
          display: flex;
          align-items: baseline;
          gap: 10px;
        }
        .${SCOPE}-price {
          font-size: 1.15rem;
          font-weight: 800;
          color: #1a1a1a;
          font-family: ${brand.bodyFont || "inherit"};
        }
        .${SCOPE}-btn {
          display: block;
          width: 100%;
          margin-top: 14px;
          padding: 11px 20px;
          border-radius: 12px;
          border: none;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s;
          color: ${getContrastColor(primary)};
          background: ${primary};
          font-family: ${brand.bodyFont || "inherit"};
        }
        .${SCOPE}-btn:hover {
          opacity: 0.88;
          transform: scale(1.02);
        }

        @media (max-width: 768px) {
          .${SCOPE} {
            padding: 48px 16px;
          }
          .${SCOPE}-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .${SCOPE}-track {
            gap: 16px;
          }
          .${SCOPE}-carousel .${SCOPE}-card {
            min-width: 260px;
            max-width: 300px;
          }
          .${SCOPE}-card {
            border-radius: 16px;
          }
          .${SCOPE}-img-wrap {
            border-radius: 16px;
          }
          .${SCOPE}-arrow-left {
            left: 8px;
          }
          .${SCOPE}-arrow-right {
            right: 8px;
          }
        }
      `}</style>

      {(heading || subheading || isEditing) && (
        <div className={`${SCOPE}-header`}>
          {isEditing ? (
            <ResizableText
              text={heading || "Services"}
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
                textAlign: styleOverrides?.headingTextAlign ?? "center",
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
              text={subheading || "Browse our offerings"}
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
                fontSize: styleOverrides?.subheadingFontSize ?? 17,
                fontFamily: styleOverrides?.subheadingFontFamily ?? "",
                fontWeight: styleOverrides?.subheadingFontWeight ?? "normal",
                fontStyle: styleOverrides?.subheadingFontStyle ?? "normal",
                color: styleOverrides?.subheadingTextColor ?? "#6b7280",
                textAlign: styleOverrides?.subheadingTextAlign ?? "center",
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

      {useCarousel ? (
        <div className={`${SCOPE}-carousel`}>
          {canScrollLeft && (
            <button
              type="button"
              className={`${SCOPE}-arrow ${SCOPE}-arrow-left`}
              onClick={() => scroll("left")}
              aria-label="Scroll left"
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
          {canScrollRight && (
            <button
              type="button"
              className={`${SCOPE}-arrow ${SCOPE}-arrow-right`}
              onClick={() => scroll("right")}
              aria-label="Scroll right"
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <polyline points="9 6 15 12 9 18" />
              </svg>
            </button>
          )}

          {}
          <div
            className={`${SCOPE}-track`}
            ref={trackRef}
            onScroll={updateArrows}
            onMouseEnter={updateArrows}
          >
            {renderCards()}
          </div>
        </div>
      ) : (
        <div className={`${SCOPE}-grid`}>{renderCards()}</div>
      )}

      {renderPortalToolbar()}
    </section>
  );
}
