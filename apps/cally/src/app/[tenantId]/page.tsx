/**
 * Public Landing Page for Tenant
 * Route: /{tenantId}
 */
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTenantById } from "@/lib/repositories/tenantRepository";
import { getApprovedFeedback } from "@/lib/repositories/feedbackRepository";
import { getActiveProducts } from "@/lib/repositories/productRepository";
import { DEFAULT_LANDING_PAGE_CONFIG } from "@/types/landing-page";
import type { Testimonial } from "@/types/landing-page";
import LandingPageRenderer from "@/components/landing-page/LandingPageRenderer";

interface PageProps {
  params: Promise<{
    tenantId: string;
  }>;
}

export default async function TenantLandingPage({ params }: PageProps) {
  const { tenantId } = await params;

  console.log("[DBG][tenantId/page] Loading landing page for:", tenantId);

  // Fetch tenant from DynamoDB
  const tenant = await getTenantById(tenantId);

  if (!tenant) {
    console.log("[DBG][tenantId/page] Tenant not found:", tenantId);
    notFound();
  }

  // Check if landing page is published
  if (!tenant.isLandingPagePublished && !tenant.customLandingPage) {
    console.log("[DBG][tenantId/page] Landing page not published:", tenantId);
    // Show a placeholder or redirect
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          textAlign: "center",
          background: "#f8fafc",
        }}
      >
        <h1
          style={{
            fontSize: "24px",
            fontWeight: "600",
            color: "#1e293b",
            marginBottom: "12px",
          }}
        >
          {tenant.name}
        </h1>
        <p
          style={{
            fontSize: "16px",
            color: "#64748b",
          }}
        >
          This page is coming soon.
        </p>
      </div>
    );
  }

  // Get landing page config - use published version, with defaults
  const landingPage = {
    ...DEFAULT_LANDING_PAGE_CONFIG,
    ...tenant.customLandingPage,
  };

  // Fetch active products and feedback in parallel
  const [approvedFeedback, activeProducts] = await Promise.all([
    getApprovedFeedback(tenantId),
    getActiveProducts(tenantId),
  ]);
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

  // Build canonical URL for structured data
  const domain = tenant.domainConfig?.domain;
  const baseUrl = domain
    ? `https://${domain}`
    : `https://cally.live/${tenantId}`;

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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPageRenderer
        config={landingPage}
        tenantId={tenantId}
        products={activeProducts}
        currency={tenant.currency ?? "AUD"}
        address={tenant.address}
      />
    </>
  );
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps) {
  const { tenantId } = await params;
  const tenant = await getTenantById(tenantId);

  if (!tenant) {
    return { title: "Not Found" };
  }

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
    : `https://cally.live/${tenantId}`;

  const metadata: Metadata = {
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

  return metadata;
}
