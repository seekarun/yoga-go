/**
 * GET /api/data/app/domain/status
 * Get current domain and email configuration status
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import type { DomainStatusResponse } from "@/types/domain";

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
      "[DBG][domain/status] Getting domain status for user:",
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

    const response: DomainStatusResponse = {
      hasDomain: !!tenant.domainConfig?.domain,
      domain: tenant.domainConfig?.domain,
      domainConfig: tenant.domainConfig,
      emailConfig: tenant.emailConfig,
    };

    console.log(
      "[DBG][domain/status] Status retrieved for tenant:",
      tenant.id,
      "hasDomain:",
      response.hasDomain,
    );

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("[DBG][domain/status] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
