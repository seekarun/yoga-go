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

interface CardMatrix3x2Props {
  testimonials: Testimonial[];
  heading?: string;
  subheading?: string;
  brand: WidgetBrandConfig;
}

/** Unique scope id to avoid CSS collisions */
const SCOPE = "w-tm-3x2";

/**
 * Generate initials from a name (first letter of first and last name).
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2)
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] || "?").toUpperCase();
}

/**
 * Convert a hex color to rgba with a given alpha.
 */
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(0,0,0,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Testimonials: 3x2 Card Matrix
 *
 * A clean 3-column grid (responsive to 2→1 columns) showing up to 6
 * testimonial cards. Each card has a large quote icon, the quote text,
 * and the author with an initial avatar. Styled with the tenant's brand.
 */
export default function CardMatrix3x2({
  testimonials,
  heading,
  subheading,
  brand,
}: CardMatrix3x2Props) {
  // Show at most 6 testimonials in the 3×2 grid
  const visible = testimonials.slice(0, 6);
  if (visible.length === 0) return null;

  const primary = brand.primaryColor || "#6366f1";
  const iconColor = primary;

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
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        @media (max-width: 1024px) {
          .${SCOPE}-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 640px) {
          .${SCOPE}-grid {
            grid-template-columns: 1fr;
          }
          .${SCOPE} {
            padding: 48px 16px;
          }
        }
        .${SCOPE}-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 32px;
          border: none;
          box-shadow: 0 2px 16px rgba(0, 0, 0, 0.06);
          display: flex;
          flex-direction: column;
          transition: box-shadow 0.2s;
        }
        .${SCOPE}-card:hover {
          box-shadow: 0 6px 28px rgba(0, 0, 0, 0.1);
        }
        .${SCOPE}-quote-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
          flex-shrink: 0;
          background: transparent;
          border: 1.5px solid ${hexToRgba(primary, 0.25)};
        }
        .${SCOPE}-quote-text {
          font-size: 1rem;
          line-height: 1.75;
          color: #374151;
          flex: 1;
          margin-bottom: 24px;
          font-family: ${brand.bodyFont || "inherit"};
        }
        .${SCOPE}-author {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: auto;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
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
        }
        .${SCOPE}-author-name {
          font-weight: 600;
          font-size: 0.95rem;
          color: #1a1a1a;
          font-family: ${brand.bodyFont || "inherit"};
        }
        .${SCOPE}-author-title {
          font-size: 0.8rem;
          color: #9ca3af;
          margin-top: 2px;
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
            <div key={t.id} className={`${SCOPE}-card`}>
              {/* Quote icon */}
              <div className={`${SCOPE}-quote-icon`}>
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill={iconColor}
                >
                  <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311C9.591 11.69 11 13.208 11 15c0 1.862-1.462 3.378-3.304 3.378-1.006 0-1.96-.427-2.613-1.057l-.5-.001zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311C19.591 11.69 21 13.208 21 15c0 1.862-1.462 3.378-3.304 3.378-1.006 0-1.96-.427-2.613-1.057l-.5-.001h.5z" />
                </svg>
              </div>

              {/* Quote text */}
              <p className={`${SCOPE}-quote-text`}>{t.quote}</p>

              {/* Author */}
              <div className={`${SCOPE}-author`}>
                <div
                  className={`${SCOPE}-avatar`}
                  style={{ backgroundColor: primary }}
                >
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
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
