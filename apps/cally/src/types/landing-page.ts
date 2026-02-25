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
 * Brand-level font configuration (header or body)
 */
export interface BrandFont {
  family: string; // e.g. "'Playfair Display', serif" (matches FONT_OPTIONS value)
  size?: number; // px
}

/**
 * Template IDs for the 5 available hero templates
 */
export type TemplateId = "centered" | "salon";

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
  /** Whether this template is published (user-ready) or still in development */
  status: "published" | "development";
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
    status: "published",
  },
  {
    id: "salon",
    name: "Salon",
    description:
      "Premium salon layout with warm earth tones and elegant serif typography",
    imageConfig: {
      heroBackground: "16/9",
      aboutImage: "3/4",
      featureCardImage: "1/1",
    },
    status: "published",
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

/**
 * Common section style overrides shared by all sections
 */
export interface SectionStyleOverrides {
  bgColor?: string;
  bgImage?: string;
  bgImageBlur?: number; // px, default 0
  bgImageOpacity?: number; // 0-100, default 100
  overlayOpacity?: number; // 0-100, dark overlay on bg image
  bgFilter?: string; // CSS filter preset
  bgImageOffsetX?: number; // px, drag reposition X
  bgImageOffsetY?: number; // px, drag reposition Y
  bgImageZoom?: number; // 100-300, scroll zoom during drag
  paddingTop?: number; // px, default 80
  paddingBottom?: number; // px, default 80
  paddingLeft?: number; // px, default 0
  paddingRight?: number; // px, default 0
  sectionHeight?: number; // px, optional fixed height
}

export interface AboutStyleOverrides {
  paddingTop?: number; // px, default 80
  paddingBottom?: number; // px, default 80
  paddingLeft?: number; // px, default 0
  paddingRight?: number; // px, default 0
  imageWidth?: number; // px, default 320
  imageHeight?: number; // px, default 320
  imageOffsetY?: number; // px, default 0 — negative values push image above section
  borderRadius?: number; // px, default 16
  // Body text overrides
  fontSize?: number; // px, default 18
  fontFamily?: string; // default: "" (system/inherit)
  fontWeight?: "normal" | "bold"; // default: "normal"
  fontStyle?: "normal" | "italic"; // default: "normal"
  textColor?: string; // hex, default: theme.text
  textAlign?: "left" | "center" | "right"; // default: "left"
  // Title text overrides
  titleFontSize?: number; // px, default 28
  titleFontFamily?: string; // default: "" (system/inherit)
  titleFontWeight?: "normal" | "bold"; // default: "bold"
  titleFontStyle?: "normal" | "italic"; // default: "normal"
  titleTextColor?: string; // hex, default: theme.text
  titleTextAlign?: "left" | "center" | "right"; // default: "left"
  titleMaxWidth?: number; // px, default 700 — title text max-width
  bodyMaxWidth?: number; // px, default 700 — body text max-width
  bgColor?: string; // hex, overrides theme.bg
  bgImage?: string; // URL
  bgImageBlur?: number; // px, default 0
  bgImageOpacity?: number; // 0-100, default 100
  overlayOpacity?: number; // 0-100, dark overlay on bg image
  bgFilter?: string; // CSS filter preset: "grayscale" | "sepia" | etc.
  sectionHeight?: number; // px, optional fixed height
  bgImageOffsetX?: number; // px, drag reposition X
  bgImageOffsetY?: number; // px, drag reposition Y
  bgImageZoom?: number; // 100-300, scroll zoom during drag
  layout?: "image-left" | "image-right" | "stacked"; // default: "image-left"
}

export interface HeroStyleOverrides {
  titleFontSize?: number;
  titleFontFamily?: string;
  titleFontWeight?: "normal" | "bold";
  titleFontStyle?: "normal" | "italic";
  titleTextColor?: string;
  titleTextAlign?: "left" | "center" | "right";
  subtitleFontSize?: number;
  subtitleFontFamily?: string;
  subtitleFontWeight?: "normal" | "bold";
  subtitleFontStyle?: "normal" | "italic";
  subtitleTextColor?: string;
  subtitleTextAlign?: "left" | "center" | "right";
  titleMaxWidth?: number; // px, draggable max-width for title wrapper
  subtitleMaxWidth?: number; // px, draggable max-width for subtitle wrapper
  overlayOpacity?: number; // 0-100, controls dark overlay on bg image
  paddingTop?: number; // px
  paddingBottom?: number; // px
  bgColor?: string; // hex fallback when no image
  // Freeform element positions (% of container, 0-100)
  titleX?: number; // default 50
  titleY?: number; // default 30
  subtitleX?: number; // default 50
  subtitleY?: number; // default 50
  buttonX?: number; // default 50
  buttonY?: number; // default 72
  sectionHeight?: number; // px, default 600
  paddingLeft?: number; // px, default 20
  paddingRight?: number; // px, default 20
  contentAlign?: "left" | "center" | "right"; // default per template
  bgBlur?: number; // px, default 0 — blur on hero background image
  bgOpacity?: number; // 0-100, default 100 — opacity of hero background image
  bgFilter?: string; // CSS filter preset name: "grayscale" | "sepia" | "saturate" | "contrast" | "brightness" | "invert" | "none"
  // Mobile freeform position overrides (% of container, 0-100)
  mobileTitleX?: number;
  mobileTitleY?: number;
  mobileSubtitleX?: number;
  mobileSubtitleY?: number;
  mobileButtonX?: number;
  mobileButtonY?: number;
  mobileSectionHeight?: number; // px
}

export interface AboutConfig {
  title?: string;
  image?: string;
  imagePosition?: string;
  imageZoom?: number;
  paragraph: string;
  styleOverrides?: AboutStyleOverrides;
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
  styleOverrides?: SectionStyleOverrides;
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
  styleOverrides?: SectionStyleOverrides;
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
  styleOverrides?: SectionStyleOverrides;
}

/**
 * Products section style overrides (bg colour, padding)
 */
export interface ProductsStyleOverrides {
  bgColor?: string;
  bgImage?: string; // URL
  bgImageBlur?: number; // px, default 0
  bgImageOpacity?: number; // 0-100, default 100
  paddingTop?: number; // px, default 80
  paddingBottom?: number; // px, default 80
  paddingLeft?: number; // px, default 0
  paddingRight?: number; // px, default 0
  // Heading text overrides
  headingFontSize?: number; // px
  headingFontFamily?: string;
  headingFontWeight?: "normal" | "bold";
  headingFontStyle?: "normal" | "italic";
  headingTextColor?: string;
  headingTextAlign?: "left" | "center" | "right";
  // Subheading text overrides
  subheadingFontSize?: number; // px
  subheadingFontFamily?: string;
  subheadingFontWeight?: "normal" | "bold";
  subheadingFontStyle?: "normal" | "italic";
  subheadingTextColor?: string;
  subheadingTextAlign?: "left" | "center" | "right";
}

/**
 * Products section configuration (heading/subheading text)
 */
export interface ProductsConfig {
  heading?: string;
  subheading?: string;
  styleOverrides?: ProductsStyleOverrides;
}

/**
 * Location section configuration
 */
export interface LocationConfig {
  heading?: string;
  subheading?: string;
  styleOverrides?: SectionStyleOverrides;
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
  styleOverrides?: SectionStyleOverrides;
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
  styleOverrides?: SectionStyleOverrides;
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
  /** Drag offset X in pixels (0 = centered per imagePosition) */
  imageOffsetX?: number;
  /** Drag offset Y in pixels (0 = centered per imagePosition) */
  imageOffsetY?: number;
  /** Action button configuration */
  button?: ButtonConfig;
  /** About section configuration */
  about?: AboutConfig;
  /** Features section configuration */
  features?: FeaturesConfig;
  /** Products section heading/subheading configuration */
  productsConfig?: ProductsConfig;
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
  /** Hero section style overrides (font, overlay, padding) */
  heroStyleOverrides?: HeroStyleOverrides;
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
    headerFont?: BrandFont;
    bodyFont?: BrandFont;
  };
  /** User-defined custom colour swatches */
  customColors?: { name: string; hex: string }[];
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
  backgroundImage:
    "https://images.pexels.com/photos/28461041/pexels-photo-28461041.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
  imagePosition: "50% 50%",
  imageZoom: 100,
  button: {
    label: "Book Now",
    action: "booking",
  },
  about: {
    title: "About Me",
    image:
      "https://images.pexels.com/photos/29852895/pexels-photo-29852895.jpeg?auto=compress&cs=tinysrgb&w=800",
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
        image:
          "https://images.pexels.com/photos/7699526/pexels-photo-7699526.jpeg?auto=compress&cs=tinysrgb&w=800",
        title: "One-on-One Sessions",
        description:
          "Personalized sessions designed to address your specific goals and challenges.",
      },
      {
        id: "feature-2",
        image:
          "https://images.pexels.com/photos/15189552/pexels-photo-15189552.jpeg?auto=compress&cs=tinysrgb&w=800",
        title: "Group Workshops",
        description:
          "Interactive group sessions that foster community learning and shared growth.",
      },
      {
        id: "feature-3",
        image:
          "https://images.pexels.com/photos/4225881/pexels-photo-4225881.jpeg?auto=compress&cs=tinysrgb&w=800",
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
    images: [
      {
        id: "gallery-default-1",
        url: "https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=800",
        caption: "",
      },
      {
        id: "gallery-default-2",
        url: "https://images.pexels.com/photos/30234387/pexels-photo-30234387.jpeg?auto=compress&cs=tinysrgb&w=800",
        caption: "",
      },
      {
        id: "gallery-default-3",
        url: "https://images.pexels.com/photos/3822864/pexels-photo-3822864.jpeg?auto=compress&cs=tinysrgb&w=800",
        caption: "",
      },
      {
        id: "gallery-default-4",
        url: "https://images.pexels.com/photos/7851906/pexels-photo-7851906.jpeg?auto=compress&cs=tinysrgb&w=800",
        caption: "",
      },
    ],
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

/**
 * Get templates available for the template picker.
 * Returns all templates in dev mode, only published ones in production.
 */
export function getAvailableTemplates(isDev: boolean): TemplateInfo[] {
  if (isDev) return TEMPLATES;
  return TEMPLATES.filter((t) => t.status === "published");
}

// ============================================================================
// Rich data model — all public tenant data available to every section
// ============================================================================

/**
 * Public product shape exposed to landing page sections.
 * Trimmed from the full Product type — no internal fields.
 */
export interface TenantLandingPageProduct {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  images?: Array<{ id: string; url: string }>;
  isActive: boolean;
  productType?: "service" | "webinar";
  maxParticipants?: number;
  signupCount?: number;
}

/**
 * Public review shape exposed to landing page sections.
 * Transformed from FeedbackRequest — only visitor-safe fields.
 */
export interface TenantLandingPageReview {
  id: string;
  rating?: number;
  message: string;
  authorName: string;
  submittedAt?: string;
}

/**
 * Pre-computed stats for landing page sections.
 */
export interface TenantLandingPageStats {
  totalProducts: number;
  totalReviews: number;
  averageRating: number | null; // null if no reviews with ratings
  totalWebinars: number;
}

/**
 * All public tenant data aggregated for landing page sections.
 *
 * Passed to every section component so any section can render cross-cutting
 * views (hero with review snippets, about with product count, CTA with stats).
 *
 * Contains NO sensitive data (no emails, tokens, stripe keys, etc.).
 */
export interface TenantLandingPageData {
  // Tenant identity
  tenantId: string;
  name: string;
  avatar?: string;
  logo?: string;

  // Contact & location
  address?: string;
  currency?: string;
  timezone?: string;

  // Products & services
  products: TenantLandingPageProduct[];

  // Reviews (approved feedback)
  reviews: TenantLandingPageReview[];

  // Computed stats
  stats: TenantLandingPageStats;

  // Booking availability (public-safe subset)
  booking?: {
    timezone: string;
    slotDurationMinutes: number;
    lookaheadDays: number;
  };

  // Domain info
  domain?: string;
  baseUrl: string; // canonical URL (custom domain or vercel URL)
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
