"use client";

import type { SimpleLandingPageConfig } from "@/types/landing-page";
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
  onAboutParagraphChange?: (paragraph: string) => void;
  onAboutImageClick?: () => void;
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
  // Products data
  products?: Product[];
  currency?: string;
  onBookProduct?: (productId: string) => void;
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
  onAboutParagraphChange,
  onAboutImageClick,
  onFeaturesHeadingChange,
  onFeaturesSubheadingChange,
  onFeatureCardChange,
  onFeatureCardImageClick,
  onAddFeatureCard,
  onRemoveFeatureCard,
  products,
  currency,
  onBookProduct,
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
                  onParagraphChange={onAboutParagraphChange}
                  onImageClick={onAboutImageClick}
                />
              ) : null;

            case "features":
              return config.features && config.features.cards.length > 0 ? (
                <FeaturesSection
                  key="features"
                  features={config.features}
                  isEditing={isEditing}
                  variant={variant}
                  onHeadingChange={onFeaturesHeadingChange}
                  onSubheadingChange={onFeaturesSubheadingChange}
                  onCardChange={onFeatureCardChange}
                  onCardImageClick={onFeatureCardImageClick}
                  onAddCard={onAddFeatureCard}
                  onRemoveCard={onRemoveFeatureCard}
                />
              ) : null;

            case "products":
              return products && products.length > 0 ? (
                <ProductsSection
                  key="products"
                  products={products}
                  currency={currency || "AUD"}
                  variant={variant}
                  onBookProduct={onBookProduct}
                />
              ) : null;

            case "testimonials":
              return config.testimonials ? (
                <TestimonialsSection
                  key="testimonials"
                  testimonials={config.testimonials}
                  isEditing={isEditing}
                  variant={variant}
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
          onTextChange={onFooterTextChange}
          onLinkChange={onFooterLinkChange}
          onAddLink={onAddFooterLink}
          onRemoveLink={onRemoveFooterLink}
        />
      )}
    </>
  );
}
