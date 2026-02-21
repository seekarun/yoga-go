"use client";

import type { HeroTemplateProps } from "./types";
import type { BrandFont } from "@/types/landing-page";
import AboutSection from "./AboutSection";
import FeaturesSection from "./FeaturesSection";
import ProductsSection from "./ProductsSection";
import TestimonialsSection from "./TestimonialsSection";
import FAQSection from "./FAQSection";
import LocationSection from "./LocationSection";
import GallerySection from "./GallerySection";
import FooterSection from "./FooterSection";
import useHeroToolbarState from "./useHeroToolbarState";
import SectionToolbar from "./SectionToolbar";
import { HERO_LAYOUT_OPTIONS, bgFilterToCSS } from "./layoutOptions";
import ResizableText from "./ResizableText";
import BgDragOverlay from "./BgDragOverlay";

/**
 * Apple Template
 * Structurally unique tile/grid layout inspired by Apple.com.
 * Compact hero + sections rendered as white tile cards in a responsive grid.
 * Bypasses SectionsRenderer to control layout directly.
 */
export default function AppleTemplate(props: HeroTemplateProps) {
  const {
    config,
    isEditing = false,
    onTitleChange,
    onSubtitleChange,
    onButtonClick,
    onAboutTitleChange,
    onAboutParagraphChange,
    onAboutImageClick,
    onAboutStyleOverrideChange,
    onAboutBgImageClick,
    onAboutImagePositionChange,
    onAboutImageZoomChange,
    onCustomColorsChange,
    onHeroStyleOverrideChange,
    onHeroBgImageClick,
    onHeroRemoveBg,
    heroRemovingBg,
    heroBgRemoved,
    onHeroUndoRemoveBg,
    onImageOffsetChange,
    onImageZoomChange,
    onFeaturesHeadingChange,
    onFeaturesSubheadingChange,
    onFeatureCardChange,
    onFeatureCardImageClick,
    onAddFeatureCard,
    onRemoveFeatureCard,
    onAboutRemoveBgComplete,
    onFeatureCardRemoveBg,
    products,
    currency,
    onBookProduct,
    onSignupWebinar,
    onProductsHeadingChange,
    onProductsSubheadingChange,
    onProductsStyleOverrideChange,
    onProductsBgImageClick,
    onTestimonialsHeadingChange,
    onTestimonialsSubheadingChange,
    onTestimonialChange,
    onAddTestimonial,
    onRemoveTestimonial,
    onFAQHeadingChange,
    onFAQSubheadingChange,
    onFAQItemChange,
    onAddFAQItem,
    onRemoveFAQItem,
    address,
    onLocationHeadingChange,
    onLocationSubheadingChange,
    onGalleryHeadingChange,
    onGallerySubheadingChange,
    onGalleryAddImage,
    onGalleryRemoveImage,
    onFooterTextChange,
    onFooterLinkChange,
    onAddFooterLink,
    onRemoveFooterLink,
  } = props;
  const {
    title,
    subtitle,
    backgroundImage,
    imagePosition,
    imageZoom,
    imageOffsetX,
    imageOffsetY,
    button,
  } = config;

  const hasImage = !!backgroundImage;

  const h = config.heroStyleOverrides;

  const toolbar = useHeroToolbarState({
    isEditing,
    heroStyleOverrides: h,
    onHeroStyleOverrideChange,
  });

  const DEFAULT_TITLE_MW = 900;
  const DEFAULT_SUBTITLE_MW = 700;

  const DEFAULT_OVERLAY = 35;
  const overlayAlpha = (h?.overlayOpacity ?? DEFAULT_OVERLAY) / 100;
  const padTop = h?.paddingTop ?? 60;
  const padBottom = h?.paddingBottom ?? 60;
  const contentAlign = h?.contentAlign || "center";
  const alignMap: Record<string, string> = {
    left: "flex-start",
    center: "center",
    right: "flex-end",
  };

  const sections = config.sections || [
    { id: "about" as const, enabled: true },
    { id: "features" as const, enabled: true },
    { id: "testimonials" as const, enabled: false },
    { id: "faq" as const, enabled: false },
  ];

  const brandFonts: { headerFont?: BrandFont; bodyFont?: BrandFont } = {
    headerFont: config.theme?.headerFont,
    bodyFont: config.theme?.bodyFont,
  };

  const sfProDisplay =
    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  const sfProText =
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  // --- Hero Styles ---
  const heroStyle: React.CSSProperties = {
    minHeight: "70vh",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: contentAlign as React.CSSProperties["textAlign"],
    paddingTop: `${padTop}px`,
    paddingBottom: `${padBottom}px`,
    paddingLeft: `${h?.paddingLeft ?? 24}px`,
    paddingRight: `${h?.paddingRight ?? 24}px`,
    position: "relative",
    overflow: "hidden",
    color: hasImage ? "#ffffff" : "#1d1d1f",
    backgroundColor: h?.bgColor || undefined,
  };

  const backgroundStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    backgroundColor: hasImage ? undefined : "#fbfbfd",
    backgroundImage: hasImage
      ? `linear-gradient(rgba(0, 0, 0, ${overlayAlpha}), rgba(0, 0, 0, ${overlayAlpha})), url(${backgroundImage})`
      : undefined,
    backgroundPosition: imagePosition || "50% 50%",
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
    transform: hasImage
      ? `translate(${imageOffsetX || 0}px, ${imageOffsetY || 0}px) scale(${((imageZoom || 100) / 100) * ((h?.bgBlur ?? 0) > 0 ? 1.05 : 1)})`
      : undefined,
    filter: hasImage
      ? [
          (h?.bgBlur ?? 0) > 0 ? `blur(${h!.bgBlur}px)` : "",
          bgFilterToCSS(h?.bgFilter) || "",
        ]
          .filter(Boolean)
          .join(" ") || undefined
      : undefined,
    opacity: hasImage ? (h?.bgOpacity ?? 100) / 100 : undefined,
    zIndex: 0,
  };

  const contentStyle: React.CSSProperties = {
    position: "relative",
    zIndex: 1,
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: alignMap[contentAlign],
    maxWidth: `${h?.titleMaxWidth ?? DEFAULT_TITLE_MW}px`,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: h?.titleFontSize
      ? `${h.titleFontSize}px`
      : "clamp(2.5rem, 7vw, 4.5rem)",
    fontWeight: h?.titleFontWeight === "normal" ? 400 : 600,
    fontStyle: h?.titleFontStyle || undefined,
    marginBottom: "16px",
    lineHeight: 1.07,
    letterSpacing: "-0.04em",
    color: h?.titleTextColor || (hasImage ? "#ffffff" : "#1d1d1f"),
    textAlign: h?.titleTextAlign || undefined,
    fontFamily:
      h?.titleFontFamily || config.theme?.headerFont?.family || sfProDisplay,
    whiteSpace: "pre-line",
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: h?.subtitleFontSize
      ? `${h.subtitleFontSize}px`
      : "clamp(1.05rem, 2vw, 1.35rem)",
    fontWeight: h?.subtitleFontWeight === "bold" ? 700 : 400,
    fontStyle: h?.subtitleFontStyle || undefined,
    color:
      h?.subtitleTextColor ||
      (hasImage ? "rgba(255, 255, 255, 0.85)" : "#6e6e73"),
    textAlign: h?.subtitleTextAlign || undefined,
    lineHeight: 1.5,
    letterSpacing: "-0.01em",
    fontFamily:
      h?.subtitleFontFamily || config.theme?.bodyFont?.family || sfProText,
    whiteSpace: "pre-line",
  };

  const selectedOutline: React.CSSProperties = {
    outline: "2px solid #3b82f6",
    outlineOffset: "4px",
    borderRadius: "6px",
  };

  const editFieldClass = hasImage
    ? "editable-field-light"
    : "editable-field-dark";

  const buttonStyle: React.CSSProperties = {
    marginTop: "28px",
    padding: "12px 28px",
    fontSize: "1.05rem",
    fontWeight: 400,
    backgroundColor: "transparent",
    color: hasImage ? "#ffffff" : "var(--brand-500, #0071e3)",
    border: "none",
    borderRadius: "0",
    cursor: "pointer",
    transition: "opacity 0.2s",
    letterSpacing: "-0.01em",
    fontFamily: sfProText,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  };

  const editButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    position: "relative",
  };

  const chevronSvg = (
    <svg
      width="8"
      height="14"
      viewBox="0 0 8 14"
      fill="none"
      style={{ marginTop: "1px" }}
    >
      <path
        d="M1 1L7 7L1 13"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  // --- Tile Grid Styles ---
  const pageStyle: React.CSSProperties = {
    backgroundColor: "#f5f5f7",
    fontFamily: sfProText,
  };

  const tileStyle: React.CSSProperties = {
    background: "#fff",
    borderRadius: "20px",
    overflow: "hidden",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  };

  // --- Build section tiles ---
  const sectionTiles = sections
    .filter((s) => s.enabled)
    .map((section) => {
      switch (section.id) {
        case "about":
          return config.about ? (
            <div
              key="about"
              className="apple-tile apple-tile-full"
              style={tileStyle}
            >
              <AboutSection
                about={config.about}
                isEditing={isEditing}
                variant="light"
                palette={config.theme?.palette}
                customColors={config.customColors}
                brandFonts={brandFonts}
                onCustomColorsChange={onCustomColorsChange}
                onTitleChange={onAboutTitleChange}
                onParagraphChange={onAboutParagraphChange}
                onImageClick={onAboutImageClick}
                onStyleOverrideChange={onAboutStyleOverrideChange}
                onBgImageClick={onAboutBgImageClick}
                onImagePositionChange={onAboutImagePositionChange}
                onImageZoomChange={onAboutImageZoomChange}
                onRemoveBgComplete={onAboutRemoveBgComplete}
              />
            </div>
          ) : null;

        case "features":
          return config.features && config.features.cards.length > 0 ? (
            <div
              key="features"
              className="apple-tile apple-tile-full"
              style={tileStyle}
            >
              <FeaturesSection
                features={config.features}
                isEditing={isEditing}
                variant="light"
                brandFonts={brandFonts}
                onHeadingChange={onFeaturesHeadingChange}
                onSubheadingChange={onFeaturesSubheadingChange}
                onCardChange={onFeatureCardChange}
                onCardImageClick={onFeatureCardImageClick}
                onAddCard={onAddFeatureCard}
                onRemoveCard={onRemoveFeatureCard}
                onCardRemoveBg={onFeatureCardRemoveBg}
              />
            </div>
          ) : null;

        case "products":
          return products && products.length > 0 ? (
            <div
              key="products"
              className="apple-tile apple-tile-full"
              style={tileStyle}
            >
              <ProductsSection
                products={products}
                currency={currency || "AUD"}
                variant="light"
                brandFonts={brandFonts}
                productsConfig={config.productsConfig}
                isEditing={isEditing}
                palette={config.theme?.palette}
                customColors={config.customColors}
                onHeadingChange={onProductsHeadingChange}
                onSubheadingChange={onProductsSubheadingChange}
                onBookProduct={onBookProduct}
                onSignupWebinar={onSignupWebinar}
                onStyleOverrideChange={onProductsStyleOverrideChange}
                onBgImageClick={onProductsBgImageClick}
                onCustomColorsChange={onCustomColorsChange}
              />
            </div>
          ) : null;

        case "testimonials":
          return config.testimonials ? (
            <div
              key="testimonials"
              className="apple-tile apple-tile-full"
              style={tileStyle}
            >
              <TestimonialsSection
                testimonials={config.testimonials}
                isEditing={isEditing}
                variant="light"
                brandFonts={brandFonts}
                onHeadingChange={onTestimonialsHeadingChange}
                onSubheadingChange={onTestimonialsSubheadingChange}
                onTestimonialChange={onTestimonialChange}
                onAddTestimonial={onAddTestimonial}
                onRemoveTestimonial={onRemoveTestimonial}
              />
            </div>
          ) : null;

        case "faq":
          return config.faq ? (
            <div
              key="faq"
              className="apple-tile apple-tile-full"
              style={tileStyle}
            >
              <FAQSection
                faq={config.faq}
                isEditing={isEditing}
                variant="light"
                brandFonts={brandFonts}
                onHeadingChange={onFAQHeadingChange}
                onSubheadingChange={onFAQSubheadingChange}
                onItemChange={onFAQItemChange}
                onAddItem={onAddFAQItem}
                onRemoveItem={onRemoveFAQItem}
              />
            </div>
          ) : null;

        case "location":
          return config.location ? (
            <div
              key="location"
              className="apple-tile apple-tile-full"
              style={tileStyle}
            >
              <LocationSection
                location={config.location}
                address={address}
                isEditing={isEditing}
                variant="light"
                brandFonts={brandFonts}
                onHeadingChange={onLocationHeadingChange}
                onSubheadingChange={onLocationSubheadingChange}
              />
            </div>
          ) : null;

        case "gallery":
          return config.gallery ? (
            <div
              key="gallery"
              className="apple-tile apple-tile-full"
              style={tileStyle}
            >
              <GallerySection
                gallery={config.gallery}
                isEditing={isEditing}
                variant="light"
                brandFonts={brandFonts}
                onHeadingChange={onGalleryHeadingChange}
                onSubheadingChange={onGallerySubheadingChange}
                onAddImage={onGalleryAddImage}
                onRemoveImage={onGalleryRemoveImage}
              />
            </div>
          ) : null;

        default:
          return null;
      }
    })
    .filter(Boolean);

  return (
    <div style={pageStyle}>
      {/* Responsive grid styles */}
      <style>{`
        .apple-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          max-width: 1440px;
          margin: 0 auto;
          padding: 40px 20px 60px;
        }
        .apple-tile-full {
          grid-column: 1 / -1;
        }
        @media (max-width: 768px) {
          .apple-grid {
            grid-template-columns: 1fr;
            padding: 24px 16px 40px;
          }
        }
        ${
          isEditing
            ? `
          [contenteditable]:focus {
            outline: none !important;
            border: none !important;
            box-shadow: none !important;
          }
          .editable-field-light:focus {
            background: rgba(255, 255, 255, 0.12) !important;
          }
          .editable-field-light:hover:not(:focus) {
            background: rgba(255, 255, 255, 0.06);
          }
          .editable-field-dark:focus {
            background: rgba(0, 0, 0, 0.04) !important;
          }
          .editable-field-dark:hover:not(:focus) {
            background: rgba(0, 0, 0, 0.02);
          }
        `
            : ""
        }
      `}</style>

      {/* Compact Hero Section */}
      {config.heroEnabled !== false && (
        <div
          ref={toolbar.sectionRef}
          style={{
            ...heroStyle,
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

          {/* Section Toolbar */}
          {isEditing && toolbar.sectionSelected && (
            <div
              style={{ position: "absolute", top: 8, left: "50%", zIndex: 50 }}
            >
              <SectionToolbar
                bgColor={h?.bgColor || ""}
                hasBackgroundImage={hasImage}
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
                paddingLeft={h?.paddingLeft ?? 24}
                paddingRight={h?.paddingRight ?? 24}
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
                  editableClassName={editFieldClass}
                  maxWidth={h?.titleMaxWidth ?? DEFAULT_TITLE_MW}
                  onMaxWidthChange={toolbar.onTitleMaxWidthChange}
                  selected={toolbar.titleSelected}
                  onSelect={toolbar.handleTitleClick}
                  toolbarProps={{
                    fontSize: h?.titleFontSize || 48,
                    fontFamily: h?.titleFontFamily || "",
                    fontWeight: h?.titleFontWeight || "bold",
                    fontStyle: h?.titleFontStyle || "normal",
                    color:
                      h?.titleTextColor || (hasImage ? "#ffffff" : "#1d1d1f"),
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
                  editableClassName={editFieldClass}
                  maxWidth={h?.subtitleMaxWidth ?? DEFAULT_SUBTITLE_MW}
                  onMaxWidthChange={toolbar.onSubtitleMaxWidthChange}
                  selected={toolbar.subtitleSelected}
                  onSelect={toolbar.handleSubtitleClick}
                  toolbarProps={{
                    fontSize: h?.subtitleFontSize || 18,
                    fontFamily: h?.subtitleFontFamily || "",
                    fontWeight: h?.subtitleFontWeight || "normal",
                    fontStyle: h?.subtitleFontStyle || "normal",
                    color:
                      h?.subtitleTextColor ||
                      (hasImage ? "#ffffff" : "#6e6e73"),
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
                  >
                    {button.label} {chevronSvg}
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
                    {button.label} {chevronSvg}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Tile Grid of Sections */}
      {sectionTiles.length > 0 && (
        <div className="apple-grid">{sectionTiles}</div>
      )}

      {/* Footer outside grid */}
      {config.footerEnabled !== false && config.footer && (
        <FooterSection
          footer={config.footer}
          isEditing={isEditing}
          brandFonts={brandFonts}
          onTextChange={onFooterTextChange}
          onLinkChange={onFooterLinkChange}
          onAddLink={onAddFooterLink}
          onRemoveLink={onRemoveFooterLink}
        />
      )}
    </div>
  );
}
