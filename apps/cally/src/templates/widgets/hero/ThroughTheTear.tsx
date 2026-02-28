"use client";

import type { WidgetBrandConfig } from "../types";

interface ThroughTheTearProps {
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
  brand: WidgetBrandConfig;
  onButtonClick?: () => void;
  /** Optional image URL shown through the tear. Falls back to a placeholder. */
  backgroundImage?: string;
}

const SCOPE = "w-hr-ttt";

const PLACEHOLDER_IMAGE =
  "https://images.pexels.com/photos/3760529/pexels-photo-3760529.jpeg?auto=compress&cs=tinysrgb&w=1200";

/**
 * Hero: Through the Tear
 *
 * A torn-paper band at the top reveals a background image tinted with the brand
 * colour. White clip-path overlays create the jagged torn edges. Title, subtitle,
 * and CTA sit in a clean white area below the tear.
 */
export default function ThroughTheTear({
  title,
  subtitle,
  buttonLabel,
  brand,
  onButtonClick,
  backgroundImage,
}: ThroughTheTearProps) {
  const primary = brand.primaryColor || "#e84233";
  const imgSrc = backgroundImage || PLACEHOLDER_IMAGE;

  return (
    <section className={SCOPE}>
      <style>{`
        .${SCOPE} {
          width: 100%;
        }

        /* ---- Band area (the torn reveal) ---- */
        .${SCOPE}-band {
          position: relative;
          height: 420px;
          background: ${primary};
        }

        /* Background image */
        .${SCOPE}-bg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          z-index: 0;
        }

        /* Colour overlay on image */
        .${SCOPE}-overlay {
          position: absolute;
          inset: 0;
          background: ${primary};
          opacity: 0.3;
          z-index: 1;
        }

        /* Grain / noise texture */
        .${SCOPE}-grain {
          position: absolute;
          inset: 0;
          z-index: 2;
          opacity: 0.12;
          background: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          pointer-events: none;
        }

        /* White torn-paper overlays */
        .${SCOPE}-tear-top,
        .${SCOPE}-tear-bottom {
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          height: 100%;
          background: #fff;
          z-index: 4;
        }

        /* Shadow wrappers — blur applied here AFTER inner div is clipped */
        .${SCOPE}-shadow-wrap {
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          height: 100%;
          z-index: 3;
          filter: blur(6px);
          pointer-events: none;
        }
        .${SCOPE}-shadow-wrap-top {
          top: 4px;
          left: 4px;
        }
        .${SCOPE}-shadow-wrap-bottom {
          top: -10px;
          left: 4px;
        }
        /* Inner shadow shape — clip-path applied here */
        .${SCOPE}-shadow-inner {
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.25);
        }

        .${SCOPE}-tear-top,
        .${SCOPE}-shadow-wrap-top .${SCOPE}-shadow-inner {
          clip-path: polygon(
            0% 0%,
            100% 0%,
            100% 22%,
            97% 24%,
            95% 22%,
            90% 19%,
            89% 21%,
            87% 20%,
            85% 18%,
            80% 21%,
            78% 22%,
            75% 22%,
            73% 26%,
            70% 24%,
            68% 27%,
            65% 28%,
            63% 26%,
            60% 21%,
            58% 22%,
            55% 18%,
            53% 20%,
            50% 18%,
            47% 21%,
            45% 24%,
            42% 22%,
            40% 25%,
            37% 26%,
            35% 24%,
            32% 22%,
            30% 25%,
            27% 27%,
            25% 28%,
            22% 29%,
            20% 32%,
            17% 30%,
            15% 31%,
            12% 28%,
            10% 27%,
            7% 28%,
            5% 25%,
            2% 22%,
            0% 24%
          );
        }
        .${SCOPE}-tear-bottom,
        .${SCOPE}-shadow-wrap-bottom .${SCOPE}-shadow-inner {
          clip-path: polygon(
            0% 86%,
            2% 86%,
            5% 83%,
            7% 81%,
            10% 82%,
            12% 87%,
            15% 87%,
            17% 85%,
            20% 85%,
            22% 84%,
            25% 87%,
            27% 86%,
            30% 88%,
            32% 92%,
            35% 90%,
            37% 90%,
            40% 84%,
            42% 83%,
            45% 83%,
            47% 81%,
            50% 82%,
            53% 87%,
            55% 89%,
            58% 87%,
            60% 88%,
            63% 90%,
            65% 89%,
            68% 90%,
            70% 91%,
            73% 90%,
            75% 84%,
            78% 85%,
            80% 84%,
            83% 88%,
            85% 89%,
            87% 88%,
            90% 92%,
            92% 91%,
            95% 90%,
            97% 84%,
            100% 82%,
            100% 100%,
            0% 100%
          );
        }
        /* ---- Content below the band ---- */
        .${SCOPE}-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 0px 24px 64px;
          background: #fff;
        }

        .${SCOPE}-title {
          font-size: clamp(2.2rem, 5.5vw, 3.8rem);
          font-weight: 800;
          color: #1a1a1a;
          margin: 0 0 16px;
          font-family: ${brand.headerFont || "inherit"};
          line-height: 1.08;
          letter-spacing: -0.02em;
          max-width: 800px;
        }

        .${SCOPE}-subtitle {
          font-size: clamp(0.95rem, 2vw, 1.15rem);
          color: #6b7280;
          max-width: 560px;
          margin: 0 0 32px;
          line-height: 1.65;
          font-family: ${brand.bodyFont || "inherit"};
        }

        .${SCOPE}-btn {
          display: inline-block;
          padding: 14px 40px;
          border-radius: 50px;
          font-weight: 700;
          font-size: 0.95rem;
          border: 2px solid ${primary};
          cursor: pointer;
          transition: all 0.25s;
          color: ${primary};
          background: transparent;
          font-family: ${brand.bodyFont || "inherit"};
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .${SCOPE}-btn:hover {
          background: ${primary};
          color: #fff;
        }

        @media (max-width: 768px) {
          .${SCOPE}-band {
            height: 320px;
          }
          .${SCOPE}-content {
            padding: 36px 16px 48px;
          }
        }
      `}</style>

      {/* Band area with torn edges */}
      <div className={`${SCOPE}-band`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- hero background */}
        <img className={`${SCOPE}-bg`} src={imgSrc} alt="" />
        <div className={`${SCOPE}-overlay`} />
        <div className={`${SCOPE}-grain`} />
        <div className={`${SCOPE}-shadow-wrap ${SCOPE}-shadow-wrap-top`}>
          <div className={`${SCOPE}-shadow-inner`} />
        </div>
        <div className={`${SCOPE}-shadow-wrap ${SCOPE}-shadow-wrap-bottom`}>
          <div className={`${SCOPE}-shadow-inner`} />
        </div>
        <div className={`${SCOPE}-tear-top`} />
        <div className={`${SCOPE}-tear-bottom`} />
      </div>

      {/* Content below the tear */}
      <div className={`${SCOPE}-content`}>
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
    </section>
  );
}
