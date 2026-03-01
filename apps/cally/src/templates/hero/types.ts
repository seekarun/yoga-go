/**
 * Hero Template Types
 */

import type {
  SimpleLandingPageConfig,
  AboutStyleOverrides,
  HeroStyleOverrides,
  ProductCardStyleOverride,
  ProductsStyleOverrides,
  SectionStyleOverrides,
  TenantLandingPageData,
} from "@/types/landing-page";
import type { Product } from "@/types";

export interface HeroTemplateProps {
  config: SimpleLandingPageConfig;
  tenantData?: TenantLandingPageData;
  isEditing?: boolean;
  editingFormFactor?: "desktop" | "mobile";
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
  onFeatureCardImagePositionChange?: (cardId: string, position: string) => void;
  onFeatureCardImageZoomChange?: (cardId: string, zoom: number) => void;
  onFeatureCardStyleChange?: (
    cardId: string,
    patch: Partial<import("@/types/landing-page").FeatureCard>,
  ) => void;
  onAddFeatureCard?: () => void;
  onRemoveFeatureCard?: (cardId: string) => void;
  // Hero style overrides
  onHeroStyleOverrideChange?: (overrides: HeroStyleOverrides) => void;
  onHeroBgImageClick?: () => void;
  onImageOffsetChange?: (x: number, y: number) => void;
  onImageZoomChange?: (zoom: number) => void;
  onHeroRemoveBgComplete?: (newUrl: string) => void;
  onHeroRemoveBg?: () => void;
  heroRemovingBg?: boolean;
  heroBgRemoved?: boolean;
  onHeroUndoRemoveBg?: () => void;
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
  onProductCardStyleChange?: (
    productId: string,
    patch: Partial<ProductCardStyleOverride>,
  ) => void;
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

export type HeroTemplateComponent = React.FC<HeroTemplateProps>;

export interface TemplateRegistry {
  [key: string]: HeroTemplateComponent;
}
