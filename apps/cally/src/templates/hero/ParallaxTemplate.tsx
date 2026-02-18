"use client";

import { useEffect, useRef } from "react";
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
import HeroSectionToolbar from "./HeroSectionToolbar";
import ResizableText from "./ResizableText";

const DEFAULT_TITLE_MW = 900;
const DEFAULT_SUBTITLE_MW = 600;

/**
 * Parallax Template
 * Immersive scroll-driven depth effect with a slower-scrolling background layer.
 * Uses Approach 2 (custom layout, bypasses SectionsRenderer).
 *
 * The background image (or gradient) scrolls at ~50 % of the content rate via
 * a JS scroll listener, creating true parallax. Section wrappers are transparent
 * so the background shows through; only cards and content blocks are opaque.
 *
 * Typography: Playfair Display serif headings, system font body.
 * Palette usage:
 * - --brand-500: CTA fill, scroll indicator
 * - --brand-500-contrast: CTA text
 * - --brand-highlight: about heading
 * - --brand-800/900: dark gradient fallback (no image)
 */
export default function ParallaxTemplate(props: HeroTemplateProps) {
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

  const h = config.heroStyleOverrides;

  const toolbar = useHeroToolbarState({
    isEditing,
    heroStyleOverrides: h,
    onHeroStyleOverrideChange,
  });

  const DEFAULT_OVERLAY = 45;
  const overlayAlpha = (h?.overlayOpacity ?? DEFAULT_OVERLAY) / 100;
  const padTop = h?.paddingTop ?? 80;
  const padBottom = h?.paddingBottom ?? 80;

  const sections = config.sections || [
    { id: "about" as const, enabled: true },
    { id: "features" as const, enabled: true },
    { id: "testimonials" as const, enabled: false },
    { id: "faq" as const, enabled: false },
  ];

  // Refs for parallax scroll
  const containerRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  const brandFonts: { headerFont?: BrandFont; bodyFont?: BrandFont } = {
    headerFont: config.theme?.headerFont,
    bodyFont: config.theme?.bodyFont,
  };

  // Typography
  const playfair = '"Playfair Display", Georgia, serif';
  const systemFont =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  // Extract vertical position from imagePosition (e.g. "50% 30%" → "30%")
  const bgPositionY = (() => {
    if (!imagePosition) return "50%";
    const parts = imagePosition.trim().split(/\s+/);
    return parts.length > 1 ? parts[1] : "50%";
  })();

  // --- Parallax scroll effect ---
  // Background is pinned to the viewport (100vh tall) and pans left→right
  // as the user scrolls, revealing different parts of the image.
  useEffect(() => {
    const container = containerRef.current;
    const bg = bgRef.current;
    if (!container || !bg) return;

    // Find the nearest scrollable ancestor (for editor preview) or fall back to window
    const findScrollParent = (el: HTMLElement): HTMLElement | null => {
      let parent = el.parentElement;
      while (parent) {
        const { overflow, overflowY } = getComputedStyle(parent);
        if (/(auto|scroll)/.test(overflow + overflowY)) return parent;
        parent = parent.parentElement;
      }
      return null;
    };

    const scrollEl = findScrollParent(container);
    const target: EventTarget = scrollEl || window;

    const onScroll = () => {
      if (!bg) return;
      const scrollY = scrollEl ? scrollEl.scrollTop : window.scrollY;
      const maxScroll = scrollEl
        ? scrollEl.scrollHeight - scrollEl.clientHeight
        : document.documentElement.scrollHeight - window.innerHeight;
      const progress = maxScroll > 0 ? Math.min(scrollY / maxScroll, 1) : 0;

      // Pin background to viewport (counteract normal scroll)
      bg.style.transform = `translate3d(0, ${scrollY}px, 0)`;

      // Pan image horizontally from left to right based on scroll progress
      if (hasImage) {
        bg.style.backgroundPosition = `${progress * 100}% ${bgPositionY}`;
      }
    };

    target.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => target.removeEventListener("scroll", onScroll);
  }, [hasImage, bgPositionY]);

  // --- Hero Styles ---
  const titleStyle: React.CSSProperties = {
    fontFamily:
      h?.titleFontFamily || config.theme?.headerFont?.family || playfair,
    fontSize: h?.titleFontSize
      ? `${h.titleFontSize}px`
      : "clamp(2.4rem, 5vw, 4.5rem)",
    fontWeight: h?.titleFontWeight === "normal" ? 400 : 700,
    fontStyle: h?.titleFontStyle || undefined,
    lineHeight: 1.1,
    color: h?.titleTextColor || "#fff",
    textAlign: h?.titleTextAlign || "center",
    margin: 0,
    marginBottom: "20px",
    textShadow: "0 2px 16px rgba(0,0,0,0.4)",
  };

  const subtitleStyle: React.CSSProperties = {
    fontFamily:
      h?.subtitleFontFamily || config.theme?.bodyFont?.family || systemFont,
    fontSize: h?.subtitleFontSize
      ? `${h.subtitleFontSize}px`
      : "clamp(1rem, 1.5vw, 1.25rem)",
    fontWeight: h?.subtitleFontWeight === "bold" ? 700 : 400,
    fontStyle: h?.subtitleFontStyle || undefined,
    color: h?.subtitleTextColor || "rgba(255,255,255,0.9)",
    textAlign: h?.subtitleTextAlign || "center",
    lineHeight: 1.7,
    margin: 0,
    marginBottom: "40px",
    textShadow: "0 1px 8px rgba(0,0,0,0.3)",
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
    fontFamily: systemFont,
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
  };

  const editButtonStyle: React.CSSProperties = {
    ...pillButtonStyle,
    position: "relative",
  };

  // --- Custom About Section (opaque card) ---
  const aboutSection = (() => {
    if (!config.about) return null;
    const about = config.about;
    const hasAboutImage = !!about.image;

    const aboutImageStyle: React.CSSProperties = {
      width: "100%",
      maxWidth: "400px",
      aspectRatio: "4/5",
      borderRadius: "12px",
      boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
      objectFit: "cover",
      objectPosition: about.imagePosition || "50% 50%",
      transform: hasAboutImage
        ? `scale(${(about.imageZoom || 100) / 100})`
        : undefined,
    };

    const aboutPlaceholderStyle: React.CSSProperties = {
      width: "100%",
      maxWidth: "400px",
      aspectRatio: "4/5",
      borderRadius: "12px",
      backgroundColor: "#f3f4f6",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    };

    const aboutTextStyle: React.CSSProperties = {
      fontSize: "1.1rem",
      lineHeight: 1.8,
      color: "#4b5563",
      fontFamily: systemFont,
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
      <div style={{ padding: "96px 8%" }}>
        <div
          style={{
            maxWidth: "1000px",
            margin: "0 auto",
            backgroundColor: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderRadius: "16px",
            padding: "48px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
            display: "flex",
            gap: "48px",
            alignItems: "center",
            flexWrap: "wrap" as const,
          }}
        >
          {/* Image */}
          <div
            className="parallax-about-image-col"
            style={{
              flex: "0 0 auto",
              width: "40%",
              minWidth: "240px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {hasAboutImage ? (
              // eslint-disable-next-line @next/next/no-img-element -- custom parallax about with object-fit
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

          {/* Text */}
          <div style={{ flex: 1, minWidth: "260px" }}>
            <h2
              className="parallax-about-heading"
              style={{
                fontFamily: playfair,
                fontSize: "clamp(1.5rem, 3vw, 2rem)",
                fontWeight: 600,
                color: "var(--brand-highlight, #1a1a1a)",
                marginBottom: "20px",
                marginTop: 0,
              }}
            >
              About Me
            </h2>

            {isEditing ? (
              <div
                className="parallax-editable"
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
              <p style={{ ...aboutTextStyle, margin: 0 }}>{about.paragraph}</p>
            )}
          </div>
        </div>
      </div>
    );
  })();

  // --- Section rendering ---
  const enabledSections = sections.filter((s) => s.enabled);
  const sectionElements: React.ReactNode[] = [];

  enabledSections.forEach((section) => {
    const wrapperStyle: React.CSSProperties = {
      padding: section.id === "about" ? "0" : "96px 0",
    };

    let element: React.ReactNode = null;

    switch (section.id) {
      case "about":
        element = config.about ? (
          <div key="about" style={{ padding: 0 }}>
            {aboutSection}
          </div>
        ) : null;
        break;

      case "features":
        element =
          config.features && config.features.cards.length > 0 ? (
            <div
              key="features"
              className="parallax-section"
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
        break;

      case "products":
        element =
          products && products.length > 0 ? (
            <div
              key="products"
              className="parallax-section"
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
        break;

      case "testimonials":
        element = config.testimonials ? (
          <div
            key="testimonials"
            className="parallax-section"
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
        break;

      case "faq":
        element = config.faq ? (
          <div key="faq" className="parallax-section" style={wrapperStyle}>
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
        break;

      case "location":
        element = config.location ? (
          <div key="location" className="parallax-section" style={wrapperStyle}>
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
        break;

      case "gallery":
        element = config.gallery ? (
          <div key="gallery" className="parallax-section" style={wrapperStyle}>
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
        break;

      default:
        break;
    }

    if (element) {
      sectionElements.push(element);
    }
  });

  return (
    <div
      ref={containerRef}
      style={{
        fontFamily: systemFont,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Google Fonts + CSS overrides */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap');

        /* ── Transparent section backgrounds ── */
        .parallax-section > section {
          background-color: transparent !important;
          padding-top: 0 !important;
          padding-bottom: 0 !important;
        }

        /* ── Section headings: white on parallax bg ── */
        .parallax-section h2 {
          font-family: ${playfair} !important;
          color: #fff !important;
          text-shadow: 0 2px 8px rgba(0,0,0,0.5) !important;
        }
        /* Subheading (p immediately after h2) */
        .parallax-section h2 + p {
          color: rgba(255,255,255,0.85) !important;
          text-shadow: 0 1px 4px rgba(0,0,0,0.3) !important;
        }

        /* About heading inside opaque card stays dark */
        .parallax-about-heading {
          color: var(--brand-highlight, #1a1a1a) !important;
          text-shadow: none !important;
        }

        /* ── Edit mode: section header editable fields on dark bg ── */
        .parallax-section > section > div > div:first-child .editable-field-dark {
          color: #fff !important;
          text-shadow: 0 1px 4px rgba(0,0,0,0.3) !important;
        }
        .parallax-section > section > div > div:first-child .editable-field-dark:focus {
          background: rgba(255, 255, 255, 0.15) !important;
        }
        .parallax-section > section > div > div:first-child .editable-field-dark:hover:not(:focus) {
          background: rgba(255, 255, 255, 0.08) !important;
        }

        /* ── Opaque cards with enhanced shadow for depth ── */
        .parallax-section .feature-card {
          background-color: rgba(255,255,255,0.95) !important;
          box-shadow: 0 4px 24px rgba(0,0,0,0.15) !important;
          border-radius: 12px !important;
          border: 1px solid rgba(255,255,255,0.3) !important;
          transition: transform 0.3s ease, box-shadow 0.3s ease !important;
        }
        .parallax-section .feature-card:hover {
          transform: translateY(-4px) !important;
          box-shadow: 0 12px 32px rgba(0,0,0,0.2) !important;
        }

        .parallax-section .faq-item {
          background-color: rgba(255,255,255,0.95) !important;
          box-shadow: 0 2px 16px rgba(0,0,0,0.1) !important;
          border-radius: 12px !important;
          border: 1px solid rgba(255,255,255,0.3) !important;
        }

        .parallax-section .product-card {
          background-color: rgba(255,255,255,0.95) !important;
          box-shadow: 0 4px 24px rgba(0,0,0,0.15) !important;
        }

        /* Edit mode add-buttons on dark bg */
        .parallax-section .add-card-btn,
        .parallax-section .add-testimonial-btn {
          border-color: rgba(255,255,255,0.3) !important;
          color: rgba(255,255,255,0.7) !important;
        }
        .parallax-section .add-card-btn svg,
        .parallax-section .add-testimonial-btn svg {
          stroke: rgba(255,255,255,0.5) !important;
        }
        .parallax-section .add-card-btn span,
        .parallax-section .add-testimonial-btn span {
          color: rgba(255,255,255,0.7) !important;
        }

        /* CTA pill hover */
        .parallax-cta:hover {
          opacity: 0.9;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.24) !important;
        }

        /* Scroll indicator bounce animation */
        @keyframes parallaxBounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(10px); }
        }

        @media (max-width: 768px) {
          .parallax-hero {
            min-height: 80vh !important;
          }
          .parallax-section {
            padding: 64px 0 !important;
          }
          .parallax-scroll-indicator {
            display: none !important;
          }
          .parallax-about-layout {
            flex-direction: column !important;
          }
          .parallax-about-image-col {
            width: 100% !important;
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
          .parallax-editable:focus {
            background: rgba(0, 0, 0, 0.04) !important;
          }
          .parallax-editable:hover:not(:focus) {
            background: rgba(0, 0, 0, 0.02);
          }
          .parallax-editable-light:focus {
            background: rgba(255, 255, 255, 0.15) !important;
          }
          .parallax-editable-light:hover:not(:focus) {
            background: rgba(255, 255, 255, 0.08);
          }
        `
            : ""
        }
      `}</style>

      {/* ── Background layer: 100vh pinned to viewport, pans left→right ── */}
      <div
        ref={bgRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "100vh",
          willChange: "transform",
          zIndex: 0,
          ...(hasImage
            ? {
                backgroundImage: `url(${backgroundImage})`,
                backgroundPosition: `0% ${bgPositionY}`,
                backgroundSize: `auto ${imageZoom || 100}%`,
                backgroundRepeat: "no-repeat",
              }
            : {
                background:
                  "linear-gradient(135deg, var(--brand-800, #1a1a2e) 0%, var(--brand-900, #0f0f1a) 100%)",
              }),
        }}
      >
        {/* Dark overlay for readability */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: hasImage
              ? `linear-gradient(rgba(0,0,0,${overlayAlpha}), rgba(0,0,0,${overlayAlpha}))`
              : "rgba(0,0,0,0.15)",
          }}
        />
      </div>

      {/* ── Content layer ── */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Hero Section */}
        {config.heroEnabled !== false && (
          <div
            ref={toolbar.sectionRef}
            className="parallax-hero"
            style={{
              position: "relative",
              minHeight: "100vh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              paddingTop: `${padTop}px`,
              paddingBottom: `${padBottom}px`,
              paddingLeft: "8%",
              paddingRight: "8%",
              ...(isEditing && toolbar.sectionSelected ? selectedOutline : {}),
            }}
            onClick={toolbar.handleSectionClick}
          >
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
                  hasBackgroundImage={hasImage}
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

            {/* Content */}
            <div
              style={{
                position: "relative",
                zIndex: 2,
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
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
                    editableClassName="parallax-editable-light"
                    maxWidth={h?.titleMaxWidth ?? DEFAULT_TITLE_MW}
                    onMaxWidthChange={toolbar.onTitleMaxWidthChange}
                    selected={toolbar.titleSelected}
                    onSelect={(e) => toolbar.handleTitleClick(e!)}
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
                    editableClassName="parallax-editable-light"
                    maxWidth={h?.subtitleMaxWidth ?? DEFAULT_SUBTITLE_MW}
                    onMaxWidthChange={toolbar.onSubtitleMaxWidthChange}
                    selected={toolbar.subtitleSelected}
                    onSelect={(e) => toolbar.handleSubtitleClick(e!)}
                    toolbarProps={{
                      fontSize: h?.subtitleFontSize || 18,
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
                      className="parallax-cta"
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
                      className="parallax-cta"
                      onClick={onButtonClick}
                    >
                      {button.label}
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Scroll indicator */}
            <div
              className="parallax-scroll-indicator"
              style={{
                position: "absolute",
                bottom: "32px",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 2,
                animation: "parallaxBounce 2s ease-in-out infinite",
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--brand-500, #667eea)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>
        )}

        {/* Sections (transparent bg, only cards opaque) */}
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
    </div>
  );
}
