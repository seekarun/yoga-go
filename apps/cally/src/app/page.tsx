/**
 * Root Landing Page — renders the platform tenant's landing page.
 *
 * Uses PLATFORM_TENANT_ID env var to identify which tenant's published
 * landing page to render at `/`. Falls back to a "Coming Soon" splash
 * if the tenant doesn't exist or hasn't published yet.
 */
import { Suspense } from "react";
import type { Metadata } from "next";
import { getTenantById } from "@/lib/repositories/tenantRepository";
import {
  buildLandingPageForTenant,
  buildTenantMetadata,
} from "@/lib/tenant-landing-page";
import LandingPageRenderer from "@/components/landing-page/LandingPageRenderer";
import { ChatWidgetWrapper } from "@/components/ai";
import ComingSoonFallback from "@/components/landing-page/ComingSoonFallback";

export const dynamic = "force-dynamic";

const PLATFORM_TENANT_ID = process.env.PLATFORM_TENANT_ID;

export default async function HomePage() {
  if (!PLATFORM_TENANT_ID) {
    console.log("[DBG][page] PLATFORM_TENANT_ID not set");
    return <ComingSoonFallback />;
  }

  const tenant = await getTenantById(PLATFORM_TENANT_ID);

  if (!tenant) {
    console.log("[DBG][page] Platform tenant not found:", PLATFORM_TENANT_ID);
    return <ComingSoonFallback />;
  }

  if (!tenant.isLandingPagePublished && !tenant.customLandingPage) {
    console.log("[DBG][page] Platform tenant landing page not published");
    return <ComingSoonFallback />;
  }

  const { landingPage, tenantData, activeProducts, jsonLd } =
    await buildLandingPageForTenant(tenant, PLATFORM_TENANT_ID);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense>
        <LandingPageRenderer
          config={landingPage}
          tenantId={PLATFORM_TENANT_ID}
          tenantData={tenantData}
          products={activeProducts}
          currency={tenant.currency ?? "AUD"}
          address={tenant.address}
          logo={tenant.logo}
          tenantName={tenant.name}
          contactForms={tenant.contactForms}
        />
      </Suspense>
      <ChatWidgetWrapper
        tenantId={PLATFORM_TENANT_ID}
        config={tenant.aiAssistantConfig}
      />
    </>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  if (!PLATFORM_TENANT_ID) {
    return {
      title: "CallyGo — Run your business, let CallyGo handle the rest",
    };
  }

  const tenant = await getTenantById(PLATFORM_TENANT_ID);
  if (!tenant) {
    return {
      title: "CallyGo — Run your business, let CallyGo handle the rest",
    };
  }

  return buildTenantMetadata(tenant, PLATFORM_TENANT_ID);
}
