"use client";

import type { FeatureCard } from "@/types/landing-page";
import type { WidgetBrandConfig } from "../types";

interface SimpleGridProps {
  heading?: string;
  subheading?: string;
  cards: FeatureCard[];
  brand: WidgetBrandConfig;
}

const SCOPE = "w-ft-sg";

/**
 * Features: Simple Grid
 *
 * Clean 4-column layout with a small icon, bold title, and description
 * per card. No background colours or images — text-only minimal design.
 */
export default function SimpleGrid({ cards, brand }: SimpleGridProps) {
  const primary = brand.primaryColor || "#6366f1";

  return (
    <section className={SCOPE}>
      <style>{`
        .${SCOPE} {
          padding: 64px 24px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .${SCOPE}-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 40px;
        }

        .${SCOPE}-card {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .${SCOPE}-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .${SCOPE}-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0;
          line-height: 1.3;
          font-family: ${brand.headerFont || "inherit"};
        }

        .${SCOPE}-desc {
          font-size: 0.95rem;
          color: #6b7280;
          line-height: 1.7;
          margin: 0;
          font-family: ${brand.bodyFont || "inherit"};
        }

        @media (max-width: 900px) {
          .${SCOPE}-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 32px;
          }
        }

        @media (max-width: 500px) {
          .${SCOPE}-grid {
            grid-template-columns: 1fr;
            gap: 28px;
          }
        }
      `}</style>

      <div className={`${SCOPE}-grid`}>
        {cards.map((card) => (
          <div key={card.id} className={`${SCOPE}-card`}>
            <div className={`${SCOPE}-icon`}>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke={primary}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <h3 className={`${SCOPE}-title`}>{card.title}</h3>
            <p className={`${SCOPE}-desc`}>{card.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
