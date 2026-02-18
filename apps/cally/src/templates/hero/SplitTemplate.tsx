"use client";

import type { HeroTemplateProps } from "./types";
import SectionsRenderer from "./SectionsRenderer";
import useHeroToolbarState from "./useHeroToolbarState";
import HeroSectionToolbar from "./HeroSectionToolbar";
import ResizableText from "./ResizableText";

const DEFAULT_PADDING_TOP = 60;
const DEFAULT_PADDING_BOTTOM = 60;
const DEFAULT_TITLE_MW = 900;
const DEFAULT_SUBTITLE_MW = 450;

/**
 * Split Template
 * Half image, half content side-by-side layout
 */
export default function SplitTemplate(props: HeroTemplateProps) {
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

  const toolbar = useHeroToolbarState({
    isEditing,
    heroStyleOverrides: h,
    onHeroStyleOverrideChange,
  });

  const padTop = h?.paddingTop ?? DEFAULT_PADDING_TOP;
  const padBottom = h?.paddingBottom ?? DEFAULT_PADDING_BOTTOM;

  const containerStyle: React.CSSProperties = {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    flexDirection: "row",
  };

  const contentSide: React.CSSProperties = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingTop: `${padTop}px`,
    paddingBottom: `${padBottom}px`,
    paddingLeft: "8%",
    paddingRight: "8%",
    background: h?.bgColor || "#fafafa",
    color: "#1a1a1a",
  };

  const imageSide: React.CSSProperties = {
    flex: 1,
    position: "relative",
    backgroundColor: backgroundImage ? "#000" : undefined,
    minHeight: "100vh",
    overflow: "hidden",
  };

  const imageSideBackground: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    backgroundImage: backgroundImage
      ? `url(${backgroundImage})`
      : `linear-gradient(135deg, var(--brand-500, #667eea) 0%, var(--brand-600, #764ba2) 100%)`,
    backgroundPosition: imagePosition || "50% 50%",
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
    transform: backgroundImage
      ? `scale(${(imageZoom || 100) / 100})`
      : undefined,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: h?.titleFontSize
      ? `${h.titleFontSize}px`
      : "clamp(2rem, 4vw, 3.5rem)",
    fontWeight: h?.titleFontWeight === "normal" ? 400 : 700,
    fontFamily:
      h?.titleFontFamily || config.theme?.headerFont?.family || undefined,
    fontStyle: h?.titleFontStyle || undefined,
    color: h?.titleTextColor || "#1a1a1a",
    textAlign: h?.titleTextAlign || undefined,
    marginBottom: "20px",
    lineHeight: 1.15,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: h?.subtitleFontSize
      ? `${h.subtitleFontSize}px`
      : "clamp(1rem, 1.8vw, 1.2rem)",
    fontWeight: h?.subtitleFontWeight === "bold" ? 700 : 400,
    fontFamily:
      h?.subtitleFontFamily || config.theme?.bodyFont?.family || undefined,
    fontStyle: h?.subtitleFontStyle || undefined,
    color: h?.subtitleTextColor || "#666",
    textAlign: h?.subtitleTextAlign || undefined,
    lineHeight: 1.7,
  };

  const selectedOutline: React.CSSProperties = {
    outline: "2px solid #3b82f6",
    outlineOffset: "4px",
    borderRadius: "6px",
  };

  const buttonStyle: React.CSSProperties = {
    marginTop: "32px",
    padding: "16px 40px",
    fontSize: "1rem",
    fontWeight: 600,
    backgroundColor: "var(--brand-500, #1a1a1a)",
    color: "var(--brand-500-contrast, #ffffff)",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "transform 0.2s, background 0.2s",
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
            position: "relative",
          }}
          onClick={toolbar.handleSectionClick}
        >
          {isEditing && (
            <style>{`
              [contenteditable]:focus {
                outline: none !important;
                border: none !important;
                box-shadow: none !important;
              }
              .editable-field-dark:focus {
                background: rgba(0, 0, 0, 0.05) !important;
              }
              .editable-field-dark:hover:not(:focus) {
                background: rgba(0, 0, 0, 0.02);
              }
            `}</style>
          )}

          {/* Section Toolbar */}
          {isEditing && toolbar.sectionSelected && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: "25%",
                zIndex: 50,
              }}
            >
              <HeroSectionToolbar
                bgColor={h?.bgColor || "#fafafa"}
                hasBackgroundImage={false}
                overlayOpacity={0}
                paddingTop={padTop}
                paddingBottom={padBottom}
                palette={config.theme?.palette}
                customColors={config.customColors}
                onBgColorChange={toolbar.onBgColorChange}
                onOverlayOpacityChange={toolbar.onOverlayOpacityChange}
                onPaddingTopChange={toolbar.onPaddingTopChange}
                onPaddingBottomChange={toolbar.onPaddingBottomChange}
                onCustomColorsChange={onCustomColorsChange}
              />
            </div>
          )}

          <div style={contentSide}>
            {isEditing ? (
              <>
                <ResizableText
                  ref={toolbar.titleRef}
                  text={title}
                  isEditing={isEditing}
                  onTextChange={onTitleChange}
                  textStyle={titleStyle}
                  editableClassName="editable-field-dark"
                  maxWidth={h?.titleMaxWidth ?? DEFAULT_TITLE_MW}
                  onMaxWidthChange={toolbar.onTitleMaxWidthChange}
                  selected={toolbar.titleSelected}
                  onSelect={toolbar.handleTitleClick}
                  toolbarProps={{
                    fontSize: h?.titleFontSize || 40,
                    fontFamily: h?.titleFontFamily || "",
                    fontWeight: h?.titleFontWeight || "bold",
                    fontStyle: h?.titleFontStyle || "normal",
                    color: h?.titleTextColor || "#1a1a1a",
                    textAlign: h?.titleTextAlign || "left",
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
                  editableClassName="editable-field-dark"
                  maxWidth={h?.subtitleMaxWidth ?? DEFAULT_SUBTITLE_MW}
                  onMaxWidthChange={toolbar.onSubtitleMaxWidthChange}
                  selected={toolbar.subtitleSelected}
                  onSelect={toolbar.handleSubtitleClick}
                  toolbarProps={{
                    fontSize: h?.subtitleFontSize || 18,
                    fontFamily: h?.subtitleFontFamily || "",
                    fontWeight: h?.subtitleFontWeight || "normal",
                    fontStyle: h?.subtitleFontStyle || "normal",
                    color: h?.subtitleTextColor || "#666",
                    textAlign: h?.subtitleTextAlign || "left",
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
          <div style={imageSide}>
            <div style={imageSideBackground} />
          </div>
        </div>
      )}

      {/* Dynamic Sections */}
      <SectionsRenderer {...props} variant="light" />
    </>
  );
}
