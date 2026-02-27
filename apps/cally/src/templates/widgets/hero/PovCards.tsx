"use client";

import type { WidgetBrandConfig } from "../types";
import { getContrastColor } from "@/lib/colorPalette";

interface PovCardsProps {
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
  brand: WidgetBrandConfig;
  onButtonClick?: () => void;
}

const SCOPE = "w-hr-pc";

const CARDS = [
  {
    question: "Why do I feel exhausted even after a full night's sleep?",
    answers: 24,
    views: "40k",
    avatar:
      "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=120",
  },
  {
    question: "How do you stop overthinking small social interactions?",
    answers: 16,
    views: "400",
    avatar:
      "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=120",
  },
  {
    question: "Is it normal to lose motivation for everything at once?",
    answers: 31,
    views: "12k",
    avatar:
      "https://images.pexels.com/photos/1065084/pexels-photo-1065084.jpeg?auto=compress&cs=tinysrgb&w=120",
  },
];

/**
 * Hero: POV Cards
 *
 * Centered hero with title, subtitle, and CTA over a soft lavender-to-cream
 * gradient. Three question cards fan out at the bottom, each slightly rotated.
 * Subtle grid overlay and a bottom border complete the look.
 */
export default function PovCards({
  title,
  subtitle,
  buttonLabel,
  brand,
  onButtonClick,
}: PovCardsProps) {
  const primary = brand.primaryColor || "#6366f1";

  return (
    <section className={SCOPE}>
      <style>{`
        .${SCOPE} {
          position: relative;
          overflow: hidden;
          padding: 80px 24px 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: linear-gradient(
            160deg,
            #eae6f2 0%,
            #f0ecf4 20%,
            #f5f2f0 45%,
            #f3edd8 100%
          );
          border-bottom: 1px solid #e0dbd4;
        }

        /* subtle grid overlay */
        .${SCOPE}::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(0, 0, 0, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 0, 0, 0.03) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none;
        }

        /* ---- text content ---- */
        .${SCOPE}-content {
          position: relative;
          z-index: 2;
          text-align: center;
          max-width: 720px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }
        .${SCOPE}-title {
          font-size: clamp(2.4rem, 5.5vw, 3.8rem);
          font-weight: 700;
          color: #1a1a1a;
          margin: 0;
          font-family: ${brand.headerFont || "inherit"};
          line-height: 1.1;
          letter-spacing: -0.025em;
        }
        .${SCOPE}-subtitle {
          font-size: clamp(1rem, 2vw, 1.15rem);
          color: #5c5c5c;
          line-height: 1.65;
          margin: 0;
          max-width: 580px;
          font-family: ${brand.bodyFont || "inherit"};
        }
        .${SCOPE}-btn {
          display: inline-block;
          padding: 16px 40px;
          border-radius: 50px;
          font-weight: 600;
          font-size: 1rem;
          border: none;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s;
          color: ${getContrastColor(primary)};
          background: ${primary};
          font-family: ${brand.bodyFont || "inherit"};
          margin-top: 4px;
        }
        .${SCOPE}-btn:hover {
          opacity: 0.9;
          transform: scale(1.03);
        }

        /* ---- cards fan ---- */
        .${SCOPE}-cards {
          position: relative;
          z-index: 2;
          display: flex;
          justify-content: center;
          align-items: flex-end;
          gap: 0;
          margin-top: 48px;
          width: 100%;
          max-width: 650px;
          height: 260px;
        }

        .${SCOPE}-card {
          width: 240px;
          aspect-ratio: 5 / 7;
          flex-shrink: 0;
          background: #fff;
          border-radius: 20px;
          padding: 32px 24px 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: normal;
          gap: 16px;
          box-shadow:
            0 4px 24px rgba(0, 0, 0, 0.06),
            0 1px 4px rgba(0, 0, 0, 0.04);
          position: absolute;
          bottom: -140px;
          transform-origin: bottom center;
        }
        .${SCOPE}-card:nth-child(1) {
          left: 0;
          transform: rotate(-8deg);
          z-index: 2;
        }
        .${SCOPE}-card:nth-child(2) {
          left: 50%;
          transform: translateX(-50%) translateY(-30px);
          z-index: 1;
          background: #f0ecf8;
        }
        .${SCOPE}-card:nth-child(3) {
          right: 0;
          transform: rotate(8deg);
          z-index: 2;
        }

        .${SCOPE}-card-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #fff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .${SCOPE}-card-question {
          font-size: 1.1rem;
          font-weight: 600;
          color: #1a1a1a;
          text-align: center;
          line-height: 1.35;
          margin: 0;
          font-family: ${brand.headerFont || "inherit"};
        }
        .${SCOPE}-card-stats {
          display: flex;
          gap: 16px;
          align-items: center;
          font-size: 0.85rem;
          color: #8b8b8b;
          font-family: ${brand.bodyFont || "inherit"};
        }
        .${SCOPE}-card-stats span {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .${SCOPE}-card-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${primary};
          opacity: 0.6;
        }

        @media (max-width: 768px) {
          .${SCOPE} {
            padding: 56px 16px 0;
          }
          .${SCOPE}-cards {
            height: 280px;
            max-width: 100%;
          }
          .${SCOPE}-card {
            width: 200px;
            padding: 24px 16px 20px;
          }
          .${SCOPE}-card-question {
            font-size: 0.95rem;
          }
        }

        @media (max-width: 520px) {
          .${SCOPE}-cards {
            height: 220px;
          }
          .${SCOPE}-card {
            width: 180px;
            padding: 20px 14px 16px;
            border-radius: 14px;
          }
          .${SCOPE}-card:nth-child(1) {
            transform: rotate(-6deg) translateY(16px);
          }
          .${SCOPE}-card:nth-child(3) {
            transform: rotate(6deg) translateY(16px);
          }
          .${SCOPE}-card-avatar {
            width: 36px;
            height: 36px;
          }
          .${SCOPE}-card-question {
            font-size: 0.85rem;
          }
          .${SCOPE}-card-stats {
            font-size: 0.75rem;
          }
        }
      `}</style>

      {/* Text content */}
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

      {/* Fanned cards */}
      <div className={`${SCOPE}-cards`}>
        {CARDS.map((card) => (
          <div key={card.question} className={`${SCOPE}-card`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- placeholder avatar */}
            <img
              className={`${SCOPE}-card-avatar`}
              src={card.avatar}
              alt="Avatar"
            />
            <p className={`${SCOPE}-card-question`}>{card.question}</p>
            <div className={`${SCOPE}-card-stats`}>
              <span>{card.answers} answers</span>
              <span>
                <span className={`${SCOPE}-card-dot`} />
                {card.views} views
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
