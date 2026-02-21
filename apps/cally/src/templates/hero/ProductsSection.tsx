"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { Product, ProductImage } from "@/types";
import type {
  BrandFont,
  ProductsConfig,
  ProductsStyleOverrides,
} from "@/types/landing-page";
import type { ColorPalette } from "@/lib/colorPalette";
import SectionToolbar from "./SectionToolbar";
import TextToolbar from "./TextToolbar";

/**
 * Tiny image carousel for product cards.
 * Shows prev/next arrows + dot indicators when there are 2+ images.
 */
function ProductImageCarousel({
  images,
  fallbackImage,
  fallbackPosition,
  fallbackZoom,
  imageBg,
}: {
  images: ProductImage[];
  fallbackImage?: string;
  fallbackPosition?: string;
  fallbackZoom?: number;
  imageBg: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Build a unified slide list: prefer images array, fallback to legacy single image
  const slides =
    images.length > 0
      ? images
      : fallbackImage
        ? [
            {
              id: "legacy",
              url: fallbackImage,
              position: fallbackPosition,
              zoom: fallbackZoom,
            },
          ]
        : [];

  const hasMultiple = slides.length > 1;

  const goNext = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    },
    [slides.length],
  );

  const goPrev = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
    },
    [slides.length],
  );

  if (slides.length === 0) return null;

  const current = slides[currentIndex];

  const containerStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    paddingTop: "56.25%",
    backgroundColor: imageBg,
    overflow: "hidden",
  };

  const imageStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    backgroundImage: `url(${current.url})`,
    backgroundPosition: current.position || "50% 50%",
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
    transform: current.zoom ? `scale(${current.zoom / 100})` : undefined,
    transition: "background-image 0.3s ease",
  };

  const arrowStyle = (side: "left" | "right"): React.CSSProperties => ({
    position: "absolute",
    top: "50%",
    [side]: "8px",
    transform: "translateY(-50%)",
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    backgroundColor: "rgba(0,0,0,0.45)",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0,
    transition: "opacity 0.2s",
    zIndex: 2,
  });

  const dotsContainerStyle: React.CSSProperties = {
    position: "absolute",
    bottom: "8px",
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    gap: "5px",
    zIndex: 2,
  };

  return (
    <div style={containerStyle} className="product-carousel-container">
      <div style={imageStyle} />
      {hasMultiple && (
        <>
          <button
            type="button"
            className="product-carousel-arrow"
            style={arrowStyle("left")}
            onClick={goPrev}
            aria-label="Previous image"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            type="button"
            className="product-carousel-arrow"
            style={arrowStyle("right")}
            onClick={goNext}
            aria-label="Next image"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          <div style={dotsContainerStyle}>
            {slides.map((slide, idx) => (
              <button
                key={slide.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  border: "none",
                  cursor: "pointer",
                  backgroundColor:
                    idx === currentIndex ? "#fff" : "rgba(255,255,255,0.5)",
                  transition: "background-color 0.2s",
                  padding: 0,
                }}
                aria-label={`Go to image ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface ProductsSectionProps {
  products: Product[];
  currency: string;
  variant?: "light" | "dark" | "gray";
  brandFonts?: { headerFont?: BrandFont; bodyFont?: BrandFont };
  productsConfig?: ProductsConfig;
  isEditing?: boolean;
  palette?: ColorPalette;
  customColors?: { name: string; hex: string }[];
  onHeadingChange?: (heading: string) => void;
  onSubheadingChange?: (subheading: string) => void;
  onBookProduct?: (productId: string) => void;
  onSignupWebinar?: (productId: string) => void;
  onStyleOverrideChange?: (overrides: ProductsStyleOverrides) => void;
  onCustomColorsChange?: (colors: { name: string; hex: string }[]) => void;
  onBgImageClick?: () => void;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  AUD: "$",
  USD: "$",
  GBP: "\u00a3",
  EUR: "\u20ac",
  INR: "\u20b9",
  NZD: "$",
  CAD: "$",
  SGD: "$",
};

function formatPrice(cents: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] || "$";
  const amount = cents / 100;
  return Number.isInteger(amount)
    ? `${symbol}${amount}`
    : `${symbol}${amount.toFixed(2)}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Products Section Component
 * Displays product catalog cards on the landing page
 */
export default function ProductsSection({
  products,
  currency,
  variant = "light",
  brandFonts,
  productsConfig,
  isEditing = false,
  palette,
  customColors,
  onHeadingChange,
  onSubheadingChange,
  onBookProduct,
  onSignupWebinar,
  onStyleOverrideChange,
  onCustomColorsChange,
  onBgImageClick,
}: ProductsSectionProps) {
  const overrides = productsConfig?.styleOverrides;

  // Track whether the section is selected (click to select, click outside to deselect)
  const [sectionSelected, setSectionSelected] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // Track whether the heading text is selected
  const [headingSelected, setHeadingSelected] = useState(false);
  const headingContainerRef = useRef<HTMLDivElement>(null);

  // Track whether the subheading text is selected
  const [subheadingSelected, setSubheadingSelected] = useState(false);
  const subheadingContainerRef = useRef<HTMLDivElement>(null);

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

  // Click-outside listener to deselect heading
  useEffect(() => {
    if (!headingSelected) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        headingContainerRef.current &&
        !headingContainerRef.current.contains(e.target as Node)
      ) {
        setHeadingSelected(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [headingSelected]);

  // Click-outside listener to deselect subheading
  useEffect(() => {
    if (!subheadingSelected) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        subheadingContainerRef.current &&
        !subheadingContainerRef.current.contains(e.target as Node)
      ) {
        setSubheadingSelected(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [subheadingSelected]);

  const showHandles = isEditing && !!onStyleOverrideChange;

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

  const handlePaddingTopChange = useCallback(
    (val: number) => {
      onStyleOverrideChange?.({ ...overrides, paddingTop: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handlePaddingBottomChange = useCallback(
    (val: number) => {
      onStyleOverrideChange?.({ ...overrides, paddingBottom: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handlePaddingLeftChange = useCallback(
    (val: number) => {
      onStyleOverrideChange?.({ ...overrides, paddingLeft: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handlePaddingRightChange = useCallback(
    (val: number) => {
      onStyleOverrideChange?.({ ...overrides, paddingRight: val });
    },
    [overrides, onStyleOverrideChange],
  );

  // Heading text toolbar handlers
  const handleHeadingFontSizeChange = useCallback(
    (val: number) => {
      onStyleOverrideChange?.({ ...overrides, headingFontSize: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handleHeadingFontFamilyChange = useCallback(
    (val: string) => {
      onStyleOverrideChange?.({ ...overrides, headingFontFamily: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handleHeadingFontWeightChange = useCallback(
    (val: "normal" | "bold") => {
      onStyleOverrideChange?.({ ...overrides, headingFontWeight: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handleHeadingFontStyleChange = useCallback(
    (val: "normal" | "italic") => {
      onStyleOverrideChange?.({ ...overrides, headingFontStyle: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handleHeadingTextColorChange = useCallback(
    (val: string) => {
      onStyleOverrideChange?.({ ...overrides, headingTextColor: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handleHeadingTextAlignChange = useCallback(
    (val: "left" | "center" | "right") => {
      onStyleOverrideChange?.({ ...overrides, headingTextAlign: val });
    },
    [overrides, onStyleOverrideChange],
  );

  // Subheading text toolbar handlers
  const handleSubheadingFontSizeChange = useCallback(
    (val: number) => {
      onStyleOverrideChange?.({ ...overrides, subheadingFontSize: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handleSubheadingFontFamilyChange = useCallback(
    (val: string) => {
      onStyleOverrideChange?.({ ...overrides, subheadingFontFamily: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handleSubheadingFontWeightChange = useCallback(
    (val: "normal" | "bold") => {
      onStyleOverrideChange?.({ ...overrides, subheadingFontWeight: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handleSubheadingFontStyleChange = useCallback(
    (val: "normal" | "italic") => {
      onStyleOverrideChange?.({ ...overrides, subheadingFontStyle: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handleSubheadingTextColorChange = useCallback(
    (val: string) => {
      onStyleOverrideChange?.({ ...overrides, subheadingTextColor: val });
    },
    [overrides, onStyleOverrideChange],
  );

  const handleSubheadingTextAlignChange = useCallback(
    (val: "left" | "center" | "right") => {
      onStyleOverrideChange?.({ ...overrides, subheadingTextAlign: val });
    },
    [overrides, onStyleOverrideChange],
  );

  if (products.length === 0) return null;

  const resolvedPaddingTop = overrides?.paddingTop ?? 80;
  const resolvedPaddingBottom = overrides?.paddingBottom ?? 80;
  const resolvedPaddingLeft = overrides?.paddingLeft ?? 0;
  const resolvedPaddingRight = overrides?.paddingRight ?? 0;

  const colors = {
    light: {
      bg: "#ffffff",
      heading: "#1a1a1a",
      subheading: "#6b7280",
      cardBg: "#f9fafb",
      cardTitle: "#1a1a1a",
      cardText: "#4b5563",
      cardBorder: "#e5e7eb",
      imageBg: "#e5e7eb",
      priceBg: "#f0f9ff",
      priceText: "#0369a1",
      badgeBg: "#f3f4f6",
      badgeText: "#6b7280",
    },
    dark: {
      bg: "#1a1a1a",
      heading: "#ffffff",
      subheading: "#9ca3af",
      cardBg: "#262626",
      cardTitle: "#ffffff",
      cardText: "#9ca3af",
      cardBorder: "#374151",
      imageBg: "#374151",
      priceBg: "#1e3a5f",
      priceText: "#93c5fd",
      badgeBg: "#374151",
      badgeText: "#9ca3af",
    },
    gray: {
      bg: "#f3f4f6",
      heading: "#1a1a1a",
      subheading: "#6b7280",
      cardBg: "#ffffff",
      cardTitle: "#1a1a1a",
      cardText: "#4b5563",
      cardBorder: "#e5e7eb",
      imageBg: "#e5e7eb",
      priceBg: "#f0f9ff",
      priceText: "#0369a1",
      badgeBg: "#f3f4f6",
      badgeText: "#6b7280",
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
      sectionSelected || headingSelected || subheadingSelected
        ? "visible"
        : "hidden",
    ...(showHandles
      ? {
          outline: "2px dashed rgba(59, 130, 246, 0.25)",
          outlineOffset: "-2px",
          zIndex:
            sectionSelected || headingSelected || subheadingSelected
              ? 10
              : undefined,
        }
      : {}),
  };

  /** Base horizontal padding that's always applied for comfortable reading */
  const BASE_HORIZONTAL_PADDING = 24;

  const containerStyle: React.CSSProperties = {
    maxWidth: "1440px",
    margin: "0 auto",
    paddingLeft: `${BASE_HORIZONTAL_PADDING + resolvedPaddingLeft}px`,
    paddingRight: `${BASE_HORIZONTAL_PADDING + resolvedPaddingRight}px`,
    boxSizing: "border-box",
    position: "relative",
    zIndex: 1,
  };

  const headerStyle: React.CSSProperties = {
    textAlign: "center",
    marginBottom: "48px",
  };

  const headingStyle: React.CSSProperties = {
    fontSize: overrides?.headingFontSize
      ? `${overrides.headingFontSize}px`
      : brandFonts?.headerFont?.size
        ? `${brandFonts.headerFont.size}px`
        : "clamp(1.75rem, 3vw, 2.5rem)",
    fontFamily:
      overrides?.headingFontFamily ||
      brandFonts?.headerFont?.family ||
      undefined,
    fontWeight: overrides?.headingFontWeight ?? 700,
    fontStyle: overrides?.headingFontStyle || undefined,
    color: overrides?.headingTextColor || theme.heading,
    textAlign: overrides?.headingTextAlign || "center",
    marginBottom: "12px",
  };

  const subheadingStyle: React.CSSProperties = {
    fontSize: overrides?.subheadingFontSize
      ? `${overrides.subheadingFontSize}px`
      : brandFonts?.bodyFont?.size
        ? `${brandFonts.bodyFont.size}px`
        : "1.1rem",
    fontFamily:
      overrides?.subheadingFontFamily ||
      brandFonts?.bodyFont?.family ||
      undefined,
    fontWeight: overrides?.subheadingFontWeight || undefined,
    fontStyle: overrides?.subheadingFontStyle || undefined,
    color: overrides?.subheadingTextColor || theme.subheading,
    textAlign: overrides?.subheadingTextAlign || "center",
    maxWidth: "600px",
    margin: "0 auto",
  };

  const editableStyle: React.CSSProperties = isEditing
    ? {
        cursor: "text",
        outline: "none",
        borderRadius: "4px",
        padding: "4px 8px",
        transition: "background 0.2s, outline 0.2s",
      }
    : {};

  const editableClass =
    variant === "dark" ? "editable-field-light" : "editable-field-dark";

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "24px",
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: theme.cardBg,
    borderRadius: "12px",
    overflow: "hidden",
    border: `1px solid ${theme.cardBorder}`,
    transition: "transform 0.2s, box-shadow 0.2s",
    display: "flex",
    flexDirection: "column",
  };

  const cardContentStyle: React.CSSProperties = {
    padding: "20px",
    flex: 1,
    display: "flex",
    flexDirection: "column",
  };

  const cardTitleStyle: React.CSSProperties = {
    fontSize: "1.15rem",
    fontFamily: brandFonts?.headerFont?.family || undefined,
    fontWeight: 600,
    color: theme.cardTitle,
    marginBottom: "8px",
  };

  const cardDescStyle: React.CSSProperties = {
    fontSize: "0.95rem",
    fontFamily: brandFonts?.bodyFont?.family || undefined,
    color: theme.cardText,
    lineHeight: 1.6,
    marginBottom: "16px",
    flex: 1,
  };

  const metaRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "16px",
  };

  const badgeStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "0.8rem",
    fontWeight: 500,
    backgroundColor: theme.badgeBg,
    color: theme.badgeText,
  };

  const priceStyle: React.CSSProperties = {
    fontSize: "1.2rem",
    fontWeight: 700,
    color: theme.priceText,
  };

  const buttonStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "var(--brand-500, #667eea)",
    color: "#ffffff",
    fontSize: "0.95rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "opacity 0.2s",
  };

  return (
    <section
      ref={sectionRef}
      style={sectionStyle}
      onClick={
        showHandles
          ? (e) => {
              // Only activate section selection if click is NOT inside heading or subheading
              if (
                headingContainerRef.current?.contains(e.target as Node) ||
                subheadingContainerRef.current?.contains(e.target as Node)
              )
                return;
              setSectionSelected(true);
              setHeadingSelected(false);
              setSubheadingSelected(false);
            }
          : undefined
      }
    >
      {/* Products section toolbar — anchored to section top */}
      {showHandles && sectionSelected && (
        <SectionToolbar
          bgColor={overrides?.bgColor || theme.bg}
          bgImage={overrides?.bgImage}
          onBgImageClick={onBgImageClick}
          onBgImageRemove={handleBgImageRemove}
          bgImageBlur={overrides?.bgImageBlur ?? 0}
          onBgImageBlurChange={handleBgImageBlurChange}
          bgImageOpacity={overrides?.bgImageOpacity ?? 100}
          onBgImageOpacityChange={handleBgImageOpacityChange}
          paddingTop={overrides?.paddingTop ?? 80}
          paddingBottom={overrides?.paddingBottom ?? 80}
          paddingLeft={overrides?.paddingLeft ?? 0}
          paddingRight={overrides?.paddingRight ?? 0}
          onPaddingTopChange={handlePaddingTopChange}
          onPaddingBottomChange={handlePaddingBottomChange}
          onPaddingLeftChange={handlePaddingLeftChange}
          onPaddingRightChange={handlePaddingRightChange}
          palette={palette}
          customColors={customColors}
          onBgColorChange={handleBgColorChange}
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
            // Slight scale to prevent blur white edges
            transform:
              (overrides.bgImageBlur ?? 0) > 0 ? "scale(1.05)" : undefined,
          }}
        />
      )}

      <style>{`
        .product-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .product-book-btn:hover {
          opacity: 0.9;
        }
        .product-carousel-container:hover .product-carousel-arrow {
          opacity: 1 !important;
        }
        ${
          isEditing
            ? `
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
        `
            : ""
        }
      `}</style>
      <div style={containerStyle}>
        <div style={headerStyle}>
          {/* Heading — independently selectable */}
          <div
            ref={headingContainerRef}
            style={{
              position: "relative",
              ...(showHandles && headingSelected
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
                    setHeadingSelected(true);
                    setSubheadingSelected(false);
                    setSectionSelected(false);
                  }
                : undefined
            }
          >
            {showHandles && headingSelected && (
              <TextToolbar
                fontSize={overrides?.headingFontSize ?? 28}
                fontFamily={overrides?.headingFontFamily ?? ""}
                fontWeight={overrides?.headingFontWeight ?? "bold"}
                fontStyle={overrides?.headingFontStyle ?? "normal"}
                color={overrides?.headingTextColor ?? theme.heading}
                textAlign={overrides?.headingTextAlign ?? "center"}
                palette={palette}
                customColors={customColors}
                onFontSizeChange={handleHeadingFontSizeChange}
                onFontFamilyChange={handleHeadingFontFamilyChange}
                onFontWeightChange={handleHeadingFontWeightChange}
                onFontStyleChange={handleHeadingFontStyleChange}
                onColorChange={handleHeadingTextColorChange}
                onTextAlignChange={handleHeadingTextAlignChange}
                onCustomColorsChange={onCustomColorsChange}
              />
            )}
            {isEditing ? (
              <div
                className={editableClass}
                contentEditable
                suppressContentEditableWarning
                style={{
                  ...headingStyle,
                  ...editableStyle,
                  display: "inline-block",
                }}
                onBlur={(e) =>
                  onHeadingChange?.(e.currentTarget.textContent || "")
                }
              >
                {productsConfig?.heading || "Our Services"}
              </div>
            ) : (
              <h2 style={headingStyle}>
                {productsConfig?.heading || "Our Services"}
              </h2>
            )}
          </div>

          {/* Subheading — independently selectable */}
          <div
            ref={subheadingContainerRef}
            style={{
              position: "relative",
              ...(showHandles && subheadingSelected
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
                    setSubheadingSelected(true);
                    setHeadingSelected(false);
                    setSectionSelected(false);
                  }
                : undefined
            }
          >
            {showHandles && subheadingSelected && (
              <TextToolbar
                fontSize={overrides?.subheadingFontSize ?? 18}
                fontFamily={overrides?.subheadingFontFamily ?? ""}
                fontWeight={overrides?.subheadingFontWeight ?? "normal"}
                fontStyle={overrides?.subheadingFontStyle ?? "normal"}
                color={overrides?.subheadingTextColor ?? theme.subheading}
                textAlign={overrides?.subheadingTextAlign ?? "center"}
                palette={palette}
                customColors={customColors}
                onFontSizeChange={handleSubheadingFontSizeChange}
                onFontFamilyChange={handleSubheadingFontFamilyChange}
                onFontWeightChange={handleSubheadingFontWeightChange}
                onFontStyleChange={handleSubheadingFontStyleChange}
                onColorChange={handleSubheadingTextColorChange}
                onTextAlignChange={handleSubheadingTextAlignChange}
                onCustomColorsChange={onCustomColorsChange}
              />
            )}
            {isEditing ? (
              <div
                className={editableClass}
                contentEditable
                suppressContentEditableWarning
                style={{ ...subheadingStyle, ...editableStyle }}
                onBlur={(e) =>
                  onSubheadingChange?.(e.currentTarget.textContent || "")
                }
              >
                {productsConfig?.subheading ||
                  "Browse our offerings and book your appointment"}
              </div>
            ) : (
              <p style={subheadingStyle}>
                {productsConfig?.subheading ||
                  "Browse our offerings and book your appointment"}
              </p>
            )}
          </div>
        </div>

        <div style={gridStyle}>
          {products.map((product) => {
            const productImages = product.images || [];
            const hasAnyImage = productImages.length > 0 || !!product.image;

            return (
              <div key={product.id} className="product-card" style={cardStyle}>
                {/* Card Image Carousel */}
                {hasAnyImage && (
                  <ProductImageCarousel
                    images={productImages}
                    fallbackImage={product.image}
                    fallbackPosition={product.imagePosition}
                    fallbackZoom={product.imageZoom}
                    imageBg={theme.imageBg}
                  />
                )}

                {/* Card Content */}
                <div style={cardContentStyle}>
                  <h3 style={cardTitleStyle}>{product.name}</h3>
                  {product.description && (
                    <p style={cardDescStyle}>{product.description}</p>
                  )}

                  {/* Duration + Price */}
                  <div style={metaRowStyle}>
                    <span style={badgeStyle}>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {formatDuration(product.durationMinutes)}
                    </span>
                    <span style={priceStyle}>
                      {formatPrice(product.price, currency)}
                    </span>
                  </div>

                  {/* Book Now / Sign Up Button */}
                  <button
                    type="button"
                    className="product-book-btn"
                    style={buttonStyle}
                    onClick={() =>
                      product.productType === "webinar"
                        ? onSignupWebinar?.(product.id)
                        : onBookProduct?.(product.id)
                    }
                  >
                    {product.productType === "webinar" ? "Sign Up" : "Book Now"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
