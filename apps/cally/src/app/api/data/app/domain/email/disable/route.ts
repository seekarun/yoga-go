/**
 * DELETE /api/data/app/domain/email/disable
 * Disable email for the domain (remove SES identity)
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  updateEmailConfig,
  deleteDomainLookup,
} from "@/lib/repositories/tenantRepository";
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
    console.log("[DBG][email/disable] Disabling email for user:", cognitoSub);

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

    // Delete SES domain identity
    try {
      await deleteDomainIdentity(domain);
      console.log("[DBG][email/disable] SES identity deleted for:", domain);
    } catch (sesError) {
      console.error(
        "[DBG][email/disable] Failed to delete SES identity:",
        sesError,
      );
      // Continue to clear config even if SES deletion fails
    }

    // Delete domain lookup from yoga-go-core
    // This stops the SES email-forwarder Lambda from routing emails to this tenant
    try {
      await deleteDomainLookup(domain, tenant.id);
      console.log("[DBG][email/disable] Domain lookup deleted for:", domain);
    } catch (lookupError) {
      console.error(
        "[DBG][email/disable] Failed to delete domain lookup:",
        lookupError,
      );
      // Continue to clear config even if lookup deletion fails
    }

    // Clear email config from tenant
    await updateEmailConfig(tenant.id, undefined);

    console.log("[DBG][email/disable] Email disabled for tenant:", tenant.id);

    return NextResponse.json({
      success: true,
      data: {
        message:
          "Email disabled successfully. DNS records can be removed from your domain.",
      },
    });
  } catch (error) {
    console.error("[DBG][email/disable] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
