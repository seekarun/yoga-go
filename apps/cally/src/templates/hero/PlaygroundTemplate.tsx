"use client";

import { useCallback } from "react";
import type { HeroTemplateProps } from "./types";
import type {
  BrandButtonStyle,
  CustomFontType,
  HeroStyleOverrides,
  SectionStyleOverrides,
  AboutStyleOverrides,
  ProductsStyleOverrides,
} from "@/types/landing-page";
import type {
  WidgetBrandConfig,
  WidgetButtonStyle,
  WidgetCardStyle,
} from "../widgets/types";
import {
  getHarmonyColors,
  getContrastColor,
  resolveColorRef,
} from "@/lib/colorPalette";
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
  // Features
  FeaturesUnevenGrid,
  FeaturesSimpleGrid,
  // FAQ
  FaqClassicCollapsible,
  // About
  AboutLeftImage,
  AboutLeftVideo,
} from "../widgets";
import FooterSection from "./FooterSection";
import { BrandColorsProvider } from "./CustomColorsContext";

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

  const cc = props.config.customColors;
  const rc = (v: string | undefined, fb: string) =>
    resolveColorRef(v, palette, cc, fb);

  const resolveBtn = (
    raw: BrandButtonStyle | undefined,
    fallbackFill: string,
    fallbackText: string,
  ): WidgetButtonStyle => ({
    fillColor: rc(raw?.fillColor, fallbackFill),
    textColor: rc(raw?.textColor, fallbackText),
    borderColor: rc(raw?.borderColor, "transparent"),
    borderWidth: raw?.borderWidth ?? 0,
    borderRadius: raw?.borderRadius ?? 8,
  });

  return {
    primaryColor,
    secondaryColor,
    headerFont: props.config.theme?.headerFont?.family,
    headerFontSize: props.config.theme?.headerFont?.size,
    subHeaderFont: props.config.theme?.subHeaderFont?.family,
    subHeaderFontSize: props.config.theme?.subHeaderFont?.size,
    headerFontWeight: props.config.theme?.headerFont?.weight,
    subHeaderFontWeight: props.config.theme?.subHeaderFont?.weight,
    bodyFont: props.config.theme?.bodyFont?.family,
    bodyFontSize: props.config.theme?.bodyFont?.size,
    bodyFontWeight: props.config.theme?.bodyFont?.weight,
    headerFontColor: rc(props.config.theme?.headerFont?.color, "#1a1a1a"),
    subHeaderFontColor: rc(props.config.theme?.subHeaderFont?.color, "#1a1a1a"),
    bodyFontColor: rc(props.config.theme?.bodyFont?.color, "#1a1a1a"),
    primaryButton: resolveBtn(
      props.config.theme?.primaryButton,
      primaryColor,
      getContrastColor(primaryColor),
    ),
    secondaryButton: resolveBtn(
      props.config.theme?.secondaryButton,
      "transparent",
      primaryColor,
    ),
    cardStyle: props.config.theme?.cardStyle
      ? ({
          borderRadius: props.config.theme.cardStyle.borderRadius ?? 20,
          padding: props.config.theme.cardStyle.padding ?? 28,
          margin: props.config.theme.cardStyle.margin ?? 16,
          bgColor: rc(props.config.theme.cardStyle.bgColor, ""),
        } as WidgetCardStyle)
      : undefined,
    customFontTypes: props.config.customFontTypes,
  };
}

/**
 * Resolve colour-ref strings in hero style overrides so widgets get plain hex.
 */
function resolveHeroOverrides(
  o: HeroStyleOverrides | undefined,
  rc: (v: string | undefined, fb: string) => string,
): HeroStyleOverrides | undefined {
  if (!o) return o;
  return {
    ...o,
    bgColor: o.bgColor ? rc(o.bgColor, "") || undefined : undefined,
  };
}

/**
 * Resolve colour-ref strings in section style overrides.
 */
function resolveSectionOverrides(
  o: SectionStyleOverrides | undefined,
  rc: (v: string | undefined, fb: string) => string,
): SectionStyleOverrides | undefined {
  if (!o) return o;
  return {
    ...o,
    bgColor: o.bgColor ? rc(o.bgColor, "") || undefined : undefined,
  };
}

/**
 * Resolve colour-ref strings in about style overrides.
 */
function resolveAboutOverrides(
  o: AboutStyleOverrides | undefined,
  rc: (v: string | undefined, fb: string) => string,
): AboutStyleOverrides | undefined {
  if (!o) return o;
  return {
    ...o,
    bgColor: o.bgColor ? rc(o.bgColor, "") || undefined : undefined,
  };
}

/**
 * Resolve colour-ref strings in products style overrides.
 */
function resolveProductsOverrides(
  o: ProductsStyleOverrides | undefined,
  rc: (v: string | undefined, fb: string) => string,
): ProductsStyleOverrides | undefined {
  if (!o) return o;
  return {
    ...o,
    bgColor: o.bgColor ? rc(o.bgColor, "") || undefined : undefined,
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
  const { config, tenantData, products, currency, onCustomFontTypesChange } =
    props;
  const brand = buildBrand(props);

  const handleAddCustomFontType = useCallback(
    (ft: CustomFontType) => {
      const existing = config.customFontTypes ?? [];
      onCustomFontTypesChange?.([...existing, ft]);
    },
    [config.customFontTypes, onCustomFontTypesChange],
  );

  /** Resolve colour references to hex for display. */
  const rc = (v: string | undefined, fb: string) =>
    resolveColorRef(v, config.theme?.palette, config.customColors, fb);

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
    isEditing: props.isEditing,
    styleOverrides: resolveHeroOverrides(config.heroStyleOverrides, rc),
    onTitleChange: props.onTitleChange,
    onSubtitleChange: props.onSubtitleChange,
    onStyleOverrideChange: props.onHeroStyleOverrideChange,
    onAddCustomFontType: handleAddCustomFontType,
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

  /** Common about props (data + editing callbacks). */
  const aboutProps = {
    title: config.about?.title,
    paragraph: config.about?.paragraph,
    image: config.about?.image,
    imagePosition: config.about?.imagePosition,
    imageZoom: config.about?.imageZoom,
    styleOverrides: resolveAboutOverrides(config.about?.styleOverrides, rc),
    brand,
    isEditing: props.isEditing,
    onTitleChange: props.onAboutTitleChange,
    onParagraphChange: props.onAboutParagraphChange,
    onImageClick: props.onAboutImageClick,
    onImagePositionChange: props.onAboutImagePositionChange,
    onImageZoomChange: props.onAboutImageZoomChange,
    onStyleOverrideChange: props.onAboutStyleOverrideChange,
    onAddCustomFontType: handleAddCustomFontType,
  };

  /** Render the selected about widget. */
  const renderAbout = () => {
    const widgetId = getWidgetId("about") || "left-image";
    switch (widgetId) {
      case "left-video":
        return <AboutLeftVideo {...aboutProps} />;
      case "left-image":
      default:
        return <AboutLeftImage {...aboutProps} />;
    }
  };

  /** Common features props. */
  const featuresProps = {
    heading: config.features?.heading,
    subheading: config.features?.subheading,
    cards: config.features?.cards || [],
    brand,
    isEditing: props.isEditing,
    styleOverrides: resolveSectionOverrides(
      config.features?.styleOverrides,
      rc,
    ),
    onHeadingChange: props.onFeaturesHeadingChange,
    onSubheadingChange: props.onFeaturesSubheadingChange,
    onStyleOverrideChange: props.onFeaturesStyleOverrideChange,
    onCardChange: props.onFeatureCardChange,
    onCardImageClick: props.onFeatureCardImageClick,
    onCardImagePositionChange: props.onFeatureCardImagePositionChange,
    onCardImageZoomChange: props.onFeatureCardImageZoomChange,
    onCardStyleChange: props.onFeatureCardStyleChange,
    onAddCustomFontType: handleAddCustomFontType,
  };

  /** Render the selected features widget. */
  const renderFeatures = () => {
    const widgetId = getWidgetId("features") || "uneven-grid";
    switch (widgetId) {
      case "simple-grid":
        return <FeaturesSimpleGrid {...featuresProps} />;
      case "uneven-grid":
      default:
        return <FeaturesUnevenGrid {...featuresProps} />;
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
    isEditing: props.isEditing,
    styleOverrides: resolveProductsOverrides(
      config.productsConfig?.styleOverrides,
      rc,
    ),
    cardStyles: config.productsConfig?.cardStyles,
    onHeadingChange: props.onProductsHeadingChange,
    onSubheadingChange: props.onProductsSubheadingChange,
    onStyleOverrideChange: props.onProductsStyleOverrideChange,
    onCardStyleChange: props.onProductCardStyleChange,
    onAddCustomFontType: handleAddCustomFontType,
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
    isEditing: props.isEditing,
    styleOverrides: resolveSectionOverrides(
      config.testimonials?.styleOverrides,
      rc,
    ),
    onHeadingChange: props.onTestimonialsHeadingChange,
    onSubheadingChange: props.onTestimonialsSubheadingChange,
    onStyleOverrideChange: props.onTestimonialsStyleOverrideChange,
    onAddCustomFontType: handleAddCustomFontType,
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

  /** Common FAQ props. */
  const faqProps = {
    heading: config.faq?.heading || "FAQ",
    subheading: config.faq?.subheading,
    items: config.faq?.items || [],
    brand,
    isEditing: props.isEditing,
    styleOverrides: resolveSectionOverrides(config.faq?.styleOverrides, rc),
    onHeadingChange: props.onFAQHeadingChange,
    onSubheadingChange: props.onFAQSubheadingChange,
    onStyleOverrideChange: props.onFAQStyleOverrideChange,
    onAddCustomFontType: handleAddCustomFontType,
  };

  /** Render the selected FAQ widget. */
  const renderFaq = () => {
    const widgetId = getWidgetId("faq") || "classic-collapsible";
    switch (widgetId) {
      case "classic-collapsible":
      default:
        return <FaqClassicCollapsible {...faqProps} />;
    }
  };

  return (
    <BrandColorsProvider
      palette={config.theme?.palette}
      customColors={config.customColors || []}
      onCustomColorsChange={props.onCustomColorsChange}
    >
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
          font-size: ${brand.subHeaderFontSize ? `${brand.subHeaderFontSize}px` : "clamp(1.5rem, 3vw, 2rem)"};
          font-weight: 700;
          margin: 0 0 8px;
          font-family: ${brand.subHeaderFont || brand.headerFont || "inherit"};
          ${brand.subHeaderFontColor ? `color: ${brand.subHeaderFontColor};` : ""}
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
          font-size: ${brand.subHeaderFontSize ? `${brand.subHeaderFontSize}px` : "clamp(1.25rem, 3vw, 1.5rem)"};
          font-weight: 700;
          margin: 0 0 16px;
          font-family: ${brand.subHeaderFont || brand.headerFont || "inherit"};
          ${brand.subHeaderFontColor ? `color: ${brand.subHeaderFontColor};` : ""}
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
                <div key="about">{renderAbout()}</div>
              ) : null;

            case "features":
              return config.features && config.features.cards.length > 0 ? (
                <div key="features">{renderFeatures()}</div>
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
                <div key="faq">{renderFaq()}</div>
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
    </BrandColorsProvider>
  );
}
