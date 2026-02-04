/**
 * Cally Landing Page Types
 *
 * Simplified landing page configuration for Cally.
 * Uses template-based approach with minimal customization:
 * - 5 hero-style templates
 * - Just title, subtitle, and background image
 */

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
export type ButtonAction = "booking" | "contact";

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
