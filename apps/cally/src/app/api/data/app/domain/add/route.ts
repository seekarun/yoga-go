/**
 * POST /api/data/app/domain/add
 * Add a domain to Vercel for the tenant
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  updateDomainConfig,
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
    const { domain } = body;

    if (!domain || typeof domain !== "string") {
      return NextResponse.json(
        { success: false, error: "Domain is required" },
        { status: 400 },
      );
    }

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
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

    // Check if tenant already has a domain configured
    if (tenant.domainConfig?.domain) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A domain is already configured. Remove it first before adding a new one.",
        },
        { status: 400 },
      );
    }

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

        if (existingLookup) {
          // Another tenant in DynamoDB still owns this domain — reject
          console.error(
            "[DBG][domain/add] Domain owned by tenant:",
            existingLookup.tenantId,
          );
          return NextResponse.json(
            {
              success: false,
              error: "This domain is already associated with another account.",
            },
            { status: 400 },
          );
        }

        // No tenant owns it in DynamoDB — domain is orphaned in Vercel (previous tenant was deleted)
        // Try to remove from Vercel then re-add so it's properly assigned to our project
        console.log(
          "[DBG][domain/add] Domain orphaned in Vercel, removing and re-adding for tenant:",
          tenant.id,
        );

        // Remove may fail (e.g. nameserver issue) — that's OK, try re-add anyway
        const removeResult = await removeDomainFromVercel(normalizedDomain);
        console.log(
          "[DBG][domain/add] Vercel remove result:",
          removeResult.success,
          removeResult.error,
        );

        // Re-add to ensure it's on our project
        const retryResult = await addDomainToVercel(normalizedDomain);
        if (!retryResult.success) {
          // If still failing, check if domain is already on our project
          const existingStatus = await getDomainStatus(normalizedDomain);
          if (!existingStatus.exists) {
            console.error(
              "[DBG][domain/add] Cannot reclaim orphaned domain:",
              retryResult.error,
            );
            return NextResponse.json(
              {
                success: false,
                error: `Cannot reclaim domain. It may still be registered in Vercel. Try removing it from the Vercel dashboard first.`,
              },
              { status: 400 },
            );
          }
          // Domain is already on our project — proceed
          console.log(
            "[DBG][domain/add] Domain already on our project, proceeding",
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

    // Save domain config to tenant
    await updateDomainConfig(tenant.id, {
      domain: normalizedDomain,
      addedAt: new Date().toISOString(),
      vercelVerified: status.verified,
      vercelVerifiedAt: status.verified ? new Date().toISOString() : undefined,
    });

    console.log(
      "[DBG][domain/add] Domain added for tenant:",
      tenant.id,
      "verified:",
      status.verified,
    );

    // Vercel nameservers - standard for all domains
    const nameservers = ["ns1.vercel-dns.com", "ns2.vercel-dns.com"];

    const response: AddDomainResponse = {
      domain: normalizedDomain,
      verified: status.verified,
      nameservers,
      verification: result.verification,
      instructions: status.verified
        ? "Domain is verified and ready to use."
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
