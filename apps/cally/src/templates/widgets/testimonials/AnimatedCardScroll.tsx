"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import type { WidgetBrandConfig } from "../types";
import type { SectionStyleOverrides } from "@/types/landing-page";
import { getContrastColor } from "@/lib/colorPalette";
import ResizableText from "../../hero/ResizableText";

interface Testimonial {
  id: string;
  quote: string;
  authorName: string;
  authorTitle?: string;
  rating?: number;
}

interface AnimatedCardScrollProps {
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

const SCOPE = "w-tm-acs";
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
      <span key={i} style={{ color: i <= full ? color : "#d1d5db" }}>
        &#9733;
      </span>,
    );
  }
  return <>{stars}</>;
}

/**
 * Testimonials: Animated Card Scroll
 *
 * Horizontal carousel where the focused card grows larger and side cards
 * shrink. Smooth scale + slide transitions. Arrow buttons on the sides,
 * dot indicators below. Auto-slides left, infinite loop via 3× cloned track.
 */
export default function AnimatedCardScroll({
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
}: AnimatedCardScrollProps) {
  const limited = useMemo(() => testimonials.slice(0, 6), [testimonials]);
  const count = limited.length;

  const [centerIdx, setCenterIdx] = useState(count);
  const [transitionOn, setTransitionOn] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pausedRef = useRef(false);
  const [headingSelected, setHeadingSelected] = useState(false);
  const [subheadingSelected, setSubheadingSelected] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const primary = brand.primaryColor || "#6366f1";
  const starColor = brand.secondaryColor || "#f5a623";

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

  const handleTransitionEnd = useCallback(
    (e: React.TransitionEvent) => {
      // Only handle the track's own transition, not bubbled card transitions
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

  useEffect(() => {
    if (!transitionOn) {
      // Force browser to paint the snapped position before re-enabling transition
      const el = trackRef.current;
      if (el) {
        // Reading offsetHeight forces a synchronous reflow/paint
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

  // Pause auto-cycle while user is hovering/touching the carousel
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

  // Active dot index (0..count-1)
  const activeDot = ((centerIdx % count) + count) % count;

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
          overflow: hidden;
          --card-w: 360px;
          --card-gap: 24px;
          --slot-w: calc(var(--card-w) + var(--card-gap));
          --focus-scale: 1.12;
          --side-scale: 0.88;
          --far-scale: 0.78;
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

        /* ---- carousel ---- */
        .${SCOPE}-carousel {
          position: relative;
          margin: 0 auto;
          max-width: 1200px;
        }
        .${SCOPE}-viewport {
          overflow: hidden;
          height: 420px;
          position: relative;
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

        /* ---- card ---- */
        .${SCOPE}-card {
          flex-shrink: 0;
          width: var(--card-w);
          background: ${brand.secondaryColor || "#fff"};
          border-radius: 20px;
          padding: 32px 28px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
          border: 1px solid #f0f0f0;
          display: flex;
          flex-direction: column;
          opacity: 1;
          transform-origin: center center;
        }
        /* Only animate card scale/shadow when the track itself is sliding */
        .${SCOPE}-track.sliding .${SCOPE}-card {
          transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94),
                      box-shadow 0.6s ease;
        }
        .${SCOPE}-card[data-dist="0"] {
          opacity: 1;
          box-shadow: 0 8px 40px rgba(0, 0, 0, 0.10);
          z-index: 3;
        }
        .${SCOPE}-card[data-dist="1"] {
          opacity: 0.7;
        }
        .${SCOPE}-card[data-dist="2"] {
          opacity: 0.4;
        }
        .${SCOPE}-card[data-dist="3"] {
          opacity: 0.4;
        }
        .${SCOPE}-stars {
          display: flex;
          gap: 2px;
          margin-bottom: 16px;
          font-size: 1.3rem;
          line-height: 1;
        }
        .${SCOPE}-quote {
          font-size: 1.05rem;
          line-height: 1.7;
          color: #1f2937;
          font-weight: 500;
          margin: 0 0 24px;
          font-family: ${brand.bodyFont || "inherit"};
          font-style: italic;
          flex: 1;
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
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 0.8rem;
          color: ${getContrastColor(primary)};
          flex-shrink: 0;
        }
        .${SCOPE}-author-name {
          font-weight: 600;
          font-size: 0.95rem;
          color: #1a1a1a;
          font-family: ${brand.bodyFont || "inherit"};
        }
        .${SCOPE}-author-title {
          font-size: 0.8rem;
          color: #6b7280;
          margin-top: 2px;
          font-family: ${brand.bodyFont || "inherit"};
        }

        /* ---- arrows ---- */
        .${SCOPE}-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.85);
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.10);
          color: #374151;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          transition: background 0.2s, box-shadow 0.2s;
          backdrop-filter: blur(4px);
        }
        .${SCOPE}-arrow:hover {
          background: #fff;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
        .${SCOPE}-arrow svg {
          width: 18px;
          height: 18px;
          fill: none;
          stroke: currentColor;
          stroke-width: 2.5;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .${SCOPE}-arrow-left {
          left: 12px;
        }
        .${SCOPE}-arrow-right {
          right: 12px;
        }

        /* ---- dots ---- */
        .${SCOPE}-dots {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 32px;
        }
        .${SCOPE}-dot {
          width: 8px;
          height: 8px;
          border-radius: 4px;
          background: #d1d5db;
          border: none;
          padding: 0;
          cursor: pointer;
          transition: width 0.3s, background 0.3s;
        }
        .${SCOPE}-dot.active {
          width: 24px;
          background: ${primary};
        }

        @media (max-width: 768px) {
          .${SCOPE} {
            padding: 48px 16px;
            --card-w: 280px;
            --card-gap: 16px;
          }
          .${SCOPE}-viewport {
            height: 380px;
          }
          .${SCOPE}-arrow {
            width: 36px;
            height: 36px;
          }
          .${SCOPE}-arrow svg {
            width: 14px;
            height: 14px;
          }
          .${SCOPE}-arrow-left { left: 4px; }
          .${SCOPE}-arrow-right { right: 4px; }
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
                color: styleOverrides?.headingTextColor ?? "#1a1a1a",
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
        className={`${SCOPE}-carousel`}
        onMouseEnter={handlePointerEnter}
        onMouseLeave={handlePointerLeave}
        onTouchStart={handlePointerEnter}
        onTouchEnd={handlePointerLeave}
      >
        <div className={`${SCOPE}-viewport`}>
          <div
            ref={trackRef}
            className={`${SCOPE}-track${transitionOn ? " sliding" : ""}`}
            style={{
              transform: `translateX(calc(-${centerIdx} * var(--slot-w) - var(--card-w) / 2))`,
            }}
            onTransitionEnd={handleTransitionEnd}
          >
            {extended.map((t, i) => {
              const dist = Math.abs(i - centerIdx);
              let cardScale = "var(--far-scale)";
              if (dist === 0) {
                cardScale = "var(--focus-scale)";
              } else if (dist === 1) {
                cardScale = "var(--side-scale)";
              }

              return (
                <div
                  key={`${t.id}-${i}`}
                  className={`${SCOPE}-card`}
                  data-dist={dist <= 2 ? dist : 3}
                  style={{
                    transform: `scale(${cardScale})`,
                  }}
                >
                  {t.rating && (
                    <div className={`${SCOPE}-stars`}>
                      {renderStars(t.rating, starColor)}
                    </div>
                  )}
                  <p className={`${SCOPE}-quote`}>&ldquo;{t.quote}&rdquo;</p>
                  <div className={`${SCOPE}-author`}>
                    <div
                      className={`${SCOPE}-avatar`}
                      style={{ backgroundColor: primary }}
                    >
                      {getInitials(t.authorName)}
                    </div>
                    <div>
                      <div className={`${SCOPE}-author-name`}>
                        {t.authorName}
                      </div>
                      {t.authorTitle && (
                        <div className={`${SCOPE}-author-title`}>
                          {t.authorTitle}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Arrows overlaying the viewport */}
          <button
            type="button"
            className={`${SCOPE}-arrow ${SCOPE}-arrow-left`}
            onClick={() => handleArrow(-1)}
            aria-label="Previous testimonial"
          >
            <svg viewBox="0 0 24 24">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            className={`${SCOPE}-arrow ${SCOPE}-arrow-right`}
            onClick={() => handleArrow(1)}
            aria-label="Next testimonial"
          >
            <svg viewBox="0 0 24 24">
              <polyline points="9 6 15 12 9 18" />
            </svg>
          </button>
        </div>

        {/* Dot indicators */}
        <div className={`${SCOPE}-dots`}>
          {limited.map((t, i) => (
            <button
              key={t.id}
              type="button"
              className={`${SCOPE}-dot${i === activeDot ? " active" : ""}`}
              aria-label={`Go to testimonial ${i + 1}`}
              onClick={() => {
                setTransitionOn(true);
                // Jump to the equivalent position in the middle set
                setCenterIdx(count + i);
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
