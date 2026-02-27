"use client";

import { getContrastColor } from "@/lib/colorPalette";
import type { WidgetBrandConfig } from "../types";

interface Testimonial {
  id: string;
  quote: string;
  authorName: string;
  authorTitle?: string;
  rating?: number;
}

interface SolidCardsProps {
  testimonials: Testimonial[];
  heading?: string;
  subheading?: string;
  brand: WidgetBrandConfig;
}

const SCOPE = "w-tm-solid";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2)
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] || "?").toUpperCase();
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s, l };
}

/**
 * Testimonials: Solid Cards
 *
 * Dark solid-background cards with author at top, star rating, and quote.
 * Card background is a deep shade derived from the brand colour.
 * Responsive 2-column grid (1 col on mobile).
 */
export default function SolidCards({
  testimonials,
  heading,
  subheading,
  brand,
}: SolidCardsProps) {
  const visible = testimonials.slice(0, 6);
  if (visible.length === 0) return null;

  const primary = brand.primaryColor || "#6366f1";
  const { h, s } = hexToHsl(primary);
  // Deep dark card gradient derived from brand hue
  const cardBgFrom = `hsl(${h}, ${Math.round(s * 40)}%, 18%)`;
  const cardBgTo = `hsl(${h}, ${Math.round(s * 35)}%, 12%)`;
  const cardBg = `linear-gradient(135deg, ${cardBgFrom}, ${cardBgTo})`;
  const cardBorder = `hsl(${h}, ${Math.round(s * 30)}%, 24%)`;
  const starColor = `hsl(${h}, ${Math.round(s * 60)}%, 65%)`;

  return (
    <section className={SCOPE}>
      <style>{`
        .${SCOPE} {
          padding: 80px 24px;
        }
        .${SCOPE}-container {
          max-width: 1200px;
          margin: 0 auto;
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
        .${SCOPE}-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }
        @media (max-width: 700px) {
          .${SCOPE}-grid {
            grid-template-columns: 1fr;
          }
          .${SCOPE} {
            padding: 48px 16px;
          }
        }
        .${SCOPE}-card {
          border-radius: 14px;
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .${SCOPE}-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
        }
        .${SCOPE}-author {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .${SCOPE}-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.85rem;
          flex-shrink: 0;
          color: ${getContrastColor(primary)};
          border: 2px solid rgba(255,255,255,0.15);
          background: rgba(255,255,255,0.08);
        }
        .${SCOPE}-author-name {
          font-weight: 600;
          font-size: 0.95rem;
          color: #ffffff;
          font-family: ${brand.bodyFont || "inherit"};
        }
        .${SCOPE}-author-title {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.5);
          margin-top: 2px;
          font-family: ${brand.bodyFont || "inherit"};
        }
        .${SCOPE}-stars {
          display: flex;
          gap: 3px;
        }
        .${SCOPE}-quote {
          font-size: 0.95rem;
          line-height: 1.7;
          color: rgba(255,255,255,0.7);
          font-family: ${brand.bodyFont || "inherit"};
        }
      `}</style>

      <div className={`${SCOPE}-container`}>
        {(heading || subheading) && (
          <div className={`${SCOPE}-header`}>
            {heading && <h2 className={`${SCOPE}-heading`}>{heading}</h2>}
            {subheading && (
              <p className={`${SCOPE}-subheading`}>{subheading}</p>
            )}
          </div>
        )}

        <div className={`${SCOPE}-grid`}>
          {visible.map((t) => (
            <div
              key={t.id}
              className={`${SCOPE}-card`}
              style={{
                background: cardBg,
                border: `1px solid ${cardBorder}`,
              }}
            >
              {/* Author — top */}
              <div className={`${SCOPE}-author`}>
                <div className={`${SCOPE}-avatar`}>
                  {getInitials(t.authorName)}
                </div>
                <div>
                  <div className={`${SCOPE}-author-name`}>{t.authorName}</div>
                  {t.authorTitle && (
                    <div className={`${SCOPE}-author-title`}>
                      {t.authorTitle}
                    </div>
                  )}
                </div>
              </div>

              {/* Stars */}
              <div className={`${SCOPE}-stars`}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill={
                      star <= (t.rating || 5)
                        ? starColor
                        : "rgba(255,255,255,0.12)"
                    }
                    stroke="none"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ))}
              </div>

              {/* Quote */}
              <p className={`${SCOPE}-quote`}>&ldquo;{t.quote}&rdquo;</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
