/**
 * Hero Template Types
 */

import type { SimpleLandingPageConfig } from "@/types/landing-page";

export interface HeroTemplateProps {
  config: SimpleLandingPageConfig;
  isEditing?: boolean;
  onTitleChange?: (title: string) => void;
  onSubtitleChange?: (subtitle: string) => void;
  onButtonClick?: () => void;
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

export type HeroTemplateComponent = React.FC<HeroTemplateProps>;

export interface TemplateRegistry {
  [key: string]: HeroTemplateComponent;
}
