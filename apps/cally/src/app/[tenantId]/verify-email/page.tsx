/**
 * Verify Email Page
 * Route: /{tenantId}/verify-email
 * Allows visitors to verify their email after signup
 */
import { notFound } from "next/navigation";
import { getTenantById } from "@/lib/repositories/tenantRepository";
import VerifyEmailForm from "@/components/visitor/VerifyEmailForm";

interface PageProps {
  params: Promise<{
    tenantId: string;
  }>;
}

export default async function VerifyEmailPage({ params }: PageProps) {
  const { tenantId } = await params;

  console.log(
    "[DBG][verify-email/page] Loading verify page for tenant:",
    tenantId,
  );

  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    console.log("[DBG][verify-email/page] Tenant not found:", tenantId);
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
      <VerifyEmailForm tenantId={tenantId} tenantName={tenant.name} />
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
    title: `Verify Email — ${tenant.name}`,
    description: `Verify your email to complete signup with ${tenant.name}`,
  };
}
