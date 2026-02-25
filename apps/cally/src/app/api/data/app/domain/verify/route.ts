/**
 * POST /api/data/app/domain/verify
 * Verify domain DNS configuration with Vercel
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  updateDomainConfig,
  updateAdditionalDomain,
  createDomainLookup,
} from "@/lib/repositories/tenantRepository";
import { verifyDomain, getDomainStatus } from "@/lib/vercel";

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
    console.log("[DBG][domain/verify] Verifying domain for user:", cognitoSub);

    // Parse optional domain from body
    let targetDomain: string | undefined;
    try {
      const body = await request.json();
      targetDomain = body.domain;
    } catch {
      // No body or invalid JSON — verify primary domain
    }

    // Get tenant by user ID
    const tenant = await getTenantByUserId(cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    // Determine which domain to verify
    const isAdditionalDomain =
      targetDomain &&
      (tenant.additionalDomains || []).some((d) => d.domain === targetDomain);
    const isPrimaryDomain =
      !targetDomain || targetDomain === tenant.domainConfig?.domain;

    if (!isPrimaryDomain && !isAdditionalDomain) {
      return NextResponse.json(
        { success: false, error: "Domain not found on this account" },
        { status: 400 },
      );
    }

    const domain = targetDomain || tenant.domainConfig?.domain;
    if (!domain) {
      return NextResponse.json(
        { success: false, error: "No domain configured" },
        { status: 400 },
      );
    }

    // Trigger verification with Vercel
    const verifyResult = await verifyDomain(domain);

    if (!verifyResult.success) {
      console.error(
        "[DBG][domain/verify] Verification failed:",
        verifyResult.error,
      );
      return NextResponse.json(
        { success: false, error: verifyResult.error || "Verification failed" },
        { status: 400 },
      );
    }

    // Get full status including config check
    const status = await getDomainStatus(domain);

    // Update tenant if newly verified and ensure domain lookup exists
    if (status.verified) {
      if (isAdditionalDomain) {
        const additionalDomainConfig = (tenant.additionalDomains || []).find(
          (d) => d.domain === domain,
        );
        if (additionalDomainConfig && !additionalDomainConfig.vercelVerified) {
          await updateAdditionalDomain(tenant.id, domain, {
            vercelVerified: true,
            vercelVerifiedAt: new Date().toISOString(),
          });
        }
      } else if (tenant.domainConfig && !tenant.domainConfig.vercelVerified) {
        await updateDomainConfig(tenant.id, {
          ...tenant.domainConfig,
          vercelVerified: true,
          vercelVerifiedAt: new Date().toISOString(),
        });
      }

      // Always ensure domain lookup record exists for routing
      await createDomainLookup(domain, tenant.id);
      console.log(
        "[DBG][domain/verify] Domain verified, lookup ensured for:",
        domain,
        "tenant:",
        tenant.id,
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        domain,
        verified: status.verified,
        verification: status.verification,
        message: status.verified
          ? "Domain is verified and ready to use."
          : "Domain verification pending. Make sure your nameservers are configured correctly.",
      },
    });
  } catch (error) {
    console.error("[DBG][domain/verify] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
