"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type {
  AboutConfig,
  AboutStyleOverrides,
  BrandFont,
} from "@/types/landing-page";
import type { ColorPalette } from "@/lib/colorPalette";
import DragHandle from "./DragHandle";
import ImageToolbar from "./ImageToolbar";
import TextToolbar from "./TextToolbar";
import AboutSectionToolbar from "./AboutSectionToolbar";
import RemoveBackgroundButton from "./RemoveBackgroundButton";

const DEFAULTS = {
  paddingTop: 80,
  paddingBottom: 80,
  imageWidth: 320,
  imageHeight: 320,
};

/** Base horizontal padding that's always applied for comfortable reading */
const BASE_HORIZONTAL_PADDING = 24;

const CONSTRAINTS = {
  imageMin: 100,
  imageMax: 1200,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

interface AboutSectionProps {
  about: AboutConfig;
  isEditing?: boolean;
  variant?: "light" | "dark" | "gray";
  palette?: ColorPalette;
  customColors?: { name: string; hex: string }[];
  brandFonts?: { headerFont?: BrandFont; bodyFont?: BrandFont };
  onCustomColorsChange?: (colors: { name: string; hex: string }[]) => void;
  onTitleChange?: (title: string) => void;
  onParagraphChange?: (paragraph: string) => void;
  onImageClick?: () => void;
  onStyleOverrideChange?: (overrides: AboutStyleOverrides) => void;
  onBgImageClick?: () => void;
  onImagePositionChange?: (position: string) => void;
  onImageZoomChange?: (zoom: number) => void;
  onRemoveBgComplete?: (newUrl: string) => void;
}

export default function AboutSection({
  about,
  isEditing = false,
  variant = "light",
  palette,
  customColors,
  brandFonts,
  onCustomColorsChange,
  onTitleChange,
  onParagraphChange,
  onImageClick,
  onStyleOverrideChange,
  onBgImageClick,
  onImagePositionChange,
  onImageZoomChange,
  onRemoveBgComplete,
}: AboutSectionProps) {
  const overrides = about.styleOverrides;

  // Track whether the image is selected (click to select, click outside to deselect)
  const [imageSelected, setImageSelected] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Track whether the title text is selected
  const [titleSelected, setTitleSelected] = useState(false);
  const titleContainerRef = useRef<HTMLDivElement>(null);

  // Track whether the body text is selected
  const [bodySelected, setBodySelected] = useState(false);
  const bodyContainerRef = useRef<HTMLDivElement>(null);

  // Track whether the section background is selected
  const [sectionSelected, setSectionSelected] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // Click-outside listener to deselect image
  useEffect(() => {
    if (!imageSelected) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        imageContainerRef.current &&
        !imageContainerRef.current.contains(e.target as Node)
      ) {
        setImageSelected(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [imageSelected]);

  // Click-outside listener to deselect title
  useEffect(() => {
    if (!titleSelected) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        titleContainerRef.current &&
        !titleContainerRef.current.contains(e.target as Node)
      ) {
        setTitleSelected(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [titleSelected]);

  // Click-outside listener to deselect body
  useEffect(() => {
    if (!bodySelected) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        bodyContainerRef.current &&
        !bodyContainerRef.current.contains(e.target as Node)
      ) {
        setBodySelected(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [bodySelected]);

  // Click-outside listener to deselect section
  useEffect(() => {
    if (!sectionSelected) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        sectionRef.current &&
        !sectionRef.current.contains(e.target as Node)
      ) {
        setSectionSelected(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sectionSelected]);

  // Local drag deltas for instant visual feedback (image resize only)
  const [dragDelta, setDragDelta] = useState<{
    imageWidth?: number;
    imageHeight?: number;
  }>({});

  // Store base values at drag start (image resize only)
  const baseRef = useRef({
    imageWidth: 0,
    imageHeight: 0,
  });

  const showHandles = isEditing && !!onStyleOverrideChange;

  // Resolved values
  const resolvedPaddingTop = overrides?.paddingTop ?? DEFAULTS.paddingTop;
  const resolvedPaddingBottom =
    overrides?.paddingBottom ?? DEFAULTS.paddingBottom;
  const resolvedPaddingLeft = overrides?.paddingLeft ?? 0;
  const resolvedPaddingRight = overrides?.paddingRight ?? 0;
  const resolvedImageWidth = clamp(
    dragDelta.imageWidth ?? overrides?.imageWidth ?? DEFAULTS.imageWidth,
    CONSTRAINTS.imageMin,
    CONSTRAINTS.imageMax,
  );
  const resolvedImageHeight = clamp(
    dragDelta.imageHeight ?? overrides?.imageHeight ?? DEFAULTS.imageHeight,
    CONSTRAINTS.imageMin,
    CONSTRAINTS.imageMax,
  );

  // --- Image drag handlers ---
  // Image edge handlers - right edge
  const handleImageRightDrag = useCallback((dx: number, _dy: number) => {
    const base = baseRef.current.imageWidth;
    setDragDelta((prev) => ({ ...prev, imageWidth: base + dx }));
  }, []);

  const handleImageRightDragEnd = useCallback(() => {
    setDragDelta((prev) => {
      const final = clamp(
        prev.imageWidth ?? overrides?.imageWidth ?? DEFAULTS.imageWidth,
        CONSTRAINTS.imageMin,
        CONSTRAINTS.imageMax,
      );
      onStyleOverrideChange?.({
        ...overrides,
        imageWidth: final,
      });
      return { ...prev, imageWidth: undefined };
    });
  }, [overrides, onStyleOverrideChange]);

  // Image edge handlers - left edge (drag left = wider)
  const handleImageLeftDrag = useCallback((dx: number, _dy: number) => {
    const base = baseRef.current.imageWidth;
    setDragDelta((prev) => ({ ...prev, imageWidth: base - dx }));
  }, []);

  const handleImageLeftDragEnd = useCallback(() => {
    setDragDelta((prev) => {
      const final = clamp(
        prev.imageWidth ?? overrides?.imageWidth ?? DEFAULTS.imageWidth,
        CONSTRAINTS.imageMin,
        CONSTRAINTS.imageMax,
      );
      onStyleOverrideChange?.({
        ...overrides,
        imageWidth: final,
      });
      return { ...prev, imageWidth: undefined };
    });
  }, [overrides, onStyleOverrideChange]);

  // Image edge handlers - top edge (drag up = taller)
  const handleImageTopDrag = useCallback((_dx: number, dy: number) => {
    const base = baseRef.current.imageHeight;
    setDragDelta((prev) => ({ ...prev, imageHeight: base - dy }));
  }, []);

  const handleImageTopDragEnd = useCallback(() => {
    setDragDelta((prev) => {
      const final = clamp(
        prev.imageHeight ?? overrides?.imageHeight ?? DEFAULTS.imageHeight,
        CONSTRAINTS.imageMin,
        CONSTRAINTS.imageMax,
      );
      onStyleOverrideChange?.({
        ...overrides,
        imageHeight: final,
      });
      return { ...prev, imageHeight: undefined };
    });
  }, [overrides, onStyleOverrideChange]);

  // Image edge handlers - bottom edge (drag down = taller)
  const handleImageBottomDrag = useCallback((_dx: number, dy: number) => {
    const base = baseRef.current.imageHeight;
    setDragDelta((prev) => ({ ...prev, imageHeight: base + dy }));
  }, []);

  const handleImageBottomDragEnd = useCallback(() => {
    setDragDelta((prev) => {
      const final = clamp(
        prev.imageHeight ?? overrides?.imageHeight ?? DEFAULTS.imageHeight,
        CONSTRAINTS.imageMin,
        CONSTRAINTS.imageMax,
      );
      onStyleOverrideChange?.({
        ...overrides,
        imageHeight: final,
      });
      return { ...prev, imageHeight: undefined };
    });
  }, [overrides, onStyleOverrideChange]);

  // Corner handler - bottom-right (drag right+down = wider+taller)
  const handleCornerBottomRightDrag = useCallback((dx: number, dy: number) => {
    const baseW = baseRef.current.imageWidth;
    const baseH = baseRef.current.imageHeight;
    setDragDelta((prev) => ({
      ...prev,
      imageWidth: baseW + dx,
      imageHeight: baseH + dy,
    }));
  }, []);

  // Corner handler - bottom-left (drag left+down = wider+taller)
  const handleCornerBottomLeftDrag = useCallback((dx: number, dy: number) => {
    const baseW = baseRef.current.imageWidth;
    const baseH = baseRef.current.imageHeight;
    setDragDelta((prev) => ({
      ...prev,
      imageWidth: baseW - dx,
      imageHeight: baseH + dy,
    }));
  }, []);

  // Corner handler - top-right (drag right+up = wider+taller)
  const handleCornerTopRightDrag = useCallback((dx: number, dy: number) => {
    const baseW = baseRef.current.imageWidth;
    const baseH = baseRef.current.imageHeight;
    setDragDelta((prev) => ({
      ...prev,
      imageWidth: baseW + dx,
      imageHeight: baseH - dy,
    }));
  }, []);

  // Corner handler - top-left (drag left+up = wider+taller)
  const handleCornerTopLeftDrag = useCallback((dx: number, dy: number) => {
    const baseW = baseRef.current.imageWidth;
    const baseH = baseRef.current.imageHeight;
    setDragDelta((prev) => ({
      ...prev,
      imageWidth: baseW - dx,
      imageHeight: baseH - dy,
    }));
  }, []);

  const handleCornerDragEnd = useCallback(() => {
    setDragDelta((prev) => {
      const finalW = clamp(
        prev.imageWidth ?? overrides?.imageWidth ?? DEFAULTS.imageWidth,
        CONSTRAINTS.imageMin,
        CONSTRAINTS.imageMax,
      );
      const finalH = clamp(
        prev.imageHeight ?? overrides?.imageHeight ?? DEFAULTS.imageHeight,
        CONSTRAINTS.imageMin,
        CONSTRAINTS.imageMax,
      );
      onStyleOverrideChange?.({
        ...overrides,
        imageWidth: finalW,
        imageHeight: finalH,
      });
      return { ...prev, imageWidth: undefined, imageHeight: undefined };
    });
  }, [overrides, onStyleOverrideChange]);

  // Capture base values when image drag starts
  const captureBase = useCallback(() => {
    baseRef.current = {
      imageWidth: overrides?.imageWidth ?? DEFAULTS.imageWidth,
      imageHeight: overrides?.imageHeight ?? DEFAULTS.imageHeight,
    };
  }, [overrides]);

  // Parse image position for toolbar X/Y values
  const [posX, posY] = (about.imagePosition || "50% 50%")
    .split(" ")
    .map((v) => parseInt(v));

  const handleBorderRadiusChange = useCallback(
    (val: number) => {
      onStyleOverrideChange?.({ ...overrides, borderRadius: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handlePositionChange = useCallback(
    (x: number, y: number) => {
      onImagePositionChange?.(`${x}% ${y}%`);
    },
    [onImagePositionChange],
  );

  const handleZoomChange = useCallback(
    (val: number) => {
      onImageZoomChange?.(val);
    },
    [onImageZoomChange],
  );

  // Title toolbar handlers
  const handleTitleFontSizeChange = useCallback(
    (val: number) => {
      onStyleOverrideChange?.({ ...overrides, titleFontSize: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handleTitleFontFamilyChange = useCallback(
    (val: string) => {
      onStyleOverrideChange?.({ ...overrides, titleFontFamily: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handleTitleTextColorChange = useCallback(
    (val: string) => {
      onStyleOverrideChange?.({ ...overrides, titleTextColor: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handleTitleTextAlignChange = useCallback(
    (val: "left" | "center" | "right") => {
      onStyleOverrideChange?.({ ...overrides, titleTextAlign: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handleTitleFontWeightChange = useCallback(
    (val: "normal" | "bold") => {
      onStyleOverrideChange?.({ ...overrides, titleFontWeight: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handleTitleFontStyleChange = useCallback(
    (val: "normal" | "italic") => {
      onStyleOverrideChange?.({ ...overrides, titleFontStyle: val });
    },
    [overrides, onStyleOverrideChange],
  );

  // Body text toolbar handlers
  const handleFontSizeChange = useCallback(
    (val: number) => {
      onStyleOverrideChange?.({ ...overrides, fontSize: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handleFontFamilyChange = useCallback(
    (val: string) => {
      onStyleOverrideChange?.({ ...overrides, fontFamily: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handleTextColorChange = useCallback(
    (val: string) => {
      onStyleOverrideChange?.({ ...overrides, textColor: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handleTextAlignChange = useCallback(
    (val: "left" | "center" | "right") => {
      onStyleOverrideChange?.({ ...overrides, textAlign: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handleFontWeightChange = useCallback(
    (val: "normal" | "bold") => {
      onStyleOverrideChange?.({ ...overrides, fontWeight: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handleFontStyleChange = useCallback(
    (val: "normal" | "italic") => {
      onStyleOverrideChange?.({ ...overrides, fontStyle: val });
    },
    [overrides, onStyleOverrideChange],
  );

  // Section toolbar handlers
  const handleBgImageRemove = useCallback(() => {
    onStyleOverrideChange?.({
      ...overrides,
      bgImage: undefined,
      bgImageBlur: undefined,
      bgImageOpacity: undefined,
    });
  }, [overrides, onStyleOverrideChange]);

  const handleBgImageBlurChange = useCallback(
    (val: number) => {
      onStyleOverrideChange?.({ ...overrides, bgImageBlur: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handleBgImageOpacityChange = useCallback(
    (val: number) => {
      onStyleOverrideChange?.({ ...overrides, bgImageOpacity: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handleBgColorChange = useCallback(
    (val: string) => {
      onStyleOverrideChange?.({ ...overrides, bgColor: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handleLayoutChange = useCallback(
    (val: "image-left" | "image-right" | "stacked") => {
      onStyleOverrideChange?.({ ...overrides, layout: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handleToolbarPaddingTopChange = useCallback(
    (val: number) => {
      onStyleOverrideChange?.({ ...overrides, paddingTop: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handleToolbarPaddingBottomChange = useCallback(
    (val: number) => {
      onStyleOverrideChange?.({ ...overrides, paddingBottom: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handleToolbarPaddingLeftChange = useCallback(
    (val: number) => {
      onStyleOverrideChange?.({ ...overrides, paddingLeft: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handleToolbarPaddingRightChange = useCallback(
    (val: number) => {
      onStyleOverrideChange?.({ ...overrides, paddingRight: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const resolvedLayout = overrides?.layout ?? "image-left";

  const colors = {
    light: {
      bg: "#ffffff",
      text: "#4b5563",
      imageBg: "#f3f4f6",
      imagePlaceholder: "#9ca3af",
    },
    dark: {
      bg: "#111111",
      text: "#cccccc",
      imageBg: "#222222",
      imagePlaceholder: "#666666",
    },
    gray: {
      bg: "#fafafa",
      text: "#666666",
      imageBg: "#f3f4f6",
      imagePlaceholder: "#9ca3af",
    },
  };

  const theme = colors[variant];

  const sectionStyle: React.CSSProperties = {
    width: "100%",
    paddingTop: `${resolvedPaddingTop}px`,
    paddingBottom: `${resolvedPaddingBottom}px`,
    paddingLeft: 0,
    paddingRight: 0,
    backgroundColor: overrides?.bgColor || theme.bg,
    position: "relative",
    overflow:
      sectionSelected || imageSelected || titleSelected || bodySelected
        ? "visible"
        : "hidden",
    ...(showHandles
      ? {
          outline: "2px dashed rgba(59, 130, 246, 0.25)",
          outlineOffset: "-2px",
          zIndex:
            sectionSelected || imageSelected || titleSelected || bodySelected
              ? 10
              : undefined,
        }
      : {}),
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: "1440px",
    margin: "0 auto",
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "40px",
    flexWrap: "wrap",
    justifyContent: "center",
    position: "relative",
    zIndex: 1,
    flexDirection: resolvedLayout === "stacked" ? "column" : "row",
    paddingLeft: `${BASE_HORIZONTAL_PADDING + resolvedPaddingLeft}px`,
    paddingRight: `${BASE_HORIZONTAL_PADDING + resolvedPaddingRight}px`,
    boxSizing: "border-box",
  };

  const resolvedBorderRadius = overrides?.borderRadius ?? 16;

  const imageContainerStyle: React.CSSProperties = {
    position: "relative",
    width: `${resolvedImageWidth}px`,
    height: `${resolvedImageHeight}px`,
    borderRadius: `${resolvedBorderRadius}px`,
    overflow: showHandles ? "visible" : "hidden",
    flexShrink: 0,
    backgroundColor: about.image ? "transparent" : theme.imageBg,
    ...(resolvedLayout === "image-right" ? { order: 2 } : {}),
    ...(showHandles && imageSelected
      ? {
          outline: "2px solid #3b82f6",
          outlineOffset: "4px",
        }
      : {}),
    ...(showHandles ? { cursor: "pointer" } : {}),
  };

  const imageClipStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    borderRadius: `${resolvedBorderRadius}px`,
    overflow: "hidden",
  };

  const imgPosition = about.imagePosition || "50% 50%";
  const imageStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    backgroundImage: about.image ? `url(${about.image})` : undefined,
    backgroundPosition: imgPosition,
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
    backgroundColor: about.image ? undefined : theme.imageBg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transform: about.image
      ? `scale(${(about.imageZoom || 100) / 100})`
      : undefined,
    transformOrigin: about.image ? imgPosition : undefined,
  };

  const textStyle: React.CSSProperties = {
    flex: 1,
    minWidth: "280px",
    maxWidth: resolvedLayout === "stacked" ? "700px" : "500px",
    padding: "24px 0",
    ...(resolvedLayout === "image-right" ? { order: 1 } : {}),
  };

  const titleStyle: React.CSSProperties = {
    fontSize: overrides?.titleFontSize
      ? `${overrides.titleFontSize}px`
      : brandFonts?.headerFont?.size
        ? `${brandFonts.headerFont.size}px`
        : "1.75rem",
    fontWeight: overrides?.titleFontWeight ?? "bold",
    lineHeight: 1.3,
    marginBottom: "16px",
    color: overrides?.titleTextColor || theme.text,
    textAlign: overrides?.titleTextAlign || "left",
    fontFamily:
      overrides?.titleFontFamily || brandFonts?.headerFont?.family || undefined,
    fontStyle: overrides?.titleFontStyle || undefined,
  };

  const paragraphStyle: React.CSSProperties = {
    fontSize: overrides?.fontSize
      ? `${overrides.fontSize}px`
      : brandFonts?.bodyFont?.size
        ? `${brandFonts.bodyFont.size}px`
        : "1.1rem",
    lineHeight: 1.8,
    color: overrides?.textColor || theme.text,
    textAlign: overrides?.textAlign || "left",
    fontFamily:
      overrides?.fontFamily || brandFonts?.bodyFont?.family || undefined,
    fontWeight: overrides?.fontWeight || undefined,
    fontStyle: overrides?.fontStyle || undefined,
  };

  const editableStyle: React.CSSProperties = isEditing
    ? {
        cursor: "text",
        outline: "none",
        borderRadius: "4px",
        padding: "12px",
        transition: "background 0.2s, outline 0.2s",
      }
    : {};

  const editableClass =
    variant === "dark" ? "editable-field-light" : "editable-field-dark";

  return (
    <section
      ref={sectionRef}
      style={sectionStyle}
      onClick={
        showHandles
          ? (e) => {
              // Only activate section selection if click is NOT inside image, title, or body
              if (
                imageContainerRef.current?.contains(e.target as Node) ||
                titleContainerRef.current?.contains(e.target as Node) ||
                bodyContainerRef.current?.contains(e.target as Node)
              )
                return;
              setSectionSelected(true);
              setImageSelected(false);
              setTitleSelected(false);
              setBodySelected(false);
            }
          : undefined
      }
    >
      {isEditing && (
        <style>{`
          .editable-field-dark:focus {
            background: rgba(0, 0, 0, 0.05) !important;
            outline: 2px solid rgba(0, 0, 0, 0.3) !important;
          }
          .editable-field-dark:hover:not(:focus) {
            background: rgba(0, 0, 0, 0.02);
          }
          .editable-field-light:focus {
            background: rgba(255, 255, 255, 0.1) !important;
            outline: 2px solid rgba(255, 255, 255, 0.5) !important;
          }
          .editable-field-light:hover:not(:focus) {
            background: rgba(255, 255, 255, 0.05);
          }
        `}</style>
      )}

      {/* About section toolbar — anchored to section top so it doesn't move with padding */}
      {showHandles && sectionSelected && (
        <AboutSectionToolbar
          bgColor={overrides?.bgColor || theme.bg}
          bgImage={overrides?.bgImage}
          bgImageBlur={overrides?.bgImageBlur ?? 0}
          bgImageOpacity={overrides?.bgImageOpacity ?? 100}
          layout={resolvedLayout}
          paddingTop={overrides?.paddingTop ?? 80}
          paddingBottom={overrides?.paddingBottom ?? 80}
          paddingLeft={overrides?.paddingLeft ?? 0}
          paddingRight={overrides?.paddingRight ?? 0}
          palette={palette}
          customColors={customColors}
          onBgColorChange={handleBgColorChange}
          onBgImageClick={onBgImageClick}
          onBgImageRemove={handleBgImageRemove}
          onBgImageBlurChange={handleBgImageBlurChange}
          onBgImageOpacityChange={handleBgImageOpacityChange}
          onLayoutChange={handleLayoutChange}
          onPaddingTopChange={handleToolbarPaddingTopChange}
          onPaddingBottomChange={handleToolbarPaddingBottomChange}
          onPaddingLeftChange={handleToolbarPaddingLeftChange}
          onPaddingRightChange={handleToolbarPaddingRightChange}
          onCustomColorsChange={onCustomColorsChange}
        />
      )}

      {/* Background image layer */}
      {overrides?.bgImage && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${overrides.bgImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            filter: `blur(${overrides.bgImageBlur ?? 0}px)`,
            opacity: (overrides.bgImageOpacity ?? 100) / 100,
            zIndex: 0,
            transform:
              (overrides.bgImageBlur ?? 0) > 0 ? "scale(1.05)" : undefined,
          }}
        />
      )}

      <div style={containerStyle}>
        {/* About Image */}
        <div
          ref={imageContainerRef}
          style={imageContainerStyle}
          onClick={
            showHandles
              ? (e) => {
                  // Don't select if clicking the edit image button
                  if ((e.target as HTMLElement).closest("button")) return;
                  setImageSelected(true);
                  setTitleSelected(false);
                  setBodySelected(false);
                  setSectionSelected(false);
                }
              : undefined
          }
        >
          <div style={imageClipStyle}>
            <div style={imageStyle}>
              {!about.image && (
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={theme.imagePlaceholder}
                  strokeWidth="1.5"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              )}
            </div>
          </div>
          {isEditing && (
            <div
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                display: "flex",
                gap: "8px",
                zIndex: 5,
              }}
            >
              {about.image && onRemoveBgComplete && (
                <RemoveBackgroundButton
                  imageUrl={about.image}
                  onComplete={onRemoveBgComplete}
                />
              )}
              <button
                type="button"
                onClick={onImageClick}
                style={{
                  width: "36px",
                  height: "36px",
                  backgroundColor: "white",
                  borderRadius: "50%",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#374151"
                  strokeWidth="2"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </button>
            </div>
          )}

          {/* Image toolbar — floating above image when selected */}
          {showHandles && imageSelected && (
            <ImageToolbar
              borderRadius={resolvedBorderRadius}
              positionX={posX}
              positionY={posY}
              zoom={about.imageZoom || 100}
              onBorderRadiusChange={handleBorderRadiusChange}
              onPositionChange={handlePositionChange}
              onZoomChange={handleZoomChange}
              onReplaceImage={() => onImageClick?.()}
            />
          )}

          {/* Image resize drag handles — 4 edges + 4 corners (node mode) */}
          {showHandles && imageSelected && (
            <>
              {/* Edge midpoints */}
              <DragHandle
                position="top"
                mode="node"
                onDragStart={captureBase}
                onDrag={handleImageTopDrag}
                onDragEnd={handleImageTopDragEnd}
              />
              <DragHandle
                position="bottom"
                mode="node"
                onDragStart={captureBase}
                onDrag={handleImageBottomDrag}
                onDragEnd={handleImageBottomDragEnd}
              />
              <DragHandle
                position="left"
                mode="node"
                onDragStart={captureBase}
                onDrag={handleImageLeftDrag}
                onDragEnd={handleImageLeftDragEnd}
              />
              <DragHandle
                position="right"
                mode="node"
                onDragStart={captureBase}
                onDrag={handleImageRightDrag}
                onDragEnd={handleImageRightDragEnd}
              />
              {/* Corners */}
              <DragHandle
                position="top-left"
                mode="node"
                onDragStart={captureBase}
                onDrag={handleCornerTopLeftDrag}
                onDragEnd={handleCornerDragEnd}
              />
              <DragHandle
                position="top-right"
                mode="node"
                onDragStart={captureBase}
                onDrag={handleCornerTopRightDrag}
                onDragEnd={handleCornerDragEnd}
              />
              <DragHandle
                position="bottom-left"
                mode="node"
                onDragStart={captureBase}
                onDrag={handleCornerBottomLeftDrag}
                onDragEnd={handleCornerDragEnd}
              />
              <DragHandle
                position="bottom-right"
                mode="node"
                onDragStart={captureBase}
                onDrag={handleCornerBottomRightDrag}
                onDragEnd={handleCornerDragEnd}
              />
            </>
          )}
        </div>

        {/* About Text */}
        <div
          style={{
            ...textStyle,
            display: "flex",
            flexDirection: "column",
            gap: 0,
          }}
        >
          {/* Title — independently selectable */}
          <div
            ref={titleContainerRef}
            style={{
              position: "relative",
              ...(showHandles && titleSelected
                ? {
                    outline: "2px solid #3b82f6",
                    outlineOffset: "4px",
                    borderRadius: "4px",
                  }
                : {}),
              ...(showHandles ? { cursor: "pointer" } : {}),
            }}
            onClick={
              showHandles
                ? () => {
                    setTitleSelected(true);
                    setBodySelected(false);
                    setImageSelected(false);
                    setSectionSelected(false);
                  }
                : undefined
            }
          >
            {showHandles && titleSelected && (
              <TextToolbar
                fontSize={overrides?.titleFontSize ?? 28}
                fontFamily={overrides?.titleFontFamily ?? ""}
                fontWeight={overrides?.titleFontWeight ?? "bold"}
                fontStyle={overrides?.titleFontStyle ?? "normal"}
                color={overrides?.titleTextColor ?? theme.text}
                textAlign={overrides?.titleTextAlign ?? "left"}
                palette={palette}
                customColors={customColors}
                onFontSizeChange={handleTitleFontSizeChange}
                onFontFamilyChange={handleTitleFontFamilyChange}
                onFontWeightChange={handleTitleFontWeightChange}
                onFontStyleChange={handleTitleFontStyleChange}
                onColorChange={handleTitleTextColorChange}
                onTextAlignChange={handleTitleTextAlignChange}
                onCustomColorsChange={onCustomColorsChange}
              />
            )}
            {isEditing ? (
              <div
                className={editableClass}
                contentEditable
                suppressContentEditableWarning
                style={{ ...titleStyle, ...editableStyle }}
                onBlur={(e) =>
                  onTitleChange?.(e.currentTarget.textContent || "")
                }
              >
                {about.title || "About Me"}
              </div>
            ) : (
              (about.title ?? "About Me") && (
                <h2 style={titleStyle}>{about.title ?? "About Me"}</h2>
              )
            )}
          </div>

          {/* Body — independently selectable */}
          <div
            ref={bodyContainerRef}
            style={{
              position: "relative",
              ...(showHandles && bodySelected
                ? {
                    outline: "2px solid #3b82f6",
                    outlineOffset: "4px",
                    borderRadius: "4px",
                  }
                : {}),
              ...(showHandles ? { cursor: "pointer" } : {}),
            }}
            onClick={
              showHandles
                ? () => {
                    setBodySelected(true);
                    setTitleSelected(false);
                    setImageSelected(false);
                    setSectionSelected(false);
                  }
                : undefined
            }
          >
            {showHandles && bodySelected && (
              <TextToolbar
                fontSize={overrides?.fontSize ?? 18}
                fontFamily={overrides?.fontFamily ?? ""}
                fontWeight={overrides?.fontWeight ?? "normal"}
                fontStyle={overrides?.fontStyle ?? "normal"}
                color={overrides?.textColor ?? theme.text}
                textAlign={overrides?.textAlign ?? "left"}
                palette={palette}
                customColors={customColors}
                onFontSizeChange={handleFontSizeChange}
                onFontFamilyChange={handleFontFamilyChange}
                onFontWeightChange={handleFontWeightChange}
                onFontStyleChange={handleFontStyleChange}
                onColorChange={handleTextColorChange}
                onTextAlignChange={handleTextAlignChange}
                onCustomColorsChange={onCustomColorsChange}
              />
            )}
            {isEditing ? (
              <div
                className={editableClass}
                contentEditable
                suppressContentEditableWarning
                style={{ ...paragraphStyle, ...editableStyle }}
                onBlur={(e) =>
                  onParagraphChange?.(e.currentTarget.textContent || "")
                }
              >
                {about.paragraph}
              </div>
            ) : (
              <p style={paragraphStyle}>{about.paragraph}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
