/**
 * Shared logic for building a tenant's landing page data.
 * Used by both / (platform tenant) and /[tenantId] routes.
 */
import type { Metadata } from "next";
import type { CallyTenant } from "@/lib/repositories/tenantRepository";
import { getApprovedFeedback } from "@/lib/repositories/feedbackRepository";
import { getActiveProducts } from "@/lib/repositories/productRepository";
import { countWebinarSignups } from "@/lib/repositories/webinarSignupRepository";
import { DEFAULT_LANDING_PAGE_CONFIG } from "@/types/landing-page";
import type {
  Testimonial,
  GalleryImage,
  SimpleLandingPageConfig,
} from "@/types/landing-page";
import type { Product } from "@/types";
import { buildTenantLandingPageData } from "@/lib/landing-page-data";
import type { TenantLandingPageData } from "@/types/landing-page";

export interface TenantLandingPageResult {
  landingPage: SimpleLandingPageConfig;
  tenantData: TenantLandingPageData;
  activeProducts: Product[];
  jsonLd: Record<string, unknown>;
}

/**
 * Build all the data needed to render a tenant landing page.
 * Fetches products, feedback, enriches webinar counts, and assembles config.
 */
export async function buildLandingPageForTenant(
  tenant: CallyTenant,
  tenantId: string,
): Promise<TenantLandingPageResult> {
  // Get landing page config - use published version, with defaults
  const landingPage: SimpleLandingPageConfig = {
    ...DEFAULT_LANDING_PAGE_CONFIG,
    ...tenant.customLandingPage,
  };

  // Pad feature cards to 4 from defaults if tenant has fewer
  const defaultFeatureCards = DEFAULT_LANDING_PAGE_CONFIG.features?.cards || [];
  if (
    landingPage.features &&
    landingPage.features.cards.length < 4 &&
    defaultFeatureCards.length >= 4
  ) {
    landingPage.features = {
      ...landingPage.features,
      cards: [
        ...landingPage.features.cards,
        ...defaultFeatureCards.slice(landingPage.features.cards.length, 4),
      ],
    };
  }

  // Fetch active products and feedback in parallel
  const [approvedFeedback, activeProductsRaw] = await Promise.all([
    getApprovedFeedback(tenantId),
    getActiveProducts(tenantId),
  ]);

  // Enrich webinar products with signup counts
  const activeProducts = await Promise.all(
    activeProductsRaw.map(async (p) => {
      if (p.productType === "webinar") {
        const signupCount = await countWebinarSignups(tenantId, p.id);
        return { ...p, signupCount };
      }
      return p;
    }),
  );

  if (approvedFeedback.length > 0) {
    const feedbackTestimonials: Testimonial[] = approvedFeedback
      .filter((f) => f.message && f.recipientName)
      .map((f) => ({
        id: `feedback-${f.id}`,
        quote: f.message!,
        authorName: f.recipientName,
        rating: f.rating,
      }));

    if (feedbackTestimonials.length > 0) {
      const existingTestimonials = landingPage.testimonials?.testimonials || [];
      landingPage.testimonials = {
        ...landingPage.testimonials,
        testimonials: [...feedbackTestimonials, ...existingTestimonials],
      };

      // Auto-enable testimonials section if there are approved items
      if (landingPage.sections) {
        landingPage.sections = landingPage.sections.map((s) =>
          s.id === "testimonials" ? { ...s, enabled: true } : s,
        );
      }
    }
  }

  // If gallery has no user-curated images, populate from product images.
  const galleryImages = landingPage.gallery?.images || [];
  const hasOnlyDefaults =
    galleryImages.length > 0 &&
    galleryImages.every((img) => img.id.startsWith("gallery-default-"));
  if (
    (galleryImages.length === 0 || hasOnlyDefaults) &&
    activeProducts.length > 0
  ) {
    const productGalleryImages: GalleryImage[] = activeProducts.flatMap((p) => {
      const imgs =
        p.images && p.images.length > 0
          ? p.images.map((img) => ({
              id: `product-${p.id}-${img.id}`,
              url: img.url,
              caption: p.name,
            }))
          : p.image
            ? [{ id: `product-${p.id}-legacy`, url: p.image, caption: p.name }]
            : [];
      return imgs;
    });

    if (productGalleryImages.length > 0) {
      landingPage.gallery = {
        ...landingPage.gallery,
        heading: landingPage.gallery?.heading || "Gallery",
        subheading: landingPage.gallery?.subheading || "",
        images: productGalleryImages,
      };
    }
  }

  // Assemble rich data model for sections
  const tenantData = buildTenantLandingPageData({
    tenant,
    products: activeProducts,
    approvedFeedback,
  });

  // Build canonical URL for structured data
  const domain = tenant.domainConfig?.domain;
  const baseUrl = domain
    ? `https://${domain}`
    : `https://proj-cally.vercel.app/${tenantId}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: tenant.name,
    description: landingPage.seo?.description || landingPage.subtitle,
    ...(tenant.address && {
      address: {
        "@type": "PostalAddress",
        streetAddress: tenant.address,
      },
    }),
    ...(landingPage.seo?.ogImage && { image: landingPage.seo.ogImage }),
    url: baseUrl,
  };

  return { landingPage, tenantData, activeProducts, jsonLd };
}

/**
 * Build Next.js Metadata for a tenant landing page.
 */
export function buildTenantMetadata(
  tenant: CallyTenant,
  tenantId: string,
): Metadata {
  const lp = tenant.customLandingPage;
  const seo = lp?.seo;

  const title = seo?.title || lp?.title || tenant.name;
  const description =
    seo?.description || lp?.subtitle || `Welcome to ${tenant.name}'s page`;
  const ogImage = seo?.ogImage || lp?.backgroundImage;
  const favicon = seo?.favicon;

  const domain = tenant.domainConfig?.domain;
  const baseUrl = domain
    ? `https://${domain}`
    : `https://proj-cally.vercel.app/${tenantId}`;

  return {
    title,
    description,
    keywords: seo?.keywords,
    openGraph: {
      title,
      description,
      type: "website",
      url: baseUrl,
      ...(ogImage && { images: [{ url: ogImage, width: 1200, height: 630 }] }),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      ...(ogImage && { images: [ogImage] }),
    },
    alternates: {
      canonical: baseUrl,
    },
    ...(favicon && {
      icons: {
        icon: favicon,
        shortcut: favicon,
        apple: favicon,
      },
    }),
  };
}
