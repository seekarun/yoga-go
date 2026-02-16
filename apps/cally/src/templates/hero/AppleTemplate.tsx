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
    onFeaturesHeadingChange,
    onFeaturesSubheadingChange,
    onFeatureCardChange,
    onFeatureCardImageClick,
    onAddFeatureCard,
    onRemoveFeatureCard,
    products,
    currency,
    onBookProduct,
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
  const { title, subtitle, backgroundImage, imagePosition, imageZoom, button } =
    config;

  const hasImage = !!backgroundImage;

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
    textAlign: "center",
    padding: "60px 24px",
    position: "relative",
    overflow: "hidden",
    color: hasImage ? "#ffffff" : "#1d1d1f",
  };

  const backgroundStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    backgroundColor: hasImage ? "#000" : "#fbfbfd",
    backgroundImage: hasImage
      ? `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.45)), url(${backgroundImage})`
      : undefined,
    backgroundPosition: imagePosition || "50% 50%",
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
    transform: hasImage ? `scale(${(imageZoom || 100) / 100})` : undefined,
    zIndex: 0,
  };

  const contentStyle: React.CSSProperties = {
    position: "relative",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    maxWidth: "820px",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: "clamp(2.5rem, 7vw, 4.5rem)",
    fontWeight: 600,
    marginBottom: "16px",
    lineHeight: 1.07,
    letterSpacing: "-0.04em",
    color: hasImage ? "#ffffff" : "#1d1d1f",
    fontFamily: config.theme?.headerFont?.family || sfProDisplay,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: "clamp(1.05rem, 2vw, 1.35rem)",
    fontWeight: 400,
    color: hasImage ? "rgba(255, 255, 255, 0.85)" : "#6e6e73",
    maxWidth: "580px",
    lineHeight: 1.5,
    letterSpacing: "-0.01em",
    fontFamily: config.theme?.bodyFont?.family || sfProText,
  };

  const editableBaseStyle: React.CSSProperties = isEditing
    ? {
        cursor: "text",
        outline: "none",
        borderRadius: "8px",
        padding: "8px 14px",
        transition: "background 0.2s, outline 0.2s",
      }
    : {};

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
          .editable-field-light:focus {
            background: rgba(255, 255, 255, 0.12) !important;
            outline: 2px solid rgba(255, 255, 255, 0.4) !important;
          }
          .editable-field-light:hover:not(:focus) {
            background: rgba(255, 255, 255, 0.06);
          }
          .editable-field-dark:focus {
            background: rgba(0, 0, 0, 0.04) !important;
            outline: 2px solid rgba(0, 0, 0, 0.2) !important;
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
        <div style={heroStyle}>
          <div style={backgroundStyle} />
          <div style={contentStyle}>
            {isEditing ? (
              <>
                <div
                  className={editFieldClass}
                  contentEditable
                  suppressContentEditableWarning
                  style={{ ...titleStyle, ...editableBaseStyle }}
                  onBlur={(e) =>
                    onTitleChange?.(e.currentTarget.textContent || "")
                  }
                >
                  {title}
                </div>
                <div
                  className={editFieldClass}
                  contentEditable
                  suppressContentEditableWarning
                  style={{ ...subtitleStyle, ...editableBaseStyle }}
                  onBlur={(e) =>
                    onSubtitleChange?.(e.currentTarget.textContent || "")
                  }
                >
                  {subtitle}
                </div>
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
                <h1 style={titleStyle}>{title}</h1>
                <p style={subtitleStyle}>{subtitle}</p>
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
