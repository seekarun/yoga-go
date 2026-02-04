/**
 * POST /api/data/app/domain/verify
 * Verify domain DNS configuration with Vercel
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  updateDomainConfig,
} from "@/lib/repositories/tenantRepository";
import { verifyDomain, getDomainStatus } from "@/lib/vercel";

export async function POST() {
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

    // Get tenant by user ID
    const tenant = await getTenantByUserId(cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    // Check if tenant has a domain configured
    if (!tenant.domainConfig?.domain) {
      return NextResponse.json(
        { success: false, error: "No domain configured" },
        { status: 400 },
      );
    }

    const domain = tenant.domainConfig.domain;

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

    // Update tenant if newly verified
    if (status.verified && !tenant.domainConfig.vercelVerified) {
      await updateDomainConfig(tenant.id, {
        ...tenant.domainConfig,
        vercelVerified: true,
        vercelVerifiedAt: new Date().toISOString(),
      });
      console.log(
        "[DBG][domain/verify] Domain verified for tenant:",
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
          : "Domain verification pending. Make sure your nameservers are pointing to Vercel.",
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
