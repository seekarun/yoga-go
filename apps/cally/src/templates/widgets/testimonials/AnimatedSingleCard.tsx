"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { getContrastColor } from "@/lib/colorPalette";
import type { WidgetBrandConfig } from "../types";
import type { SectionStyleOverrides } from "@/types/landing-page";
import ResizableText from "../../hero/ResizableText";

interface Testimonial {
  id: string;
  quote: string;
  authorName: string;
  authorTitle?: string;
  rating?: number;
}

interface AnimatedSingleCardProps {
  testimonials: Testimonial[];
  heading?: string;
  subheading?: string;
  brand: WidgetBrandConfig;
  /** Auto-cycle interval in ms (default 5000) */
  interval?: number;
  isEditing?: boolean;
  onHeadingChange?: (heading: string) => void;
  onSubheadingChange?: (subheading: string) => void;
  onStyleOverrideChange?: (overrides: SectionStyleOverrides) => void;
  styleOverrides?: SectionStyleOverrides;
}

const SCOPE = "w-tm-asc";
const DEFAULT_INTERVAL = 5000;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2)
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] || "?").toUpperCase();
}

function renderStars(rating: number, color: string): React.ReactElement {
  const stars: React.ReactElement[] = [];
  const full = Math.round(rating);
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <span key={i} style={{ color: i <= full ? color : "#d1d5db" }}>
        &#9733;
      </span>,
    );
  }
  return <>{stars}</>;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(0,0,0,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Testimonials: Animated Single Card
 *
 * A single large card that cycles through testimonials with a fade transition.
 * Author avatars are shown below as clickable selectors — the active one is
 * enlarged. Auto-cycles every N seconds, pauses on hover or manual selection.
 */
export default function AnimatedSingleCard({
  testimonials,
  heading,
  subheading,
  brand,
  interval = DEFAULT_INTERVAL,
  isEditing,
  onHeadingChange,
  onSubheadingChange,
  onStyleOverrideChange,
  styleOverrides,
}: AnimatedSingleCardProps) {
  const limited = testimonials.slice(0, 6);
  const [activeIndex, setActiveIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pausedRef = useRef(false);
  const [headingSelected, setHeadingSelected] = useState(false);
  const [subheadingSelected, setSubheadingSelected] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const count = limited.length;
  const primary = brand.primaryColor || "#6366f1";

  const goTo = useCallback(
    (index: number) => {
      if (index === activeIndex) return;
      setFading(true);
      setTimeout(() => {
        setActiveIndex(index);
        setFading(false);
      }, 250);
    },
    [activeIndex],
  );

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (count === 0) return;
    timerRef.current = setInterval(() => {
      if (pausedRef.current) return;
      setFading(true);
      setTimeout(() => {
        setActiveIndex((prev) => (prev + 1) % count);
        setFading(false);
      }, 250);
    }, interval);
  }, [count, interval]);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTimer]);

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

  if (count === 0) return null;

  const handleSelect = (index: number) => {
    // Pause auto-cycle for 2x interval after manual click
    pausedRef.current = true;
    goTo(index);
    setTimeout(() => {
      pausedRef.current = false;
    }, interval * 2);
  };

  const active = limited[activeIndex] || limited[0];

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
    <section className={SCOPE} ref={sectionRef}>
      <style>{`
        .${SCOPE} {
          padding: 80px 24px;
        }
        .${SCOPE}-container {
          max-width: 720px;
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
        .${SCOPE}-card {
          background: ${brand.secondaryColor || "#f9fafb"};
          border-radius: 20px;
          padding: 48px 40px 40px;
          text-align: center;
          box-shadow: 0 4px 32px rgba(0, 0, 0, 0.06);
          position: relative;
          overflow: hidden;
        }
        .${SCOPE}-content {
          transition: opacity 0.25s ease;
        }
        .${SCOPE}-content.fading {
          opacity: 0;
        }
        .${SCOPE}-stars {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          margin-bottom: 20px;
          font-size: 2.5rem;
          line-height: 1;
        }
        .${SCOPE}-quote {
          font-size: clamp(1.15rem, 2.5vw, 1.5rem);
          line-height: 1.7;
          color: #1f2937;
          font-weight: 500;
          margin: 0 0 28px;
          font-family: ${brand.bodyFont || "inherit"};
          font-style: italic;
          height: calc(1.7em * 5);
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 5;
          -webkit-box-orient: vertical;
        }
        .${SCOPE}-author-name {
          font-weight: 700;
          font-size: 1.05rem;
          color: #1a1a1a;
          font-family: ${brand.bodyFont || "inherit"};
        }
        .${SCOPE}-author-title {
          font-size: 0.85rem;
          color: #6b7280;
          margin-top: 4px;
          font-family: ${brand.bodyFont || "inherit"};
        }
        .${SCOPE}-avatars {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 32px;
          height: 58px;
        }
        .${SCOPE}-av {
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          color: ${getContrastColor(primary)};
          cursor: pointer;
          transition: all 0.3s ease;
          flex-shrink: 0;
          /* inactive size */
          width: 44px;
          height: 44px;
          font-size: 0.8rem;
          opacity: 0.5;
          filter: grayscale(0.4);
        }
        .${SCOPE}-av.active {
          width: 58px;
          height: 58px;
          font-size: 0.95rem;
          opacity: 1;
          filter: none;
          box-shadow: 0 0 0 3px ${hexToRgba(primary, 0.35)};
        }
        .${SCOPE}-av:hover:not(.active) {
          opacity: 0.8;
          filter: none;
        }
        @media (max-width: 640px) {
          .${SCOPE} {
            padding: 48px 16px;
          }
          .${SCOPE}-card {
            padding: 32px 24px 28px;
          }
          .${SCOPE}-avatars {
            height: 50px;
          }
          .${SCOPE}-av {
            width: 38px;
            height: 38px;
            font-size: 0.7rem;
          }
          .${SCOPE}-av.active {
            width: 50px;
            height: 50px;
            font-size: 0.85rem;
          }
        }
      `}</style>

      <div className={`${SCOPE}-container`}>
        {(heading || subheading || isEditing) && (
          <div className={`${SCOPE}-header`}>
            {isEditing ? (
              <ResizableText
                text={heading || "What People Say"}
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
                text={subheading || "Hear from our community"}
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

        <div
          className={`${SCOPE}-card`}
          onMouseEnter={() => {
            pausedRef.current = true;
          }}
          onMouseLeave={() => {
            pausedRef.current = false;
          }}
        >
          <div className={`${SCOPE}-content${fading ? " fading" : ""}`}>
            {active.rating && (
              <div className={`${SCOPE}-stars`}>
                {renderStars(active.rating, primary)}
              </div>
            )}
            <p className={`${SCOPE}-quote`}>&ldquo;{active.quote}&rdquo;</p>
            <div className={`${SCOPE}-author-name`}>{active.authorName}</div>
            {active.authorTitle && (
              <div className={`${SCOPE}-author-title`}>
                {active.authorTitle}
              </div>
            )}
          </div>

          {/* Avatar selector row */}
          <div className={`${SCOPE}-avatars`}>
            {limited.map((t, i) => (
              <div
                key={t.id}
                className={`${SCOPE}-av${i === activeIndex ? " active" : ""}`}
                style={{ backgroundColor: primary }}
                onClick={() => handleSelect(i)}
                role="button"
                tabIndex={0}
                aria-label={`View testimonial from ${t.authorName}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleSelect(i);
                }}
              >
                {getInitials(t.authorName)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
