/**
 * POST /api/data/app/domain/purchase
 * Purchase a domain via GoDaddy, configure NS, add to Vercel, save to tenant
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  updateDomainConfig,
  addAdditionalDomain,
} from "@/lib/repositories/tenantRepository";
import {
  checkDomainAvailability,
  purchaseDomain,
  setDomainNameservers,
  getDomainDetails,
} from "@/lib/godaddy";
import { addDomainToVercel } from "@/lib/vercel";
import type { DomainPurchaseResponse } from "@/types/domain";

const VERCEL_NAMESERVERS = ["ns1.vercel-dns.com", "ns2.vercel-dns.com"];

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const cognitoSub = session.user.cognitoSub;

    // Parse request body
    const body = await request.json();
    const { domain } = body;

    if (!domain || typeof domain !== "string") {
      return NextResponse.json(
        { success: false, error: "Domain is required" },
        { status: 400 },
      );
    }

    const normalizedDomain = domain.toLowerCase().trim();
    console.log(
      "[DBG][domain/purchase] Purchase request for:",
      normalizedDomain,
      "by user:",
      cognitoSub,
    );

    // Get tenant
    const tenant = await getTenantByUserId(cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    // Check for duplicate across primary + additional domains
    const allDomains = [
      tenant.domainConfig?.domain,
      ...(tenant.additionalDomains || []).map((d) => d.domain),
    ].filter(Boolean);

    if (allDomains.includes(normalizedDomain)) {
      return NextResponse.json(
        {
          success: false,
          error: "This domain is already configured on your account.",
        },
        { status: 400 },
      );
    }

    const hasPrimaryDomain = !!tenant.domainConfig?.domain;

    // Re-check availability (race condition guard)
    const baseName = normalizedDomain.replace(/\.[a-z.]+$/, "");
    const availabilityResults = await checkDomainAvailability(baseName);
    const targetResult = availabilityResults.find(
      (r) => r.domain.toLowerCase() === normalizedDomain,
    );

    if (!targetResult?.available) {
      return NextResponse.json(
        {
          success: false,
          error: "This domain is no longer available for purchase.",
        },
        { status: 409 },
      );
    }

    // Purchase the domain via GoDaddy
    console.log("[DBG][domain/purchase] Purchasing via GoDaddy...");
    const purchaseResult = await purchaseDomain(normalizedDomain);

    if (!purchaseResult.success) {
      const status =
        purchaseResult.errorCode === "INSUFFICIENT_FUNDS" ? 402 : 500;
      return NextResponse.json(
        {
          success: false,
          error: purchaseResult.error || "Domain purchase failed",
        },
        { status },
      );
    }

    // Ensure nameservers point to Vercel (belt and suspenders - purchaseDomain sets them too)
    console.log("[DBG][domain/purchase] Setting nameservers to Vercel...");
    const nsResult = await setDomainNameservers(
      normalizedDomain,
      VERCEL_NAMESERVERS,
    );
    if (!nsResult.success) {
      console.error(
        "[DBG][domain/purchase] NS update failed (non-fatal):",
        nsResult.error,
      );
    }

    // Add domain to Vercel project
    console.log("[DBG][domain/purchase] Adding domain to Vercel...");
    const vercelResult = await addDomainToVercel(normalizedDomain);
    if (!vercelResult.success) {
      console.error(
        "[DBG][domain/purchase] Vercel add failed (non-fatal):",
        vercelResult.error,
      );
    }

    // Get domain details for renewal date
    const details = await getDomainDetails(normalizedDomain);
    const renewalDate =
      details.details?.expires ||
      new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    // Save domain config with purchase metadata — primary if first, otherwise additional
    const now = new Date().toISOString();
    const newDomainConfig = {
      domain: normalizedDomain,
      addedAt: now,
      vercelVerified: false, // Will verify once NS propagate
      purchaseConfig: {
        domain: normalizedDomain,
        purchasedAt: now,
        godaddyOrderId: purchaseResult.orderId!,
        registrar: "godaddy" as const,
        renewalDate,
        autoRenew: true,
        purchasedBy: "callygo" as const,
        nameservers: VERCEL_NAMESERVERS,
      },
    };

    if (!hasPrimaryDomain) {
      await updateDomainConfig(tenant.id, newDomainConfig);
    } else {
      await addAdditionalDomain(tenant.id, newDomainConfig);
    }

    console.log(
      "[DBG][domain/purchase] Domain purchased and saved for tenant:",
      tenant.id,
    );

    const response: DomainPurchaseResponse = {
      domain: normalizedDomain,
      orderId: purchaseResult.orderId!,
      vercelAdded: vercelResult.success,
      renewalDate,
    };

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("[DBG][domain/purchase] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
