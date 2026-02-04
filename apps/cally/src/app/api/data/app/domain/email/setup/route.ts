/**
 * POST /api/data/app/domain/email/setup
 * Set up email for the domain via SES
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  updateEmailConfig,
} from "@/lib/repositories/tenantRepository";
import { createDomainIdentity, getDnsRecordsForDomain } from "@/lib/ses";
import type { SetupEmailResponse } from "@/types/domain";

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
    console.log("[DBG][email/setup] Setting up email for user:", cognitoSub);

    // Parse request body
    const body = await request.json();
    const {
      emailPrefix = "hello",
      forwardToEmail,
    }: { emailPrefix?: string; forwardToEmail: string } = body;

    if (!forwardToEmail || typeof forwardToEmail !== "string") {
      return NextResponse.json(
        { success: false, error: "Forward-to email is required" },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forwardToEmail)) {
      return NextResponse.json(
        { success: false, error: "Invalid forward-to email format" },
        { status: 400 },
      );
    }

    // Validate email prefix (alphanumeric, dots, dashes, underscores)
    const prefixRegex = /^[a-zA-Z0-9._-]+$/;
    if (!prefixRegex.test(emailPrefix)) {
      return NextResponse.json(
        { success: false, error: "Invalid email prefix format" },
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

    // Check if tenant has a verified domain
    if (!tenant.domainConfig?.domain) {
      return NextResponse.json(
        { success: false, error: "No domain configured. Add a domain first." },
        { status: 400 },
      );
    }

    if (!tenant.domainConfig.vercelVerified) {
      return NextResponse.json(
        {
          success: false,
          error: "Domain not verified. Verify your domain first.",
        },
        { status: 400 },
      );
    }

    const domain = tenant.domainConfig.domain;
    const domainEmail = `${emailPrefix}@${domain}`;

    // Create SES domain identity
    const sesResult = await createDomainIdentity(domain);

    // Get DNS records that need to be added
    const dnsRecords = getDnsRecordsForDomain(domain, sesResult.dkimTokens);

    // Save email config to tenant
    await updateEmailConfig(tenant.id, {
      domainEmail,
      emailPrefix,
      sesVerificationStatus: "pending",
      sesDkimTokens: sesResult.dkimTokens,
      dkimVerified: sesResult.verificationStatus === "SUCCESS",
      dkimStatus: sesResult.verificationStatus,
      mxVerified: false,
      spfVerified: false,
      forwardToEmail,
      forwardingEnabled: false,
      enabledAt: new Date().toISOString(),
    });

    console.log(
      "[DBG][email/setup] Email setup initiated for tenant:",
      tenant.id,
      "email:",
      domainEmail,
    );

    const response: SetupEmailResponse = {
      domainEmail,
      dkimTokens: sesResult.dkimTokens,
      dnsRecordsAdded: false, // DNS records need to be added manually or via Vercel API
      verificationStatus: "pending",
    };

    return NextResponse.json({
      success: true,
      data: {
        ...response,
        dnsRecords,
        instructions:
          "Add the following DNS records to your domain. Once added, email verification will complete automatically.",
      },
    });
  } catch (error) {
    console.error("[DBG][email/setup] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
