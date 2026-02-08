/**
 * Embed Booking Widget Page
 * Route: /embed/{tenantId}/booking
 *
 * Renders the booking widget inside an iframe-friendly layout (no app shell).
 */
import { notFound } from "next/navigation";
import { getTenantById } from "@/lib/repositories/tenantRepository";
import EmbedBookingWidget from "@/components/booking/EmbedBookingWidget";

interface PageProps {
  params: Promise<{
    tenantId: string;
  }>;
}

export default async function EmbedBookingPage({ params }: PageProps) {
  const { tenantId } = await params;

  console.log("[DBG][embed/booking/page] Loading embed booking for:", tenantId);

  const tenant = await getTenantById(tenantId);

  if (!tenant) {
    console.log("[DBG][embed/booking/page] Tenant not found:", tenantId);
    notFound();
  }

  return <EmbedBookingWidget tenantId={tenantId} />;
}
