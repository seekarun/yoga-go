"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import type { Product, ProductImage } from "@/types";
import type { ProductsStyleOverrides } from "@/types/landing-page";
import type { WidgetBrandConfig } from "../types";
import { getContrastColor } from "@/lib/colorPalette";
import ResizableText from "../../hero/ResizableText";

interface StaticVerticalProps {
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
}

const SCOPE = "w-pr-sv";

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

/**
 * Tiny image carousel for product cards.
 * Shows dot indicators + swipe-style prev/next arrows on hover.
 */
function ImageCarousel({
  images,
  fallbackImage,
  fallbackPosition,
  fallbackZoom,
}: {
  images: ProductImage[];
  fallbackImage?: string;
  fallbackPosition?: string;
  fallbackZoom?: number;
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
    // Placeholder when no images
    return (
      <div className={`${SCOPE}-img-placeholder`}>
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ccc"
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

  return (
    <div className={`${SCOPE}-img-wrap`}>
      <div
        className={`${SCOPE}-img`}
        style={{
          backgroundImage: `url(${current.url})`,
          backgroundPosition: current.position || "50% 50%",
          transform: current.zoom ? `scale(${current.zoom / 100})` : undefined,
        }}
      />
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
 * Products: Static Vertical Cards
 *
 * Clean vertical product cards in a responsive grid.
 * Large rounded image area (always a carousel), product name,
 * description, price, and a "Book Now" CTA button.
 * Inspired by modern e-commerce card layouts.
 */
export default function StaticVertical({
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
}: StaticVerticalProps) {
  const active = useMemo(() => products.filter((p) => p.isActive), [products]);
  const useCarousel = active.length > 3;

  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const [headingSelected, setHeadingSelected] = useState(false);
  const [subheadingSelected, setSubheadingSelected] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isEditing) return;
    const handler = (e: MouseEvent) => {
      if (
        sectionRef.current &&
        !sectionRef.current.contains(e.target as Node)
      ) {
        setHeadingSelected(false);
        setSubheadingSelected(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isEditing]);

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
      left: direction === "left" ? -cardWidth - 28 : cardWidth + 28,
    });
  }, []);

  useEffect(() => {
    updateArrows();
  }, [updateArrows, active.length]);

  if (active.length === 0) return null;

  const renderCards = () =>
    active.map((product) => {
      const isWebinar = product.productType === "webinar";
      return (
        <div key={product.id} className={`${SCOPE}-card`}>
          <ImageCarousel
            images={product.images || []}
            fallbackImage={product.image}
            fallbackPosition={product.imagePosition}
            fallbackZoom={product.imageZoom}
          />
          <div className={`${SCOPE}-body`}>
            <h3 className={`${SCOPE}-name`}>{product.name}</h3>
            {product.description && (
              <p className={`${SCOPE}-desc`}>{product.description}</p>
            )}
            <div className={`${SCOPE}-meta`}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>{formatDuration(product.durationMinutes)}</span>
            </div>
            <div className={`${SCOPE}-footer`}>
              <span className={`${SCOPE}-price`}>
                {product.price > 0
                  ? formatPrice(product.price, currency)
                  : "Free"}
              </span>
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
        </div>
      );
    });

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
          gap: 28px;
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
          gap: 28px;
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
        .${SCOPE}-nav-arrow {
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
        .${SCOPE}-nav-arrow:hover {
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        }
        .${SCOPE}-nav-arrow svg {
          fill: none;
          stroke: #374151;
          stroke-width: 2.5;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .${SCOPE}-nav-arrow-left {
          left: -22px;
        }
        .${SCOPE}-nav-arrow-right {
          right: -22px;
        }

        /* ---- card ---- */
        .${SCOPE}-card {
          background: ${brand.secondaryColor || "#fff"};
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 2px 16px rgba(0, 0, 0, 0.06);
          border: 1px solid #f0f0f0;
          display: flex;
          flex-direction: column;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .${SCOPE}-carousel .${SCOPE}-card {
          min-width: 300px;
          max-width: 340px;
          flex-shrink: 0;
          scroll-snap-align: start;
        }
        .${SCOPE}-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.10);
        }

        /* ---- image area ---- */
        .${SCOPE}-img-wrap {
          position: relative;
          width: 100%;
          padding-top: 75%;
          background: #f3f4f6;
          overflow: hidden;
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
          padding-top: 75%;
          background: #f3f4f6;
          position: relative;
        }
        .${SCOPE}-img-placeholder svg {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }

        /* carousel arrows */
        .${SCOPE}-img-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.45);
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
          background: rgba(0, 0, 0, 0.65);
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

        /* ---- card content ---- */
        .${SCOPE}-body {
          padding: 20px 24px 24px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .${SCOPE}-name {
          font-size: 1.2rem;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 6px;
          font-family: ${brand.headerFont || "inherit"};
        }
        .${SCOPE}-desc {
          font-size: 0.95rem;
          color: #6b7280;
          line-height: 1.6;
          margin: 0 0 16px;
          font-family: ${brand.bodyFont || "inherit"};
          /* clamp to 3 lines */
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          flex: 1;
        }
        .${SCOPE}-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 0.8rem;
          color: #9ca3af;
          font-family: ${brand.bodyFont || "inherit"};
        }
        .${SCOPE}-meta svg {
          flex-shrink: 0;
        }
        .${SCOPE}-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: auto;
          padding-top: 16px;
          border-top: 1px solid #f0f0f0;
        }
        .${SCOPE}-price {
          font-size: 1.3rem;
          font-weight: 800;
          color: #1a1a1a;
          font-family: ${brand.bodyFont || "inherit"};
        }
        .${SCOPE}-btn {
          padding: 10px 24px;
          border-radius: 50px;
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
          opacity: 0.85;
          transform: scale(1.03);
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
          .${SCOPE}-nav-arrow-left {
            left: 8px;
          }
          .${SCOPE}-nav-arrow-right {
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
              className={`${SCOPE}-nav-arrow ${SCOPE}-nav-arrow-left`}
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
              className={`${SCOPE}-nav-arrow ${SCOPE}-nav-arrow-right`}
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
    </section>
  );
}
