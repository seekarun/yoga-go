"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import type { Product, ProductImage } from "@/types";
import type { WidgetBrandConfig } from "../types";
import { getContrastColor } from "@/lib/colorPalette";

interface StaticEcomProps {
  products: Product[];
  heading?: string;
  subheading?: string;
  brand: WidgetBrandConfig;
  currency?: string;
  onBookProduct?: (productId: string) => void;
  onSignupWebinar?: (productId: string) => void;
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

/**
 * Image carousel for ecom-style product cards.
 * Square aspect ratio, arrows + dots on hover.
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
}: StaticEcomProps) {
  const active = useMemo(() => products.filter((p) => p.isActive), [products]);
  const useCarousel = active.length > 3;

  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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

  if (active.length === 0) return null;

  const primary = brand.primaryColor || "#6366f1";
  const secondary = brand.secondaryColor || primary;
  const badgeText = getContrastColor(secondary);

  const renderCards = () =>
    active.map((product) => {
      const isWebinar = product.productType === "webinar";
      return (
        <div key={product.id} className={`${SCOPE}-card`}>
          <div style={{ position: "relative" }}>
            <div className={`${SCOPE}-badge`}>
              {formatDuration(product.durationMinutes)}
            </div>
            <ImageCarousel
              images={product.images || []}
              fallbackImage={product.image}
              fallbackPosition={product.imagePosition}
              fallbackZoom={product.imageZoom}
            />
          </div>
          <div className={`${SCOPE}-body`}>
            <div className={`${SCOPE}-row-top`}>
              <h3 className={`${SCOPE}-name`}>{product.name}</h3>
            </div>
            {product.description && (
              <p className={`${SCOPE}-desc`}>{product.description}</p>
            )}
            <div className={`${SCOPE}-price-row`}>
              <span className={`${SCOPE}-price`}>
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
    <section className={SCOPE}>
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

      {(heading || subheading) && (
        <div className={`${SCOPE}-header`}>
          {heading && <h2 className={`${SCOPE}-heading`}>{heading}</h2>}
          {subheading && <p className={`${SCOPE}-subheading`}>{subheading}</p>}
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
    </section>
  );
}
