"use client";

import type { WidgetBrandConfig } from "../types";
import { getContrastColor } from "@/lib/colorPalette";

interface StatsBoxesProps {
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
  brand: WidgetBrandConfig;
  onButtonClick?: () => void;
}

const SCOPE = "w-hr-sb";

/**
 * Placeholder stats — will be replaced with real data later.
 */
const STATS = [
  { value: "1.2k+", label: "Happy Clients" },
  { value: "350+", label: "Sessions Booked" },
  { value: "4.9", label: "Average Rating" },
];

/**
 * Hero: Stats Boxes
 *
 * Split-layout hero inspired by modern SaaS landing pages.
 * Left side: title (with italic accent on a keyword), subtitle, CTA button.
 * Right side: a 2x2 bento grid with a hero image tile and stat boxes
 * featuring large numbers + labels. Light warm/neutral backgrounds.
 */
export default function StatsBoxes({
  title,
  subtitle,
  buttonLabel,
  brand,
  onButtonClick,
}: StatsBoxesProps) {
  const primary = brand.primaryColor || "#6366f1";

  return (
    <section className={SCOPE}>
      <style>{`
        .${SCOPE} {
          padding: 40px 24px;
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
          align-items: center;
        }

        /* ---- left: text ---- */
        .${SCOPE}-text {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .${SCOPE}-title {
          font-size: clamp(2.2rem, 5vw, 3.5rem);
          font-weight: 700;
          color: #111;
          margin: 0;
          font-family: ${brand.headerFont || "inherit"};
          line-height: 1.12;
          letter-spacing: -0.02em;
        }
        .${SCOPE}-title em {
          font-style: italic;
          color: ${primary};
        }
        .${SCOPE}-subtitle {
          font-size: 1.1rem;
          color: #6b7280;
          line-height: 1.7;
          margin: 0;
          max-width: 520px;
          font-family: ${brand.bodyFont || "inherit"};
        }
        .${SCOPE}-btn {
          display: inline-block;
          width: fit-content;
          padding: 15px 36px;
          border-radius: 50px;
          font-weight: 600;
          font-size: 1rem;
          border: none;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s;
          color: ${getContrastColor(primary)};
          background: ${primary};
          font-family: ${brand.bodyFont || "inherit"};
        }
        .${SCOPE}-btn:hover {
          opacity: 0.9;
          transform: scale(1.02);
        }

        /* ---- right: bento grid ---- */
        .${SCOPE}-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 16px;
        }

        /* offset columns: first column shifts down */
        .${SCOPE}-col-left {
          display: flex;
          flex-direction: column;
          gap: 16px;
          transform: translateY(40px);
        }
        .${SCOPE}-col-right {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* image tile */
        .${SCOPE}-img-tile {
          border-radius: 20px;
          overflow: hidden;
          background: #f0eee9;
          aspect-ratio: 1;
          position: relative;
        }
        /* eslint-disable-next-line -- placeholder image */
        .${SCOPE}-img-tile img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        /* stat boxes */
        .${SCOPE}-stat {
          border-radius: 20px;
          padding: 28px 24px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          aspect-ratio: 1;
        }
        .${SCOPE}-stat--light {
          background: #f5f5f0;
        }
        .${SCOPE}-stat--warm {
          background: #ede8e3;
        }

        .${SCOPE}-stat-value {
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 700;
          color: #111;
          margin: 0 0 4px;
          font-family: ${brand.headerFont || "inherit"};
          letter-spacing: -0.02em;
          line-height: 1.1;
        }
        .${SCOPE}-stat-label {
          font-size: 0.95rem;
          color: #6b7280;
          margin: 0;
          font-family: ${brand.bodyFont || "inherit"};
          font-weight: 500;
        }

        @media (max-width: 900px) {
          .${SCOPE} {
            grid-template-columns: 1fr;
            padding: 48px 16px;
            gap: 32px;
          }
          .${SCOPE}-col-left {
            transform: none;
          }
          .${SCOPE}-img-tile {
            aspect-ratio: 1;
          }
        }

        @media (max-width: 520px) {
          .${SCOPE}-grid {
            grid-template-columns: 1fr;
          }
          .${SCOPE}-col-left,
          .${SCOPE}-col-right {
            transform: none;
          }
        }
      `}</style>

      {/* Left — text content */}
      <div className={`${SCOPE}-text`}>
        {title && <h1 className={`${SCOPE}-title`}>{title}</h1>}
        {subtitle && <p className={`${SCOPE}-subtitle`}>{subtitle}</p>}
        {buttonLabel && (
          <button
            type="button"
            className={`${SCOPE}-btn`}
            onClick={onButtonClick}
          >
            {buttonLabel}
          </button>
        )}
      </div>

      {/* Right — bento grid with offset columns */}
      <div className={`${SCOPE}-grid`}>
        {/* Column 1 — shifted down */}
        <div className={`${SCOPE}-col-left`}>
          <div className={`${SCOPE}-img-tile`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- placeholder image */}
            <img
              src="https://images.pexels.com/photos/3822864/pexels-photo-3822864.jpeg?auto=compress&cs=tinysrgb&w=600"
              alt="Hero"
            />
          </div>
          <div className={`${SCOPE}-stat ${SCOPE}-stat--light`}>
            <p className={`${SCOPE}-stat-value`}>{STATS[1].value}</p>
            <p className={`${SCOPE}-stat-label`}>{STATS[1].label}</p>
          </div>
        </div>

        {/* Column 2 — normal position */}
        <div className={`${SCOPE}-col-right`}>
          <div className={`${SCOPE}-stat ${SCOPE}-stat--light`}>
            <p className={`${SCOPE}-stat-value`}>{STATS[0].value}</p>
            <p className={`${SCOPE}-stat-label`}>{STATS[0].label}</p>
          </div>
          <div className={`${SCOPE}-stat ${SCOPE}-stat--warm`}>
            <p className={`${SCOPE}-stat-value`}>{STATS[2].value}</p>
            <p className={`${SCOPE}-stat-label`}>{STATS[2].label}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
