/**
 * PATCH /api/data/app/domain/email/forward-to-cal
 * Toggle forwarding domain emails to Cal AI inbox
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  updateEmailConfig,
  updateDomainLookupForwardToCal,
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
    console.log(
      "[DBG][forward-to-cal] Toggling forwardToCal for user:",
      cognitoSub,
    );

    const body = await request.json();
    const { forwardToCal } = body as { forwardToCal: boolean };

    if (typeof forwardToCal !== "boolean") {
      return NextResponse.json(
        { success: false, error: "forwardToCal must be a boolean" },
        { status: 400 },
      );
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

    await updateEmailConfig(tenant.id, {
      ...tenant.emailConfig,
      forwardToCal,
    });

    // Sync to yoga-go-core so the SES Lambda picks up the change
    try {
      await updateDomainLookupForwardToCal(tenant.id, forwardToCal);
    } catch (syncError) {
      console.error(
        "[DBG][forward-to-cal] Failed to sync to domain lookup:",
        syncError,
      );
      // Non-fatal - cally-main is the source of truth
    }

    console.log(
      "[DBG][forward-to-cal] Updated forwardToCal to",
      forwardToCal,
      "for tenant:",
      tenant.id,
    );

    return NextResponse.json({
      success: true,
      data: { forwardToCal },
    });
  } catch (error) {
    console.error("[DBG][forward-to-cal] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
