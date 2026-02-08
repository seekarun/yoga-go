/**
 * Embed Contact Widget Page
 * Route: /embed/{tenantId}/contact
 *
 * Renders the contact form inside an iframe-friendly layout (no app shell).
 */
import { notFound } from "next/navigation";
import { getTenantById } from "@/lib/repositories/tenantRepository";
import EmbedContactWidget from "@/components/contact/EmbedContactWidget";

interface PageProps {
  params: Promise<{
    tenantId: string;
  }>;
}

export default async function EmbedContactPage({ params }: PageProps) {
  const { tenantId } = await params;

  console.log("[DBG][embed/contact/page] Loading embed contact for:", tenantId);

  const tenant = await getTenantById(tenantId);

  if (!tenant) {
    console.log("[DBG][embed/contact/page] Tenant not found:", tenantId);
    notFound();
  }

  return <EmbedContactWidget tenantId={tenantId} />;
}
