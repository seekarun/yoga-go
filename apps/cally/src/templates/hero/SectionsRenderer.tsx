"use client";

import type {
  SimpleLandingPageConfig,
  AboutStyleOverrides,
  ProductsStyleOverrides,
  SectionStyleOverrides,
  BrandFont,
  TenantLandingPageData,
} from "@/types/landing-page";
import type { Product } from "@/types";
import AboutSection from "./AboutSection";
import FeaturesSection from "./FeaturesSection";
import ProductsSection from "./ProductsSection";
import TestimonialsSection from "./TestimonialsSection";
import FAQSection from "./FAQSection";
import LocationSection from "./LocationSection";
import GallerySection from "./GallerySection";
import FooterSection from "./FooterSection";

interface SectionsRendererProps {
  config: SimpleLandingPageConfig;
  tenantData?: TenantLandingPageData;
  isEditing?: boolean;
  variant?: "light" | "dark" | "gray";
  // About callbacks
  onAboutTitleChange?: (title: string) => void;
  onAboutParagraphChange?: (paragraph: string) => void;
  onAboutImageClick?: () => void;
  onAboutStyleOverrideChange?: (overrides: AboutStyleOverrides) => void;
  onAboutBgImageClick?: () => void;
  onAboutImagePositionChange?: (position: string) => void;
  onAboutImageZoomChange?: (zoom: number) => void;
  onCustomColorsChange?: (colors: { name: string; hex: string }[]) => void;
  // Features callbacks
  onFeaturesHeadingChange?: (heading: string) => void;
  onFeaturesSubheadingChange?: (subheading: string) => void;
  onFeatureCardChange?: (
    cardId: string,
    field: "title" | "description",
    value: string,
  ) => void;
  onFeatureCardImageClick?: (cardId: string) => void;
  onAddFeatureCard?: () => void;
  onRemoveFeatureCard?: (cardId: string) => void;
  // Background removal callbacks
  onAboutRemoveBgComplete?: (newUrl: string) => void;
  onFeatureCardRemoveBg?: (cardId: string, newUrl: string) => void;
  onFeaturesStyleOverrideChange?: (o: SectionStyleOverrides) => void;
  onFeaturesBgImageClick?: () => void;
  // Products data & callbacks
  products?: Product[];
  currency?: string;
  onBookProduct?: (productId: string) => void;
  onSignupWebinar?: (productId: string) => void;
  onProductsHeadingChange?: (heading: string) => void;
  onProductsSubheadingChange?: (subheading: string) => void;
  onProductsStyleOverrideChange?: (overrides: ProductsStyleOverrides) => void;
  onProductsBgImageClick?: () => void;
  // Testimonials callbacks
  onTestimonialsHeadingChange?: (heading: string) => void;
  onTestimonialsSubheadingChange?: (subheading: string) => void;
  onTestimonialChange?: (
    testimonialId: string,
    field: "quote" | "authorName" | "authorTitle",
    value: string,
  ) => void;
  onAddTestimonial?: () => void;
  onRemoveTestimonial?: (testimonialId: string) => void;
  onTestimonialsStyleOverrideChange?: (o: SectionStyleOverrides) => void;
  onTestimonialsBgImageClick?: () => void;
  // Location props & callbacks
  address?: string;
  onLocationHeadingChange?: (heading: string) => void;
  onLocationSubheadingChange?: (subheading: string) => void;
  onLocationStyleOverrideChange?: (o: SectionStyleOverrides) => void;
  onLocationBgImageClick?: () => void;
  // Gallery callbacks
  onGalleryHeadingChange?: (heading: string) => void;
  onGallerySubheadingChange?: (subheading: string) => void;
  onGalleryAddImage?: () => void;
  onGalleryRemoveImage?: (imageId: string) => void;
  onGalleryStyleOverrideChange?: (o: SectionStyleOverrides) => void;
  onGalleryBgImageClick?: () => void;
  // FAQ callbacks
  onFAQHeadingChange?: (heading: string) => void;
  onFAQSubheadingChange?: (subheading: string) => void;
  onFAQItemChange?: (
    itemId: string,
    field: "question" | "answer",
    value: string,
  ) => void;
  onAddFAQItem?: () => void;
  onRemoveFAQItem?: (itemId: string) => void;
  onFAQStyleOverrideChange?: (o: SectionStyleOverrides) => void;
  onFAQBgImageClick?: () => void;
  // Footer callbacks
  onFooterTextChange?: (text: string) => void;
  onFooterLinkChange?: (
    index: number,
    field: "label" | "url",
    value: string,
  ) => void;
  onAddFooterLink?: () => void;
  onRemoveFooterLink?: (index: number) => void;
  onFooterStyleOverrideChange?: (o: SectionStyleOverrides) => void;
  onFooterBgImageClick?: () => void;
}

export default function SectionsRenderer({
  config,
  tenantData,
  isEditing = false,
  variant = "light",
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
  onAboutRemoveBgComplete,
  onFeatureCardRemoveBg,
  onFeaturesStyleOverrideChange,
  onFeaturesBgImageClick,
  products,
  currency,
  onBookProduct,
  onSignupWebinar,
  onProductsHeadingChange,
  onProductsSubheadingChange,
  onProductsStyleOverrideChange,
  onProductsBgImageClick,
  address,
  onLocationHeadingChange,
  onLocationSubheadingChange,
  onLocationStyleOverrideChange,
  onLocationBgImageClick,
  onGalleryHeadingChange,
  onGallerySubheadingChange,
  onGalleryAddImage,
  onGalleryRemoveImage,
  onGalleryStyleOverrideChange,
  onGalleryBgImageClick,
  onTestimonialsHeadingChange,
  onTestimonialsSubheadingChange,
  onTestimonialChange,
  onAddTestimonial,
  onRemoveTestimonial,
  onTestimonialsStyleOverrideChange,
  onTestimonialsBgImageClick,
  onFAQHeadingChange,
  onFAQSubheadingChange,
  onFAQItemChange,
  onAddFAQItem,
  onRemoveFAQItem,
  onFAQStyleOverrideChange,
  onFAQBgImageClick,
  onFooterTextChange,
  onFooterLinkChange,
  onAddFooterLink,
  onRemoveFooterLink,
  onFooterStyleOverrideChange,
  onFooterBgImageClick,
}: SectionsRendererProps) {
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

  return (
    <>
      {sections
        .filter((s) => s.enabled)
        .map((section) => {
          switch (section.id) {
            case "about":
              return config.about ? (
                <div key="about" id="section-about">
                  <AboutSection
                    about={config.about}
                    tenantData={tenantData}
                    isEditing={isEditing}
                    variant={variant}
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
                <div key="features" id="section-features">
                  <FeaturesSection
                    features={config.features}
                    tenantData={tenantData}
                    isEditing={isEditing}
                    variant={variant}
                    brandFonts={brandFonts}
                    onHeadingChange={onFeaturesHeadingChange}
                    onSubheadingChange={onFeaturesSubheadingChange}
                    onCardChange={onFeatureCardChange}
                    onCardImageClick={onFeatureCardImageClick}
                    onAddCard={onAddFeatureCard}
                    onRemoveCard={onRemoveFeatureCard}
                    onCardRemoveBg={onFeatureCardRemoveBg}
                    onStyleOverrideChange={onFeaturesStyleOverrideChange}
                    onBgImageClick={onFeaturesBgImageClick}
                    palette={config.theme?.palette}
                    customColors={config.customColors}
                    onCustomColorsChange={onCustomColorsChange}
                  />
                </div>
              ) : null;

            case "products":
              return products && products.length > 0 ? (
                <div key="products" id="section-products">
                  <ProductsSection
                    products={products}
                    tenantData={tenantData}
                    currency={currency || "AUD"}
                    variant={variant}
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
                    onCustomColorsChange={onCustomColorsChange}
                    onBgImageClick={onProductsBgImageClick}
                  />
                </div>
              ) : null;

            case "testimonials":
              return config.testimonials ? (
                <div key="testimonials" id="section-testimonials">
                  <TestimonialsSection
                    testimonials={config.testimonials}
                    tenantData={tenantData}
                    isEditing={isEditing}
                    variant={variant}
                    brandFonts={brandFonts}
                    onHeadingChange={onTestimonialsHeadingChange}
                    onSubheadingChange={onTestimonialsSubheadingChange}
                    onTestimonialChange={onTestimonialChange}
                    onAddTestimonial={onAddTestimonial}
                    onRemoveTestimonial={onRemoveTestimonial}
                    onStyleOverrideChange={onTestimonialsStyleOverrideChange}
                    onBgImageClick={onTestimonialsBgImageClick}
                    palette={config.theme?.palette}
                    customColors={config.customColors}
                    onCustomColorsChange={onCustomColorsChange}
                  />
                </div>
              ) : null;

            case "faq":
              return config.faq ? (
                <div key="faq" id="section-faq">
                  <FAQSection
                    faq={config.faq}
                    tenantData={tenantData}
                    isEditing={isEditing}
                    variant={variant}
                    brandFonts={brandFonts}
                    onHeadingChange={onFAQHeadingChange}
                    onSubheadingChange={onFAQSubheadingChange}
                    onItemChange={onFAQItemChange}
                    onAddItem={onAddFAQItem}
                    onRemoveItem={onRemoveFAQItem}
                    onStyleOverrideChange={onFAQStyleOverrideChange}
                    onBgImageClick={onFAQBgImageClick}
                    palette={config.theme?.palette}
                    customColors={config.customColors}
                    onCustomColorsChange={onCustomColorsChange}
                  />
                </div>
              ) : null;

            case "location":
              return config.location ? (
                <div key="location" id="section-location">
                  <LocationSection
                    location={config.location}
                    tenantData={tenantData}
                    address={address}
                    isEditing={isEditing}
                    variant={variant}
                    brandFonts={brandFonts}
                    onHeadingChange={onLocationHeadingChange}
                    onSubheadingChange={onLocationSubheadingChange}
                    onStyleOverrideChange={onLocationStyleOverrideChange}
                    onBgImageClick={onLocationBgImageClick}
                    palette={config.theme?.palette}
                    customColors={config.customColors}
                    onCustomColorsChange={onCustomColorsChange}
                  />
                </div>
              ) : null;

            case "gallery":
              return config.gallery ? (
                <div key="gallery" id="section-gallery">
                  <GallerySection
                    gallery={config.gallery}
                    tenantData={tenantData}
                    isEditing={isEditing}
                    variant={variant}
                    brandFonts={brandFonts}
                    onHeadingChange={onGalleryHeadingChange}
                    onSubheadingChange={onGallerySubheadingChange}
                    onAddImage={onGalleryAddImage}
                    onRemoveImage={onGalleryRemoveImage}
                    onStyleOverrideChange={onGalleryStyleOverrideChange}
                    onBgImageClick={onGalleryBgImageClick}
                    palette={config.theme?.palette}
                    customColors={config.customColors}
                    onCustomColorsChange={onCustomColorsChange}
                  />
                </div>
              ) : null;

            default:
              return null;
          }
        })}

      {/* Footer always last, controlled by footerEnabled */}
      {config.footerEnabled !== false && config.footer && (
        <div id="section-footer">
          <FooterSection
            footer={config.footer}
            tenantData={tenantData}
            isEditing={isEditing}
            brandFonts={brandFonts}
            onTextChange={onFooterTextChange}
            onLinkChange={onFooterLinkChange}
            onAddLink={onAddFooterLink}
            onRemoveLink={onRemoveFooterLink}
            onStyleOverrideChange={onFooterStyleOverrideChange}
            onBgImageClick={onFooterBgImageClick}
            palette={config.theme?.palette}
            customColors={config.customColors}
            onCustomColorsChange={onCustomColorsChange}
          />
        </div>
      )}
    </>
  );
}
