"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { getContrastColor } from "@/lib/colorPalette";
import type {
  SectionStyleOverrides,
  CustomFontType,
} from "@/types/landing-page";
import type { WidgetBrandConfig } from "../types";
import { fontForRole } from "../../hero/fontUtils";
import { getSectionTheme } from "../sectionTheme";
import ResizableText from "../../hero/ResizableText";

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
  isEditing?: boolean;
  onHeadingChange?: (heading: string) => void;
  onSubheadingChange?: (subheading: string) => void;
  onStyleOverrideChange?: (overrides: SectionStyleOverrides) => void;
  styleOverrides?: SectionStyleOverrides;
  onAddCustomFontType?: (ft: CustomFontType) => void;
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
  isEditing,
  onHeadingChange,
  onSubheadingChange,
  onStyleOverrideChange,
  styleOverrides,
  onAddCustomFontType,
}: SolidCardsProps) {
  const t2 = getSectionTheme(brand.colorMode);
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

  const headingRole = styleOverrides?.headingTypography || "header";
  const headingResolved = fontForRole(headingRole, brand);
  const headingStyle: React.CSSProperties = {
    fontSize: headingResolved.size,
    fontWeight: headingResolved.weight ?? 700,
    color: headingResolved.color ?? t2.heading,
    textAlign: styleOverrides?.headingTextAlign ?? "center",
    fontFamily: headingResolved.font || "inherit",
    lineHeight: 1.15,
    margin: "0 0 12px",
  };

  const subheadingRole = styleOverrides?.subheadingTypography || "sub-header";
  const subheadingResolved = fontForRole(subheadingRole, brand);
  const subAlign = styleOverrides?.subheadingTextAlign ?? "center";
  const subheadingStyle: React.CSSProperties = {
    fontSize: subheadingResolved.size,
    fontWeight: subheadingResolved.weight ?? "normal",
    color: subheadingResolved.color ?? t2.body,
    textAlign: subAlign,
    fontFamily: subheadingResolved.font || "inherit",
    maxWidth: 600,
    margin:
      subAlign === "center"
        ? "0 auto"
        : subAlign === "right"
          ? "0 0 0 auto"
          : 0,
  };

  const innerSubHeader = fontForRole("sub-header", brand);
  const innerBody = fontForRole("body", brand);

  return (
    <section ref={sectionRef} className={SCOPE}>
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
          color: ${innerSubHeader.color || t2.heading};
          margin: 0 0 12px;
          font-family: ${innerSubHeader.font || "inherit"};
        }
        .${SCOPE}-subheading {
          font-size: 1.1rem;
          color: ${innerBody.color || t2.body};
          max-width: 600px;
          margin: 0 auto;
          font-family: ${innerBody.font || "inherit"};
        }
        .${SCOPE}-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: ${brand.cardStyle?.margin ?? 20}px;
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
          border-radius: ${brand.cardStyle?.borderRadius ?? 14}px;
          padding: ${brand.cardStyle?.padding ?? 28}px;
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
          font-weight: ${innerSubHeader.weight ?? 600};
          font-size: ${innerSubHeader.size}px;
          color: #ffffff;
          font-family: ${innerSubHeader.font || "inherit"};
        }
        .${SCOPE}-author-title {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.5);
          margin-top: 2px;
          font-family: ${innerBody.font || "inherit"};
        }
        .${SCOPE}-stars {
          display: flex;
          gap: 3px;
        }
        .${SCOPE}-quote {
          font-size: ${innerBody.size}px;
          line-height: 1.7;
          color: rgba(255,255,255,0.7);
          font-family: ${innerBody.font || "inherit"};
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
                  typographyRole: styleOverrides?.headingTypography || "header",
                  onTypographyRoleChange: (v) =>
                    emitOverride({ headingTypography: v }),
                  textAlign: styleOverrides?.headingTextAlign ?? "center",
                  onTextAlignChange: (v) =>
                    emitOverride({ headingTextAlign: v }),
                  customFontTypes: brand.customFontTypes,
                  onAddCustomFontType,
                }}
              />
            ) : (
              heading && (
                <h2 className={`${SCOPE}-heading`} style={headingStyle}>
                  {heading}
                </h2>
              )
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
                  typographyRole:
                    styleOverrides?.subheadingTypography || "sub-header",
                  onTypographyRoleChange: (v) =>
                    emitOverride({ subheadingTypography: v }),
                  textAlign: styleOverrides?.subheadingTextAlign ?? "center",
                  onTextAlignChange: (v) =>
                    emitOverride({ subheadingTextAlign: v }),
                  customFontTypes: brand.customFontTypes,
                  onAddCustomFontType,
                }}
              />
            ) : (
              subheading && (
                <p className={`${SCOPE}-subheading`} style={subheadingStyle}>
                  {subheading}
                </p>
              )
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
