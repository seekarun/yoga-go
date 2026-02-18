"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { HeroTemplateProps } from "./types";
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

// Mobile CSS override for stacked layout
const MOBILE_CSS = `
@media (max-width: 768px) {
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

/**
 * Freeform Template
 * Canvas-like hero section where every element (title, subtitle, button) is
 * absolutely positioned and drag-to-moveable.  Section height is user-adjustable.
 */
export default function FreeformTemplate(props: HeroTemplateProps) {
  const {
    config,
    isEditing = false,
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
  } = useHeroToolbarState({
    isEditing,
    heroStyleOverrides: h,
    onHeroStyleOverrideChange,
  });

  const [buttonSelected, setButtonSelected] = useState(false);

  // Section height resize
  const sectionHeight = h?.sectionHeight ?? DEFAULT_SECTION_HEIGHT;
  const baseHeightRef = useRef(sectionHeight);

  const handleHeightDragStart = useCallback(() => {
    baseHeightRef.current = sectionHeight;
  }, [sectionHeight]);

  const handleHeightDrag = useCallback(
    (_dx: number, dy: number) => {
      const clamped = Math.max(200, baseHeightRef.current + dy);
      onSectionHeightChange(clamped);
    },
    [onSectionHeightChange],
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

  // Stored positions are percentages (0-100)
  const titleXPct = h?.titleX ?? DEFAULT_TITLE_X;
  const titleYPct = h?.titleY ?? DEFAULT_TITLE_Y;
  const subtitleXPct = h?.subtitleX ?? DEFAULT_SUBTITLE_X;
  const subtitleYPct = h?.subtitleY ?? DEFAULT_SUBTITLE_Y;
  const buttonXPct = h?.buttonX ?? DEFAULT_BUTTON_X;
  const buttonYPct = h?.buttonY ?? DEFAULT_BUTTON_Y;

  // In edit mode: convert % → px for DraggableItem
  const pctToPxX = (pct: number) => (pct / 100) * containerSize.width;
  const pctToPxY = (pct: number) => (pct / 100) * containerSize.height;

  // Wrap position-change handlers to convert px → % before persisting
  const handleTitlePositionChange = useCallback(
    (px: number, py: number) => {
      onTitlePositionChange(
        (px / containerSize.width) * 100,
        (py / containerSize.height) * 100,
      );
    },
    [containerSize, onTitlePositionChange],
  );

  const handleSubtitlePositionChange = useCallback(
    (px: number, py: number) => {
      onSubtitlePositionChange(
        (px / containerSize.width) * 100,
        (py / containerSize.height) * 100,
      );
    },
    [containerSize, onSubtitlePositionChange],
  );

  const handleButtonPositionChange = useCallback(
    (px: number, py: number) => {
      onButtonPositionChange(
        (px / containerSize.width) * 100,
        (py / containerSize.height) * 100,
      );
    },
    [containerSize, onButtonPositionChange],
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

  return (
    <>
      {config.heroEnabled !== false && (
        <section
          ref={sectionRef}
          className="freeform-hero-section"
          style={{
            position: "relative",
            height: `${sectionHeight}px`,
            width: "100%",
            overflow: isEditing ? "visible" : "hidden",
            color: "#ffffff",
            backgroundColor: h?.bgColor || undefined,
          }}
          onClick={handleSectionBgClick}
        >
          <div style={backgroundStyle} />

          {/* Mobile responsive + editor styles */}
          <style>{MOBILE_CSS}</style>
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
              x={isEditing ? pctToPxX(titleXPct) : titleXPct}
              y={isEditing ? pctToPxY(titleYPct) : titleYPct}
              isEditing={isEditing}
              selected={titleSelected}
              onSelect={handleTitleSelect}
              onPositionChange={handleTitlePositionChange}
              unit="%"
              className="freeform-item"
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
              x={isEditing ? pctToPxX(subtitleXPct) : subtitleXPct}
              y={isEditing ? pctToPxY(subtitleYPct) : subtitleYPct}
              isEditing={isEditing}
              selected={subtitleSelected}
              onSelect={handleSubtitleSelect}
              onPositionChange={handleSubtitlePositionChange}
              unit="%"
              className="freeform-item"
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
                x={isEditing ? pctToPxX(buttonXPct) : buttonXPct}
                y={isEditing ? pctToPxY(buttonYPct) : buttonYPct}
                isEditing={isEditing}
                selected={buttonSelected}
                onSelect={handleButtonClick}
                onPositionChange={handleButtonPositionChange}
                unit="%"
                className="freeform-item"
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
