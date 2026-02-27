"use client";

import type { HeroTemplateProps } from "./types";
import type { WidgetBrandConfig } from "../widgets/types";
import { getHarmonyColors } from "@/lib/colorPalette";
import {
  TestimonialsAnimatedCardScroll,
  ProductsStaticHorizontal,
  HeroVerticalImageScroll,
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
 * Renders each section in a simple format — hero as a header band,
 * about as text, products as cards, and testimonials using the
 * "3x2 Card Matrix" widget.
 *
 * All sections are responsive and styled using the tenant's brand.
 */
export default function PlaygroundTemplate(props: HeroTemplateProps) {
  const { config, tenantData, products, currency } = props;
  const brand = buildBrand(props);

  const sections = config.sections || [];
  const enabledSections = sections.filter((s) => s.enabled).map((s) => s.id);

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

      {/* Hero — uses widget */}
      {config.heroEnabled !== false && (
        <HeroVerticalImageScroll
          title={config.title}
          subtitle={config.subtitle}
          buttonLabel={config.button?.label}
          brand={brand}
          onButtonClick={props.onButtonClick}
          products={products}
        />
      )}

      {/* About */}
      {enabledSections.includes("about") && config.about && (
        <div className={`${SCOPE}-section`}>
          <div className={`${SCOPE}-about`}>
            {config.about.image && (
              // eslint-disable-next-line @next/next/no-img-element -- playground template, simple rendering
              <img
                className={`${SCOPE}-about-img`}
                src={config.about.image}
                alt={config.about.title || "About"}
              />
            )}
            <div>
              {config.about.title && (
                <h2 className={`${SCOPE}-about-title`}>{config.about.title}</h2>
              )}
              <p className={`${SCOPE}-about-text`}>{config.about.paragraph}</p>
            </div>
          </div>
        </div>
      )}

      {/* Products — uses widget */}
      {enabledSections.includes("products") &&
        products &&
        products.length > 0 && (
          <ProductsStaticHorizontal
            products={products}
            heading={config.productsConfig?.heading || "Services"}
            subheading={config.productsConfig?.subheading}
            brand={brand}
            currency={currency}
            onBookProduct={props.onBookProduct}
            onSignupWebinar={props.onSignupWebinar}
          />
        )}

      {/* Testimonials — uses widget */}
      {enabledSections.includes("testimonials") &&
        config.testimonials &&
        config.testimonials.testimonials.length > 0 && (
          <TestimonialsAnimatedCardScroll
            testimonials={config.testimonials.testimonials}
            heading={config.testimonials.heading || "What People Say"}
            subheading={config.testimonials.subheading}
            brand={brand}
          />
        )}

      {/* FAQ */}
      {enabledSections.includes("faq") &&
        config.faq &&
        config.faq.items.length > 0 && (
          <div className={`${SCOPE}-bg-gray`}>
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
        )}

      {/* Footer */}
      {config.footerEnabled !== false && config.footer && (
        <FooterSection footer={config.footer} tenantData={tenantData} />
      )}
    </div>
  );
}
