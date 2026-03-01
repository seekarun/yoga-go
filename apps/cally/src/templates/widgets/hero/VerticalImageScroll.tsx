"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Product } from "@/types";
import type { HeroStyleOverrides } from "@/types/landing-page";
import type { WidgetBrandConfig } from "../types";
import { getContrastColor } from "@/lib/colorPalette";
import ResizableText from "../../hero/ResizableText";
import { renderSpans } from "../../hero/spanUtils";
import { getSpanFontUrls } from "../../hero/fonts";

interface VerticalImageScrollProps {
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
  brand: WidgetBrandConfig;
  onButtonClick?: () => void;
  products?: Product[];
  isEditing?: boolean;
  styleOverrides?: HeroStyleOverrides;
  onTitleChange?: (title: string) => void;
  onSubtitleChange?: (subtitle: string) => void;
  onStyleOverrideChange?: (overrides: HeroStyleOverrides) => void;
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
 * Split layout. Left: title, subtitle, CTA. Right: two columns of images
 * scrolling upward at different speeds.
 */
export default function VerticalImageScroll({
  title,
  subtitle,
  buttonLabel,
  brand,
  onButtonClick,
  products,
  isEditing = false,
  styleOverrides: overrides,
  onTitleChange,
  onSubtitleChange,
  onStyleOverrideChange,
}: VerticalImageScrollProps) {
  const primary = brand.primaryColor || "#1a1a1a";

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

  // Collect images from products
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
  const pool = productImages.length > 0 ? productImages : PLACEHOLDER_IMAGES;

  const col1Src: string[] = [];
  const col2Src: string[] = [];
  pool.forEach((src, i) => {
    if (i % 2 === 0) col1Src.push(src);
    else col2Src.push(src);
  });

  const repeat = (arr: string[], minLen: number): string[] => {
    const out: string[] = [];
    while (out.length < minLen) out.push(...arr);
    return out;
  };
  const col1Set = repeat(col1Src, 8);
  const col2Set = repeat(col2Src, 8);
  const col1 = [...col1Set, ...col1Set];
  const col2 = [...col2Set, ...col2Set];

  const titleStyle: React.CSSProperties = {
    fontSize: overrides?.titleFontSize ?? "clamp(2.4rem, 5.5vw, 3.8rem)",
    fontWeight: overrides?.titleFontWeight ?? 700,
    fontStyle: overrides?.titleFontStyle ?? "normal",
    color: overrides?.titleTextColor ?? "#1a1a1a",
    textAlign: overrides?.titleTextAlign ?? "left",
    fontFamily: overrides?.titleFontFamily || brand.headerFont || "inherit",
    lineHeight: 1.08,
    letterSpacing: "-0.025em",
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
          padding: 40px 24px; max-width: 1280px; margin: 0 auto;
          display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 48px;
          align-items: center; min-height: 560px;
        }
        .${SCOPE}-text { display: flex; flex-direction: column; gap: 24px; }
        .${SCOPE}-btn {
          display: inline-block; width: fit-content; padding: 16px 40px;
          border-radius: 50px; font-weight: 600; font-size: 1rem; border: none;
          cursor: pointer; transition: opacity 0.2s, transform 0.15s;
          color: ${getContrastColor(primary)}; background: ${primary};
          font-family: ${brand.bodyFont || "inherit"};
        }
        .${SCOPE}-btn:hover { opacity: 0.9; transform: scale(1.03); }
        .${SCOPE}-scroll-wrap {
          position: relative; height: 520px; overflow: hidden; border-radius: 20px;
        }
        .${SCOPE}-scroll-wrap::before, .${SCOPE}-scroll-wrap::after {
          content: ""; position: absolute; left: 0; right: 0; height: 100px; z-index: 2; pointer-events: none;
        }
        .${SCOPE}-scroll-wrap::before { top: 0; background: linear-gradient(to bottom, #fff, transparent); }
        .${SCOPE}-scroll-wrap::after { bottom: 0; background: linear-gradient(to top, #fff, transparent); }
        .${SCOPE}-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; height: 100%; }
        .${SCOPE}-col { overflow: hidden; }
        .${SCOPE}-track { display: flex; flex-direction: column; gap: 12px; }
        .${SCOPE}-track--slow { animation: ${SCOPE}-scroll 35s linear infinite; }
        .${SCOPE}-track--fast { animation: ${SCOPE}-scroll 25s linear infinite; }
        @keyframes ${SCOPE}-scroll { 0% { transform: translateY(0); } 100% { transform: translateY(-50%); } }
        .${SCOPE}-track img { width: 100%; border-radius: 12px; object-fit: cover; aspect-ratio: 4 / 3; display: block; flex-shrink: 0; }
        @media (max-width: 900px) {
          .${SCOPE} { grid-template-columns: 1fr; padding: 32px 16px; gap: 32px; }
          .${SCOPE}-scroll-wrap { height: 400px; }
        }
        @media (max-width: 520px) { .${SCOPE}-scroll-wrap { height: 320px; } }
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
              fontSize: overrides?.titleFontSize ?? 38,
              fontFamily: overrides?.titleFontFamily ?? "",
              fontWeight: overrides?.titleFontWeight ?? "bold",
              fontStyle: overrides?.titleFontStyle ?? "normal",
              color: overrides?.titleTextColor ?? "#1a1a1a",
              textAlign: overrides?.titleTextAlign ?? "left",
              onFontSizeChange: (v) => emitOverride({ titleFontSize: v }),
              onFontFamilyChange: (v) => emitOverride({ titleFontFamily: v }),
              onFontWeightChange: (v) => emitOverride({ titleFontWeight: v }),
              onFontStyleChange: (v) => emitOverride({ titleFontStyle: v }),
              onColorChange: (v) => emitOverride({ titleTextColor: v }),
              onTextAlignChange: (v) => emitOverride({ titleTextAlign: v }),
            }}
            spans={overrides?.titleSpans}
            onSpansChange={(spans) => emitOverride({ titleSpans: spans })}
            isTitle
          />
        ) : (
          title && (
            <>
              {getSpanFontUrls(overrides?.titleSpans).map((url) => (
                <link key={url} rel="stylesheet" href={url} />
              ))}
              <h1 style={titleStyle}>
                {overrides?.titleSpans && overrides.titleSpans.length > 0
                  ? renderSpans(title, overrides.titleSpans, titleStyle).map(
                      (s) => (
                        <span key={s.startIndex} style={s.style}>
                          {s.text}
                        </span>
                      ),
                    )
                  : title}
              </h1>
            </>
          )
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
