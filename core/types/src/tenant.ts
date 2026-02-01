// Tenant Types - Multi-tenancy and expert profile types

import type { BaseEntity } from "./base";
import type { SupportedCurrency } from "./currency";

/**
 * Tenant status
 */
export type TenantStatus = "active" | "pending" | "suspended";

/**
 * SES verification status
 */
export type SesVerificationStatus = "pending" | "verified" | "failed";

/**
 * DKIM status
 */
export type DkimStatus =
  | "PENDING"
  | "SUCCESS"
  | "FAILED"
  | "NOT_STARTED"
  | "TEMPORARY_FAILURE";

/**
 * Landing page template types
 */
export type LandingPageTemplate = "classic" | "modern" | "classic-dark";

/**
 * Color harmony types for palette generation
 */
export type ColorHarmonyType = "analogous" | "triadic" | "split-complementary";

/**
 * Brand Color Palette
 */
export interface ColorPalette {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
  secondary?: string;
  highlight?: string;
  harmonyType?: ColorHarmonyType;
}

/**
 * Social links
 */
export interface SocialLinks {
  instagram?: string;
  youtube?: string;
  facebook?: string;
  twitter?: string;
  website?: string;
}

/**
 * Expert course summary
 */
export interface ExpertCourse {
  id: string;
  title: string;
  level: string;
  duration: string;
  students: number;
}

/**
 * Custom landing page configuration
 */
export interface CustomLandingPageConfig {
  branding?: {
    logo?: string;
  };
  hero?: {
    heroImage?: string;
    heroImagePosition?: string;
    heroImageZoom?: number;
    heroImageAttribution?: {
      photographerName: string;
      photographerUsername?: string;
      photographerUrl: string;
      unsplashUrl?: string;
      pexelsUrl?: string;
    };
    headline?: string;
    description?: string;
    ctaText?: string;
    ctaLink?: string;
    alignment?: "center" | "left" | "right";
  };
  valuePropositions?: {
    type?: "paragraph" | "cards";
    content?: string;
    items?: Array<{
      title: string;
      description: string;
      image?: string;
    }>;
  };
  about?: {
    bio?: string;
    highlights?: string[];
    layoutType?: "video" | "image-text";
    videoCloudflareId?: string;
    videoStatus?: "uploading" | "processing" | "ready" | "error";
    imageUrl?: string;
    imagePosition?: string;
    imageZoom?: number;
    text?: string;
  };
  act?: {
    imageUrl?: string;
    imageAttribution?: {
      photographerName: string;
      photographerUsername: string;
      photographerUrl: string;
      unsplashUrl: string;
    };
    title?: string;
    text?: string;
    ctaText?: string;
    ctaLink?: string;
  };
  blog?: {
    title?: string;
    description?: string;
  };
  courses?: {
    title?: string;
    description?: string;
  };
  webinars?: {
    title?: string;
    description?: string;
  };
  photoGallery?: {
    title?: string;
    description?: string;
    images?: Array<{
      id: string;
      url: string;
      thumbUrl?: string;
      caption?: string;
      attribution?: {
        photographerName: string;
        photographerUsername: string;
        photographerUrl: string;
        unsplashUrl: string;
      };
    }>;
  };
  footer?: {
    copyrightText?: string;
    tagline?: string;
    showSocialLinks?: boolean;
    socialLinks?: {
      instagram?: string;
      youtube?: string;
      facebook?: string;
      twitter?: string;
      tiktok?: string;
    };
    showLegalLinks?: boolean;
    legalLinks?: {
      privacyPolicy?: string;
      termsOfService?: string;
      refundPolicy?: string;
    };
    showContactInfo?: boolean;
    contactEmail?: string;
  };
  featuredCourses?: string[];
  testimonials?: Array<{
    id: string;
    name: string;
    avatar?: string;
    text: string;
    rating?: number;
  }>;
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    palette?: ColorPalette;
    fontFamily?: string;
  };
  contact?: {
    email?: string;
    phone?: string;
    bookingUrl?: string;
  };
  sectionOrder?: string[];
  disabledSections?: string[];
  template?: LandingPageTemplate;
}

/**
 * Expert platform preferences
 */
export interface ExpertPlatformPreferences {
  featuredOnPlatform: boolean;
  defaultEmail?: string;
  customEmail?: string;
  emailVerified?: boolean;
  forwardingEmail?: string;
  emailForwardingEnabled?: boolean;
  location?: string;
  currency?: SupportedCurrency;
}

/**
 * Stripe Connect status
 */
export type StripeConnectStatus =
  | "not_connected"
  | "pending"
  | "active"
  | "restricted"
  | "disabled";

/**
 * Stripe Connect account details
 */
export interface StripeConnectDetails {
  accountId: string;
  status: StripeConnectStatus;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  onboardingCompletedAt?: string;
  lastUpdatedAt: string;
  email?: string;
  country?: string;
}

/**
 * Tenant branding configuration
 */
export interface TenantBranding {
  faviconUrl?: string;
  siteTitle?: string;
  siteDescription?: string;
  ogImage?: string;
}

/**
 * DNS management method
 */
export type DnsManagementMethod = "manual" | "cloudflare";
export type CloudflareZoneStatus = "pending" | "active" | "moved" | "deleted";

/**
 * Cloudflare DNS configuration
 */
export interface CloudflareDnsConfig {
  method: DnsManagementMethod;
  domain?: string;
  zoneId?: string;
  zoneStatus?: CloudflareZoneStatus;
  nameservers?: string[];
  recordIds?: {
    aRecord?: string;
    wwwCname?: string;
    mxRecord?: string;
    spfTxt?: string;
    dkim1Cname?: string;
    dkim2Cname?: string;
    dkim3Cname?: string;
  };
  zoneCreatedAt?: string;
  nsVerifiedAt?: string;
  recordsCreatedAt?: string;
}

/**
 * Tenant email configuration
 */
export interface TenantEmailConfig {
  domainEmail: string;
  sesIdentityArn?: string;
  sesVerificationStatus: SesVerificationStatus;
  sesDkimTokens?: string[];
  dkimVerified: boolean;
  dkimStatus?: DkimStatus;
  mxVerified: boolean;
  spfVerified?: boolean;
  forwardToEmail: string;
  forwardingEnabled: boolean;
  enabledAt?: string;
  verifiedAt?: string;
}

/**
 * DNS Record information
 */
export interface TenantDnsRecord {
  type: "MX" | "TXT" | "CNAME";
  name: string;
  value: string;
  priority?: number;
  purpose: string;
}

/**
 * Main Tenant entity (Expert profile with multi-tenancy)
 */
export interface Tenant extends BaseEntity {
  name: string;
  slug?: string;
  userId?: string;
  title: string;
  bio: string;
  avatar: string;
  profilePic?: string;
  rating: number;
  totalCourses: number;
  totalStudents: number;
  specializations: string[];
  featured: boolean;
  certifications?: string[];
  experience?: string;
  courses?: ExpertCourse[];
  socialLinks?: SocialLinks;
  onboardingCompleted?: boolean;
  promoVideo?: string;
  promoVideoCloudflareId?: string;
  promoVideoStatus?: "uploading" | "processing" | "ready" | "error";
  customLandingPage?: CustomLandingPageConfig;
  draftLandingPage?: CustomLandingPageConfig;
  isLandingPagePublished?: boolean;
  flaggedForReview?: boolean;
  flagReason?: string;
  flaggedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewStatus?: "pending" | "approved" | "rejected";
  platformPreferences?: ExpertPlatformPreferences;
  stripeConnect?: StripeConnectDetails;
  primaryDomain?: string;
  additionalDomains?: string[];
  featuredOnPlatform?: boolean;
  status?: TenantStatus;
  emailConfig?: TenantEmailConfig;
  branding?: TenantBranding;
  cloudflareDns?: CloudflareDnsConfig;
}

/**
 * Expert is an alias for Tenant
 */
export type Expert = Tenant;
