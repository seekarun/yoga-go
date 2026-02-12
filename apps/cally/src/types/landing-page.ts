/**
 * CallyGo Landing Page Types
 *
 * Simplified landing page configuration for CallyGo.
 * Uses template-based approach with minimal customization:
 * - 5 hero-style templates
 * - Just title, subtitle, and background image
 */

import type { ColorPalette } from "@/lib/colorPalette";

/**
 * Template IDs for the 5 available hero templates
 */
export type TemplateId =
  | "centered"
  | "left-aligned"
  | "split"
  | "minimal"
  | "bold";

/**
 * Image aspect ratio configuration for a template
 */
export interface TemplateImageConfig {
  /** Aspect ratio for hero background image (e.g., "16/9", "9/16") */
  heroBackground: string;
  /** Aspect ratio for about section image */
  aboutImage: string;
  /** Aspect ratio for feature card images */
  featureCardImage: string;
}

/**
 * Template metadata for display in the editor
 */
export interface TemplateInfo {
  id: TemplateId;
  name: string;
  description: string;
  previewImage?: string;
  /** Image aspect ratio configuration for this template */
  imageConfig: TemplateImageConfig;
}

/**
 * All available templates
 */
export const TEMPLATES: TemplateInfo[] = [
  {
    id: "centered",
    name: "Centered",
    description:
      "Classic centered layout with title and subtitle over the background",
    imageConfig: {
      heroBackground: "16/9",
      aboutImage: "1/1",
      featureCardImage: "16/9",
    },
  },
  {
    id: "left-aligned",
    name: "Left Aligned",
    description: "Content aligned to the left with a modern feel",
    imageConfig: {
      heroBackground: "16/9",
      aboutImage: "4/5",
      featureCardImage: "16/9",
    },
  },
  {
    id: "split",
    name: "Split",
    description: "Half image, half content side-by-side layout",
    imageConfig: {
      heroBackground: "9/16",
      aboutImage: "4/5",
      featureCardImage: "16/9",
    },
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Clean and simple with subtle background",
    imageConfig: {
      heroBackground: "16/9",
      aboutImage: "1/1",
      featureCardImage: "16/9",
    },
  },
  {
    id: "bold",
    name: "Bold",
    description: "Large typography with strong visual impact",
    imageConfig: {
      heroBackground: "16/9",
      aboutImage: "1/1",
      featureCardImage: "16/9",
    },
  },
];

/**
 * Action button types
 */
export type ButtonAction = "booking" | "contact" | "chat";

export interface ButtonConfig {
  label: string;
  action: string; // Using string for flexibility, validated against BUTTON_ACTIONS at runtime
}

export interface AboutConfig {
  image?: string;
  imagePosition?: string;
  imageZoom?: number;
  paragraph: string;
}

/**
 * Feature card for the features section
 */
export interface FeatureCard {
  id: string;
  image?: string;
  imagePosition?: string;
  imageZoom?: number;
  title: string;
  description: string;
}

/**
 * Features section configuration
 */
export interface FeaturesConfig {
  heading?: string;
  subheading?: string;
  cards: FeatureCard[];
}

/**
 * Section ordering types
 */
export type SectionId =
  | "about"
  | "features"
  | "products"
  | "testimonials"
  | "faq"
  | "location"
  | "gallery";

export interface SectionOrderItem {
  id: SectionId;
  enabled: boolean;
}

/**
 * Testimonials section configuration
 */
export interface Testimonial {
  id: string;
  quote: string;
  authorName: string;
  authorTitle?: string;
  rating?: number;
}

export interface TestimonialsConfig {
  heading?: string;
  subheading?: string;
  testimonials: Testimonial[];
}

/**
 * FAQ section configuration
 */
export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface FAQConfig {
  heading?: string;
  subheading?: string;
  items: FAQItem[];
}

/**
 * Location section configuration
 */
export interface LocationConfig {
  heading?: string;
  subheading?: string;
}

/**
 * Gallery section configuration
 */
export interface GalleryImage {
  id: string;
  url: string;
  caption?: string;
}

export interface GalleryConfig {
  heading?: string;
  subheading?: string;
  images: GalleryImage[];
}

/**
 * SEO configuration for landing pages
 */
export interface SEOConfig {
  /** Custom SEO title (overrides hero title) */
  title?: string;
  /** Custom meta description (overrides subtitle) */
  description?: string;
  /** Comma-separated keywords */
  keywords?: string;
  /** URL for og:image / twitter:image */
  ogImage?: string;
  /** URL for favicon */
  favicon?: string;
}

/**
 * Footer section configuration
 */
export interface FooterLink {
  label: string;
  url: string;
}

export interface FooterConfig {
  text?: string;
  links?: FooterLink[];
  showPoweredBy?: boolean;
}

/**
 * Available button actions with display names
 */
export const BUTTON_ACTIONS: {
  id: ButtonAction;
  name: string;
  description: string;
}[] = [
  {
    id: "booking",
    name: "Book Appointment",
    description: "Opens the booking calendar",
  },
  { id: "contact", name: "Contact Form", description: "Opens a contact form" },
  { id: "chat", name: "AI Chat", description: "Opens the AI chat assistant" },
];

/**
 * Simple landing page configuration
 * Just the essentials: template choice + editable fields + image settings
 */
export interface SimpleLandingPageConfig {
  template: TemplateId;
  title: string;
  subtitle: string;
  backgroundImage?: string;
  /** Background image position (e.g., "50% 50%") */
  imagePosition?: string;
  /** Background image zoom level (100-200) */
  imageZoom?: number;
  /** Action button configuration */
  button?: ButtonConfig;
  /** About section configuration */
  about?: AboutConfig;
  /** Features section configuration */
  features?: FeaturesConfig;
  /** Testimonials section configuration */
  testimonials?: TestimonialsConfig;
  /** FAQ section configuration */
  faq?: FAQConfig;
  /** Location section configuration */
  location?: LocationConfig;
  /** Gallery section configuration */
  gallery?: GalleryConfig;
  /** Footer section configuration */
  footer?: FooterConfig;
  /** Whether hero section is visible (default true) */
  heroEnabled?: boolean;
  /** Whether footer section is visible (default true) */
  footerEnabled?: boolean;
  /** Section ordering (about, features, testimonials, faq) */
  sections?: SectionOrderItem[];
  /** Brand colour theme */
  theme?: {
    primaryColor?: string;
    palette?: ColorPalette;
  };
  /** SEO configuration */
  seo?: SEOConfig;
}

/**
 * Default landing page configuration for new tenants
 */
export const DEFAULT_LANDING_PAGE_CONFIG: SimpleLandingPageConfig = {
  template: "centered",
  title: "Welcome",
  subtitle: "Book a session with me",
  backgroundImage: undefined,
  imagePosition: "50% 50%",
  imageZoom: 100,
  button: {
    label: "Book Now",
    action: "booking",
  },
  about: {
    image: undefined,
    imagePosition: "50% 50%",
    imageZoom: 100,
    paragraph:
      "I'm passionate about helping people achieve their goals. With years of experience in my field, I provide personalized guidance tailored to your unique needs. Let's work together to unlock your potential.",
  },
  features: {
    heading: "What I Offer",
    subheading: "Services tailored to your needs",
    cards: [
      {
        id: "feature-1",
        title: "One-on-One Sessions",
        description:
          "Personalized sessions designed to address your specific goals and challenges.",
      },
      {
        id: "feature-2",
        title: "Group Workshops",
        description:
          "Interactive group sessions that foster community learning and shared growth.",
      },
      {
        id: "feature-3",
        title: "Online Consultations",
        description:
          "Flexible virtual meetings that fit your schedule, from anywhere in the world.",
      },
    ],
  },
  testimonials: {
    heading: "What People Say",
    subheading: "Hear from those who have worked with me",
    testimonials: [
      {
        id: "testimonial-1",
        quote:
          "An incredible experience that truly transformed my perspective. Highly recommended!",
        authorName: "Sarah M.",
        authorTitle: "Client",
        rating: 5,
      },
      {
        id: "testimonial-2",
        quote:
          "Professional, knowledgeable, and genuinely caring. The sessions exceeded my expectations.",
        authorName: "James R.",
        authorTitle: "Client",
        rating: 5,
      },
    ],
  },
  faq: {
    heading: "Frequently Asked Questions",
    subheading: "Everything you need to know",
    items: [
      {
        id: "faq-1",
        question: "How do I book a session?",
        answer:
          "Simply click the Book Now button at the top of the page to view available times and schedule your session.",
      },
      {
        id: "faq-2",
        question: "What should I expect in my first session?",
        answer:
          "Your first session is an introductory meeting where we discuss your goals and create a personalised plan together.",
      },
      {
        id: "faq-3",
        question: "Do you offer online sessions?",
        answer:
          "Yes! I offer both in-person and online sessions to accommodate your schedule and preferences.",
      },
    ],
  },
  location: {
    heading: "Visit Us",
    subheading: "Find us at our location",
  },
  gallery: {
    heading: "Gallery",
    subheading: "",
    images: [],
  },
  footer: {
    text: "\u00a9 2026 All rights reserved.",
    links: [],
    showPoweredBy: true,
  },
  seo: {},
  heroEnabled: true,
  footerEnabled: true,
  sections: [
    { id: "about", enabled: true },
    { id: "features", enabled: true },
    { id: "products", enabled: false },
    { id: "testimonials", enabled: false },
    { id: "faq", enabled: false },
    { id: "location", enabled: false },
    { id: "gallery", enabled: false },
  ],
};

/**
 * Get template info by ID
 */
export function getTemplateInfo(id: TemplateId): TemplateInfo | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

// ============================================================================
// Legacy types kept for backward compatibility during migration
// These can be removed once all existing data is migrated
// ============================================================================

export type CallySectionType =
  | "hero"
  | "valuePropositions"
  | "about"
  | "photoGallery"
  | "act"
  | "footer";

export const DEFAULT_SECTION_ORDER: CallySectionType[] = [
  "hero",
  "valuePropositions",
  "about",
  "photoGallery",
  "act",
  "footer",
];
