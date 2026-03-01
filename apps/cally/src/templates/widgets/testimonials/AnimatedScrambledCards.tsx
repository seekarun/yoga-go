"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
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

interface AnimatedScrambledCardsProps {
  testimonials: Testimonial[];
  heading?: string;
  subheading?: string;
  brand: WidgetBrandConfig;
  /** Auto-cycle interval in ms (default 4000) */
  interval?: number;
  isEditing?: boolean;
  onHeadingChange?: (heading: string) => void;
  onSubheadingChange?: (subheading: string) => void;
  onStyleOverrideChange?: (overrides: SectionStyleOverrides) => void;
  styleOverrides?: SectionStyleOverrides;
}

const SCOPE = "w-tm-asc2";
const DEFAULT_INTERVAL = 4000;

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
      <span key={i} style={{ color: i <= full ? color : "#555" }}>
        &#9733;
      </span>,
    );
  }
  return <>{stars}</>;
}

/** Fixed rotation per testimonial so they look "scrambled" */
const ROTATIONS = [-2.5, 1.8, -1.5, 2.2, -2, 1.5];

/**
 * Testimonials: Animated Scrambled Cards
 *
 * Dark cards with slight rotations in a sliding carousel.
 * Fades toward the edges. Shows 2 full cards on desktop, 1 on mobile.
 * Auto-slides left at a set interval; arrow buttons below for manual control.
 * Uses 3x cloned track for seamless infinite looping.
 */
export default function AnimatedScrambledCards({
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
}: AnimatedScrambledCardsProps) {
  const limited = useMemo(() => testimonials.slice(0, 6), [testimonials]);
  const count = limited.length;

  // centerIdx points into the 3x extended array; starts in the middle copy
  const [centerIdx, setCenterIdx] = useState(count);
  const [transitionOn, setTransitionOn] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pausedRef = useRef(false);
  const [headingSelected, setHeadingSelected] = useState(false);
  const [subheadingSelected, setSubheadingSelected] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const starColor = brand.secondaryColor || "#f5b942";
  const primary = brand.primaryColor || "#6366f1";

  // 3x copies for seamless infinite loop
  const extended = useMemo(
    () => [...limited, ...limited, ...limited],
    [limited],
  );

  const advance = useCallback(
    (dir: 1 | -1) => {
      if (count === 0) return;
      setTransitionOn(true);
      setCenterIdx((prev) => prev + dir);
    },
    [count],
  );

  // Auto-cycle
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (count === 0) return;
    timerRef.current = setInterval(() => {
      if (pausedRef.current) return;
      advance(1);
    }, interval);
  }, [count, interval, advance]);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTimer]);

  const trackRef = useRef<HTMLDivElement | null>(null);

  // After slide animation ends, snap back to middle range if needed
  const handleTransitionEnd = useCallback(
    (e: React.TransitionEvent) => {
      if (e.target !== trackRef.current) return;
      if (centerIdx >= count * 2) {
        setTransitionOn(false);
        setCenterIdx((prev) => prev - count);
      } else if (centerIdx < count) {
        setTransitionOn(false);
        setCenterIdx((prev) => prev + count);
      }
    },
    [centerIdx, count],
  );

  // Re-enable transition after a snap (double rAF ensures the no-transition frame paints)
  useEffect(() => {
    if (!transitionOn) {
      // Force browser to paint the snapped position before re-enabling transition
      const el = trackRef.current;
      if (el) {
        void el.offsetHeight;
      }
      const id = requestAnimationFrame(() => {
        setTransitionOn(true);
      });
      return () => cancelAnimationFrame(id);
    }
  }, [transitionOn]);

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

  const handlePointerEnter = () => {
    pausedRef.current = true;
  };
  const handlePointerLeave = () => {
    pausedRef.current = false;
  };

  const handleArrow = (dir: 1 | -1) => {
    advance(dir);
  };

  if (count === 0) return null;

  const headingStyle: React.CSSProperties = {
    fontSize: styleOverrides?.headingFontSize ?? "clamp(1.75rem, 3vw, 2.5rem)",
    fontWeight: styleOverrides?.headingFontWeight ?? 700,
    fontStyle: styleOverrides?.headingFontStyle ?? "normal",
    color: styleOverrides?.headingTextColor ?? "#fff",
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
    color: styleOverrides?.subheadingTextColor ?? "rgba(255,255,255,0.55)",
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
          background: #111;
          overflow: hidden;
          --card-w: 440px;
          --card-gap: 28px;
          --slot-w: calc(var(--card-w) + var(--card-gap));
        }
        .${SCOPE}-header {
          text-align: center;
          margin-bottom: 48px;
        }
        .${SCOPE}-heading {
          font-size: clamp(1.75rem, 3vw, 2.5rem);
          font-weight: 700;
          color: #fff;
          margin: 0 0 12px;
          font-family: ${brand.headerFont || "inherit"};
        }
        .${SCOPE}-subheading {
          font-size: 1.1rem;
          color: rgba(255,255,255,0.55);
          max-width: 600px;
          margin: 0 auto;
          font-family: ${brand.bodyFont || "inherit"};
        }
        .${SCOPE}-track-wrapper {
          position: relative;
          margin: 0 auto;
          height: 340px;
          overflow: hidden;
          mask-image: linear-gradient(
            to right,
            transparent 0%,
            black 15%,
            black 85%,
            transparent 100%
          );
          -webkit-mask-image: linear-gradient(
            to right,
            transparent 0%,
            black 15%,
            black 85%,
            transparent 100%
          );
        }
        .${SCOPE}-track {
          position: absolute;
          left: 50%;
          top: 0;
          display: flex;
          gap: var(--card-gap);
          height: 100%;
          align-items: center;
          will-change: transform;
        }
        .${SCOPE}-track.sliding {
          transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        .${SCOPE}-card {
          flex-shrink: 0;
          width: var(--card-w);
          background: linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 100%);
          border-radius: 16px;
          padding: 36px 32px 32px;
          border: 1px solid rgba(255,255,255,0.08);
        }
        .${SCOPE}-stars {
          display: flex;
          gap: 3px;
          margin-bottom: 20px;
          font-size: 1.4rem;
          line-height: 1;
        }
        .${SCOPE}-quote {
          font-size: 1.05rem;
          line-height: 1.7;
          color: rgba(255,255,255,0.88);
          font-weight: 500;
          margin: 0 0 24px;
          font-family: ${brand.bodyFont || "inherit"};
          font-style: italic;
          height: calc(1.7em * 4);
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;
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
          color: ${getContrastColor(primary)};
          flex-shrink: 0;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.15);
        }
        .${SCOPE}-author-name {
          font-weight: 600;
          font-size: 0.95rem;
          color: #fff;
          font-family: ${brand.bodyFont || "inherit"};
        }
        .${SCOPE}-author-title {
          font-size: 0.8rem;
          color: ${primary};
          margin-top: 2px;
          font-family: ${brand.bodyFont || "inherit"};
        }
        .${SCOPE}-arrows {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-top: 40px;
        }
        .${SCOPE}-arrow {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.25);
          background: transparent;
          color: #fff;
          font-size: 1.2rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: border-color 0.2s, background 0.2s;
        }
        .${SCOPE}-arrow:hover {
          border-color: ${primary};
          background: rgba(255,255,255,0.05);
        }
        .${SCOPE}-arrow svg {
          width: 20px;
          height: 20px;
          fill: none;
          stroke: currentColor;
          stroke-width: 2.5;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        @media (max-width: 768px) {
          .${SCOPE} {
            padding: 48px 16px;
            --card-w: 300px;
            --card-gap: 20px;
          }
          .${SCOPE}-track-wrapper {
            height: 310px;
            mask-image: linear-gradient(
              to right,
              transparent 0%,
              black 10%,
              black 90%,
              transparent 100%
            );
            -webkit-mask-image: linear-gradient(
              to right,
              transparent 0%,
              black 10%,
              black 90%,
              transparent 100%
            );
          }
          .${SCOPE}-card {
            padding: 28px 24px 24px;
          }
          .${SCOPE}-quote {
            font-size: 0.95rem;
          }
        }
      `}</style>

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
                color: styleOverrides?.headingTextColor ?? "#fff",
                textAlign: styleOverrides?.headingTextAlign ?? "center",
                onFontSizeChange: (v) => emitOverride({ headingFontSize: v }),
                onFontFamilyChange: (v) =>
                  emitOverride({ headingFontFamily: v }),
                onFontWeightChange: (v) =>
                  emitOverride({ headingFontWeight: v }),
                onFontStyleChange: (v) => emitOverride({ headingFontStyle: v }),
                onColorChange: (v) => emitOverride({ headingTextColor: v }),
                onTextAlignChange: (v) => emitOverride({ headingTextAlign: v }),
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
                color:
                  styleOverrides?.subheadingTextColor ??
                  "rgba(255,255,255,0.55)",
                textAlign: styleOverrides?.subheadingTextAlign ?? "center",
                onFontSizeChange: (v) =>
                  emitOverride({ subheadingFontSize: v }),
                onFontFamilyChange: (v) =>
                  emitOverride({ subheadingFontFamily: v }),
                onFontWeightChange: (v) =>
                  emitOverride({ subheadingFontWeight: v }),
                onFontStyleChange: (v) =>
                  emitOverride({ subheadingFontStyle: v }),
                onColorChange: (v) => emitOverride({ subheadingTextColor: v }),
                onTextAlignChange: (v) =>
                  emitOverride({ subheadingTextAlign: v }),
              }}
            />
          ) : (
            subheading && <p className={`${SCOPE}-subheading`}>{subheading}</p>
          )}
        </div>
      )}

      <div
        className={`${SCOPE}-track-wrapper`}
        onMouseEnter={handlePointerEnter}
        onMouseLeave={handlePointerLeave}
        onTouchStart={handlePointerEnter}
        onTouchEnd={handlePointerLeave}
      >
        <div
          ref={trackRef}
          className={`${SCOPE}-track${transitionOn ? " sliding" : ""}`}
          style={{
            transform: `translateX(calc(-${centerIdx} * var(--slot-w) - var(--card-w) / 2))`,
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {extended.map((t, i) => (
            <div
              key={`${t.id}-${i}`}
              className={`${SCOPE}-card`}
              style={{
                transform: `rotate(${ROTATIONS[i % 6]}deg)`,
              }}
            >
              {t.rating && (
                <div className={`${SCOPE}-stars`}>
                  {renderStars(t.rating, starColor)}
                </div>
              )}
              <p className={`${SCOPE}-quote`}>&ldquo;{t.quote}&rdquo;</p>
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
            </div>
          ))}
        </div>
      </div>

      <div className={`${SCOPE}-arrows`}>
        <button
          type="button"
          className={`${SCOPE}-arrow`}
          onClick={() => handleArrow(-1)}
          aria-label="Previous testimonial"
        >
          <svg viewBox="0 0 24 24">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button
          type="button"
          className={`${SCOPE}-arrow`}
          onClick={() => handleArrow(1)}
          aria-label="Next testimonial"
        >
          <svg viewBox="0 0 24 24">
            <polyline points="9 6 15 12 9 18" />
          </svg>
        </button>
      </div>
    </section>
  );
}
