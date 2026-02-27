"use client";

import type { WidgetBrandConfig } from "../types";
import { getContrastColor } from "@/lib/colorPalette";

interface DoctorProfileProps {
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
  brand: WidgetBrandConfig;
  onButtonClick?: () => void;
}

const SCOPE = "w-hr-dp";

/**
 * Hero: Doctor Profile
 *
 * Clean 2x2 grid layout. Left column spans both rows (text card with title,
 * subtitle, CTA, social proof). Right column: portrait image on top, name
 * card on bottom. No overlaps — everything fits snugly in a rectangle.
 */
export default function DoctorProfile({
  title,
  subtitle,
  buttonLabel,
  brand,
  onButtonClick,
}: DoctorProfileProps) {
  const primary = brand.primaryColor || "#2a7a6f";

  return (
    <section className={SCOPE}>
      <style>{`
        .${SCOPE} {
          padding: 24px;
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 1fr auto;
          gap: 16px;
        }

        /* ---- left card — spans both rows ---- */
        .${SCOPE}-left {
          grid-row: 1 / 3;
          background: #f5f5f3;
          border-radius: 24px;
          padding: 60px 48px;
          display: flex;
          flex-direction: column;
          gap: 28px;
          justify-content: center;
        }
        .${SCOPE}-title {
          font-size: clamp(2.2rem, 5vw, 3.4rem);
          font-weight: 700;
          color: #1a1a1a;
          margin: 0;
          font-family: ${brand.headerFont || "inherit"};
          line-height: 1.1;
          letter-spacing: -0.02em;
        }
        .${SCOPE}-title em {
          font-style: italic;
          color: ${primary};
          display: block;
        }
        .${SCOPE}-subtitle {
          font-size: 1.1rem;
          color: #5c5c5c;
          line-height: 1.65;
          margin: 0;
          max-width: 520px;
          font-family: ${brand.bodyFont || "inherit"};
        }

        /* buttons row */
        .${SCOPE}-actions {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }
        .${SCOPE}-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px 16px 28px;
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
        .${SCOPE}-btn-primary:hover {
          opacity: 0.9;
          transform: scale(1.02);
        }
        .${SCOPE}-btn-arrow {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .${SCOPE}-btn-arrow svg {
          width: 16px;
          height: 16px;
          fill: none;
          stroke: currentColor;
          stroke-width: 2.5;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        /* social proof row */
        .${SCOPE}-proof {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 4px;
        }
        .${SCOPE}-avatars {
          display: flex;
        }
        .${SCOPE}-avatars img {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #f5f5f3;
          margin-left: -10px;
        }
        .${SCOPE}-avatars img:first-child {
          margin-left: 0;
        }
        .${SCOPE}-proof-text {
          font-size: 0.95rem;
          color: #1a1a1a;
          font-family: ${brand.bodyFont || "inherit"};
        }
        .${SCOPE}-proof-text strong {
          font-weight: 700;
        }

        /* ---- portrait (top-right) ---- */
        .${SCOPE}-portrait {
          grid-row: 1 / 2;
          border-radius: 24px;
          overflow: hidden;
          position: relative;
        }
        .${SCOPE}-portrait img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        /* dot indicators */
        .${SCOPE}-dots {
          position: absolute;
          bottom: 16px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 6px;
        }
        .${SCOPE}-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.5);
        }
        .${SCOPE}-dot--active {
          background: #fff;
          width: 20px;
          border-radius: 4px;
        }

        /* ---- name card (bottom-right) ---- */
        .${SCOPE}-namecard {
          grid-row: 2 / 3;
          background: #f5f5f3;
          border-radius: 24px;
          padding: 20px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .${SCOPE}-namecard-info h3 {
          font-size: 1.3rem;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0;
          font-family: ${brand.headerFont || "inherit"};
        }
        .${SCOPE}-namecard-info p {
          font-size: 0.9rem;
          color: #6b7280;
          margin: 4px 0 0;
          font-family: ${brand.bodyFont || "inherit"};
        }
        .${SCOPE}-namecard-link {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: ${primary};
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .${SCOPE}-namecard-link svg {
          width: 18px;
          height: 18px;
          fill: none;
          stroke: ${getContrastColor(primary)};
          stroke-width: 2.5;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        @media (max-width: 900px) {
          .${SCOPE} {
            grid-template-columns: 1fr;
            grid-template-rows: auto auto auto;
            padding: 16px;
          }
          .${SCOPE}-left {
            grid-row: auto;
            padding: 40px 28px;
          }
          .${SCOPE}-portrait {
            grid-row: auto;
            aspect-ratio: 4 / 3;
          }
          .${SCOPE}-namecard {
            grid-row: auto;
          }
        }

        @media (max-width: 520px) {
          .${SCOPE}-left {
            padding: 32px 20px;
          }
        }
      `}</style>

      {/* Left — text card (spans both rows) */}
      <div className={`${SCOPE}-left`}>
        {title && <h1 className={`${SCOPE}-title`}>{title}</h1>}
        {subtitle && <p className={`${SCOPE}-subtitle`}>{subtitle}</p>}

        <div className={`${SCOPE}-actions`}>
          {buttonLabel && (
            <button
              type="button"
              className={`${SCOPE}-btn-primary`}
              onClick={onButtonClick}
            >
              {buttonLabel}
              <span className={`${SCOPE}-btn-arrow`}>
                <svg viewBox="0 0 24 24">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
            </button>
          )}
        </div>

        {/* Social proof */}
        <div className={`${SCOPE}-proof`}>
          <div className={`${SCOPE}-avatars`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- placeholder */}
            <img
              src="https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=80"
              alt=""
            />
            {/* eslint-disable-next-line @next/next/no-img-element -- placeholder */}
            <img
              src="https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=80"
              alt=""
            />
            {/* eslint-disable-next-line @next/next/no-img-element -- placeholder */}
            <img
              src="https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=80"
              alt=""
            />
          </div>
          <p className={`${SCOPE}-proof-text`}>
            <strong>300+</strong> Certified Experts
          </p>
        </div>
      </div>

      {/* Top-right — portrait */}
      <div className={`${SCOPE}-portrait`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- placeholder portrait */}
        <img
          src="https://images.pexels.com/photos/5215024/pexels-photo-5215024.jpeg?auto=compress&cs=tinysrgb&w=800"
          alt="Professional portrait"
        />
        <div className={`${SCOPE}-dots`}>
          <span className={`${SCOPE}-dot ${SCOPE}-dot--active`} />
          <span className={`${SCOPE}-dot`} />
          <span className={`${SCOPE}-dot`} />
          <span className={`${SCOPE}-dot`} />
          <span className={`${SCOPE}-dot`} />
        </div>
      </div>

      {/* Bottom-right — name card */}
      <div className={`${SCOPE}-namecard`}>
        <div className={`${SCOPE}-namecard-info`}>
          <h3>Dr. James Cart</h3>
          <p>Neurologist</p>
        </div>
        <span className={`${SCOPE}-namecard-link`}>
          <svg viewBox="0 0 24 24">
            <path d="M7 17L17 7M17 7H7M17 7v10" />
          </svg>
        </span>
      </div>
    </section>
  );
}
