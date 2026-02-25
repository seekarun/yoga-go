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
} from "@/lib/repositories/tenantRepository";
import {
  addDomainToVercel,
  getDomainStatus,
  removeDomainFromVercel,
} from "@/lib/vercel";
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
          "[DBG][domain/add] Domain already in Vercel, checking DynamoDB ownership",
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

        // No other tenant owns it — check if domain is on our project or another
        const existingStatus = await getDomainStatus(normalizedDomain);
        if (existingStatus.exists) {
          // Domain is already on our project — just reuse it
          console.log(
            "[DBG][domain/add] Domain already on our project, reusing for tenant:",
            tenant.id,
          );
        } else if (result.conflictProjectId) {
          // Domain is on a different project in our team — move it
          console.log(
            "[DBG][domain/add] Domain on another project, moving from:",
            result.conflictProjectId,
          );
          const removeResult = await removeDomainFromVercel(
            normalizedDomain,
            result.conflictProjectId,
          );
          if (!removeResult.success) {
            console.error(
              "[DBG][domain/add] Failed to remove from other project:",
              removeResult.error,
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
          // Re-add to our project
          const retryResult = await addDomainToVercel(normalizedDomain);
          if (!retryResult.success) {
            console.error(
              "[DBG][domain/add] Failed to re-add after move:",
              retryResult.error,
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
        } else {
          // No project ID available — cannot reclaim
          console.error(
            "[DBG][domain/add] Domain in use, no conflict project ID available",
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
              purpose: "Vercel domain ownership verification",
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
