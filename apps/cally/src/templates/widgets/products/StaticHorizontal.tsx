"use client";

import { useState, useCallback, useMemo } from "react";
import type { Product, ProductImage } from "@/types";
import type { WidgetBrandConfig } from "../types";
import { getContrastColor } from "@/lib/colorPalette";

interface StaticHorizontalProps {
  products: Product[];
  heading?: string;
  subheading?: string;
  brand: WidgetBrandConfig;
  currency?: string;
  onBookProduct?: (productId: string) => void;
  onSignupWebinar?: (productId: string) => void;
}

const SCOPE = "w-pr-sh";

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
 * Image carousel for horizontal product cards.
 * 4:3 aspect ratio, arrows + dots on hover.
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
 * Products: Static Horizontal Cards
 *
 * Full-width horizontal cards stacked vertically.
 * Image and text sit side by side — alternating left/right per card.
 * First card has image on the left, second on the right, and so on.
 * Each card spans the full container width.
 */
export default function StaticHorizontal({
  products,
  heading,
  subheading,
  brand,
  currency = "AUD",
  onBookProduct,
  onSignupWebinar,
}: StaticHorizontalProps) {
  const active = useMemo(() => products.filter((p) => p.isActive), [products]);

  if (active.length === 0) return null;

  const primary = brand.primaryColor || "#6366f1";
  const secondary = brand.secondaryColor || primary;

  return (
    <section className={SCOPE}>
      <style>{`
        .${SCOPE} {
          padding: 80px 24px;
        }
        .${SCOPE}-header {
          text-align: center;
          margin-bottom: 56px;
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

        /* ---- stack ---- */
        .${SCOPE}-stack {
          display: flex;
          flex-direction: column;
          gap: 48px;
          max-width: 1200px;
          margin: 0 auto;
        }

        /* ---- card ---- */
        .${SCOPE}-card {
          display: flex;
          align-items: stretch;
          background: #fff;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 2px 20px rgba(0, 0, 0, 0.06);
          border: 1px solid #f0f0f0;
          transition: box-shadow 0.3s ease;
        }
        .${SCOPE}-card:hover {
          box-shadow: 0 8px 40px rgba(0, 0, 0, 0.10);
        }
        .${SCOPE}-card--reversed {
          flex-direction: row-reverse;
        }

        /* ---- image side ---- */
        .${SCOPE}-card-img {
          flex: 0 0 45%;
          min-height: 320px;
          position: relative;
        }
        .${SCOPE}-img-wrap {
          position: absolute;
          inset: 0;
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
          position: absolute;
          inset: 0;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* image carousel arrows */
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

        /* image dots */
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

        /* ---- content side ---- */
        .${SCOPE}-card-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 40px 48px;
        }
        .${SCOPE}-duration {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          color: ${getContrastColor(secondary)};
          background: ${secondary};
          padding: 5px 14px;
          border-radius: 20px;
          width: fit-content;
          margin-bottom: 16px;
          font-family: ${brand.bodyFont || "inherit"};
          letter-spacing: 0.02em;
        }
        .${SCOPE}-name {
          font-size: clamp(1.25rem, 2.5vw, 1.75rem);
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 12px;
          font-family: ${brand.headerFont || "inherit"};
          line-height: 1.3;
        }
        .${SCOPE}-desc {
          font-size: 1rem;
          color: #6b7280;
          line-height: 1.7;
          margin: 0 0 24px;
          font-family: ${brand.bodyFont || "inherit"};
        }
        .${SCOPE}-price {
          font-size: 1.5rem;
          font-weight: 800;
          color: #1a1a1a;
          margin: 0 0 20px;
          font-family: ${brand.bodyFont || "inherit"};
        }
        .${SCOPE}-btn {
          display: inline-block;
          padding: 13px 32px;
          border-radius: 12px;
          border: none;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s;
          color: ${getContrastColor(primary)};
          background: ${primary};
          font-family: ${brand.bodyFont || "inherit"};
          width: fit-content;
        }
        .${SCOPE}-btn:hover {
          opacity: 0.88;
          transform: scale(1.02);
        }

        @media (max-width: 768px) {
          .${SCOPE} {
            padding: 48px 16px;
          }
          .${SCOPE}-stack {
            gap: 32px;
          }
          .${SCOPE}-card,
          .${SCOPE}-card--reversed {
            flex-direction: column;
          }
          .${SCOPE}-card-img {
            flex: none;
            min-height: 240px;
            height: 240px;
          }
          .${SCOPE}-card-content {
            padding: 24px 20px 28px;
          }
          .${SCOPE}-card {
            border-radius: 16px;
          }
        }
      `}</style>

      {(heading || subheading) && (
        <div className={`${SCOPE}-header`}>
          {heading && <h2 className={`${SCOPE}-heading`}>{heading}</h2>}
          {subheading && <p className={`${SCOPE}-subheading`}>{subheading}</p>}
        </div>
      )}

      <div className={`${SCOPE}-stack`}>
        {active.map((product, index) => {
          const isWebinar = product.productType === "webinar";
          const reversed = index % 2 !== 0;
          return (
            <div
              key={product.id}
              className={`${SCOPE}-card${reversed ? ` ${SCOPE}-card--reversed` : ""}`}
            >
              <div className={`${SCOPE}-card-img`}>
                <ImageCarousel
                  images={product.images || []}
                  fallbackImage={product.image}
                  fallbackPosition={product.imagePosition}
                  fallbackZoom={product.imageZoom}
                />
              </div>
              <div className={`${SCOPE}-card-content`}>
                <span className={`${SCOPE}-duration`}>
                  {formatDuration(product.durationMinutes)}
                </span>
                <h3 className={`${SCOPE}-name`}>{product.name}</h3>
                {product.description && (
                  <p className={`${SCOPE}-desc`}>{product.description}</p>
                )}
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
          );
        })}
      </div>
    </section>
  );
}
