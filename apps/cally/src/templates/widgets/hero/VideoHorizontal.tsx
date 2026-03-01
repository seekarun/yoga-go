"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import type { HeroStyleOverrides } from "@/types/landing-page";
import type { WidgetBrandConfig } from "../types";
import { getContrastColor } from "@/lib/colorPalette";
import ResizableText from "../../hero/ResizableText";
import { renderSpans } from "../../hero/spanUtils";
import { getSpanFontUrls } from "../../hero/fonts";

interface VideoHorizontalProps {
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

const SCOPE = "w-hr-vh";

const DEFAULT_VIDEOS = [
  "https://videos.pexels.com/video-files/3982856/3982856-uhd_2560_1440_30fps.mp4",
  "https://videos.pexels.com/video-files/8760113/8760113-hd_1920_1080_30fps.mp4",
  "https://videos.pexels.com/video-files/8524222/8524222-hd_1920_1080_25fps.mp4",
  "https://videos.pexels.com/video-files/4769802/4769802-hd_1920_1080_25fps.mp4",
];

/**
 * Hero: Video Horizontal
 *
 * Full-width hero background that plays videos one at a time, full landscape.
 * When one video ends it crossfades to the next, looping back to the first
 * after the last. Dark overlay for text contrast.
 */
export default function VideoHorizontal({
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
}: VideoHorizontalProps) {
  const primary = brand.primaryColor || "#6366f1";
  const [activeIndex, setActiveIndex] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  // Selection state for editing
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

  const handleEnded = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % DEFAULT_VIDEOS.length);
  }, []);

  useEffect(() => {
    videoRefs.current.forEach((el, i) => {
      if (!el) return;
      if (i === activeIndex) {
        el.currentTime = 0;
        el.play().catch(() => {});
      } else {
        el.pause();
      }
    });
  }, [activeIndex]);

  useEffect(() => {
    const first = videoRefs.current[0];
    if (first) first.play().catch(() => {});
  }, []);

  const setRef = useCallback(
    (index: number) => (el: HTMLVideoElement | null) => {
      videoRefs.current[index] = el;
    },
    [],
  );

  const titleStyle: React.CSSProperties = {
    fontSize: overrides?.titleFontSize ?? "clamp(2rem, 5vw, 3.5rem)",
    fontWeight: overrides?.titleFontWeight ?? 700,
    fontStyle: overrides?.titleFontStyle ?? "normal",
    color: overrides?.titleTextColor ?? "#fff",
    textAlign: overrides?.titleTextAlign ?? "center",
    fontFamily: overrides?.titleFontFamily || brand.headerFont || "inherit",
    lineHeight: 1.15,
    margin: "0 0 16px",
    textShadow: "0 2px 12px rgba(0, 0, 0, 0.3)",
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: overrides?.subtitleFontSize ?? "clamp(1rem, 2vw, 1.25rem)",
    fontWeight: overrides?.subtitleFontWeight ?? "normal",
    fontStyle: overrides?.subtitleFontStyle ?? "normal",
    color: overrides?.subtitleTextColor ?? "rgba(255, 255, 255, 0.85)",
    textAlign: overrides?.subtitleTextAlign ?? "center",
    fontFamily: overrides?.subtitleFontFamily || brand.bodyFont || "inherit",
    lineHeight: 1.6,
    margin: "0 auto 36px",
    maxWidth: 600,
    textShadow: "0 1px 6px rgba(0, 0, 0, 0.2)",
  };

  return (
    <section ref={sectionRef} className={SCOPE}>
      <style>{`
        .${SCOPE} {
          position: relative;
          width: 100%;
          min-height: 520px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000;
        }
        .${SCOPE}-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0;
          transition: opacity 1.2s ease;
        }
        .${SCOPE}-video--active {
          opacity: 1;
        }
        .${SCOPE}-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 1;
        }
        .${SCOPE}-content {
          position: relative;
          z-index: 2;
          text-align: center;
          padding: 60px 24px;
          max-width: 800px;
        }
        .${SCOPE}-btn {
          display: inline-block;
          padding: 14px 40px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 1rem;
          border: none;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s;
          color: ${getContrastColor(primary)};
          background: ${primary};
          font-family: ${brand.bodyFont || "inherit"};
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
        }
        .${SCOPE}-btn:hover {
          opacity: 0.9;
          transform: scale(1.03);
        }
        @media (max-width: 768px) {
          .${SCOPE} { min-height: 420px; }
          .${SCOPE}-content { padding: 40px 16px; }
        }
      `}</style>

      {DEFAULT_VIDEOS.map((src, i) => (
        <video
          key={src}
          ref={setRef(i)}
          className={`${SCOPE}-video${i === activeIndex ? ` ${SCOPE}-video--active` : ""}`}
          src={src}
          muted
          playsInline
          preload={i === 0 ? "auto" : "metadata"}
          onEnded={i === activeIndex ? handleEnded : undefined}
        />
      ))}

      <div className={`${SCOPE}-overlay`} />

      <div className={`${SCOPE}-content`}>
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
              color: overrides?.titleTextColor ?? "#fff",
              textAlign: overrides?.titleTextAlign ?? "center",
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
              fontSize: overrides?.subtitleFontSize ?? 18,
              fontFamily: overrides?.subtitleFontFamily ?? "",
              fontWeight: overrides?.subtitleFontWeight ?? "normal",
              fontStyle: overrides?.subtitleFontStyle ?? "normal",
              color: overrides?.subtitleTextColor ?? "rgba(255,255,255,0.85)",
              textAlign: overrides?.subtitleTextAlign ?? "center",
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
    </section>
  );
}
