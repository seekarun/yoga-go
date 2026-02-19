/**
 * GET /api/auth/mobile/me
 * Get current tenant for mobile clients using Authorization header
 * Expects: Authorization: Bearer <cognito-access-token>
 */
import { NextResponse } from "next/server";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import { getAccessTokenVerifier } from "@/lib/cognito";

export async function GET(request: Request) {
  console.log("[DBG][mobile/me] GET /api/auth/mobile/me called");

  try {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("[DBG][mobile/me] No Authorization header or invalid format");
      return NextResponse.json(
        { success: false, error: "Missing or invalid Authorization header" },
        { status: 401 },
      );
    }

    const token = authHeader.substring(7);
    const verifier = getAccessTokenVerifier();

    if (!verifier) {
      console.error("[DBG][mobile/me] Access token verifier not available");
      return NextResponse.json(
        { success: false, error: "Authentication service unavailable" },
        { status: 500 },
      );
    }

    let cognitoSub: string;
    try {
      const payload = await verifier.verify(token);
      cognitoSub = payload.sub;
      console.log(
        "[DBG][mobile/me] Cognito token verified for sub:",
        cognitoSub,
      );
    } catch (jwtError) {
      console.error("[DBG][mobile/me] Token verification failed:", jwtError);
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(cognitoSub);

    if (!tenant) {
      console.log("[DBG][mobile/me] Tenant not found for sub:", cognitoSub);
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    console.log("[DBG][mobile/me] Tenant found:", tenant.id);

    return NextResponse.json({
      success: true,
      data: {
        id: tenant.id,
        cognitoSub,
        email: tenant.email,
        name: tenant.name || "",
        tenantId: tenant.id,
      },
    });
  } catch (error) {
    console.error("[DBG][mobile/me] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
