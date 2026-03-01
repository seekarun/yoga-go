"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { HeroStyleOverrides } from "@/types/landing-page";
import type { WidgetBrandConfig } from "../types";
import { getContrastColor } from "@/lib/colorPalette";
import ResizableText from "../../hero/ResizableText";

interface StatsBoxesProps {
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
  brand: WidgetBrandConfig;
  onButtonClick?: () => void;
  isEditing?: boolean;
  styleOverrides?: HeroStyleOverrides;
  onTitleChange?: (title: string) => void;
  onSubtitleChange?: (subtitle: string) => void;
  onStyleOverrideChange?: (overrides: HeroStyleOverrides) => void;
}

const SCOPE = "w-hr-sb";

const STATS = [
  { value: "1.2k+", label: "Happy Clients" },
  { value: "350+", label: "Sessions Booked" },
  { value: "4.9", label: "Average Rating" },
];

/**
 * Hero: Stats Boxes
 *
 * Split-layout hero. Left: title, subtitle, CTA. Right: 2x2 bento grid
 * with a hero image tile and stat boxes.
 */
export default function StatsBoxes({
  title,
  subtitle,
  buttonLabel,
  brand,
  onButtonClick,
  isEditing = false,
  styleOverrides: overrides,
  onTitleChange,
  onSubtitleChange,
  onStyleOverrideChange,
}: StatsBoxesProps) {
  const primary = brand.primaryColor || "#6366f1";

  const [titleSelected, setTitleSelected] = useState(false);
  const [subtitleSelected, setSubtitleSelected] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isEditing) return;
    const handler = (e: MouseEvent) => {
      if (
        sectionRef.current &&
        !sectionRef.current.contains(e.target as Node)
      ) {
        setTitleSelected(false);
        setSubtitleSelected(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isEditing]);

  const emitOverride = useCallback(
    (patch: Partial<HeroStyleOverrides>) => {
      onStyleOverrideChange?.({ ...overrides, ...patch });
    },
    [overrides, onStyleOverrideChange],
  );

  const titleStyle: React.CSSProperties = {
    fontSize: overrides?.titleFontSize ?? "clamp(2.2rem, 5vw, 3.5rem)",
    fontWeight: overrides?.titleFontWeight ?? 700,
    fontStyle: overrides?.titleFontStyle ?? "normal",
    color: overrides?.titleTextColor ?? "#111",
    textAlign: overrides?.titleTextAlign ?? "left",
    fontFamily: overrides?.titleFontFamily || brand.headerFont || "inherit",
    lineHeight: 1.12,
    letterSpacing: "-0.02em",
    margin: 0,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: overrides?.subtitleFontSize ?? "1.1rem",
    fontWeight: overrides?.subtitleFontWeight ?? "normal",
    fontStyle: overrides?.subtitleFontStyle ?? "normal",
    color: overrides?.subtitleTextColor ?? "#6b7280",
    textAlign: overrides?.subtitleTextAlign ?? "left",
    fontFamily: overrides?.subtitleFontFamily || brand.bodyFont || "inherit",
    lineHeight: 1.7,
    margin: 0,
    maxWidth: 520,
  };

  return (
    <section ref={sectionRef} className={SCOPE}>
      <style>{`
        .${SCOPE} {
          padding: 40px 24px;
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
          align-items: center;
        }
        .${SCOPE}-text {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .${SCOPE}-title em {
          font-style: italic;
          color: ${primary};
        }
        .${SCOPE}-btn {
          display: inline-block;
          width: fit-content;
          padding: 15px 36px;
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
          transform: scale(1.02);
        }
        .${SCOPE}-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 16px;
        }
        .${SCOPE}-col-left {
          display: flex;
          flex-direction: column;
          gap: 16px;
          transform: translateY(40px);
        }
        .${SCOPE}-col-right {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .${SCOPE}-img-tile {
          border-radius: 20px;
          overflow: hidden;
          background: #f0eee9;
          aspect-ratio: 1;
          position: relative;
        }
        .${SCOPE}-img-tile img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .${SCOPE}-stat {
          border-radius: 20px;
          padding: 28px 24px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          aspect-ratio: 1;
        }
        .${SCOPE}-stat--light { background: #f5f5f0; }
        .${SCOPE}-stat--warm { background: #ede8e3; }
        .${SCOPE}-stat-value {
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 700;
          color: #111;
          margin: 0 0 4px;
          font-family: ${brand.headerFont || "inherit"};
          letter-spacing: -0.02em;
          line-height: 1.1;
        }
        .${SCOPE}-stat-label {
          font-size: 0.95rem;
          color: #6b7280;
          margin: 0;
          font-family: ${brand.bodyFont || "inherit"};
          font-weight: 500;
        }
        @media (max-width: 900px) {
          .${SCOPE} { grid-template-columns: 1fr; padding: 48px 16px; gap: 32px; }
          .${SCOPE}-col-left { transform: none; }
        }
        @media (max-width: 520px) {
          .${SCOPE}-grid { grid-template-columns: 1fr; }
          .${SCOPE}-col-left, .${SCOPE}-col-right { transform: none; }
        }
      `}</style>

      <div className={`${SCOPE}-text`}>
        {isEditing ? (
          <ResizableText
            text={title || "Your Heading"}
            isEditing
            onTextChange={onTitleChange}
            textStyle={titleStyle}
            selected={titleSelected}
            onSelect={() => {
              setTitleSelected(true);
              setSubtitleSelected(false);
            }}
            onDeselect={() => setTitleSelected(false)}
            toolbarProps={{
              fontSize: overrides?.titleFontSize ?? 36,
              fontFamily: overrides?.titleFontFamily ?? "",
              fontWeight: overrides?.titleFontWeight ?? "bold",
              fontStyle: overrides?.titleFontStyle ?? "normal",
              color: overrides?.titleTextColor ?? "#111",
              textAlign: overrides?.titleTextAlign ?? "left",
              onFontSizeChange: (v) => emitOverride({ titleFontSize: v }),
              onFontFamilyChange: (v) => emitOverride({ titleFontFamily: v }),
              onFontWeightChange: (v) => emitOverride({ titleFontWeight: v }),
              onFontStyleChange: (v) => emitOverride({ titleFontStyle: v }),
              onColorChange: (v) => emitOverride({ titleTextColor: v }),
              onTextAlignChange: (v) => emitOverride({ titleTextAlign: v }),
            }}
          />
        ) : (
          title && <h1 style={titleStyle}>{title}</h1>
        )}

        {isEditing ? (
          <ResizableText
            text={subtitle || ""}
            isEditing
            onTextChange={onSubtitleChange}
            textStyle={subtitleStyle}
            selected={subtitleSelected}
            onSelect={() => {
              setSubtitleSelected(true);
              setTitleSelected(false);
            }}
            onDeselect={() => setSubtitleSelected(false)}
            toolbarProps={{
              fontSize: overrides?.subtitleFontSize ?? 17,
              fontFamily: overrides?.subtitleFontFamily ?? "",
              fontWeight: overrides?.subtitleFontWeight ?? "normal",
              fontStyle: overrides?.subtitleFontStyle ?? "normal",
              color: overrides?.subtitleTextColor ?? "#6b7280",
              textAlign: overrides?.subtitleTextAlign ?? "left",
              onFontSizeChange: (v) => emitOverride({ subtitleFontSize: v }),
              onFontFamilyChange: (v) =>
                emitOverride({ subtitleFontFamily: v }),
              onFontWeightChange: (v) =>
                emitOverride({ subtitleFontWeight: v }),
              onFontStyleChange: (v) => emitOverride({ subtitleFontStyle: v }),
              onColorChange: (v) => emitOverride({ subtitleTextColor: v }),
              onTextAlignChange: (v) => emitOverride({ subtitleTextAlign: v }),
            }}
          />
        ) : (
          subtitle && <p style={subtitleStyle}>{subtitle}</p>
        )}

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

      <div className={`${SCOPE}-grid`}>
        <div className={`${SCOPE}-col-left`}>
          <div className={`${SCOPE}-img-tile`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- placeholder image */}
            <img
              src="https://images.pexels.com/photos/3822864/pexels-photo-3822864.jpeg?auto=compress&cs=tinysrgb&w=600"
              alt="Hero"
            />
          </div>
          <div className={`${SCOPE}-stat ${SCOPE}-stat--light`}>
            <p className={`${SCOPE}-stat-value`}>{STATS[1].value}</p>
            <p className={`${SCOPE}-stat-label`}>{STATS[1].label}</p>
          </div>
        </div>
        <div className={`${SCOPE}-col-right`}>
          <div className={`${SCOPE}-stat ${SCOPE}-stat--light`}>
            <p className={`${SCOPE}-stat-value`}>{STATS[0].value}</p>
            <p className={`${SCOPE}-stat-label`}>{STATS[0].label}</p>
          </div>
          <div className={`${SCOPE}-stat ${SCOPE}-stat--warm`}>
            <p className={`${SCOPE}-stat-value`}>{STATS[2].value}</p>
            <p className={`${SCOPE}-stat-label`}>{STATS[2].label}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
