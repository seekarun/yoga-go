/**
 * Embed Chat Widget Page
 * Route: /embed/{tenantId}/chat
 *
 * Renders the AI chat widget inside an iframe-friendly layout (no app shell).
 * The chat panel is always open and fills the iframe.
 */
import { notFound } from "next/navigation";
import { getTenantById } from "@/lib/repositories/tenantRepository";
import EmbedChatWidget from "@/components/ai/EmbedChatWidget";

interface PageProps {
  params: Promise<{
    tenantId: string;
  }>;
}

export default async function EmbedChatPage({ params }: PageProps) {
  const { tenantId } = await params;

  console.log("[DBG][embed/chat/page] Loading embed chat for:", tenantId);

  const tenant = await getTenantById(tenantId);

  if (!tenant) {
    console.log("[DBG][embed/chat/page] Tenant not found:", tenantId);
    notFound();
  }

  return <EmbedChatWidget tenantId={tenantId} />;
}
