/**
 * POST /api/data/app/domain/add
 * Add a domain to Vercel for the tenant
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  updateDomainConfig,
  addAdditionalDomain,
  getDomainLookup,
  createDomainLookup,
} from "@/lib/repositories/tenantRepository";
import { addDomainToVercel, getDomainStatus } from "@/lib/vercel";
import type { AddDomainResponse } from "@/types/domain";

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
    console.log("[DBG][domain/add] Adding domain for user:", cognitoSub);

    // Parse request body
    const body = await request.json();
    const { domain, dnsManagement = "vercel" } = body as {
      domain: string;
      dnsManagement?: "vercel" | "self";
    };

    if (!domain || typeof domain !== "string") {
      return NextResponse.json(
        { success: false, error: "Domain is required" },
        { status: 400 },
      );
    }

    // Validate domain format (supports multi-part TLDs like .com.au, .co.uk)
    const domainRegex =
      /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    const normalizedDomain = domain.toLowerCase().trim();
    if (!domainRegex.test(normalizedDomain)) {
      return NextResponse.json(
        { success: false, error: "Invalid domain format" },
        { status: 400 },
      );
    }

    // Get tenant by user ID
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

    // Add domain to Vercel
    const result = await addDomainToVercel(normalizedDomain);

    if (!result.success) {
      // If Vercel says domain is already in use, check if any tenant in DynamoDB owns it
      const isAlreadyInUse =
        result.error?.includes("already in use") ||
        result.error?.includes("domain_already_in_use");

      if (isAlreadyInUse) {
        console.log(
          "[DBG][domain/add] Domain already in use, checking DynamoDB ownership",
        );
        const existingLookup = await getDomainLookup(normalizedDomain);

        if (existingLookup && existingLookup.tenantId !== tenant.id) {
          // Another tenant in DynamoDB owns this domain — reject
          console.error(
            "[DBG][domain/add] Domain owned by tenant:",
            existingLookup.tenantId,
          );
          return NextResponse.json(
            {
              success: false,
              error:
                "This domain is already taken. If you own this domain, please contact support.",
            },
            { status: 400 },
          );
        }

        // No other tenant owns it in DynamoDB — safe to proceed.
        // The domain is either already on our project or was previously configured.
        console.log(
          "[DBG][domain/add] No other tenant owns this domain, proceeding. conflictProjectId:",
          result.conflictProjectId,
        );
      } else {
        console.error(
          "[DBG][domain/add] Failed to add domain to Vercel:",
          result.error,
        );
        return NextResponse.json(
          { success: false, error: result.error || "Failed to add domain" },
          { status: 400 },
        );
      }
    }

    // Get domain status to check if it's already verified
    const status = await getDomainStatus(normalizedDomain);

    // Save domain config — primary if first domain, otherwise additional
    const newDomainConfig = {
      domain: normalizedDomain,
      addedAt: new Date().toISOString(),
      vercelVerified: status.verified,
      vercelVerifiedAt: status.verified ? new Date().toISOString() : undefined,
      dnsManagement,
    };

    if (!hasPrimaryDomain) {
      await updateDomainConfig(tenant.id, newDomainConfig);
    } else {
      await addAdditionalDomain(tenant.id, newDomainConfig);
    }

    // Create domain lookup record so middleware can route custom domain requests
    if (status.verified) {
      await createDomainLookup(normalizedDomain, tenant.id);
      console.log(
        "[DBG][domain/add] Domain lookup created for verified domain:",
        normalizedDomain,
      );
    }

    console.log(
      "[DBG][domain/add] Domain added for tenant:",
      tenant.id,
      "verified:",
      status.verified,
    );

    // Vercel nameservers - standard for all domains
    const nameservers = ["ns1.vercel-dns.com", "ns2.vercel-dns.com"];

    // Build DNS records for self-managed domains
    const selfManagedRecords =
      dnsManagement === "self"
        ? [
            {
              type: "A" as const,
              name: "@",
              value: "76.76.21.21",
              purpose: "Points your root domain to CallyGo",
            },
            {
              type: "CNAME" as const,
              name: "www",
              value: "cname.vercel-dns.com",
              purpose: "Points www subdomain to CallyGo",
            },
            // Include Vercel TXT verification record if present
            ...(status.verification || []).map((v) => ({
              type: "TXT" as const,
              name: v.name,
              value: v.value,
              purpose: "Domain ownership verification",
            })),
          ]
        : undefined;

    const response: AddDomainResponse = {
      domain: normalizedDomain,
      verified: status.verified,
      nameservers,
      dnsManagement,
      dnsRecords: selfManagedRecords,
      verification: result.verification,
      instructions: status.verified
        ? "Domain is verified and ready to use."
        : dnsManagement === "self"
          ? "Add the DNS records shown above at your domain registrar. DNS changes can take up to 48 hours to propagate."
          : "Update your domain's nameservers at your registrar to the values shown above. DNS changes can take up to 48 hours to propagate.",
    };

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("[DBG][domain/add] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
