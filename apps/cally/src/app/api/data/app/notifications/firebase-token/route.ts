/**
 * GET /api/data/app/notifications/firebase-token
 *
 * Returns a Firebase custom token for the authenticated tenant.
 * The client uses this to sign into Firebase Auth, enabling
 * secure RTDB subscriptions with auth.uid === tenantId.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { ApiResponse } from "@/types";
import { auth } from "@/auth";
import { getMobileAuthResult } from "@/lib/mobile-auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import { createFirebaseCustomToken } from "@/lib/firebase-admin";

export async function GET(request: NextRequest) {
  console.log("[DBG][firebase-token] GET called");

  try {
    const mobileAuth = await getMobileAuthResult(request);
    let cognitoSub: string | undefined;

    if (mobileAuth.session) {
      cognitoSub = mobileAuth.session.cognitoSub;
    } else if (mobileAuth.tokenExpired) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Token expired" },
        { status: 401 },
      );
    } else {
      const session = await auth();
      cognitoSub = session?.user?.cognitoSub;
    }

    if (!cognitoSub) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(cognitoSub);
    if (!tenant) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const token = await createFirebaseCustomToken(tenant.id);
    if (!token) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Failed to create Firebase token" },
        { status: 500 },
      );
    }

    console.log(`[DBG][firebase-token] Created token for tenant ${tenant.id}`);

    return NextResponse.json<ApiResponse<{ token: string }>>({
      success: true,
      data: { token },
    });
  } catch (error) {
    console.error("[DBG][firebase-token] Error:", error);
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create Firebase token",
      },
      { status: 500 },
    );
  }
}
