"use client";

import type {
  SimpleLandingPageConfig,
  AboutStyleOverrides,
  ProductsStyleOverrides,
  BrandFont,
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
  // Products data & callbacks
  products?: Product[];
  currency?: string;
  onBookProduct?: (productId: string) => void;
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
  // Location props & callbacks
  address?: string;
  onLocationHeadingChange?: (heading: string) => void;
  onLocationSubheadingChange?: (subheading: string) => void;
  // Gallery callbacks
  onGalleryHeadingChange?: (heading: string) => void;
  onGallerySubheadingChange?: (subheading: string) => void;
  onGalleryAddImage?: () => void;
  onGalleryRemoveImage?: (imageId: string) => void;
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
  // Footer callbacks
  onFooterTextChange?: (text: string) => void;
  onFooterLinkChange?: (
    index: number,
    field: "label" | "url",
    value: string,
  ) => void;
  onAddFooterLink?: () => void;
  onRemoveFooterLink?: (index: number) => void;
}

export default function SectionsRenderer({
  config,
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
  products,
  currency,
  onBookProduct,
  onProductsHeadingChange,
  onProductsSubheadingChange,
  onProductsStyleOverrideChange,
  onProductsBgImageClick,
  address,
  onLocationHeadingChange,
  onLocationSubheadingChange,
  onGalleryHeadingChange,
  onGallerySubheadingChange,
  onGalleryAddImage,
  onGalleryRemoveImage,
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
  onFooterTextChange,
  onFooterLinkChange,
  onAddFooterLink,
  onRemoveFooterLink,
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
                <AboutSection
                  key="about"
                  about={config.about}
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
              ) : null;

            case "features":
              return config.features && config.features.cards.length > 0 ? (
                <FeaturesSection
                  key="features"
                  features={config.features}
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
                />
              ) : null;

            case "products":
              return products && products.length > 0 ? (
                <ProductsSection
                  key="products"
                  products={products}
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
                  onStyleOverrideChange={onProductsStyleOverrideChange}
                  onCustomColorsChange={onCustomColorsChange}
                  onBgImageClick={onProductsBgImageClick}
                />
              ) : null;

            case "testimonials":
              return config.testimonials ? (
                <TestimonialsSection
                  key="testimonials"
                  testimonials={config.testimonials}
                  isEditing={isEditing}
                  variant={variant}
                  brandFonts={brandFonts}
                  onHeadingChange={onTestimonialsHeadingChange}
                  onSubheadingChange={onTestimonialsSubheadingChange}
                  onTestimonialChange={onTestimonialChange}
                  onAddTestimonial={onAddTestimonial}
                  onRemoveTestimonial={onRemoveTestimonial}
                />
              ) : null;

            case "faq":
              return config.faq ? (
                <FAQSection
                  key="faq"
                  faq={config.faq}
                  isEditing={isEditing}
                  variant={variant}
                  brandFonts={brandFonts}
                  onHeadingChange={onFAQHeadingChange}
                  onSubheadingChange={onFAQSubheadingChange}
                  onItemChange={onFAQItemChange}
                  onAddItem={onAddFAQItem}
                  onRemoveItem={onRemoveFAQItem}
                />
              ) : null;

            case "location":
              return config.location ? (
                <LocationSection
                  key="location"
                  location={config.location}
                  address={address}
                  isEditing={isEditing}
                  variant={variant}
                  brandFonts={brandFonts}
                  onHeadingChange={onLocationHeadingChange}
                  onSubheadingChange={onLocationSubheadingChange}
                />
              ) : null;

            case "gallery":
              return config.gallery ? (
                <GallerySection
                  key="gallery"
                  gallery={config.gallery}
                  isEditing={isEditing}
                  variant={variant}
                  brandFonts={brandFonts}
                  onHeadingChange={onGalleryHeadingChange}
                  onSubheadingChange={onGallerySubheadingChange}
                  onAddImage={onGalleryAddImage}
                  onRemoveImage={onGalleryRemoveImage}
                />
              ) : null;

            default:
              return null;
          }
        })}

      {/* Footer always last, controlled by footerEnabled */}
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
    </>
  );
}
