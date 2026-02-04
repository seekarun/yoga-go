/**
 * DELETE /api/data/app/domain/remove
 * Remove domain from Vercel and clear tenant config
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  clearDomainAndEmailConfig,
} from "@/lib/repositories/tenantRepository";
import { removeDomainFromVercel } from "@/lib/vercel";
import { deleteDomainIdentity } from "@/lib/ses";

export async function DELETE() {
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
    console.log("[DBG][domain/remove] Removing domain for user:", cognitoSub);

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

    // Remove SES identity if email was configured
    if (tenant.emailConfig?.domainEmail) {
      try {
        await deleteDomainIdentity(domain);
        console.log("[DBG][domain/remove] SES identity deleted for:", domain);
      } catch (sesError) {
        console.error(
          "[DBG][domain/remove] Failed to delete SES identity:",
          sesError,
        );
        // Continue with domain removal even if SES deletion fails
      }
    }

    // Remove domain from Vercel
    const result = await removeDomainFromVercel(domain);

    if (!result.success) {
      console.error(
        "[DBG][domain/remove] Failed to remove domain from Vercel:",
        result.error,
      );
      // Continue to clear config even if Vercel removal fails
    }

    // Clear domain and email config from tenant
    await clearDomainAndEmailConfig(tenant.id);

    console.log("[DBG][domain/remove] Domain removed for tenant:", tenant.id);

    return NextResponse.json({
      success: true,
      data: {
        message: "Domain removed successfully.",
      },
    });
  } catch (error) {
    console.error("[DBG][domain/remove] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
