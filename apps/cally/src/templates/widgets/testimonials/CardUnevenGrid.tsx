"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { getContrastColor } from "@/lib/colorPalette";
import type { SectionStyleOverrides } from "@/types/landing-page";
import type { WidgetBrandConfig } from "../types";
import ResizableText from "../../hero/ResizableText";

interface Testimonial {
  id: string;
  quote: string;
  authorName: string;
  authorTitle?: string;
  rating?: number;
}

interface CardUnevenGridProps {
  testimonials: Testimonial[];
  heading?: string;
  subheading?: string;
  brand: WidgetBrandConfig;
  isEditing?: boolean;
  onHeadingChange?: (heading: string) => void;
  onSubheadingChange?: (subheading: string) => void;
  onStyleOverrideChange?: (overrides: SectionStyleOverrides) => void;
  styleOverrides?: SectionStyleOverrides;
}

const SCOPE = "w-tm-ug";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2)
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] || "?").toUpperCase();
}

/**
 * Testimonials: Card Uneven Grid
 *
 * A 3-column, 2-row grid where the first card is a dark "featured" card
 * spanning both rows. The remaining 4 cards are light and fill a 2×2 grid
 * to the right. Shows up to 5 testimonials.
 */
export default function CardUnevenGrid({
  testimonials,
  heading,
  subheading,
  brand,
  isEditing,
  onHeadingChange,
  onSubheadingChange,
  onStyleOverrideChange,
  styleOverrides,
}: CardUnevenGridProps) {
  const [headingSelected, setHeadingSelected] = useState(false);
  const [subheadingSelected, setSubheadingSelected] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isEditing) return;
    const handler = (e: MouseEvent) => {
      if (
        sectionRef.current &&
        !sectionRef.current.contains(e.target as Node)
      ) {
        setHeadingSelected(false);
        setSubheadingSelected(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isEditing]);

  const emitOverride = useCallback(
    (patch: Partial<SectionStyleOverrides>) => {
      onStyleOverrideChange?.({ ...styleOverrides, ...patch });
    },
    [styleOverrides, onStyleOverrideChange],
  );

  const limited = useMemo(() => testimonials.slice(0, 5), [testimonials]);
  const count = limited.length;

  if (count === 0) return null;

  const primary = brand.primaryColor || "#6366f1";
  const starColor = brand.secondaryColor || "#f5a623";

  const headingStyle: React.CSSProperties = {
    fontSize: styleOverrides?.headingFontSize ?? "clamp(1.75rem, 3vw, 2.5rem)",
    fontWeight: styleOverrides?.headingFontWeight ?? 700,
    fontStyle: styleOverrides?.headingFontStyle ?? "normal",
    color: styleOverrides?.headingTextColor ?? "#1a1a1a",
    textAlign: styleOverrides?.headingTextAlign ?? "center",
    fontFamily:
      styleOverrides?.headingFontFamily || brand.headerFont || "inherit",
    lineHeight: 1.15,
    margin: "0 0 12px",
  };

  const subheadingStyle: React.CSSProperties = {
    fontSize: styleOverrides?.subheadingFontSize ?? "1.1rem",
    fontWeight: styleOverrides?.subheadingFontWeight ?? "normal",
    fontStyle: styleOverrides?.subheadingFontStyle ?? "normal",
    color: styleOverrides?.subheadingTextColor ?? "#6b7280",
    textAlign: styleOverrides?.subheadingTextAlign ?? "center",
    fontFamily:
      styleOverrides?.subheadingFontFamily || brand.bodyFont || "inherit",
    maxWidth: 600,
    margin: "0 auto",
  };

  return (
    <section ref={sectionRef} className={SCOPE}>
      <style>{`
        .${SCOPE} {
          padding: 80px 24px;
        }
        .${SCOPE}-container {
          max-width: 1100px;
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
          grid-template-columns: 1fr 1fr 1fr;
          grid-template-rows: auto auto;
          gap: 20px;
        }

        /* ---- shared card base ---- */
        .${SCOPE}-card {
          border-radius: 16px;
          padding: 28px 24px;
          display: flex;
          flex-direction: column;
        }
        .${SCOPE}-card-top {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }
        .${SCOPE}-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.8rem;
          flex-shrink: 0;
        }
        .${SCOPE}-rating {
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 600;
          font-size: 0.9rem;
        }
        .${SCOPE}-rating-star {
          color: ${starColor};
          font-size: 1rem;
        }
        .${SCOPE}-quote {
          font-size: 1rem;
          line-height: 1.7;
          font-weight: 500;
          margin: 0;
          flex: 1;
          font-family: ${brand.bodyFont || "inherit"};
        }
        .${SCOPE}-author {
          margin-top: 24px;
        }
        .${SCOPE}-author-name {
          font-weight: 600;
          font-size: 0.95rem;
          font-family: ${brand.bodyFont || "inherit"};
        }
        .${SCOPE}-author-title {
          font-size: 0.8rem;
          margin-top: 2px;
          font-family: ${brand.bodyFont || "inherit"};
        }

        /* ---- featured (dark) card ---- */
        .${SCOPE}-featured {
          grid-row: 1 / 3;
          background: #111;
          color: #fff;
          padding: 32px 28px;
        }
        .${SCOPE}-featured .${SCOPE}-avatar {
          background: ${primary};
          color: ${getContrastColor(primary)};
          border: 1px solid rgba(255,255,255,0.2);
        }
        .${SCOPE}-featured .${SCOPE}-rating {
          color: #fff;
        }
        .${SCOPE}-featured .${SCOPE}-quote {
          font-size: 1.15rem;
          color: #fff;
        }
        .${SCOPE}-featured .${SCOPE}-author-name {
          color: #fff;
        }
        .${SCOPE}-featured .${SCOPE}-author-title {
          color: rgba(255,255,255,0.6);
        }

        /* ---- light cards ---- */
        .${SCOPE}-light {
          background: ${brand.secondaryColor || "#f9fafb"};
          border: 1px solid #eee;
        }
        .${SCOPE}-light .${SCOPE}-avatar {
          background: ${primary};
          color: ${getContrastColor(primary)};
        }
        .${SCOPE}-light .${SCOPE}-rating {
          color: #1a1a1a;
        }
        .${SCOPE}-light .${SCOPE}-quote {
          color: #1f2937;
        }
        .${SCOPE}-light .${SCOPE}-author-name {
          color: #1a1a1a;
        }
        .${SCOPE}-light .${SCOPE}-author-title {
          color: #6b7280;
        }

        @media (max-width: 768px) {
          .${SCOPE} {
            padding: 48px 16px;
          }
          .${SCOPE}-grid {
            grid-template-columns: 1fr;
            grid-template-rows: auto;
          }
          .${SCOPE}-featured {
            grid-row: auto;
          }
        }
      `}</style>

      <div className={`${SCOPE}-container`}>
        {(heading || subheading || isEditing) && (
          <div className={`${SCOPE}-header`}>
            {isEditing ? (
              <ResizableText
                text={heading || "Section Heading"}
                isEditing
                onTextChange={onHeadingChange}
                textStyle={headingStyle}
                selected={headingSelected}
                onSelect={() => {
                  setHeadingSelected(true);
                  setSubheadingSelected(false);
                }}
                onDeselect={() => setHeadingSelected(false)}
                toolbarProps={{
                  fontSize: styleOverrides?.headingFontSize ?? 28,
                  fontFamily: styleOverrides?.headingFontFamily ?? "",
                  fontWeight: styleOverrides?.headingFontWeight ?? "bold",
                  fontStyle: styleOverrides?.headingFontStyle ?? "normal",
                  color: styleOverrides?.headingTextColor ?? "#1a1a1a",
                  textAlign: styleOverrides?.headingTextAlign ?? "center",
                  onFontSizeChange: (v) => emitOverride({ headingFontSize: v }),
                  onFontFamilyChange: (v) =>
                    emitOverride({ headingFontFamily: v }),
                  onFontWeightChange: (v) =>
                    emitOverride({ headingFontWeight: v }),
                  onFontStyleChange: (v) =>
                    emitOverride({ headingFontStyle: v }),
                  onColorChange: (v) => emitOverride({ headingTextColor: v }),
                  onTextAlignChange: (v) =>
                    emitOverride({ headingTextAlign: v }),
                }}
              />
            ) : (
              heading && <h2 className={`${SCOPE}-heading`}>{heading}</h2>
            )}
            {isEditing ? (
              <ResizableText
                text={subheading || "Section Subheading"}
                isEditing
                onTextChange={onSubheadingChange}
                textStyle={subheadingStyle}
                selected={subheadingSelected}
                onSelect={() => {
                  setSubheadingSelected(true);
                  setHeadingSelected(false);
                }}
                onDeselect={() => setSubheadingSelected(false)}
                toolbarProps={{
                  fontSize: styleOverrides?.subheadingFontSize ?? 16,
                  fontFamily: styleOverrides?.subheadingFontFamily ?? "",
                  fontWeight: styleOverrides?.subheadingFontWeight ?? "normal",
                  fontStyle: styleOverrides?.subheadingFontStyle ?? "normal",
                  color: styleOverrides?.subheadingTextColor ?? "#6b7280",
                  textAlign: styleOverrides?.subheadingTextAlign ?? "center",
                  onFontSizeChange: (v) =>
                    emitOverride({ subheadingFontSize: v }),
                  onFontFamilyChange: (v) =>
                    emitOverride({ subheadingFontFamily: v }),
                  onFontWeightChange: (v) =>
                    emitOverride({ subheadingFontWeight: v }),
                  onFontStyleChange: (v) =>
                    emitOverride({ subheadingFontStyle: v }),
                  onColorChange: (v) =>
                    emitOverride({ subheadingTextColor: v }),
                  onTextAlignChange: (v) =>
                    emitOverride({ subheadingTextAlign: v }),
                }}
              />
            ) : (
              subheading && (
                <p className={`${SCOPE}-subheading`}>{subheading}</p>
              )
            )}
          </div>
        )}

        <div className={`${SCOPE}-grid`}>
          {limited.map((t, i) => {
            const isFeatured = i === 0;
            const displayRating = t.rating ? t.rating.toFixed(1) : "5.0";

            return (
              <div
                key={t.id}
                className={`${SCOPE}-card ${isFeatured ? `${SCOPE}-featured` : `${SCOPE}-light`}`}
              >
                <div className={`${SCOPE}-card-top`}>
                  <div className={`${SCOPE}-avatar`}>
                    {getInitials(t.authorName)}
                  </div>
                  <div className={`${SCOPE}-rating`}>
                    {displayRating}{" "}
                    <span className={`${SCOPE}-rating-star`}>&#9733;</span>{" "}
                    Rating
                  </div>
                </div>

                <p className={`${SCOPE}-quote`}>&ldquo;{t.quote}&rdquo;</p>

                <div className={`${SCOPE}-author`}>
                  <div className={`${SCOPE}-author-name`}>{t.authorName}</div>
                  {t.authorTitle && (
                    <div className={`${SCOPE}-author-title`}>
                      {t.authorTitle}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
