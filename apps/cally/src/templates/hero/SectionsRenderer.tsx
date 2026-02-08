"use client";

import type { SimpleLandingPageConfig } from "@/types/landing-page";
import FeaturesSection from "./FeaturesSection";
import TestimonialsSection from "./TestimonialsSection";
import FAQSection from "./FAQSection";
import FooterSection from "./FooterSection";

interface SectionsRendererProps {
  config: SimpleLandingPageConfig;
  isEditing?: boolean;
  variant?: "light" | "dark" | "gray";
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
  onFeaturesHeadingChange,
  onFeaturesSubheadingChange,
  onFeatureCardChange,
  onFeatureCardImageClick,
  onAddFeatureCard,
  onRemoveFeatureCard,
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

            default:
              return null;
          }
        })}

      {/* Footer always last */}
      {config.footer && (
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
