"use client";

import type { HeroTemplateProps } from "./types";
import type { WidgetBrandConfig } from "../widgets/types";
import { getHarmonyColors } from "@/lib/colorPalette";
import {
  // Testimonials
  TestimonialsCardMatrix3x2,
  TestimonialsSolidCards,
  TestimonialsAnimatedSingleCard,
  TestimonialsAnimatedScrambledCards,
  TestimonialsCardUnevenGrid,
  TestimonialsAnimatedCardScroll,
  // Products
  ProductsStaticVertical,
  ProductsStaticEcom,
  ProductsStaticHorizontal,
  // Hero
  HeroVideoHorizontal,
  HeroStatsBoxes,
  HeroPovCards,
  HeroDoctorProfile,
  HeroVerticalImageScroll,
  HeroThroughTheTear,
} from "../widgets";
import FooterSection from "./FooterSection";

const SCOPE = "tpl-playground";

/**
 * Build WidgetBrandConfig from the template props.
 * Derives secondary/highlight from the palette's harmony type when not stored.
 */
function buildBrand(props: HeroTemplateProps): WidgetBrandConfig {
  const palette = props.config.theme?.palette;
  const primaryColor =
    palette?.[500] || props.config.theme?.primaryColor || "#6366f1";

  // Compute secondary: use stored value, or derive from harmony, or fall back to palette[100]
  let secondaryColor = palette?.secondary;
  if (!secondaryColor && palette?.harmonyType) {
    secondaryColor = getHarmonyColors(
      primaryColor,
      palette.harmonyType,
    ).secondary;
  }
  if (!secondaryColor) {
    secondaryColor = palette?.[100];
  }

  return {
    primaryColor,
    secondaryColor,
    headerFont: props.config.theme?.headerFont?.family,
    bodyFont: props.config.theme?.bodyFont?.family,
  };
}

/**
 * Playground Template
 *
 * A clean, minimal template designed for previewing widgets and tenant data.
 * Reads heroWidgetId and section widgetId from config to dynamically
 * select which widget variant renders for each section.
 */
export default function PlaygroundTemplate(props: HeroTemplateProps) {
  const { config, tenantData, products, currency } = props;
  const brand = buildBrand(props);

  const sections = config.sections || [];
  const enabledSections = sections.filter((s) => s.enabled);

  /** Get widgetId for a section, falling back to first widget in catalogue. */
  const getWidgetId = (sectionId: string): string | undefined =>
    sections.find((s) => s.id === sectionId)?.widgetId;

  /** Common hero props passed to all hero widgets. */
  const heroProps = {
    title: config.title,
    subtitle: config.subtitle,
    buttonLabel: config.button?.label,
    brand,
    onButtonClick: props.onButtonClick,
  };

  /** Render the selected hero widget. */
  const renderHero = () => {
    const widgetId = config.heroWidgetId || "video-horizontal";
    switch (widgetId) {
      case "stats-boxes":
        return <HeroStatsBoxes {...heroProps} />;
      case "pov-cards":
        return <HeroPovCards {...heroProps} />;
      case "doctor-profile":
        return <HeroDoctorProfile {...heroProps} />;
      case "vertical-image-scroll":
        return <HeroVerticalImageScroll {...heroProps} products={products} />;
      case "through-the-tear":
        return <HeroThroughTheTear {...heroProps} />;
      case "video-horizontal":
      default:
        return <HeroVideoHorizontal {...heroProps} />;
    }
  };

  /** Common product props. */
  const productProps = {
    products: products || [],
    heading: config.productsConfig?.heading || "Services",
    subheading: config.productsConfig?.subheading,
    brand,
    currency,
    onBookProduct: props.onBookProduct,
    onSignupWebinar: props.onSignupWebinar,
  };

  /** Render the selected products widget. */
  const renderProducts = () => {
    const widgetId = getWidgetId("products") || "static-vertical";
    switch (widgetId) {
      case "static-ecom":
        return <ProductsStaticEcom {...productProps} />;
      case "static-horizontal":
        return <ProductsStaticHorizontal {...productProps} />;
      case "static-vertical":
      default:
        return <ProductsStaticVertical {...productProps} />;
    }
  };

  /** Common testimonial props. */
  const testimonialProps = {
    testimonials: config.testimonials?.testimonials || [],
    heading: config.testimonials?.heading || "What People Say",
    subheading: config.testimonials?.subheading,
    brand,
  };

  /** Render the selected testimonials widget. */
  const renderTestimonials = () => {
    const widgetId = getWidgetId("testimonials") || "card-matrix-3x2";
    switch (widgetId) {
      case "solid-cards":
        return <TestimonialsSolidCards {...testimonialProps} />;
      case "animated-single-card":
        return <TestimonialsAnimatedSingleCard {...testimonialProps} />;
      case "animated-scrambled-cards":
        return <TestimonialsAnimatedScrambledCards {...testimonialProps} />;
      case "card-uneven-grid":
        return <TestimonialsCardUnevenGrid {...testimonialProps} />;
      case "animated-card-scroll":
        return <TestimonialsAnimatedCardScroll {...testimonialProps} />;
      case "card-matrix-3x2":
      default:
        return <TestimonialsCardMatrix3x2 {...testimonialProps} />;
    }
  };

  return (
    <div className={SCOPE}>
      <style>{`
        .${SCOPE} {
          font-family: ${brand.bodyFont || "'system-ui', sans-serif"};
          color: #1a1a1a;
        }
        .${SCOPE}-section {
          padding: 64px 24px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .${SCOPE}-section-heading {
          font-size: clamp(1.5rem, 3vw, 2rem);
          font-weight: 700;
          margin: 0 0 8px;
          font-family: ${brand.headerFont || "inherit"};
        }
        .${SCOPE}-section-subheading {
          font-size: 1rem;
          color: #6b7280;
          margin: 0 0 32px;
        }

        /* About */
        .${SCOPE}-about {
          display: flex;
          gap: 48px;
          align-items: center;
        }
        .${SCOPE}-about-img {
          width: 280px;
          height: 280px;
          border-radius: 16px;
          object-fit: cover;
          flex-shrink: 0;
        }
        .${SCOPE}-about-text {
          flex: 1;
          font-size: 1.05rem;
          line-height: 1.75;
          color: #374151;
        }
        .${SCOPE}-about-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 0 16px;
          font-family: ${brand.headerFont || "inherit"};
        }

        /* Alternating section backgrounds */
        .${SCOPE}-bg-gray {
          background: #f9fafb;
        }

        @media (max-width: 768px) {
          .${SCOPE}-about {
            flex-direction: column;
          }
          .${SCOPE}-about-img {
            width: 100%;
            height: 240px;
          }
          .${SCOPE}-section {
            padding: 48px 16px;
          }
        }
      `}</style>

      {/* Hero — dynamic widget */}
      {config.heroEnabled !== false && renderHero()}

      {/* Render enabled sections in order */}
      {enabledSections.map((section) => {
        switch (section.id) {
          case "about":
            return config.about ? (
              <div key="about" className={`${SCOPE}-section`}>
                <div className={`${SCOPE}-about`}>
                  {config.about.image && (
                    // eslint-disable-next-line @next/next/no-img-element -- playground template
                    <img
                      className={`${SCOPE}-about-img`}
                      src={config.about.image}
                      alt={config.about.title || "About"}
                    />
                  )}
                  <div>
                    {config.about.title && (
                      <h2 className={`${SCOPE}-about-title`}>
                        {config.about.title}
                      </h2>
                    )}
                    <p className={`${SCOPE}-about-text`}>
                      {config.about.paragraph}
                    </p>
                  </div>
                </div>
              </div>
            ) : null;

          case "products":
            return products && products.length > 0 ? (
              <div key="products">{renderProducts()}</div>
            ) : null;

          case "testimonials":
            return config.testimonials &&
              config.testimonials.testimonials.length > 0 ? (
              <div key="testimonials">{renderTestimonials()}</div>
            ) : null;

          case "faq":
            return config.faq && config.faq.items.length > 0 ? (
              <div key="faq" className={`${SCOPE}-bg-gray`}>
                <div className={`${SCOPE}-section`}>
                  <h2 className={`${SCOPE}-section-heading`}>
                    {config.faq.heading || "FAQ"}
                  </h2>
                  {config.faq.subheading && (
                    <p className={`${SCOPE}-section-subheading`}>
                      {config.faq.subheading}
                    </p>
                  )}
                  {config.faq.items.map((item) => (
                    <details
                      key={item.id}
                      style={{
                        marginBottom: 12,
                        borderBottom: "1px solid #e5e7eb",
                        paddingBottom: 12,
                      }}
                    >
                      <summary
                        style={{
                          fontWeight: 600,
                          cursor: "pointer",
                          fontSize: "1.05rem",
                          padding: "8px 0",
                        }}
                      >
                        {item.question}
                      </summary>
                      <p
                        style={{
                          color: "#374151",
                          lineHeight: 1.7,
                          paddingTop: 8,
                        }}
                      >
                        {item.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            ) : null;

          default:
            return null;
        }
      })}

      {/* Footer */}
      {config.footerEnabled !== false && config.footer && (
        <FooterSection footer={config.footer} tenantData={tenantData} />
      )}
    </div>
  );
}
