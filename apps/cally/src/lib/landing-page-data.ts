/**
 * Assembler for TenantLandingPageData
 *
 * Transforms raw server-side data (tenant, products, feedback) into
 * a public-safe, pre-computed data object for landing page sections.
 */

import type { CallyTenant } from "@/lib/repositories/tenantRepository";
import type { Product } from "@/types/product";
import type { FeedbackRequest } from "@/types/feedback";
import type {
  TenantLandingPageData,
  TenantLandingPageProduct,
  TenantLandingPageReview,
  TenantLandingPageStats,
} from "@/types/landing-page";

/**
 * Build a TenantLandingPageData object from raw server-side data.
 *
 * - Maps products to a trimmed public shape (no sortOrder, createdAt, etc.)
 * - Maps approved feedback to reviews (no email, token, etc.)
 * - Pre-computes stats (counts, average rating)
 * - Extracts public-safe booking info
 * - Builds canonical URL from domain config
 */
export function buildTenantLandingPageData(params: {
  tenant: CallyTenant;
  products: Product[];
  approvedFeedback: FeedbackRequest[];
}): TenantLandingPageData {
  const { tenant, products, approvedFeedback } = params;

  // Map products to public shape
  const publicProducts: TenantLandingPageProduct[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    durationMinutes: p.durationMinutes,
    price: p.price,
    images: p.images?.map((img) => ({ id: img.id, url: img.url })),
    isActive: p.isActive,
    productType: p.productType,
    maxParticipants: p.maxParticipants,
    signupCount: p.signupCount,
  }));

  // Map approved feedback to reviews (only those with a message)
  const reviews: TenantLandingPageReview[] = approvedFeedback
    .filter((f) => f.message)
    .map((f) => ({
      id: f.id,
      rating: f.rating,
      message: f.message!,
      authorName: f.recipientName,
      submittedAt: f.submittedAt,
    }));

  // Compute stats
  const ratingsWithValues = reviews
    .map((r) => r.rating)
    .filter((r): r is number => r != null);

  const stats: TenantLandingPageStats = {
    totalProducts: products.length,
    totalReviews: reviews.length,
    averageRating:
      ratingsWithValues.length > 0
        ? Math.round(
            (ratingsWithValues.reduce((sum, r) => sum + r, 0) /
              ratingsWithValues.length) *
              10,
          ) / 10
        : null,
    totalWebinars: products.filter((p) => p.productType === "webinar").length,
  };

  // Build canonical URL
  const domain = tenant.domainConfig?.domain;
  const baseUrl = domain
    ? `https://${domain}`
    : `https://proj-cally.vercel.app/${tenant.id}`;

  // Extract public-safe booking info
  const booking = tenant.bookingConfig
    ? {
        timezone: tenant.bookingConfig.timezone,
        slotDurationMinutes: tenant.bookingConfig.slotDurationMinutes,
        lookaheadDays: tenant.bookingConfig.lookaheadDays,
      }
    : undefined;

  return {
    tenantId: tenant.id,
    name: tenant.name,
    avatar: tenant.avatar,
    logo: tenant.logo,
    address: tenant.address,
    currency: tenant.currency,
    timezone: tenant.timezone,
    products: publicProducts,
    reviews,
    stats,
    booking,
    domain,
    baseUrl,
  };
}
