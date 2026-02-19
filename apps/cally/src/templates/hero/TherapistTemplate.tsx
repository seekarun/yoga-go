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
 * Therapist Template
 * Warm, empathetic wellness aesthetic for therapy, counselling, and wellness
 * professionals. Uses Approach 2 (custom layout, bypasses SectionsRenderer).
 *
 * Typography: Lora serif headings, Open Sans body.
 * Hero: centered text over blurred background image / soft gradient.
 * About: circle portrait with organic blob SVG.
 * Sections: soft shadows, large border radii, organic shapes.
 *
 * Palette usage:
 * - --brand-50: page bg, card bg
 * - --brand-100: card borders, portrait border, feature image tint
 * - --brand-200: blob SVG fill
 * - --brand-500: CTA fill, FAQ chevrons
 * - --brand-500-contrast: CTA text
 * - --brand-highlight: section headings
 */
const DEFAULT_TITLE_MW = 900;
const DEFAULT_SUBTITLE_MW = 600;

export default function TherapistTemplate(props: HeroTemplateProps) {
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

  const DEFAULT_OVERLAY = 20;
  const overlayAlpha = (h?.overlayOpacity ?? DEFAULT_OVERLAY) / 100;
  const padTop = h?.paddingTop ?? 80;
  const padBottom = h?.paddingBottom ?? 80;
  const contentAlign = h?.contentAlign || "center";
  const alignMap = {
    left: "flex-start",
    center: "center",
    right: "flex-end",
  } as const;

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
  const lora = '"Lora", Georgia, "Times New Roman", serif';
  const openSans =
    '"Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  // --- Hero Styles ---
  const titleStyle: React.CSSProperties = {
    fontFamily: h?.titleFontFamily || config.theme?.headerFont?.family || lora,
    fontSize: h?.titleFontSize
      ? `${h.titleFontSize}px`
      : "clamp(2.2rem, 5vw, 4rem)",
    fontWeight: h?.titleFontWeight === "normal" ? 400 : 700,
    fontStyle: h?.titleFontStyle || undefined,
    lineHeight: 1.15,
    color:
      h?.titleTextColor ||
      (hasImage ? "#fff" : "var(--brand-highlight, #1a1a1a)"),
    textAlign: h?.titleTextAlign || "center",
    margin: 0,
    marginBottom: "20px",
    textShadow: hasImage ? "0 2px 12px rgba(0,0,0,0.3)" : undefined,
    whiteSpace: "pre-line",
  };

  const subtitleStyle: React.CSSProperties = {
    fontFamily:
      h?.subtitleFontFamily || config.theme?.bodyFont?.family || openSans,
    fontSize: h?.subtitleFontSize
      ? `${h.subtitleFontSize}px`
      : "clamp(1rem, 1.5vw, 1.2rem)",
    fontWeight: h?.subtitleFontWeight === "bold" ? 700 : 400,
    fontStyle: h?.subtitleFontStyle || undefined,
    color:
      h?.subtitleTextColor || (hasImage ? "rgba(255,255,255,0.9)" : "#666"),
    textAlign: h?.subtitleTextAlign || "center",
    lineHeight: 1.7,
    margin: 0,
    marginBottom: "36px",
    textShadow: hasImage ? "0 1px 6px rgba(0,0,0,0.2)" : undefined,
    whiteSpace: "pre-line",
  };

  const selectedOutline: React.CSSProperties = {
    outline: "2px solid #3b82f6",
    outlineOffset: "4px",
    borderRadius: "6px",
  };

  const pillButtonStyle: React.CSSProperties = {
    display: "inline-block",
    padding: "18px 48px",
    borderRadius: "50px",
    border: "none",
    background: "var(--brand-500, #667eea)",
    color: "var(--brand-500-contrast, #fff)",
    fontFamily: openSans,
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
  };

  const editButtonStyle: React.CSSProperties = {
    ...pillButtonStyle,
    position: "relative",
  };

  // --- Custom About Section ---
  const aboutSection = (() => {
    if (!config.about) return null;
    const about = config.about;
    const hasAboutImage = !!about.image;

    const aboutImageStyle: React.CSSProperties = {
      width: "240px",
      height: "240px",
      borderRadius: "50%",
      border: "4px solid var(--brand-100, #f3f2f0)",
      boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
      objectFit: "cover",
      objectPosition: about.imagePosition || "50% 50%",
      transform: hasAboutImage
        ? `scale(${(about.imageZoom || 100) / 100})`
        : undefined,
    };

    const aboutPlaceholderStyle: React.CSSProperties = {
      width: "240px",
      height: "240px",
      borderRadius: "50%",
      border: "4px solid var(--brand-100, #f3f2f0)",
      boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
      backgroundColor: "var(--brand-100, #f3f4f6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    };

    const aboutTextStyle: React.CSSProperties = {
      fontSize: "1.1rem",
      lineHeight: 1.8,
      color: "#4b5563",
      fontFamily: openSans,
      textAlign: "center",
      maxWidth: "600px",
      margin: "0 auto",
    };

    const aboutEditableStyle: React.CSSProperties = isEditing
      ? {
          cursor: "text",
          outline: "none",
          borderRadius: "8px",
          padding: "12px",
          transition: "background 0.2s, outline 0.2s",
        }
      : {};

    return (
      <div
        style={{
          padding: "96px 8%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Organic blob behind portrait */}
        <svg
          viewBox="0 0 400 400"
          style={{
            position: "absolute",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "360px",
            height: "360px",
            opacity: 0.3,
            zIndex: 0,
          }}
        >
          <path
            d="M200,20 C280,20 360,80 360,160 C360,240 320,320 240,360 C160,400 80,360 40,280 C0,200 40,100 120,40 C160,12 180,20 200,20 Z"
            fill="var(--brand-200, #e5e3df)"
          />
        </svg>

        {/* Portrait */}
        <div style={{ position: "relative", zIndex: 1, marginBottom: "32px" }}>
          {hasAboutImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- circle portrait with object-fit, next/image would require fixed layout
            <img src={about.image} alt="About" style={aboutImageStyle} />
          ) : (
            <div style={aboutPlaceholderStyle}>
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
            </div>
          )}
          {isEditing && (
            <button
              type="button"
              onClick={onAboutImageClick}
              style={{
                position: "absolute",
                bottom: "8px",
                right: "8px",
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

        {/* Heading */}
        <h2
          style={{
            fontFamily: lora,
            fontSize: "clamp(1.5rem, 3vw, 2rem)",
            fontWeight: 600,
            color: "var(--brand-highlight, #1a1a1a)",
            marginBottom: "20px",
            textAlign: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          About Me
        </h2>

        {/* Paragraph */}
        <div style={{ position: "relative", zIndex: 1 }}>
          {isEditing ? (
            <div
              className="therapist-editable"
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

  // --- Section rendering ---
  const sectionElements = sections
    .filter((s) => s.enabled)
    .map((section) => {
      const wrapperStyle: React.CSSProperties = {
        padding: section.id === "about" ? "0" : "96px 0",
      };

      switch (section.id) {
        case "about":
          return config.about ? (
            <div key="about" className="therapist-section" style={wrapperStyle}>
              {aboutSection}
            </div>
          ) : null;

        case "features":
          return config.features && config.features.cards.length > 0 ? (
            <div
              key="features"
              className="therapist-section"
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
              className="therapist-section"
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
              className="therapist-section"
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
            <div key="faq" className="therapist-section" style={wrapperStyle}>
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
              className="therapist-section"
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
              className="therapist-section therapist-gallery-wrapper"
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
    <div
      style={{
        fontFamily: openSans,
        backgroundColor: "var(--brand-50, #faf9f8)",
      }}
    >
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700&display=swap');

        /* Strip inner section backgrounds / padding so therapist wrapper controls */
        .therapist-section > section {
          background-color: transparent !important;
          padding-top: 0 !important;
          padding-bottom: 0 !important;
        }

        /* Section headings use Lora + highlight colour */
        .therapist-section h2 {
          font-family: ${lora} !important;
          color: var(--brand-highlight, #1a1a1a) !important;
        }

        /* Feature cards: soft shadow, large radius */
        .therapist-section .feature-card {
          border-radius: 24px !important;
          box-shadow: 0 10px 30px rgba(0,0,0,0.05) !important;
          background-color: var(--brand-50, #faf9f8) !important;
          border: 1px solid var(--brand-100, #f3f2f0) !important;
          transition: transform 0.3s ease, box-shadow 0.3s ease !important;
        }
        .therapist-section .feature-card:hover {
          transform: translateY(-4px) !important;
          box-shadow: 0 16px 40px rgba(0,0,0,0.08) !important;
        }
        .therapist-section .feature-card-image {
          background-color: var(--brand-100, #f3f2f0) !important;
        }

        /* FAQ items: rounded, white bg, brand chevrons */
        .therapist-section .faq-item {
          border-radius: 16px !important;
          background-color: white !important;
          border: 1px solid var(--brand-100, #f3f2f0) !important;
          box-shadow: 0 4px 16px rgba(0,0,0,0.04) !important;
        }
        .therapist-section .faq-item svg {
          stroke: var(--brand-500) !important;
        }

        /* Gallery: grid instead of carousel */
        .therapist-gallery-wrapper .gallery-carousel {
          display: grid !important;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)) !important;
          gap: 20px !important;
          overflow-x: visible !important;
          scroll-snap-type: none !important;
        }
        .therapist-gallery-wrapper .gallery-carousel > * {
          flex: none !important;
          width: auto !important;
          min-width: 0 !important;
          scroll-snap-align: unset !important;
        }
        .therapist-gallery-wrapper .gallery-carousel-card {
          border-radius: 20px !important;
          box-shadow: 0 10px 30px rgba(0,0,0,0.05) !important;
        }
        /* Hide carousel arrow buttons */
        .therapist-gallery-wrapper .gallery-arrow {
          display: none !important;
        }

        /* CTA pill hover */
        .therapist-cta:hover {
          opacity: 0.9;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.16) !important;
        }

        @media (max-width: 768px) {
          .therapist-hero {
            min-height: auto !important;
            padding: 60px 24px !important;
          }
          .therapist-section {
            padding: 64px 0 !important;
          }
          .therapist-about-portrait {
            width: 180px !important;
            height: 180px !important;
          }
          .therapist-gallery-wrapper .gallery-carousel {
            grid-template-columns: 1fr !important;
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
          .therapist-editable:focus {
            background: rgba(0, 0, 0, 0.04) !important;
          }
          .therapist-editable:hover:not(:focus) {
            background: rgba(0, 0, 0, 0.02);
          }
          .therapist-editable-light:focus {
            background: rgba(255, 255, 255, 0.15) !important;
          }
          .therapist-editable-light:hover:not(:focus) {
            background: rgba(255, 255, 255, 0.08);
          }
        `
            : ""
        }
      `}</style>

      {/* Hero Section */}
      {config.heroEnabled !== false && (
        <div
          ref={toolbar.sectionRef}
          className="therapist-hero"
          style={{
            position: "relative",
            minHeight: "85vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            paddingTop: `${padTop}px`,
            paddingBottom: `${padBottom}px`,
            paddingLeft: `${h?.paddingLeft ?? 20}px`,
            paddingRight: `${h?.paddingRight ?? 20}px`,
            textAlign: contentAlign,
            overflow: "hidden",
            backgroundColor: h?.bgColor || undefined,
            ...(isEditing && toolbar.sectionSelected ? selectedOutline : {}),
          }}
          onClick={toolbar.handleSectionClick}
        >
          {/* Background layer */}
          {hasImage ? (
            <>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: `url(${backgroundImage})`,
                  backgroundPosition: imagePosition || "50% 50%",
                  backgroundSize: "cover",
                  backgroundRepeat: "no-repeat",
                  filter: `blur(${8 + (h?.bgBlur ?? 0)}px) brightness(0.85)${bgFilterToCSS(h?.bgFilter) ? ` ${bgFilterToCSS(h?.bgFilter)}` : ""}`,
                  opacity: (h?.bgOpacity ?? 100) / 100,
                  transform: `translate(${imageOffsetX || 0}px, ${imageOffsetY || 0}px) scale(${((imageZoom || 100) / 100) * ((h?.bgBlur ?? 0) > 0 ? 1.05 : 1.05)})`,
                  zIndex: 0,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `linear-gradient(rgba(0,0,0,${overlayAlpha}), rgba(0,0,0,${overlayAlpha}))`,
                  zIndex: 1,
                }}
              />
            </>
          ) : (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(135deg, var(--brand-100, #f3f2f0) 0%, var(--brand-200, #e5e3df) 100%)",
                zIndex: 0,
              }}
            />
          )}

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

          {/* Content */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
              width: "100%",
              maxWidth: `${h?.titleMaxWidth ?? DEFAULT_TITLE_MW}px`,
              display: "flex",
              flexDirection: "column",
              alignItems: alignMap[contentAlign],
            }}
          >
            {isEditing ? (
              <>
                <ResizableText
                  ref={toolbar.titleRef}
                  text={title}
                  isEditing={isEditing}
                  onTextChange={onTitleChange}
                  textStyle={titleStyle}
                  editableClassName={
                    hasImage ? "therapist-editable-light" : "therapist-editable"
                  }
                  maxWidth={h?.titleMaxWidth ?? DEFAULT_TITLE_MW}
                  onMaxWidthChange={toolbar.onTitleMaxWidthChange}
                  selected={toolbar.titleSelected}
                  onSelect={toolbar.handleTitleClick}
                  toolbarProps={{
                    fontSize: h?.titleFontSize || 40,
                    fontFamily: h?.titleFontFamily || "",
                    fontWeight: h?.titleFontWeight || "bold",
                    fontStyle: h?.titleFontStyle || "normal",
                    color:
                      h?.titleTextColor || (hasImage ? "#ffffff" : "#1a1a1a"),
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
                  editableClassName={
                    hasImage ? "therapist-editable-light" : "therapist-editable"
                  }
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
                      h?.subtitleTextColor || (hasImage ? "#ffffff" : "#666"),
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
                    className="therapist-cta"
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
                    style={pillButtonStyle}
                    className="therapist-cta"
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

      {/* Sections */}
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
