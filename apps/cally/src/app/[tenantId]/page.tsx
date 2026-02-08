/**
 * Public Landing Page for Tenant
 * Route: /{tenantId}
 */
import { notFound } from "next/navigation";
import { getTenantById } from "@/lib/repositories/tenantRepository";
import { DEFAULT_LANDING_PAGE_CONFIG } from "@/types/landing-page";
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

  return <LandingPageRenderer config={landingPage} tenantId={tenantId} />;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps) {
  const { tenantId } = await params;
  const tenant = await getTenantById(tenantId);

  if (!tenant) {
    return {
      title: "Not Found",
    };
  }

  return {
    title: tenant.customLandingPage?.title || tenant.name,
    description:
      tenant.customLandingPage?.subtitle || `Welcome to ${tenant.name}'s page`,
  };
}
