/**
 * PATCH /api/data/app/domain/email/forwarding
 * Update email forwarding settings (address or enable/disable)
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  updateEmailConfig,
  updateDomainLookupForwardToEmail,
} from "@/lib/repositories/tenantRepository";

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const cognitoSub = session.user.cognitoSub;
    console.log("[DBG][forwarding] Updating forwarding for user:", cognitoSub);

    const body = await request.json();
    const { forwardToEmail, forwardingEnabled } = body as {
      forwardToEmail?: string;
      forwardingEnabled?: boolean;
    };

    if (forwardToEmail !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (forwardToEmail && !emailRegex.test(forwardToEmail)) {
        return NextResponse.json(
          { success: false, error: "Invalid email address" },
          { status: 400 },
        );
      }
    }

    const tenant = await getTenantByUserId(cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    if (!tenant.emailConfig) {
      return NextResponse.json(
        { success: false, error: "Email not configured" },
        { status: 400 },
      );
    }

    const updatedConfig = { ...tenant.emailConfig };

    if (forwardToEmail !== undefined) {
      updatedConfig.forwardToEmail = forwardToEmail;
    }
    if (forwardingEnabled !== undefined) {
      updatedConfig.forwardingEnabled = forwardingEnabled;
    }

    await updateEmailConfig(tenant.id, updatedConfig);

    // Sync forwardToEmail to yoga-go-core so the SES Lambda picks up the change
    if (forwardToEmail !== undefined) {
      try {
        await updateDomainLookupForwardToEmail(tenant.id, forwardToEmail);
      } catch (syncError) {
        console.error(
          "[DBG][forwarding] Failed to sync to domain lookup:",
          syncError,
        );
      }
    }

    console.log("[DBG][forwarding] Updated forwarding for tenant:", tenant.id, {
      forwardToEmail,
      forwardingEnabled,
    });

    return NextResponse.json({
      success: true,
      data: {
        forwardToEmail: updatedConfig.forwardToEmail,
        forwardingEnabled: updatedConfig.forwardingEnabled,
      },
    });
  } catch (error) {
    console.error("[DBG][forwarding] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
