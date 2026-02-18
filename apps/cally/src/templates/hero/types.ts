/**
 * Hero Template Types
 */

import type {
  SimpleLandingPageConfig,
  AboutStyleOverrides,
  HeroStyleOverrides,
  ProductsStyleOverrides,
} from "@/types/landing-page";
import type { Product } from "@/types";

export interface HeroTemplateProps {
  config: SimpleLandingPageConfig;
  isEditing?: boolean;
  onTitleChange?: (title: string) => void;
  onSubtitleChange?: (subtitle: string) => void;
  onButtonClick?: () => void;
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
  // Hero style overrides
  onHeroStyleOverrideChange?: (overrides: HeroStyleOverrides) => void;
  onHeroRemoveBgComplete?: (newUrl: string) => void;
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
  // Location props & callbacks
  address?: string;
  onLocationHeadingChange?: (heading: string) => void;
  onLocationSubheadingChange?: (subheading: string) => void;
  // Gallery callbacks
  onGalleryHeadingChange?: (heading: string) => void;
  onGallerySubheadingChange?: (subheading: string) => void;
  onGalleryAddImage?: () => void;
  onGalleryRemoveImage?: (imageId: string) => void;
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
