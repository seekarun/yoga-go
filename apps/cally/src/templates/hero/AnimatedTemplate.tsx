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

/**
 * Animated Template
 * Scroll-triggered fade-in animations with smooth element transitions.
 * Uses Approach 2 (custom layout, bypasses SectionsRenderer).
 *
 * Each section fades into view as the user scrolls:
 * - Hero: title/subtitle/CTA fade up on page load (CSS keyframes)
 * - About: image from left, text from right
 * - Features/Products/Testimonials/Gallery cards: from right (staggered)
 * - FAQ items: from bottom (staggered)
 * - Location: from bottom
 * - Footer: no animation
 *
 * Typography: Inter via Google Fonts, clean modern sans-serif.
 * All sections have white backgrounds. Animations are the signature.
 *
 * Edit mode: all animations disabled, elements fully visible.
 */

const DEFAULT_TITLE_MW = 900;
const DEFAULT_SUBTITLE_MW = 600;

/** Find the nearest scrollable ancestor (for editor preview compatibility) */
function findScrollParent(el: HTMLElement): HTMLElement | null {
  let parent = el.parentElement;
  while (parent) {
    const { overflow, overflowY } = getComputedStyle(parent);
    if (/(auto|scroll)/.test(overflow + overflowY)) return parent;
    parent = parent.parentElement;
  }
  return null;
}

export default function AnimatedTemplate(props: HeroTemplateProps) {
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

  const DEFAULT_OVERLAY = 50;
  const overlayAlpha = (h?.overlayOpacity ?? DEFAULT_OVERLAY) / 100;
  const padTop = h?.paddingTop ?? 80;
  const padBottom = h?.paddingBottom ?? 80;

  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const heroFadeRef = useRef<HTMLDivElement>(null);

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
  const interFont =
    '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  // --- IntersectionObserver for scroll-triggered animations ---
  useEffect(() => {
    if (isEditing) return; // No animations in edit mode

    const container = containerRef.current;
    if (!container) return;

    const scrollParent = findScrollParent(container);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, root: scrollParent || null },
    );

    container
      .querySelectorAll("[data-animate]")
      .forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [isEditing]);

  // --- Hero fade-to-white on scroll ---
  useEffect(() => {
    const hero = heroRef.current;
    const fade = heroFadeRef.current;
    if (!hero || !fade) return;

    const container = containerRef.current;
    const scrollParent = container ? findScrollParent(container) : null;
    const target: EventTarget = scrollParent || window;

    const onScroll = () => {
      const scrollY = scrollParent ? scrollParent.scrollTop : window.scrollY;
      const heroHeight = hero.offsetHeight;
      // Start fading at 20% through the hero, fully white by 80%
      const fadeStart = heroHeight * 0.2;
      const fadeRange = heroHeight * 0.6;
      const progress = Math.min(
        Math.max((scrollY - fadeStart) / fadeRange, 0),
        1,
      );
      fade.style.opacity = String(progress);
    };

    target.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => target.removeEventListener("scroll", onScroll);
  }, []);

  // --- Hero Styles ---
  const titleStyle: React.CSSProperties = {
    fontFamily:
      h?.titleFontFamily || config.theme?.headerFont?.family || interFont,
    fontSize: h?.titleFontSize
      ? `${h.titleFontSize}px`
      : "clamp(2.4rem, 5vw, 4.5rem)",
    fontWeight: h?.titleFontWeight === "normal" ? 400 : 700,
    fontStyle: h?.titleFontStyle || undefined,
    lineHeight: 1.1,
    color: h?.titleTextColor || "#fff",
    margin: 0,
    marginBottom: "20px",
    textAlign: h?.titleTextAlign || "center",
    textShadow: "0 2px 16px rgba(0,0,0,0.4)",
  };

  const subtitleStyle: React.CSSProperties = {
    fontFamily:
      h?.subtitleFontFamily || config.theme?.bodyFont?.family || interFont,
    fontSize: h?.subtitleFontSize
      ? `${h.subtitleFontSize}px`
      : "clamp(1rem, 1.5vw, 1.25rem)",
    fontWeight: h?.subtitleFontWeight === "bold" ? 700 : 400,
    fontStyle: h?.subtitleFontStyle || undefined,
    color: h?.subtitleTextColor || "rgba(255,255,255,0.9)",
    lineHeight: 1.7,
    margin: 0,
    marginBottom: "40px",
    textAlign: h?.subtitleTextAlign || "center",
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
    fontFamily: interFont,
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

  // --- Custom About Section ---
  const aboutSection = (() => {
    if (!config.about) return null;
    const about = config.about;
    const hasAboutImage = !!about.image;

    return (
      <div style={{ padding: "96px 8%", backgroundColor: "#fff" }}>
        <div
          style={{
            maxWidth: "1000px",
            margin: "0 auto",
            display: "flex",
            gap: "48px",
            alignItems: "center",
            flexWrap: "wrap" as const,
          }}
        >
          {/* Image - fades from left */}
          <div
            className="animated-about-image-col"
            data-animate={isEditing ? undefined : "from-left"}
            style={{
              flex: "0 0 auto",
              width: "40%",
              minWidth: "240px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {hasAboutImage ? (
              // eslint-disable-next-line @next/next/no-img-element -- custom animated about with object-fit
              <img
                src={about.image}
                alt="About"
                style={{
                  width: "100%",
                  maxWidth: "400px",
                  aspectRatio: "4/5",
                  borderRadius: "12px",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                  objectFit: "cover",
                  objectPosition: about.imagePosition || "50% 50%",
                  transform: `scale(${(about.imageZoom || 100) / 100})`,
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  maxWidth: "400px",
                  aspectRatio: "4/5",
                  borderRadius: "12px",
                  backgroundColor: "#f3f4f6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
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

          {/* Text - fades from right */}
          <div
            data-animate={isEditing ? undefined : "from-right"}
            style={{
              flex: 1,
              minWidth: "260px",
              transitionDelay: "0.15s",
            }}
          >
            <h2
              style={{
                fontFamily: interFont,
                fontSize: "clamp(1.5rem, 3vw, 2rem)",
                fontWeight: 700,
                color: "var(--brand-highlight, #1a1a1a)",
                marginBottom: "20px",
                marginTop: 0,
              }}
            >
              About Me
            </h2>

            {isEditing ? (
              <div
                className="animated-editable"
                contentEditable
                suppressContentEditableWarning
                style={{
                  fontSize: "1.1rem",
                  lineHeight: 1.8,
                  color: "#4b5563",
                  fontFamily: interFont,
                  cursor: "text",
                  outline: "none",
                  borderRadius: "8px",
                  padding: "12px",
                  transition: "background 0.2s, outline 0.2s",
                }}
                onBlur={(e) =>
                  onAboutParagraphChange?.(e.currentTarget.textContent || "")
                }
              >
                {about.paragraph}
              </div>
            ) : (
              <p
                style={{
                  fontSize: "1.1rem",
                  lineHeight: 1.8,
                  color: "#4b5563",
                  fontFamily: interFont,
                  margin: 0,
                }}
              >
                {about.paragraph}
              </p>
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
    let element: React.ReactNode = null;

    switch (section.id) {
      case "about":
        element = config.about ? <div key="about">{aboutSection}</div> : null;
        break;

      case "features":
        element =
          config.features && config.features.cards.length > 0 ? (
            <div
              key="features"
              className="animated-section"
              data-animate={isEditing ? undefined : "from-right"}
              style={{ padding: "96px 0", backgroundColor: "#fff" }}
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
              className="animated-section"
              data-animate={isEditing ? undefined : "from-right"}
              style={{ padding: "96px 0", backgroundColor: "#fff" }}
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
            className="animated-section"
            data-animate={isEditing ? undefined : "from-right"}
            style={{ padding: "96px 0", backgroundColor: "#fff" }}
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
          <div
            key="faq"
            className="animated-section"
            data-animate={isEditing ? undefined : "from-bottom"}
            style={{ padding: "96px 0", backgroundColor: "#fff" }}
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
        break;

      case "location":
        element = config.location ? (
          <div
            key="location"
            data-animate={isEditing ? undefined : "from-bottom"}
            style={{ padding: "96px 0", backgroundColor: "#fff" }}
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
        break;

      case "gallery":
        element = config.gallery ? (
          <div
            key="gallery"
            className="animated-section"
            data-animate={isEditing ? undefined : "from-right"}
            style={{ padding: "96px 0", backgroundColor: "#fff" }}
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
        fontFamily: interFont,
        backgroundColor: "#ffffff",
      }}
    >
      {/* Google Fonts + CSS for animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        /* ── Hero fade-up keyframes ── */
        @keyframes heroFadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animated-hero-title    { animation: heroFadeUp 0.8s ease-out 0.2s both; }
        .animated-hero-subtitle { animation: heroFadeUp 0.8s ease-out 0.5s both; }
        .animated-hero-cta      { animation: heroFadeUp 0.8s ease-out 0.8s both; }

        /* ── Scroll-triggered animation: initial hidden states ── */
        [data-animate="from-left"]  { opacity: 0; transform: translateX(-80px); }
        [data-animate="from-right"] { opacity: 0; transform: translateX(80px); }
        [data-animate="from-bottom"]{ opacity: 0; transform: translateY(40px); }
        [data-animate="fade"]       { opacity: 0; }

        /* ── Revealed state ── */
        .is-visible[data-animate] {
          opacity: 1 !important;
          transform: none !important;
        }

        /* ── Transition ── */
        [data-animate] {
          transition: opacity 0.7s ease-out, transform 0.7s ease-out;
        }

        /* ── Staggered child animations for section components ── */
        /* Features cards */
        .animated-section[data-animate="from-right"] .feature-card {
          opacity: 0;
          transform: translateX(80px);
          transition: opacity 0.7s ease-out, transform 0.7s ease-out;
        }
        .animated-section.is-visible .feature-card {
          opacity: 1;
          transform: none;
        }
        .animated-section.is-visible .feature-card:nth-child(1) { transition-delay: 0s; }
        .animated-section.is-visible .feature-card:nth-child(2) { transition-delay: 0.15s; }
        .animated-section.is-visible .feature-card:nth-child(3) { transition-delay: 0.3s; }
        .animated-section.is-visible .feature-card:nth-child(4) { transition-delay: 0.45s; }
        .animated-section.is-visible .feature-card:nth-child(5) { transition-delay: 0.6s; }
        .animated-section.is-visible .feature-card:nth-child(6) { transition-delay: 0.75s; }

        /* FAQ items */
        .animated-section[data-animate="from-bottom"] .faq-item {
          opacity: 0;
          transform: translateY(40px);
          transition: opacity 0.7s ease-out, transform 0.7s ease-out;
        }
        .animated-section.is-visible .faq-item {
          opacity: 1;
          transform: none;
        }
        .animated-section.is-visible .faq-item:nth-child(1) { transition-delay: 0s; }
        .animated-section.is-visible .faq-item:nth-child(2) { transition-delay: 0.15s; }
        .animated-section.is-visible .faq-item:nth-child(3) { transition-delay: 0.3s; }
        .animated-section.is-visible .faq-item:nth-child(4) { transition-delay: 0.45s; }
        .animated-section.is-visible .faq-item:nth-child(5) { transition-delay: 0.6s; }
        .animated-section.is-visible .faq-item:nth-child(6) { transition-delay: 0.75s; }

        /* Product cards */
        .animated-section .product-card {
          opacity: 0;
          transform: translateX(80px);
          transition: opacity 0.7s ease-out, transform 0.7s ease-out;
        }
        .animated-section.is-visible .product-card {
          opacity: 1;
          transform: none;
        }
        .animated-section.is-visible .product-card:nth-child(1) { transition-delay: 0s; }
        .animated-section.is-visible .product-card:nth-child(2) { transition-delay: 0.15s; }
        .animated-section.is-visible .product-card:nth-child(3) { transition-delay: 0.3s; }
        .animated-section.is-visible .product-card:nth-child(4) { transition-delay: 0.45s; }
        .animated-section.is-visible .product-card:nth-child(5) { transition-delay: 0.6s; }
        .animated-section.is-visible .product-card:nth-child(6) { transition-delay: 0.75s; }

        /* Testimonial cards (carousel items) */
        .animated-section .testimonial-card {
          opacity: 0;
          transform: translateX(80px);
          transition: opacity 0.7s ease-out, transform 0.7s ease-out;
        }
        .animated-section.is-visible .testimonial-card {
          opacity: 1;
          transform: none;
        }
        .animated-section.is-visible .testimonial-card:nth-child(1) { transition-delay: 0s; }
        .animated-section.is-visible .testimonial-card:nth-child(2) { transition-delay: 0.15s; }
        .animated-section.is-visible .testimonial-card:nth-child(3) { transition-delay: 0.3s; }
        .animated-section.is-visible .testimonial-card:nth-child(4) { transition-delay: 0.45s; }

        /* Gallery cards */
        .animated-section .gallery-card {
          opacity: 0;
          transform: translateX(80px);
          transition: opacity 0.7s ease-out, transform 0.7s ease-out;
        }
        .animated-section.is-visible .gallery-card {
          opacity: 1;
          transform: none;
        }
        .animated-section.is-visible .gallery-card:nth-child(1) { transition-delay: 0s; }
        .animated-section.is-visible .gallery-card:nth-child(2) { transition-delay: 0.15s; }
        .animated-section.is-visible .gallery-card:nth-child(3) { transition-delay: 0.3s; }
        .animated-section.is-visible .gallery-card:nth-child(4) { transition-delay: 0.45s; }
        .animated-section.is-visible .gallery-card:nth-child(5) { transition-delay: 0.6s; }
        .animated-section.is-visible .gallery-card:nth-child(6) { transition-delay: 0.75s; }

        /* ── Section headings ── */
        .animated-section h2 {
          font-family: ${interFont} !important;
          color: var(--brand-highlight, #1a1a1a) !important;
        }

        /* ── Cards: white with subtle shadow ── */
        .animated-section .feature-card {
          background-color: #fff !important;
          box-shadow: 0 2px 16px rgba(0,0,0,0.06) !important;
          border-radius: 12px !important;
          transition: opacity 0.7s ease-out, transform 0.7s ease-out, box-shadow 0.3s ease !important;
        }
        .animated-section .feature-card:hover {
          box-shadow: 0 8px 24px rgba(0,0,0,0.1) !important;
        }

        /* CTA hover */
        .animated-cta:hover {
          opacity: 0.9;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.24) !important;
        }

        @media (max-width: 768px) {
          .animated-hero {
            min-height: 80vh !important;
          }
          .animated-about-layout {
            flex-direction: column !important;
          }
          .animated-about-image-col {
            width: 100% !important;
          }
        }

        ${
          isEditing
            ? `
          /* Edit mode: make all animated elements visible immediately */
          .animated-hero-title,
          .animated-hero-subtitle,
          .animated-hero-cta {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }

          [contenteditable]:focus {
            outline: none !important;
            border: none !important;
            box-shadow: none !important;
          }
          .animated-editable:focus {
            background: rgba(0, 0, 0, 0.04) !important;
          }
          .animated-editable:hover:not(:focus) {
            background: rgba(0, 0, 0, 0.02);
          }
          .animated-editable-light:focus {
            background: rgba(255, 255, 255, 0.15) !important;
          }
          .animated-editable-light:hover:not(:focus) {
            background: rgba(255, 255, 255, 0.08);
          }
        `
            : ""
        }
      `}</style>

      {/* ── Hero Section ── */}
      {config.heroEnabled !== false && (
        <div
          ref={(node) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- merging two refs
            (heroRef as any).current = node;
            toolbar.sectionRef.current = node;
          }}
          className="animated-hero"
          onClick={toolbar.handleSectionClick}
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
            overflow: "hidden",
            backgroundColor: h?.bgColor || undefined,
            ...(isEditing && toolbar.sectionSelected ? selectedOutline : {}),
          }}
        >
          {/* Background */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 0,
              ...(hasImage
                ? {
                    backgroundColor: "#000",
                    backgroundImage: `linear-gradient(rgba(0,0,0,${overlayAlpha}), rgba(0,0,0,${overlayAlpha})), url(${backgroundImage})`,
                    backgroundPosition: imagePosition || "50% 50%",
                    backgroundSize: "cover",
                    backgroundRepeat: "no-repeat",
                    transform: `scale(${(imageZoom || 100) / 100})`,
                  }
                : {
                    background:
                      "linear-gradient(135deg, var(--brand-800, #1a1a2e) 0%, var(--brand-900, #0f0f1a) 100%)",
                  }),
            }}
          />

          {/* White fade overlay — opacity driven by scroll */}
          <div
            ref={heroFadeRef}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1,
              background:
                "linear-gradient(to bottom, transparent 0%, #ffffff 100%)",
              opacity: 0,
              pointerEvents: "none",
            }}
          />

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
                  editableClassName="animated-editable-light"
                  innerClassName="animated-hero-title"
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
                  editableClassName="animated-editable-light"
                  innerClassName="animated-hero-subtitle"
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
                    className="animated-cta animated-hero-cta"
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
                  className="animated-hero-title"
                  style={{
                    ...titleStyle,
                    maxWidth: `${h?.titleMaxWidth ?? DEFAULT_TITLE_MW}px`,
                  }}
                >
                  {title}
                </h1>
                <p
                  className="animated-hero-subtitle"
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
                    className="animated-cta animated-hero-cta"
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

      {/* ── Sections ── */}
      {sectionElements}

      {/* ── Footer (no animation) ── */}
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
