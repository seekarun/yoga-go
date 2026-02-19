"use client";

import type { HeroTemplateProps } from "./types";
import type { BrandFont } from "@/types/landing-page";
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
 * Bayside Template
 * Boutique / luxury aesthetic with serif headings, clean sans-serif body,
 * generous spacing, and editorial styling throughout.
 * Uses Approach 2 (custom layout, bypasses SectionsRenderer) for full
 * control over section rendering with alternating backgrounds and
 * Playfair Display typography.
 *
 * Hero: split layout — content left, image right (stacked on mobile).
 * About: custom split layout — image fills entire left, text right.
 *
 * Palette usage:
 * - --brand-secondary: section backgrounds (alternating with white)
 * - --brand-highlight: section headings colour
 * - --brand-500: CTA hover fill, accents
 * - --brand-100/200/300: hero gradient fallback
 */
const DEFAULT_TITLE_MW = 900;
const DEFAULT_SUBTITLE_MW = 480;

export default function BaysideTemplate(props: HeroTemplateProps) {
  const {
    config,
    isEditing = false,
    onTitleChange,
    onSubtitleChange,
    onButtonClick,
    onAboutParagraphChange,
    onAboutImageClick,
    onAboutBgImageClick: _onAboutBgImageClick,
    onFeaturesHeadingChange,
    onFeaturesSubheadingChange,
    onFeatureCardChange,
    onFeatureCardImageClick,
    onAddFeatureCard,
    onRemoveFeatureCard,
    onAboutRemoveBgComplete: _onAboutRemoveBgComplete,
    onFeatureCardRemoveBg,
    products,
    currency,
    onBookProduct,
    onProductsHeadingChange,
    onProductsSubheadingChange,
    onProductsStyleOverrideChange,
    onProductsBgImageClick,
    onCustomColorsChange,
    onHeroStyleOverrideChange,
    onHeroBgImageClick,
    onHeroRemoveBg,
    heroRemovingBg,
    heroBgRemoved,
    onHeroUndoRemoveBg,
    onImageOffsetChange,
    onImageZoomChange,
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

  const padTop = h?.paddingTop ?? 80;
  const padBottom = h?.paddingBottom ?? 80;
  const contentAlign = h?.contentAlign || "left";

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

  // Typography
  const playfair = '"Playfair Display", Georgia, "Times New Roman", serif';
  const inter =
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  // Fallback colours (used when palette CSS vars are unavailable)
  const offWhite = "#FAF9F6";
  const darkText = "#1a1a1a";

  // --- Hero Styles ---
  const titleStyle: React.CSSProperties = {
    fontFamily:
      h?.titleFontFamily || config.theme?.headerFont?.family || playfair,
    fontSize: h?.titleFontSize
      ? `${h.titleFontSize}px`
      : "clamp(2.5rem, 5vw, 4.5rem)",
    fontWeight: h?.titleFontWeight === "normal" ? 400 : 700,
    fontStyle: h?.titleFontStyle || undefined,
    lineHeight: 1.1,
    color: h?.titleTextColor || darkText,
    textAlign:
      h?.titleTextAlign || (contentAlign as React.CSSProperties["textAlign"]),
    margin: 0,
    marginBottom: "24px",
    whiteSpace: "pre-line",
  };

  const subtitleStyle: React.CSSProperties = {
    fontFamily:
      h?.subtitleFontFamily || config.theme?.bodyFont?.family || inter,
    fontSize: h?.subtitleFontSize
      ? `${h.subtitleFontSize}px`
      : "clamp(0.8rem, 1.2vw, 0.95rem)",
    fontWeight: h?.subtitleFontWeight === "bold" ? 700 : 500,
    fontStyle: h?.subtitleFontStyle || undefined,
    color: h?.subtitleTextColor || "#666",
    textAlign:
      h?.subtitleTextAlign ||
      (contentAlign as React.CSSProperties["textAlign"]),
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    lineHeight: 1.6,
    margin: 0,
    marginBottom: "40px",
    whiteSpace: "pre-line",
  };

  const selectedOutline: React.CSSProperties = {
    outline: "2px solid #3b82f6",
    outlineOffset: "4px",
    borderRadius: "6px",
  };

  const buttonStyle: React.CSSProperties = {
    display: "inline-block",
    padding: "16px 40px",
    border: "1.5px solid #1a1a1a",
    background: "transparent",
    color: darkText,
    fontFamily: inter,
    fontSize: "0.85rem",
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    cursor: "pointer",
    transition: "all 0.3s ease",
  };

  const editButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    position: "relative",
  };

  // Image style for split hero
  const heroImageStyle: React.CSSProperties = {
    backgroundImage: hasImage
      ? `url(${backgroundImage})`
      : `linear-gradient(135deg, var(--brand-100, #e8e4df) 0%, var(--brand-200, #d4cfc7) 50%, var(--brand-300, #c0b9ad) 100%)`,
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
  };

  // --- Custom About Section (split layout with full-height image) ---
  const aboutSection = (() => {
    if (!config.about) return null;
    const about = config.about;
    const hasAboutImage = !!about.image;

    const aboutImageStyle: React.CSSProperties = {
      backgroundImage: hasAboutImage ? `url(${about.image})` : undefined,
      backgroundPosition: about.imagePosition || "50% 50%",
      backgroundSize: "cover",
      backgroundRepeat: "no-repeat",
      backgroundColor: hasAboutImage ? undefined : "var(--brand-100, #f3f4f6)",
      transform: hasAboutImage
        ? `scale(${(about.imageZoom || 100) / 100})`
        : undefined,
    };

    const aboutTextStyle: React.CSSProperties = {
      fontSize: "1.1rem",
      lineHeight: 1.8,
      color: "#4b5563",
      fontFamily: inter,
    };

    const aboutEditableStyle: React.CSSProperties = isEditing
      ? {
          cursor: "text",
          outline: "none",
          borderRadius: "4px",
          padding: "12px",
          transition: "background 0.2s, outline 0.2s",
        }
      : {};

    return (
      <div className="bayside-about">
        {/* Left: Full-height image */}
        <div className="bayside-about-image">
          <div className="bayside-about-image-inner" style={aboutImageStyle}>
            {!hasAboutImage && (
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#9ca3af"
                strokeWidth="1.5"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            )}
          </div>
          {isEditing && (
            <button
              type="button"
              onClick={onAboutImageClick}
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
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
                zIndex: 2,
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
          )}
        </div>

        {/* Right: Text content */}
        <div className="bayside-about-content">
          {isEditing ? (
            <div
              className="bayside-editable"
              contentEditable
              suppressContentEditableWarning
              style={{ ...aboutTextStyle, ...aboutEditableStyle }}
              onBlur={(e) =>
                onAboutParagraphChange?.(e.currentTarget.textContent || "")
              }
            >
              {about.paragraph}
            </div>
          ) : (
            <p style={aboutTextStyle}>{about.paragraph}</p>
          )}
        </div>
      </div>
    );
  })();

  // --- Section rendering (all full-width, no max-width constraint) ---
  const sectionElements = sections
    .filter((s) => s.enabled)
    .map((section) => {
      const wrapperStyle: React.CSSProperties = {
        padding: section.id === "about" ? "0" : "96px 0",
      };

      switch (section.id) {
        case "about":
          return config.about ? (
            <div
              key="about"
              className="bayside-section bayside-section-secondary"
              style={wrapperStyle}
            >
              {aboutSection}
            </div>
          ) : null;

        case "features":
          return config.features && config.features.cards.length > 0 ? (
            <div
              key="features"
              className="bayside-section bayside-section-secondary"
              style={wrapperStyle}
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
              className="bayside-section bayside-section-secondary"
              style={wrapperStyle}
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
              className="bayside-section bayside-section-secondary"
              style={wrapperStyle}
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
              className="bayside-section bayside-section-secondary"
              style={wrapperStyle}
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
              className="bayside-section bayside-section-secondary"
              style={wrapperStyle}
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
              className="bayside-section bayside-section-secondary"
              style={wrapperStyle}
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
    <div style={{ fontFamily: inter, backgroundColor: offWhite }}>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');

        .bayside-hero {
          display: flex;
          min-height: 90vh;
        }
        .bayside-hero-content {
          flex: 1;
          padding: ${padTop}px 8% ${padBottom}px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          background-color: ${offWhite};
        }
        .bayside-hero-image {
          flex: 1;
          position: relative;
          overflow: hidden;
        }
        .bayside-hero-image-inner {
          position: absolute;
          inset: 0;
        }
        .bayside-cta:hover {
          background-color: var(--brand-500, #1a1a1a) !important;
          color: var(--brand-500-contrast, #fff) !important;
          border-color: var(--brand-500, #1a1a1a) !important;
        }

        /* All sections share the brand secondary background for a seamless flow */
        .bayside-section-secondary {
          background-color: var(--brand-secondary, ${offWhite});
        }

        /* Strip inner section backgrounds and collapse their padding so
           the bayside wrapper controls spacing seamlessly */
        .bayside-section-secondary > section {
          background-color: transparent !important;
          padding-top: 0 !important;
          padding-bottom: 0 !important;
        }

        /* Section headings use highlight colour */
        .bayside-section h2 {
          color: var(--brand-highlight, #1a1a1a) !important;
          font-family: ${playfair} !important;
        }

        /* About: split layout with full-height image */
        .bayside-about {
          display: flex;
          min-height: 500px;
        }
        .bayside-about-image {
          flex: 1;
          position: relative;
          overflow: hidden;
          min-height: 400px;
        }
        .bayside-about-image-inner {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .bayside-about-content {
          flex: 1;
          padding: 80px 8%;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        @media (max-width: 768px) {
          .bayside-hero {
            flex-direction: column-reverse;
            min-height: auto;
          }
          .bayside-hero-content {
            padding: 48px 24px;
          }
          .bayside-hero-image {
            min-height: 50vh;
            flex: none;
          }
          .bayside-about {
            flex-direction: column;
            min-height: auto;
          }
          .bayside-about-image {
            min-height: 50vh;
            flex: none;
          }
          .bayside-about-content {
            padding: 48px 24px;
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
          .bayside-editable:focus {
            background: rgba(0, 0, 0, 0.04) !important;
          }
          .bayside-editable:hover:not(:focus) {
            background: rgba(0, 0, 0, 0.02);
          }
        `
            : ""
        }
      `}</style>

      {/* Hero Section */}
      {config.heroEnabled !== false && (
        <div
          ref={toolbar.sectionRef}
          className="bayside-hero"
          style={{
            position: "relative",
            backgroundColor: h?.bgColor || undefined,
            ...(isEditing && toolbar.sectionSelected ? selectedOutline : {}),
          }}
          onClick={toolbar.handleSectionClick}
        >
          {/* Section Toolbar */}
          {isEditing && toolbar.sectionSelected && (
            <div
              style={{ position: "absolute", top: 8, left: "25%", zIndex: 50 }}
            >
              <SectionToolbar
                bgColor={h?.bgColor || offWhite}
                hasBackgroundImage={hasImage}
                bgImage={backgroundImage}
                bgImageBlur={h?.bgBlur ?? 0}
                onBgImageBlurChange={toolbar.onBgBlurChange}
                bgImageOpacity={h?.bgOpacity ?? 100}
                onBgImageOpacityChange={toolbar.onBgOpacityChange}
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

          {/* Left: Content */}
          <div className="bayside-hero-content">
            {isEditing ? (
              <>
                <ResizableText
                  ref={toolbar.titleRef}
                  text={title}
                  isEditing={isEditing}
                  onTextChange={onTitleChange}
                  textStyle={titleStyle}
                  editableClassName="bayside-editable"
                  maxWidth={h?.titleMaxWidth ?? DEFAULT_TITLE_MW}
                  onMaxWidthChange={toolbar.onTitleMaxWidthChange}
                  selected={toolbar.titleSelected}
                  onSelect={toolbar.handleTitleClick}
                  toolbarProps={{
                    fontSize: h?.titleFontSize || 48,
                    fontFamily: h?.titleFontFamily || "",
                    fontWeight: h?.titleFontWeight || "bold",
                    fontStyle: h?.titleFontStyle || "normal",
                    color: h?.titleTextColor || darkText,
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
                  editableClassName="bayside-editable"
                  maxWidth={h?.subtitleMaxWidth ?? DEFAULT_SUBTITLE_MW}
                  onMaxWidthChange={toolbar.onSubtitleMaxWidthChange}
                  selected={toolbar.subtitleSelected}
                  onSelect={toolbar.handleSubtitleClick}
                  toolbarProps={{
                    fontSize: h?.subtitleFontSize || 14,
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
                    className="bayside-cta"
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
                    className="bayside-cta"
                    onClick={onButtonClick}
                  >
                    {button.label}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Right: Image */}
          <div className="bayside-hero-image">
            <div className="bayside-hero-image-inner" style={heroImageStyle} />
            <BgDragOverlay
              active={toolbar.bgDragActive && isEditing}
              offsetX={imageOffsetX || 0}
              offsetY={imageOffsetY || 0}
              imageZoom={imageZoom || 100}
              onOffsetChange={onImageOffsetChange}
              onZoomChange={onImageZoomChange}
            />
          </div>
        </div>
      )}

      {/* Sections with palette-driven backgrounds */}
      {sectionElements}

      {/* Footer */}
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
