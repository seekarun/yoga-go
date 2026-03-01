"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { AboutStyleOverrides } from "@/types/landing-page";
import type { WidgetBrandConfig } from "../types";
import ResizableText from "../../hero/ResizableText";
import ImageToolbar from "../../hero/ImageToolbar";
import { bgFilterToCSS } from "../../hero/layoutOptions";
import { processRemoveBackground } from "../../hero/removeBackgroundUtil";

interface LeftImageProps {
  title?: string;
  paragraph?: string;
  image?: string;
  imagePosition?: string;
  imageZoom?: number;
  styleOverrides?: AboutStyleOverrides;
  brand: WidgetBrandConfig;
  /** Enable inline editing. */
  isEditing?: boolean;
  onTitleChange?: (title: string) => void;
  onParagraphChange?: (paragraph: string) => void;
  onImageClick?: () => void;
  onImagePositionChange?: (position: string) => void;
  onImageZoomChange?: (zoom: number) => void;
  onStyleOverrideChange?: (overrides: AboutStyleOverrides) => void;
}

const SCOPE = "w-ab-li";

const PLACEHOLDER_IMAGE =
  "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=600";

/** Parse "x% y%" position string into numbers. */
function parsePosition(pos?: string): { x: number; y: number } {
  if (!pos) return { x: 50, y: 50 };
  const parts = pos.split(/\s+/).map((p) => parseInt(p, 10));
  return { x: parts[0] ?? 50, y: parts[1] ?? 50 };
}

/**
 * About: Left Image
 *
 * Two-column layout with a tall portrait image on the left and the about
 * title + paragraph text on the right. Warm cream background.
 *
 * In edit mode, uses ResizableText for title/paragraph (with TextToolbar)
 * and ImageToolbar for image controls (position, zoom, replace).
 */
export default function LeftImage({
  title,
  paragraph,
  image,
  imagePosition,
  imageZoom,
  styleOverrides: overrides,
  brand,
  isEditing = false,
  onTitleChange,
  onParagraphChange,
  onImageClick,
  onImagePositionChange,
  onImageZoomChange,
  onStyleOverrideChange,
}: LeftImageProps) {
  const primary = brand.primaryColor || "#1a1a1a";
  const imgSrc = overrides?.bgRemovedImage || image || PLACEHOLDER_IMAGE;

  // Selection state
  const [titleSelected, setTitleSelected] = useState(false);
  const [paragraphSelected, setParagraphSelected] = useState(false);
  const [imageSelected, setImageSelected] = useState(false);

  // Remove-BG state
  const [removingBg, setRemovingBg] = useState(false);
  const [bgRemoved, setBgRemoved] = useState(false);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);

  // Refs for click-outside detection
  const sectionRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const paragraphRef = useRef<HTMLDivElement>(null);

  // Click-outside listener: deselect everything when clicking outside
  useEffect(() => {
    if (!isEditing) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (sectionRef.current && !sectionRef.current.contains(target)) {
        setTitleSelected(false);
        setParagraphSelected(false);
        setImageSelected(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isEditing]);

  const deselectAll = useCallback(() => {
    setTitleSelected(false);
    setParagraphSelected(false);
    setImageSelected(false);
  }, []);

  // Parsed image position
  const pos = parsePosition(imagePosition);

  // Style override helpers
  const emitOverride = useCallback(
    (patch: Partial<AboutStyleOverrides>) => {
      onStyleOverrideChange?.({ ...overrides, ...patch });
    },
    [overrides, onStyleOverrideChange],
  );

  const handleRemoveBg = useCallback(async () => {
    if (removingBg || !image) return;
    setOriginalImageUrl(image);
    setRemovingBg(true);
    try {
      const newUrl = await processRemoveBackground(image, "LeftImage");
      emitOverride({ bgRemovedImage: newUrl });
      setBgRemoved(true);
    } catch (err) {
      console.error("[DBG][LeftImage] Remove BG failed:", err);
      setOriginalImageUrl(null);
    } finally {
      setRemovingBg(false);
    }
  }, [removingBg, image, emitOverride]);

  const handleUndoRemoveBg = useCallback(() => {
    if (!originalImageUrl) return;
    emitOverride({ bgRemovedImage: undefined });
    setBgRemoved(false);
    setOriginalImageUrl(null);
  }, [originalImageUrl, emitOverride]);

  // Title toolbar style
  const titleStyle: React.CSSProperties = {
    fontSize: overrides?.titleFontSize ?? 28,
    fontWeight: overrides?.titleFontWeight ?? "bold",
    fontStyle: overrides?.titleFontStyle ?? "normal",
    color: overrides?.titleTextColor ?? primary,
    textAlign: overrides?.titleTextAlign ?? "left",
    fontFamily: overrides?.titleFontFamily || brand.headerFont || "inherit",
    lineHeight: 1.15,
    margin: 0,
  };

  // Paragraph toolbar style
  const paragraphStyle: React.CSSProperties = {
    fontSize: overrides?.fontSize ?? 16,
    fontWeight: overrides?.fontWeight ?? "normal",
    fontStyle: overrides?.fontStyle ?? "normal",
    color: overrides?.textColor ?? "#4a4a4a",
    textAlign: overrides?.textAlign ?? "left",
    fontFamily: overrides?.fontFamily || brand.bodyFont || "inherit",
    lineHeight: 1.8,
    margin: 0,
    whiteSpace: "pre-line",
  };

  // Image styles — use background-image + background-position to match the
  // image uploader modal exactly. Both use background-size: cover + position %,
  // so the same values produce the same visual crop in both places.
  // MIN_POSITION_SCALE ensures there's always overflow in both dimensions so
  // both X and Y position sliders have a visible effect (background-size:cover
  // alone only overflows in one dimension based on aspect ratio).
  const MIN_POSITION_SCALE = 1.05;
  const userScale = (imageZoom || 100) / 100;
  const zoomScale = Math.max(MIN_POSITION_SCALE, userScale);
  const imgDivStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    backgroundImage: `url(${imgSrc})`,
    backgroundPosition: `${pos.x}% ${pos.y}%`,
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
    transform: `scale(${zoomScale})`,
    transformOrigin: `${pos.x}% ${pos.y}%`,
    filter: bgFilterToCSS(overrides?.imageFilter) || "none",
  };

  return (
    <section ref={sectionRef} className={SCOPE}>
      <style>{`
        .${SCOPE} {
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: 480px;
          background: ${brand.secondaryColor || "#faf6f1"};
          max-width: 1200px;
          margin: 0 auto;
        }
        .${SCOPE}-img-col {
          position: relative;
          min-height: 480px;
        }
        .${SCOPE}-img-wrap {
          width: 100%;
          height: 100%;
          overflow: hidden;
          cursor: ${isEditing ? "pointer" : "default"};
        }
        .${SCOPE}-img-col--selected .${SCOPE}-img-wrap {
          outline: 2px solid #3b82f6;
          outline-offset: -2px;
        }
        .${SCOPE}-text {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 64px 56px;
          gap: 24px;
        }
        .${SCOPE}-dot {
          color: ${primary};
        }
        @media (max-width: 768px) {
          .${SCOPE} {
            grid-template-columns: 1fr;
          }
          .${SCOPE}-img-col {
            min-height: 320px;
            max-height: 400px;
          }
          .${SCOPE}-text {
            padding: 40px 24px;
          }
        }
      `}</style>

      {/* Left — image */}
      <div
        ref={imageRef}
        className={`${SCOPE}-img-col${imageSelected ? ` ${SCOPE}-img-col--selected` : ""}`}
        onClick={
          isEditing
            ? () => {
                setImageSelected(true);
                setTitleSelected(false);
                setParagraphSelected(false);
              }
            : undefined
        }
      >
        <div className={`${SCOPE}-img-wrap`}>
          <div role="img" aria-label={title || "About"} style={imgDivStyle} />
        </div>

        {/* ImageToolbar — outside overflow:hidden wrapper so it's not clipped */}
        {isEditing && imageSelected && (
          <ImageToolbar
            borderRadius={overrides?.borderRadius ?? 0}
            positionX={pos.x}
            positionY={pos.y}
            zoom={imageZoom || 100}
            filter={overrides?.imageFilter}
            onBorderRadiusChange={(v) => emitOverride({ borderRadius: v })}
            onPositionChange={(x, y) => onImagePositionChange?.(`${x}% ${y}%`)}
            onZoomChange={(v) => onImageZoomChange?.(v)}
            onFilterChange={(v) =>
              emitOverride({ imageFilter: v === "none" ? undefined : v })
            }
            onReplaceImage={() => onImageClick?.()}
            onRemoveBgClick={image ? handleRemoveBg : undefined}
            removingBg={removingBg}
            bgRemoved={bgRemoved}
            onUndoRemoveBg={handleUndoRemoveBg}
          />
        )}
      </div>

      {/* Right — text */}
      <div
        className={`${SCOPE}-text`}
        onClick={
          isEditing
            ? (e) => {
                // Only deselect image if clicking the text area background
                if (e.target === e.currentTarget) {
                  deselectAll();
                }
              }
            : undefined
        }
      >
        {isEditing ? (
          <div ref={titleRef}>
            <ResizableText
              text={title || "About Me"}
              isEditing
              onTextChange={onTitleChange}
              textStyle={titleStyle}
              selected={titleSelected}
              onSelect={() => {
                setTitleSelected(true);
                setParagraphSelected(false);
                setImageSelected(false);
              }}
              onDeselect={() => setTitleSelected(false)}
              toolbarProps={{
                fontSize: overrides?.titleFontSize ?? 28,
                fontFamily: overrides?.titleFontFamily ?? "",
                fontWeight: overrides?.titleFontWeight ?? "bold",
                fontStyle: overrides?.titleFontStyle ?? "normal",
                color: overrides?.titleTextColor ?? primary,
                textAlign: overrides?.titleTextAlign ?? "left",
                onFontSizeChange: (v) => emitOverride({ titleFontSize: v }),
                onFontFamilyChange: (v) => emitOverride({ titleFontFamily: v }),
                onFontWeightChange: (v) => emitOverride({ titleFontWeight: v }),
                onFontStyleChange: (v) => emitOverride({ titleFontStyle: v }),
                onColorChange: (v) => emitOverride({ titleTextColor: v }),
                onTextAlignChange: (v) => emitOverride({ titleTextAlign: v }),
              }}
            />
          </div>
        ) : (
          title && (
            <h2 style={titleStyle}>
              {title}
              <span className={`${SCOPE}-dot`}>.</span>
            </h2>
          )
        )}

        {isEditing ? (
          <div ref={paragraphRef}>
            <ResizableText
              text={paragraph || ""}
              isEditing
              onTextChange={onParagraphChange}
              textStyle={paragraphStyle}
              selected={paragraphSelected}
              onSelect={() => {
                setParagraphSelected(true);
                setTitleSelected(false);
                setImageSelected(false);
              }}
              onDeselect={() => setParagraphSelected(false)}
              toolbarProps={{
                fontSize: overrides?.fontSize ?? 16,
                fontFamily: overrides?.fontFamily ?? "",
                fontWeight: overrides?.fontWeight ?? "normal",
                fontStyle: overrides?.fontStyle ?? "normal",
                color: overrides?.textColor ?? "#4a4a4a",
                textAlign: overrides?.textAlign ?? "left",
                onFontSizeChange: (v) => emitOverride({ fontSize: v }),
                onFontFamilyChange: (v) => emitOverride({ fontFamily: v }),
                onFontWeightChange: (v) => emitOverride({ fontWeight: v }),
                onFontStyleChange: (v) => emitOverride({ fontStyle: v }),
                onColorChange: (v) => emitOverride({ textColor: v }),
                onTextAlignChange: (v) => emitOverride({ textAlign: v }),
              }}
            />
          </div>
        ) : (
          paragraph && <p style={paragraphStyle}>{paragraph}</p>
        )}
      </div>
    </section>
  );
}
