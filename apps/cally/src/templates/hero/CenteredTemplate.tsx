"use client";

import type { HeroTemplateProps } from "./types";
import SectionsRenderer from "./SectionsRenderer";
import useHeroToolbarState from "./useHeroToolbarState";
import SectionToolbar from "./SectionToolbar";
import { HERO_LAYOUT_OPTIONS, bgFilterToCSS } from "./layoutOptions";
import ResizableText from "./ResizableText";
import BgDragOverlay from "./BgDragOverlay";

const DEFAULT_OVERLAY = 50;
const DEFAULT_PADDING_TOP = 40;
const DEFAULT_PADDING_BOTTOM = 40;
const DEFAULT_TITLE_MW = 900;
const DEFAULT_SUBTITLE_MW = 700;

/**
 * Centered Template
 * Classic centered layout with title and subtitle over the background.
 * Supports inline editing via ResizableText when isEditing is true.
 */
export default function CenteredTemplate(props: HeroTemplateProps) {
  const {
    config,
    isEditing = false,
    onTitleChange,
    onSubtitleChange,
    onButtonClick,
    onHeroStyleOverrideChange,
    onHeroBgImageClick,
    onHeroRemoveBg,
    heroRemovingBg,
    heroBgRemoved,
    onHeroUndoRemoveBg,
    onImageOffsetChange,
    onImageZoomChange,
    onCustomColorsChange,
  } = props;
  const {
    title,
    subtitle,
    backgroundImage,
    imagePosition,
    imageZoom,
    button,
    imageOffsetX,
    imageOffsetY,
  } = config;
  const h = config.heroStyleOverrides;

  const toolbar = useHeroToolbarState({
    isEditing,
    heroStyleOverrides: h,
    onHeroStyleOverrideChange,
  });

  const overlayAlpha = (h?.overlayOpacity ?? DEFAULT_OVERLAY) / 100;
  const padTop = h?.paddingTop ?? DEFAULT_PADDING_TOP;
  const padBottom = h?.paddingBottom ?? DEFAULT_PADDING_BOTTOM;

  const contentAlign = h?.contentAlign || "center";
  const alignMap = { left: "flex-start", center: "center", right: "flex-end" };

  const containerStyle: React.CSSProperties = {
    minHeight: "70vh",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: contentAlign,
    paddingTop: `${padTop}px`,
    paddingBottom: `${padBottom}px`,
    paddingLeft: `${h?.paddingLeft ?? 20}px`,
    paddingRight: `${h?.paddingRight ?? 20}px`,
    position: "relative",
    overflow: "hidden",
    color: "#ffffff",
    backgroundColor: h?.bgColor || undefined,
  };

  const backgroundStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    backgroundColor: undefined,
    backgroundImage: backgroundImage
      ? `linear-gradient(rgba(0, 0, 0, ${overlayAlpha}), rgba(0, 0, 0, ${overlayAlpha})), url(${backgroundImage})`
      : `linear-gradient(135deg, var(--brand-500, #667eea) 0%, var(--brand-600, #764ba2) 100%)`,
    backgroundPosition: imagePosition || "50% 50%",
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
    transform: backgroundImage
      ? `translate(${imageOffsetX || 0}px, ${imageOffsetY || 0}px) scale(${((imageZoom || 100) / 100) * ((h?.bgBlur ?? 0) > 0 ? 1.05 : 1)})`
      : undefined,
    filter: backgroundImage
      ? [
          (h?.bgBlur ?? 0) > 0 ? `blur(${h!.bgBlur}px)` : "",
          bgFilterToCSS(h?.bgFilter) || "",
        ]
          .filter(Boolean)
          .join(" ") || undefined
      : undefined,
    opacity: backgroundImage ? (h?.bgOpacity ?? 100) / 100 : undefined,
    zIndex: 0,
  };

  const contentStyle: React.CSSProperties = {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: `${h?.titleMaxWidth ?? DEFAULT_TITLE_MW}px`,
    display: "flex",
    flexDirection: "column",
    alignItems: alignMap[contentAlign],
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
    textAlign: h?.titleTextAlign || undefined,
    marginBottom: "20px",
    lineHeight: 1.1,
    textShadow: "0 2px 10px rgba(0,0,0,0.3)",
    whiteSpace: "pre-line",
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
    textAlign: h?.subtitleTextAlign || undefined,
    opacity: 0.95,
    lineHeight: 1.6,
    textShadow: "0 1px 5px rgba(0,0,0,0.2)",
    whiteSpace: "pre-line",
  };

  const selectedOutline: React.CSSProperties = {
    outline: "2px solid #3b82f6",
    outlineOffset: "4px",
    borderRadius: "6px",
  };

  const buttonStyle: React.CSSProperties = {
    marginTop: "32px",
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
  };

  const editButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    position: "relative",
  };

  return (
    <>
      {/* Hero Section */}
      {config.heroEnabled !== false && (
        <div
          ref={toolbar.sectionRef}
          style={{
            ...containerStyle,
            ...(isEditing && toolbar.sectionSelected ? selectedOutline : {}),
          }}
          onClick={toolbar.handleSectionClick}
        >
          <div style={backgroundStyle} />
          <BgDragOverlay
            active={toolbar.bgDragActive && isEditing}
            offsetX={imageOffsetX || 0}
            offsetY={imageOffsetY || 0}
            imageZoom={imageZoom || 100}
            onOffsetChange={onImageOffsetChange}
            onZoomChange={onImageZoomChange}
          />
          {isEditing && (
            <style>{`
              [contenteditable]:focus {
                outline: none !important;
                border: none !important;
                box-shadow: none !important;
              }
              .centered-editable-light:focus {
                background: rgba(255, 255, 255, 0.1) !important;
              }
              .centered-editable-light:hover:not(:focus) {
                background: rgba(255, 255, 255, 0.05);
              }
            `}</style>
          )}

          {/* Section Toolbar */}
          {isEditing && toolbar.sectionSelected && (
            <div
              style={{
                position: "absolute",
                top: 8,
                left: "50%",
                zIndex: 50,
              }}
            >
              <SectionToolbar
                bgColor={h?.bgColor || ""}
                hasBackgroundImage={!!backgroundImage}
                bgImage={backgroundImage}
                bgImageBlur={h?.bgBlur ?? 0}
                onBgImageBlurChange={toolbar.onBgBlurChange}
                bgImageOpacity={h?.bgOpacity ?? 100}
                onBgImageOpacityChange={toolbar.onBgOpacityChange}
                overlayOpacity={h?.overlayOpacity ?? DEFAULT_OVERLAY}
                onOverlayOpacityChange={toolbar.onOverlayOpacityChange}
                bgFilter={h?.bgFilter}
                onBgFilterChange={toolbar.onBgFilterChange}
                onRemoveBgClick={onHeroRemoveBg}
                removingBg={heroRemovingBg}
                bgRemoved={heroBgRemoved}
                onUndoRemoveBg={onHeroUndoRemoveBg}
                bgDragActive={toolbar.bgDragActive}
                onBgDragToggle={toolbar.toggleBgDrag}
                onBgImageClick={onHeroBgImageClick}
                paddingTop={padTop}
                paddingBottom={padBottom}
                paddingLeft={h?.paddingLeft ?? 20}
                paddingRight={h?.paddingRight ?? 20}
                onPaddingLeftChange={toolbar.onPaddingLeftChange}
                onPaddingRightChange={toolbar.onPaddingRightChange}
                palette={config.theme?.palette}
                customColors={config.customColors}
                onBgColorChange={toolbar.onBgColorChange}
                onPaddingTopChange={toolbar.onPaddingTopChange}
                onPaddingBottomChange={toolbar.onPaddingBottomChange}
                onCustomColorsChange={onCustomColorsChange}
                layoutOptions={HERO_LAYOUT_OPTIONS}
                currentLayout={contentAlign}
                onLayoutChange={toolbar.onContentAlignChange}
              />
            </div>
          )}

          <div style={contentStyle}>
            {isEditing ? (
              <>
                <ResizableText
                  ref={toolbar.titleRef}
                  text={title}
                  isEditing={isEditing}
                  onTextChange={onTitleChange}
                  textStyle={titleStyle}
                  editableClassName="centered-editable-light"
                  maxWidth={h?.titleMaxWidth ?? DEFAULT_TITLE_MW}
                  onMaxWidthChange={toolbar.onTitleMaxWidthChange}
                  selected={toolbar.titleSelected}
                  onSelect={toolbar.handleTitleClick}
                  toolbarProps={{
                    fontSize: h?.titleFontSize || 48,
                    fontFamily: h?.titleFontFamily || "",
                    fontWeight: h?.titleFontWeight || "bold",
                    fontStyle: h?.titleFontStyle || "normal",
                    color: h?.titleTextColor || "#ffffff",
                    textAlign: h?.titleTextAlign || "center",
                    onFontSizeChange: toolbar.onTitleFontSizeChange,
                    onFontFamilyChange: toolbar.onTitleFontFamilyChange,
                    onFontWeightChange: toolbar.onTitleFontWeightChange,
                    onFontStyleChange: toolbar.onTitleFontStyleChange,
                    onColorChange: toolbar.onTitleTextColorChange,
                    onTextAlignChange: toolbar.onTitleTextAlignChange,
                  }}
                  palette={config.theme?.palette}
                  customColors={config.customColors}
                  onCustomColorsChange={onCustomColorsChange}
                />

                <ResizableText
                  ref={toolbar.subtitleRef}
                  text={subtitle}
                  isEditing={isEditing}
                  onTextChange={onSubtitleChange}
                  textStyle={subtitleStyle}
                  editableClassName="centered-editable-light"
                  maxWidth={h?.subtitleMaxWidth ?? DEFAULT_SUBTITLE_MW}
                  onMaxWidthChange={toolbar.onSubtitleMaxWidthChange}
                  selected={toolbar.subtitleSelected}
                  onSelect={toolbar.handleSubtitleClick}
                  toolbarProps={{
                    fontSize: h?.subtitleFontSize || 20,
                    fontFamily: h?.subtitleFontFamily || "",
                    fontWeight: h?.subtitleFontWeight || "normal",
                    fontStyle: h?.subtitleFontStyle || "normal",
                    color: h?.subtitleTextColor || "#ffffff",
                    textAlign: h?.subtitleTextAlign || "center",
                    onFontSizeChange: toolbar.onSubtitleFontSizeChange,
                    onFontFamilyChange: toolbar.onSubtitleFontFamilyChange,
                    onFontWeightChange: toolbar.onSubtitleFontWeightChange,
                    onFontStyleChange: toolbar.onSubtitleFontStyleChange,
                    onColorChange: toolbar.onSubtitleTextColorChange,
                    onTextAlignChange: toolbar.onSubtitleTextAlignChange,
                  }}
                  palette={config.theme?.palette}
                  customColors={config.customColors}
                  onCustomColorsChange={onCustomColorsChange}
                />

                {button && (
                  <button
                    type="button"
                    onClick={onButtonClick}
                    style={editButtonStyle}
                    className="edit-button"
                  >
                    {button.label}
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
                  </button>
                )}
              </>
            ) : (
              <>
                <h1
                  style={{
                    ...titleStyle,
                    maxWidth: `${h?.titleMaxWidth ?? DEFAULT_TITLE_MW}px`,
                  }}
                >
                  {title}
                </h1>
                <p
                  style={{
                    ...subtitleStyle,
                    maxWidth: `${h?.subtitleMaxWidth ?? DEFAULT_SUBTITLE_MW}px`,
                  }}
                >
                  {subtitle}
                </p>
                {button && (
                  <button
                    type="button"
                    style={buttonStyle}
                    onClick={onButtonClick}
                  >
                    {button.label}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Dynamic Sections (about, features, testimonials, faq, footer) */}
      <SectionsRenderer {...props} variant="gray" />
    </>
  );
}
