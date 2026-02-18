"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import type { HeroTemplateProps } from "./types";
import type { HeroStyleOverrides } from "@/types/landing-page";
import SectionsRenderer from "./SectionsRenderer";
import useHeroToolbarState from "./useHeroToolbarState";
import HeroSectionToolbar from "./HeroSectionToolbar";
import ResizableText from "./ResizableText";
import DraggableItem from "./DraggableItem";
import DragHandle from "./DragHandle";

const DEFAULT_OVERLAY = 50;
const DEFAULT_SECTION_HEIGHT = 600;
const DEFAULT_TITLE_MW = 900;
const DEFAULT_SUBTITLE_MW = 700;

// Default centre-point positions (% of container, 0-100)
const DEFAULT_TITLE_X = 50;
const DEFAULT_TITLE_Y = 30;
const DEFAULT_SUBTITLE_X = 50;
const DEFAULT_SUBTITLE_Y = 50;
const DEFAULT_BUTTON_X = 50;
const DEFAULT_BUTTON_Y = 72;

// Fallback container width used before ResizeObserver fires
const CANVAS_REF_WIDTH = 1200;

/**
 * Build dynamic mobile CSS.
 * If mobile-specific positions exist, use them for freeform positioning.
 * Otherwise, fall back to stacked centered layout.
 */
function buildMobileCSS(
  h: HeroStyleOverrides | undefined,
  defaults: {
    sectionHeight: number;
    titleX: number;
    titleY: number;
    subtitleX: number;
    subtitleY: number;
    buttonX: number;
    buttonY: number;
  },
): string {
  const hasMobilePositions =
    h?.mobileTitleX != null ||
    h?.mobileSubtitleX != null ||
    h?.mobileButtonX != null;

  if (!hasMobilePositions) {
    // Stacked fallback (current behavior)
    return `@media (max-width: 768px) {
  .freeform-hero-section {
    height: auto !important;
    min-height: 400px !important;
  }
  .freeform-hero-content {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    height: 100% !important;
    padding: 40px 20px !important;
    gap: 20px !important;
    position: relative !important;
    z-index: 1 !important;
  }
  .freeform-item {
    position: static !important;
    left: auto !important;
    top: auto !important;
    transform: none !important;
    max-width: 100% !important;
    text-align: center !important;
  }
}`;
  }

  // Freeform mobile with custom positions
  const mH = h?.mobileSectionHeight ?? defaults.sectionHeight;
  return `@media (max-width: 768px) {
  .freeform-hero-section {
    height: ${mH}px !important;
    min-height: 400px !important;
  }
  .freeform-title {
    left: ${h?.mobileTitleX ?? defaults.titleX}% !important;
    top: ${h?.mobileTitleY ?? defaults.titleY}% !important;
  }
  .freeform-subtitle {
    left: ${h?.mobileSubtitleX ?? defaults.subtitleX}% !important;
    top: ${h?.mobileSubtitleY ?? defaults.subtitleY}% !important;
  }
  .freeform-button {
    left: ${h?.mobileButtonX ?? defaults.buttonX}% !important;
    top: ${h?.mobileButtonY ?? defaults.buttonY}% !important;
  }
}`;
}

/**
 * Freeform Template
 * Canvas-like hero section where every element (title, subtitle, button) is
 * absolutely positioned and drag-to-moveable.  Section height is user-adjustable.
 */
export default function FreeformTemplate(props: HeroTemplateProps) {
  const {
    config,
    isEditing = false,
    editingFormFactor = "desktop",
    onTitleChange,
    onSubtitleChange,
    onButtonClick,
    onHeroStyleOverrideChange,
    onCustomColorsChange,
  } = props;
  const { title, subtitle, backgroundImage, imagePosition, imageZoom, button } =
    config;
  const h = config.heroStyleOverrides;

  const {
    titleSelected,
    subtitleSelected,
    sectionSelected,
    titleRef,
    subtitleRef,
    sectionRef,
    handleTitleClick,
    handleSubtitleClick,
    handleSectionClick,
    onTitleMaxWidthChange,
    onSubtitleMaxWidthChange,
    onTitleFontSizeChange,
    onTitleFontFamilyChange,
    onTitleFontWeightChange,
    onTitleFontStyleChange,
    onTitleTextColorChange,
    onTitleTextAlignChange,
    onSubtitleFontSizeChange,
    onSubtitleFontFamilyChange,
    onSubtitleFontWeightChange,
    onSubtitleFontStyleChange,
    onSubtitleTextColorChange,
    onSubtitleTextAlignChange,
    onOverlayOpacityChange,
    onPaddingTopChange,
    onPaddingBottomChange,
    onBgColorChange,
    onTitlePositionChange,
    onSubtitlePositionChange,
    onButtonPositionChange,
    onSectionHeightChange,
    onMobileTitlePositionChange,
    onMobileSubtitlePositionChange,
    onMobileButtonPositionChange,
    onMobileSectionHeightChange,
  } = useHeroToolbarState({
    isEditing,
    heroStyleOverrides: h,
    onHeroStyleOverrideChange,
  });

  const [buttonSelected, setButtonSelected] = useState(false);

  const isMobileEdit = isEditing && editingFormFactor === "mobile";

  // Desktop positions (always computed)
  const titleXPct = h?.titleX ?? DEFAULT_TITLE_X;
  const titleYPct = h?.titleY ?? DEFAULT_TITLE_Y;
  const subtitleXPct = h?.subtitleX ?? DEFAULT_SUBTITLE_X;
  const subtitleYPct = h?.subtitleY ?? DEFAULT_SUBTITLE_Y;
  const buttonXPct = h?.buttonX ?? DEFAULT_BUTTON_X;
  const buttonYPct = h?.buttonY ?? DEFAULT_BUTTON_Y;
  const desktopSectionHeight = h?.sectionHeight ?? DEFAULT_SECTION_HEIGHT;

  // Active positions (what the editor reads/writes based on form factor)
  const activeTitleX = isMobileEdit
    ? (h?.mobileTitleX ?? titleXPct)
    : titleXPct;
  const activeTitleY = isMobileEdit
    ? (h?.mobileTitleY ?? titleYPct)
    : titleYPct;
  const activeSubtitleX = isMobileEdit
    ? (h?.mobileSubtitleX ?? subtitleXPct)
    : subtitleXPct;
  const activeSubtitleY = isMobileEdit
    ? (h?.mobileSubtitleY ?? subtitleYPct)
    : subtitleYPct;
  const activeButtonX = isMobileEdit
    ? (h?.mobileButtonX ?? buttonXPct)
    : buttonXPct;
  const activeButtonY = isMobileEdit
    ? (h?.mobileButtonY ?? buttonYPct)
    : buttonYPct;
  const activeSectionHeight = isMobileEdit
    ? (h?.mobileSectionHeight ?? desktopSectionHeight)
    : desktopSectionHeight;

  // Section height resize
  const baseHeightRef = useRef(activeSectionHeight);

  const handleHeightDragStart = useCallback(() => {
    baseHeightRef.current = activeSectionHeight;
  }, [activeSectionHeight]);

  const handleHeightDrag = useCallback(
    (_dx: number, dy: number) => {
      const clamped = Math.max(200, baseHeightRef.current + dy);
      if (isMobileEdit) onMobileSectionHeightChange(clamped);
      else onSectionHeightChange(clamped);
    },
    [isMobileEdit, onSectionHeightChange, onMobileSectionHeightChange],
  );

  const handleHeightDragEnd = useCallback(() => {}, []);

  // Container measurement for % ↔ px conversion in edit mode
  const [containerSize, setContainerSize] = useState({
    width: CANVAS_REF_WIDTH,
    height: DEFAULT_SECTION_HEIGHT,
  });

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || !isEditing) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [isEditing, sectionRef]);

  // In edit mode: convert % → px for DraggableItem
  const pctToPxX = (pct: number) => (pct / 100) * containerSize.width;
  const pctToPxY = (pct: number) => (pct / 100) * containerSize.height;

  // Wrap position-change handlers to convert px → % and dispatch to desktop or mobile
  const handleTitlePositionChange = useCallback(
    (px: number, py: number) => {
      const xPct = (px / containerSize.width) * 100;
      const yPct = (py / containerSize.height) * 100;
      if (isMobileEdit) onMobileTitlePositionChange(xPct, yPct);
      else onTitlePositionChange(xPct, yPct);
    },
    [
      containerSize,
      isMobileEdit,
      onTitlePositionChange,
      onMobileTitlePositionChange,
    ],
  );

  const handleSubtitlePositionChange = useCallback(
    (px: number, py: number) => {
      const xPct = (px / containerSize.width) * 100;
      const yPct = (py / containerSize.height) * 100;
      if (isMobileEdit) onMobileSubtitlePositionChange(xPct, yPct);
      else onSubtitlePositionChange(xPct, yPct);
    },
    [
      containerSize,
      isMobileEdit,
      onSubtitlePositionChange,
      onMobileSubtitlePositionChange,
    ],
  );

  const handleButtonPositionChange = useCallback(
    (px: number, py: number) => {
      const xPct = (px / containerSize.width) * 100;
      const yPct = (py / containerSize.height) * 100;
      if (isMobileEdit) onMobileButtonPositionChange(xPct, yPct);
      else onButtonPositionChange(xPct, yPct);
    },
    [
      containerSize,
      isMobileEdit,
      onButtonPositionChange,
      onMobileButtonPositionChange,
    ],
  );

  const overlayAlpha = (h?.overlayOpacity ?? DEFAULT_OVERLAY) / 100;

  const backgroundStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    backgroundColor: backgroundImage ? "#000" : undefined,
    backgroundImage: backgroundImage
      ? `linear-gradient(rgba(0, 0, 0, ${overlayAlpha}), rgba(0, 0, 0, ${overlayAlpha})), url(${backgroundImage})`
      : `linear-gradient(135deg, var(--brand-500, #667eea) 0%, var(--brand-600, #764ba2) 100%)`,
    backgroundPosition: imagePosition || "50% 50%",
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
    transform: backgroundImage
      ? `scale(${(imageZoom || 100) / 100})`
      : undefined,
    zIndex: 0,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: h?.titleFontSize
      ? `${h.titleFontSize}px`
      : "clamp(2.5rem, 6vw, 4.5rem)",
    fontWeight: h?.titleFontWeight === "normal" ? 400 : 700,
    fontFamily:
      h?.titleFontFamily || config.theme?.headerFont?.family || undefined,
    fontStyle: h?.titleFontStyle || undefined,
    color: h?.titleTextColor || "#ffffff",
    textAlign: h?.titleTextAlign || "center",
    marginBottom: 0,
    lineHeight: 1.1,
    textShadow: "0 2px 10px rgba(0,0,0,0.3)",
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: h?.subtitleFontSize
      ? `${h.subtitleFontSize}px`
      : "clamp(1.1rem, 2.5vw, 1.5rem)",
    fontWeight: h?.subtitleFontWeight === "bold" ? 700 : 400,
    fontFamily:
      h?.subtitleFontFamily || config.theme?.bodyFont?.family || undefined,
    fontStyle: h?.subtitleFontStyle || undefined,
    color: h?.subtitleTextColor || "#ffffff",
    textAlign: h?.subtitleTextAlign || "center",
    opacity: 0.95,
    lineHeight: 1.6,
    textShadow: "0 1px 5px rgba(0,0,0,0.2)",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "16px 40px",
    fontSize: "1.1rem",
    fontWeight: 600,
    backgroundColor: "var(--brand-500, #ffffff)",
    color: "var(--brand-500-contrast, #1a1a1a)",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "transform 0.2s, box-shadow 0.2s",
    boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
    whiteSpace: "nowrap",
  };

  const handleButtonClick = useCallback(
    (e: React.MouseEvent) => {
      if (!isEditing) return;
      e.stopPropagation();
      setButtonSelected(true);
      handleSectionClick();
    },
    [isEditing, handleSectionClick],
  );

  // Deselect button when title/subtitle is selected
  const handleTitleSelect = useCallback(
    (e: React.MouseEvent) => {
      setButtonSelected(false);
      handleTitleClick(e);
    },
    [handleTitleClick],
  );

  const handleSubtitleSelect = useCallback(
    (e: React.MouseEvent) => {
      setButtonSelected(false);
      handleSubtitleClick(e);
    },
    [handleSubtitleClick],
  );

  const handleSectionBgClick = useCallback(() => {
    setButtonSelected(false);
    handleSectionClick();
  }, [handleSectionClick]);

  // Dynamic mobile CSS (always injected, not just in edit mode)
  const mobileCss = useMemo(
    () =>
      buildMobileCSS(h, {
        sectionHeight: desktopSectionHeight,
        titleX: titleXPct,
        titleY: titleYPct,
        subtitleX: subtitleXPct,
        subtitleY: subtitleYPct,
        buttonX: buttonXPct,
        buttonY: buttonYPct,
      }),
    [
      h,
      desktopSectionHeight,
      titleXPct,
      titleYPct,
      subtitleXPct,
      subtitleYPct,
      buttonXPct,
      buttonYPct,
    ],
  );

  return (
    <>
      {config.heroEnabled !== false && (
        <section
          ref={sectionRef}
          className="freeform-hero-section"
          style={{
            position: "relative",
            height: `${activeSectionHeight}px`,
            width: "100%",
            overflow: isEditing ? "visible" : "hidden",
            color: "#ffffff",
            backgroundColor: h?.bgColor || undefined,
          }}
          onClick={handleSectionBgClick}
        >
          <div style={backgroundStyle} />

          {/* Mobile responsive CSS (skip in editor to avoid interfering with mobile editing) */}
          {!isEditing && <style>{mobileCss}</style>}
          {isEditing && (
            <style>{`
              [contenteditable]:focus {
                outline: none !important;
                border: none !important;
                box-shadow: none !important;
              }
              .editable-field-light:focus {
                background: rgba(255, 255, 255, 0.1) !important;
              }
              .editable-field-light:hover:not(:focus) {
                background: rgba(255, 255, 255, 0.05);
              }
            `}</style>
          )}

          {/* Section Toolbar */}
          {isEditing && sectionSelected && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: "50%",
                zIndex: 50,
              }}
            >
              <HeroSectionToolbar
                bgColor={h?.bgColor || ""}
                hasBackgroundImage={!!backgroundImage}
                overlayOpacity={h?.overlayOpacity ?? DEFAULT_OVERLAY}
                paddingTop={0}
                paddingBottom={0}
                palette={config.theme?.palette}
                customColors={config.customColors}
                onBgColorChange={onBgColorChange}
                onOverlayOpacityChange={onOverlayOpacityChange}
                onPaddingTopChange={onPaddingTopChange}
                onPaddingBottomChange={onPaddingBottomChange}
                onCustomColorsChange={onCustomColorsChange}
              />
            </div>
          )}

          <div className="freeform-hero-content">
            {/* Title */}
            <DraggableItem
              x={isEditing ? pctToPxX(activeTitleX) : titleXPct}
              y={isEditing ? pctToPxY(activeTitleY) : titleYPct}
              isEditing={isEditing}
              selected={titleSelected}
              onSelect={handleTitleSelect}
              onPositionChange={handleTitlePositionChange}
              unit="%"
              className="freeform-item freeform-title"
              style={{ zIndex: titleSelected ? 20 : 1 }}
            >
              <ResizableText
                ref={titleRef}
                text={title}
                isEditing={isEditing}
                onTextChange={onTitleChange}
                textStyle={titleStyle}
                editableClassName="editable-field-light"
                maxWidth={h?.titleMaxWidth ?? DEFAULT_TITLE_MW}
                onMaxWidthChange={onTitleMaxWidthChange}
                selected={titleSelected}
                onSelect={handleTitleSelect}
                toolbarProps={{
                  fontSize: h?.titleFontSize || 48,
                  fontFamily: h?.titleFontFamily || "",
                  fontWeight: h?.titleFontWeight || "bold",
                  fontStyle: h?.titleFontStyle || "normal",
                  color: h?.titleTextColor || "#ffffff",
                  textAlign: h?.titleTextAlign || "center",
                  onFontSizeChange: onTitleFontSizeChange,
                  onFontFamilyChange: onTitleFontFamilyChange,
                  onFontWeightChange: onTitleFontWeightChange,
                  onFontStyleChange: onTitleFontStyleChange,
                  onColorChange: onTitleTextColorChange,
                  onTextAlignChange: onTitleTextAlignChange,
                }}
                palette={config.theme?.palette}
                customColors={config.customColors}
                onCustomColorsChange={onCustomColorsChange}
              />
            </DraggableItem>

            {/* Subtitle */}
            <DraggableItem
              x={isEditing ? pctToPxX(activeSubtitleX) : subtitleXPct}
              y={isEditing ? pctToPxY(activeSubtitleY) : subtitleYPct}
              isEditing={isEditing}
              selected={subtitleSelected}
              onSelect={handleSubtitleSelect}
              onPositionChange={handleSubtitlePositionChange}
              unit="%"
              className="freeform-item freeform-subtitle"
              style={{ zIndex: subtitleSelected ? 20 : 1 }}
            >
              <ResizableText
                ref={subtitleRef}
                text={subtitle}
                isEditing={isEditing}
                onTextChange={onSubtitleChange}
                textStyle={subtitleStyle}
                editableClassName="editable-field-light"
                maxWidth={h?.subtitleMaxWidth ?? DEFAULT_SUBTITLE_MW}
                onMaxWidthChange={onSubtitleMaxWidthChange}
                selected={subtitleSelected}
                onSelect={handleSubtitleSelect}
                toolbarProps={{
                  fontSize: h?.subtitleFontSize || 20,
                  fontFamily: h?.subtitleFontFamily || "",
                  fontWeight: h?.subtitleFontWeight || "normal",
                  fontStyle: h?.subtitleFontStyle || "normal",
                  color: h?.subtitleTextColor || "#ffffff",
                  textAlign: h?.subtitleTextAlign || "center",
                  onFontSizeChange: onSubtitleFontSizeChange,
                  onFontFamilyChange: onSubtitleFontFamilyChange,
                  onFontWeightChange: onSubtitleFontWeightChange,
                  onFontStyleChange: onSubtitleFontStyleChange,
                  onColorChange: onSubtitleTextColorChange,
                  onTextAlignChange: onSubtitleTextAlignChange,
                }}
                palette={config.theme?.palette}
                customColors={config.customColors}
                onCustomColorsChange={onCustomColorsChange}
              />
            </DraggableItem>

            {/* Button */}
            {button && (
              <DraggableItem
                x={isEditing ? pctToPxX(activeButtonX) : buttonXPct}
                y={isEditing ? pctToPxY(activeButtonY) : buttonYPct}
                isEditing={isEditing}
                selected={buttonSelected}
                onSelect={handleButtonClick}
                onPositionChange={handleButtonPositionChange}
                unit="%"
                className="freeform-item freeform-button"
                style={{ zIndex: buttonSelected ? 20 : 1 }}
              >
                <button
                  type="button"
                  onClick={isEditing ? onButtonClick : onButtonClick}
                  style={{
                    ...buttonStyle,
                    position: "relative",
                  }}
                >
                  {button.label}
                  {isEditing && (
                    <span
                      style={{
                        position: "absolute",
                        top: "-8px",
                        right: "-8px",
                        width: "24px",
                        height: "24px",
                        backgroundColor: "#2563eb",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </span>
                  )}
                </button>
              </DraggableItem>
            )}
          </div>

          {/* Bottom edge drag handle for section height resize */}
          {isEditing && (
            <DragHandle
              position="bottom"
              mode="edge"
              onDragStart={handleHeightDragStart}
              onDrag={handleHeightDrag}
              onDragEnd={handleHeightDragEnd}
            />
          )}
        </section>
      )}

      {/* Dynamic Sections (about, features, testimonials, faq, footer) */}
      <SectionsRenderer {...props} variant="gray" />
    </>
  );
}
