"use client";

import type { HeroTemplateProps } from "./types";
import SectionsRenderer from "./SectionsRenderer";
import useHeroToolbarState from "./useHeroToolbarState";
import HeroSectionToolbar from "./HeroSectionToolbar";
import ResizableText from "./ResizableText";

const DEFAULT_OVERLAY = 50;
const DEFAULT_PADDING_TOP = 40;
const DEFAULT_PADDING_BOTTOM = 40;
const DEFAULT_TITLE_MW = 900;
const DEFAULT_SUBTITLE_MW = 700;

/**
 * DIY Template
 * Centered layout with full inline editing: contentEditable fields,
 * drag-to-edit about section, image/button edit overlays.
 */
export default function DIYTemplate(props: HeroTemplateProps) {
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

  const overlayAlpha = (h?.overlayOpacity ?? DEFAULT_OVERLAY) / 100;
  const padTop = h?.paddingTop ?? DEFAULT_PADDING_TOP;
  const padBottom = h?.paddingBottom ?? DEFAULT_PADDING_BOTTOM;

  const containerStyle: React.CSSProperties = {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    paddingTop: `${padTop}px`,
    paddingBottom: `${padBottom}px`,
    paddingLeft: "20px",
    paddingRight: "20px",
    position: "relative",
    overflow: "hidden",
    color: "#ffffff",
    backgroundColor: h?.bgColor || undefined,
  };

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

  const contentStyle: React.CSSProperties = {
    position: "relative",
    zIndex: 1,
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: h?.titleFontSize
      ? `${h.titleFontSize}px`
      : "clamp(2.5rem, 6vw, 4.5rem)",
    fontWeight: h?.titleFontWeight === "normal" ? 400 : 700,
    fontFamily:
      h?.titleFontFamily || config.theme?.headerFont?.family || undefined,
    fontStyle: h?.titleFontStyle || undefined,
    color: h?.titleTextColor || undefined,
    textAlign: h?.titleTextAlign || undefined,
    marginBottom: "20px",
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
    color: h?.subtitleTextColor || undefined,
    textAlign: h?.subtitleTextAlign || undefined,
    opacity: 0.95,
    lineHeight: 1.6,
    textShadow: "0 1px 5px rgba(0,0,0,0.2)",
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
          {isEditing && toolbar.sectionSelected && (
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

          <div style={contentStyle}>
            {isEditing ? (
              <>
                <ResizableText
                  ref={toolbar.titleRef}
                  text={title}
                  isEditing={isEditing}
                  onTextChange={onTitleChange}
                  textStyle={titleStyle}
                  editableClassName="editable-field-light"
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
                  editableClassName="editable-field-light"
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
