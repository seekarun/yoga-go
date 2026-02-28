"use client";

import type { WidgetBrandConfig } from "../types";

interface LeftImageProps {
  title?: string;
  paragraph?: string;
  image?: string;
  brand: WidgetBrandConfig;
}

const SCOPE = "w-ab-li";

const PLACEHOLDER_IMAGE =
  "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=600";

/**
 * About: Left Image
 *
 * Two-column layout with a tall portrait image on the left and the about
 * title + paragraph text on the right. Warm cream background. Image fills
 * the left column edge-to-edge with no border-radius for a magazine feel.
 */
export default function LeftImage({
  title,
  paragraph,
  image,
  brand,
}: LeftImageProps) {
  const primary = brand.primaryColor || "#1a1a1a";
  const imgSrc = image || PLACEHOLDER_IMAGE;

  return (
    <section className={SCOPE}>
      <style>{`
        .${SCOPE} {
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: 480px;
          background: #faf6f1;
        }

        /* Left — image */
        .${SCOPE}-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          min-height: 480px;
        }

        /* Right — text */
        .${SCOPE}-text {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 64px 56px;
          gap: 24px;
        }

        .${SCOPE}-title {
          font-size: clamp(1.8rem, 3.5vw, 2.6rem);
          font-weight: 700;
          color: ${primary};
          margin: 0;
          font-family: ${brand.headerFont || "inherit"};
          line-height: 1.15;
        }

        /* Accent dot after title */
        .${SCOPE}-dot {
          color: ${primary};
        }

        .${SCOPE}-paragraph {
          font-size: 1rem;
          color: #4a4a4a;
          line-height: 1.8;
          margin: 0;
          font-family: ${brand.bodyFont || "inherit"};
          white-space: pre-line;
        }

        @media (max-width: 768px) {
          .${SCOPE} {
            grid-template-columns: 1fr;
          }
          .${SCOPE}-img {
            min-height: 320px;
            max-height: 400px;
          }
          .${SCOPE}-text {
            padding: 40px 24px;
          }
        }
      `}</style>

      {/* eslint-disable-next-line @next/next/no-img-element -- about image */}
      <img className={`${SCOPE}-img`} src={imgSrc} alt={title || "About"} />

      <div className={`${SCOPE}-text`}>
        {title && (
          <h2 className={`${SCOPE}-title`}>
            {title}
            <span className={`${SCOPE}-dot`}>.</span>
          </h2>
        )}
        {paragraph && <p className={`${SCOPE}-paragraph`}>{paragraph}</p>}
      </div>
    </section>
  );
}
