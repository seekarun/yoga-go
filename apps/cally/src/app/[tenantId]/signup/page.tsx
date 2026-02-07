/**
 * Visitor Signup Page
 * Route: /{tenantId}/signup
 * Allows visitors to sign up as subscribers of a tenant
 */
import { notFound } from "next/navigation";
import { getTenantById } from "@/lib/repositories/tenantRepository";
import VisitorSignupForm from "@/components/visitor/VisitorSignupForm";

interface PageProps {
  params: Promise<{
    tenantId: string;
  }>;
}

export default async function VisitorSignupPage({ params }: PageProps) {
  const { tenantId } = await params;

  console.log("[DBG][signup/page] Loading signup page for tenant:", tenantId);

  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    console.log("[DBG][signup/page] Tenant not found:", tenantId);
    notFound();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <VisitorSignupForm tenantId={tenantId} tenantName={tenant.name} />
    </div>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { tenantId } = await params;
  const tenant = await getTenantById(tenantId);

  if (!tenant) {
    return { title: "Not Found" };
  }

  return {
    title: `Sign Up — ${tenant.name}`,
    description: `Sign up for exclusive discounts and updates from ${tenant.name}`,
  };
}
