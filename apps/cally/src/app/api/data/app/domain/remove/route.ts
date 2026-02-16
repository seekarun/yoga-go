/**
 * DELETE /api/data/app/domain/remove
 * Remove domain from Vercel and clear tenant config
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  clearDomainAndEmailConfig,
  removeAdditionalDomain,
  deleteDomainLookup,
} from "@/lib/repositories/tenantRepository";
import { removeDomainFromVercel } from "@/lib/vercel";
import { deleteDomainIdentity } from "@/lib/ses";

export async function DELETE(request: Request) {
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

    // Parse optional domain from body
    let targetDomain: string | undefined;
    try {
      const body = await request.json();
      targetDomain = body.domain;
    } catch {
      // No body — remove primary domain
    }

    // Get tenant by user ID
    const tenant = await getTenantByUserId(cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    // Determine if this is an additional domain removal
    const isAdditionalDomain =
      targetDomain &&
      (tenant.additionalDomains || []).some((d) => d.domain === targetDomain);

    if (isAdditionalDomain && targetDomain) {
      // Remove additional domain
      console.log(
        "[DBG][domain/remove] Removing additional domain:",
        targetDomain,
      );

      // Remove from Vercel
      const result = await removeDomainFromVercel(targetDomain);
      if (!result.success) {
        console.error(
          "[DBG][domain/remove] Failed to remove additional domain from Vercel:",
          result.error,
        );
      }

      // Delete domain lookup record
      await deleteDomainLookup(targetDomain, tenant.id);

      // Remove from tenant's additionalDomains array
      await removeAdditionalDomain(tenant.id, targetDomain);

      console.log(
        "[DBG][domain/remove] Additional domain removed for tenant:",
        tenant.id,
      );

      return NextResponse.json({
        success: true,
        data: { message: "Domain removed successfully." },
      });
    }

    // Primary domain removal
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
      }
    }

    // Remove domain from Vercel
    const result = await removeDomainFromVercel(domain);
    if (!result.success) {
      console.error(
        "[DBG][domain/remove] Failed to remove domain from Vercel:",
        result.error,
      );
    }

    // Delete domain lookup record (bug fix: was missing before)
    await deleteDomainLookup(domain, tenant.id);

    // Clear domain and email config from tenant (preserves additionalDomains)
    await clearDomainAndEmailConfig(tenant.id);

    console.log("[DBG][domain/remove] Domain removed for tenant:", tenant.id);

    return NextResponse.json({
      success: true,
      data: { message: "Domain removed successfully." },
    });
  } catch (error) {
    console.error("[DBG][domain/remove] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
