"use client";

import type { Product } from "@/types";
import type { WidgetBrandConfig } from "../types";
import { getContrastColor } from "@/lib/colorPalette";

interface VerticalImageScrollProps {
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
  brand: WidgetBrandConfig;
  onButtonClick?: () => void;
  /** Products to extract images from. Falls back to placeholders. */
  products?: Product[];
}

const SCOPE = "w-hr-vis";

const PLACEHOLDER_IMAGES = [
  "https://images.pexels.com/photos/1029604/pexels-photo-1029604.jpeg?auto=compress&cs=tinysrgb&w=400",
  "https://images.pexels.com/photos/2559941/pexels-photo-2559941.jpeg?auto=compress&cs=tinysrgb&w=400",
  "https://images.pexels.com/photos/1266808/pexels-photo-1266808.jpeg?auto=compress&cs=tinysrgb&w=400",
  "https://images.pexels.com/photos/3825517/pexels-photo-3825517.jpeg?auto=compress&cs=tinysrgb&w=400",
  "https://images.pexels.com/photos/1484516/pexels-photo-1484516.jpeg?auto=compress&cs=tinysrgb&w=400",
  "https://images.pexels.com/photos/2693529/pexels-photo-2693529.jpeg?auto=compress&cs=tinysrgb&w=400",
  "https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg?auto=compress&cs=tinysrgb&w=400",
  "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400",
];

/**
 * Hero: Vertical Image Scroll
 *
 * Split layout. Left: title, subtitle, CTA button. Right: two columns of
 * images scrolling upward at slightly different speeds. Top and bottom edges
 * fade into the background via gradient masks.
 */
export default function VerticalImageScroll({
  title,
  subtitle,
  buttonLabel,
  brand,
  onButtonClick,
  products,
}: VerticalImageScrollProps) {
  const primary = brand.primaryColor || "#1a1a1a";

  // Collect all images from all products into a flat list.
  const productImages: string[] = [];
  if (products) {
    for (const p of products) {
      if (p.images) {
        for (const img of p.images) {
          if (img.url) productImages.push(img.url);
        }
      } else if (p.image) {
        productImages.push(p.image);
      }
    }
  }

  // Use product images if available, otherwise placeholders.
  const pool = productImages.length > 0 ? productImages : PLACEHOLDER_IMAGES;

  // Distribute alternating across two columns so both have variety.
  const col1Src: string[] = [];
  const col2Src: string[] = [];
  pool.forEach((src, i) => {
    if (i % 2 === 0) col1Src.push(src);
    else col2Src.push(src);
  });

  // Repeat until we have at least 8 per column for smooth scrolling.
  const repeat = (arr: string[], minLen: number): string[] => {
    const out: string[] = [];
    while (out.length < minLen) {
      out.push(...arr);
    }
    return out;
  };
  const col1Set = repeat(col1Src, 8);
  const col2Set = repeat(col2Src, 8);

  // Double each set — translateY(-50%) scrolls the first half, then
  // the identical second half takes over seamlessly.
  const col1 = [...col1Set, ...col1Set];
  const col2 = [...col2Set, ...col2Set];

  return (
    <section className={SCOPE}>
      <style>{`
        .${SCOPE} {
          padding: 40px 24px;
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 48px;
          align-items: center;
          min-height: 560px;
        }

        /* ---- left: text ---- */
        .${SCOPE}-text {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .${SCOPE}-title {
          font-size: clamp(2.4rem, 5.5vw, 3.8rem);
          font-weight: 700;
          color: #1a1a1a;
          margin: 0;
          font-family: ${brand.headerFont || "inherit"};
          line-height: 1.08;
          letter-spacing: -0.025em;
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
        }
        .${SCOPE}-btn:hover {
          opacity: 0.9;
          transform: scale(1.03);
        }

        /* ---- right: two scrolling columns ---- */
        .${SCOPE}-scroll-wrap {
          position: relative;
          height: 520px;
          overflow: hidden;
          border-radius: 20px;
        }

        /* Fade top & bottom */
        .${SCOPE}-scroll-wrap::before,
        .${SCOPE}-scroll-wrap::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          height: 100px;
          z-index: 2;
          pointer-events: none;
        }
        .${SCOPE}-scroll-wrap::before {
          top: 0;
          background: linear-gradient(to bottom, #fff, transparent);
        }
        .${SCOPE}-scroll-wrap::after {
          bottom: 0;
          background: linear-gradient(to top, #fff, transparent);
        }

        /* Two-column grid inside the scroll area */
        .${SCOPE}-columns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          height: 100%;
        }

        /* Individual column track */
        .${SCOPE}-col {
          overflow: hidden;
        }
        .${SCOPE}-track {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .${SCOPE}-track--slow {
          animation: ${SCOPE}-scroll 35s linear infinite;
        }
        .${SCOPE}-track--fast {
          animation: ${SCOPE}-scroll 25s linear infinite;
        }

        @keyframes ${SCOPE}-scroll {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }

        .${SCOPE}-track img {
          width: 100%;
          border-radius: 12px;
          object-fit: cover;
          aspect-ratio: 4 / 3;
          display: block;
          flex-shrink: 0;
        }

        @media (max-width: 900px) {
          .${SCOPE} {
            grid-template-columns: 1fr;
            padding: 32px 16px;
            gap: 32px;
          }
          .${SCOPE}-scroll-wrap {
            height: 400px;
          }
        }

        @media (max-width: 520px) {
          .${SCOPE}-scroll-wrap {
            height: 320px;
          }
        }
      `}</style>

      {/* Left — text */}
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

      {/* Right — two scrolling columns */}
      <div className={`${SCOPE}-scroll-wrap`}>
        <div className={`${SCOPE}-columns`}>
          <div className={`${SCOPE}-col`}>
            <div className={`${SCOPE}-track ${SCOPE}-track--slow`}>
              {col1.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element -- gallery images
                <img key={`c1-${src}-${i}`} src={src} alt="" />
              ))}
            </div>
          </div>
          <div className={`${SCOPE}-col`}>
            <div className={`${SCOPE}-track ${SCOPE}-track--fast`}>
              {col2.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element -- gallery images
                <img key={`c2-${src}-${i}`} src={src} alt="" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
