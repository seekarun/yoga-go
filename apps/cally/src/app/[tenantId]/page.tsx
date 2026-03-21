/**
 * Public Landing Page for Tenant
 * Route: /{tenantId}
 */
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTenantById } from "@/lib/repositories/tenantRepository";
import {
  buildLandingPageForTenant,
  buildTenantMetadata,
} from "@/lib/tenant-landing-page";
import LandingPageRenderer from "@/components/landing-page/LandingPageRenderer";
import { ChatWidgetWrapper } from "@/components/ai";

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

  const { landingPage, tenantData, activeProducts, jsonLd } =
    await buildLandingPageForTenant(tenant, tenantId);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPageRenderer
        config={landingPage}
        tenantId={tenantId}
        tenantData={tenantData}
        products={activeProducts}
        currency={tenant.currency ?? "AUD"}
        address={tenant.address}
        logo={tenant.logo}
        tenantName={tenant.name}
        contactForms={tenant.contactForms}
      />
      <ChatWidgetWrapper
        tenantId={tenantId}
        config={tenant.aiAssistantConfig}
      />
    </>
  );
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { tenantId } = await params;
  const tenant = await getTenantById(tenantId);

  if (!tenant) {
    return { title: "Not Found" };
  }

  return buildTenantMetadata(tenant, tenantId);
}
