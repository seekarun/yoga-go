/**
 * GET /api/data/app/domain/email/verify
 * Check email DNS verification status
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  updateEmailConfig,
  createDomainLookup,
} from "@/lib/repositories/tenantRepository";
import { verifyAllDnsRecords } from "@/lib/ses";
import type { EmailVerifyResponse } from "@/types/domain";

export async function GET() {
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
    console.log(
      "[DBG][email/verify] Checking email verification for user:",
      cognitoSub,
    );

    // Get tenant by user ID
    const tenant = await getTenantByUserId(cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    // Check if email is configured
    if (!tenant.emailConfig?.domainEmail || !tenant.domainConfig?.domain) {
      return NextResponse.json(
        { success: false, error: "Email not configured" },
        { status: 400 },
      );
    }

    const domain = tenant.domainConfig.domain;

    // Verify all DNS records
    const verification = await verifyAllDnsRecords(domain);

    // Update email config with verification status
    const sesVerificationStatus = verification.allVerified
      ? "verified"
      : "pending";

    await updateEmailConfig(tenant.id, {
      ...tenant.emailConfig,
      mxVerified: verification.mxVerified,
      spfVerified: verification.spfVerified,
      dkimVerified: verification.dkimVerified,
      dkimStatus: verification.dkimStatus,
      sesVerificationStatus,
      forwardingEnabled: verification.allVerified,
      verifiedAt: verification.allVerified
        ? new Date().toISOString()
        : undefined,
    });

    // If verification succeeded, create domain lookup in yoga-go-core
    // This allows the SES email-forwarder Lambda to route emails to this tenant
    if (verification.allVerified) {
      try {
        await createDomainLookup(domain, tenant.id);
        console.log(
          "[DBG][email/verify] Created domain lookup for:",
          domain,
          "tenant:",
          tenant.id,
        );
      } catch (lookupError) {
        console.error(
          "[DBG][email/verify] Failed to create domain lookup:",
          lookupError,
        );
        // Continue - email is still verified, just lookup may need retry
      }
    }

    console.log(
      "[DBG][email/verify] Verification status for tenant:",
      tenant.id,
      "allVerified:",
      verification.allVerified,
    );

    const response: EmailVerifyResponse = {
      mxVerified: verification.mxVerified,
      spfVerified: verification.spfVerified,
      dkimVerified: verification.dkimVerified,
      dkimStatus: verification.dkimStatus,
      allVerified: verification.allVerified,
    };

    return NextResponse.json({
      success: true,
      data: {
        ...response,
        domainEmail: tenant.emailConfig.domainEmail,
        message: verification.allVerified
          ? "Email is fully configured and ready to use."
          : "DNS verification pending. Some records are not yet configured or propagated.",
      },
    });
  } catch (error) {
    console.error("[DBG][email/verify] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
