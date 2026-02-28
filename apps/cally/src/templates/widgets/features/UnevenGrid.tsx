"use client";

import type { FeatureCard } from "@/types/landing-page";
import type { WidgetBrandConfig } from "../types";

interface UnevenGridProps {
  heading?: string;
  subheading?: string;
  cards: FeatureCard[];
  brand: WidgetBrandConfig;
}

const SCOPE = "w-ft-ug";

/**
 * Pastel tints derived from the primary colour by mixing with white.
 * Returns 4 distinct soft background colours.
 */
function getPastelTints(primary: string): string[] {
  // Parse hex to RGB
  const hex = primary.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) || 180;
  const g = parseInt(hex.substring(2, 4), 16) || 180;
  const b = parseInt(hex.substring(4, 6), 16) || 180;

  // Mix with white at different ratios for variety
  const mix = (ratio: number) => {
    const mr = Math.round(r * ratio + 255 * (1 - ratio));
    const mg = Math.round(g * ratio + 255 * (1 - ratio));
    const mb = Math.round(b * ratio + 255 * (1 - ratio));
    return `rgb(${mr}, ${mg}, ${mb})`;
  };

  return [
    mix(0.12), // very light
    mix(0.15), // light
    mix(0.1), // lightest
    mix(0.18), // slightly darker
  ];
}

/**
 * Features: Uneven Grid
 *
 * Bento-style layout: first card is large (spans 2 rows on the left),
 * second card is wide (top-right), third and fourth are smaller (bottom-right).
 * Each card has a soft pastel background derived from the primary colour,
 * a bold title, description, and optional image.
 */
export default function UnevenGrid({
  heading,
  subheading,
  cards,
  brand,
}: UnevenGridProps) {
  const cardBg =
    brand.secondaryColor || getPastelTints(brand.primaryColor || "#6366f1")[0];

  // Pad to at least 4 for the layout
  const items = cards.length >= 4 ? cards.slice(0, 4) : cards;

  return (
    <section className={SCOPE}>
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

        .${SCOPE}-subheading {
          font-size: 1rem;
          color: #6b7280;
          margin: 0 0 40px;
          font-family: ${brand.bodyFont || "inherit"};
        }

        /* Bento grid — 3 columns, 2 rows */
        .${SCOPE}-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          grid-template-rows: auto auto;
          gap: 16px;
        }

        /* Card base — no padding so images bleed to edges */
        .${SCOPE}-card {
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
          min-height: 220px;
          background: ${cardBg};
        }

        /* Card 0: tall, spans 2 rows in column 1 */
        .${SCOPE}-card--0 {
          grid-row: 1 / 3;
          grid-column: 1;
        }

        /* Card 1: top-middle — square */
        .${SCOPE}-card--1 {
          grid-row: 1;
          grid-column: 2;
          aspect-ratio: 1;
        }

        /* Card 2: top-right — square */
        .${SCOPE}-card--2 {
          grid-row: 1;
          grid-column: 3;
          aspect-ratio: 1;
        }

        /* Card 3: wide, spans columns 2-3 on bottom row — horizontal layout */
        .${SCOPE}-card--3 {
          grid-row: 2;
          grid-column: 2 / 4;
          flex-direction: row;
          align-items: center;
          gap: 24px;
        }
        .${SCOPE}-card--3 .${SCOPE}-card-text {
          padding: 24px;
          flex: 1;
        }
        .${SCOPE}-card--3 .${SCOPE}-card-img {
          width: 45%;
          height: 100%;
          max-height: none;
          object-fit: cover;
          margin-top: 0;
          flex-shrink: 0;
          order: 1;
        }

        .${SCOPE}-card-text {
          padding: 24px 24px 0;
        }

        .${SCOPE}-card-title {
          font-size: clamp(1.3rem, 2.5vw, 1.8rem);
          font-weight: 800;
          color: #1a1a1a;
          margin: 0 0 8px;
          font-family: ${brand.headerFont || "inherit"};
          line-height: 1.15;
        }

        .${SCOPE}-card-desc {
          font-size: 0.95rem;
          color: #4a4a4a;
          line-height: 1.6;
          margin: 0;
          font-family: ${brand.bodyFont || "inherit"};
        }

        .${SCOPE}-card-img {
          width: 100%;
          flex: 1;
          object-fit: cover;
          margin-top: 16px;
          border-radius: 0;
        }

        @media (max-width: 768px) {
          .${SCOPE}-grid {
            grid-template-columns: 1fr;
            grid-template-rows: auto;
          }
          .${SCOPE}-card--0,
          .${SCOPE}-card--1,
          .${SCOPE}-card--2,
          .${SCOPE}-card--3 {
            grid-row: auto;
            grid-column: auto;
          }
          .${SCOPE}-card {
            min-height: 180px;
          }
        }
      `}</style>

      <div className={`${SCOPE}-grid`}>
        {items.map((card, i) => (
          <div key={card.id} className={`${SCOPE}-card ${SCOPE}-card--${i}`}>
            <div className={`${SCOPE}-card-text`}>
              <h3 className={`${SCOPE}-card-title`}>{card.title}</h3>
              <p className={`${SCOPE}-card-desc`}>{card.description}</p>
            </div>
            {card.image && (
              // eslint-disable-next-line @next/next/no-img-element -- feature card image
              <img
                className={`${SCOPE}-card-img`}
                src={card.image}
                alt={card.title}
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
