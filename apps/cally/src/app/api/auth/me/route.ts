import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decode } from "next-auth/jwt";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";

/**
 * API route to get the current authenticated user
 * 1. Decode the session token
 * 2. Look up the tenant in DynamoDB by cognitoSub
 * 3. Return the user data with real tenantId
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("authjs.session-token")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    // Decode the session token
    const decoded = await decode({
      token: sessionToken,
      secret: process.env.NEXTAUTH_SECRET!,
      salt: "authjs.session-token",
    });

    if (!decoded) {
      return NextResponse.json(
        { success: false, error: "Invalid session" },
        { status: 401 },
      );
    }

    // Get cognitoSub from token
    const cognitoSub =
      (decoded as { cognitoSub?: string; sub?: string }).cognitoSub ||
      (decoded as { sub?: string }).sub;

    if (!cognitoSub) {
      return NextResponse.json(
        { success: false, error: "Invalid session - no user ID" },
        { status: 401 },
      );
    }

    console.log(
      "[DBG][api/auth/me] Looking up tenant for cognitoSub:",
      cognitoSub,
    );

    // Fetch tenant from DynamoDB using cognitoSub
    const tenant = await getTenantByUserId(cognitoSub);

    if (!tenant) {
      console.log("[DBG][api/auth/me] No tenant found for user:", cognitoSub);
      // User exists in Cognito but no tenant record
      // This could happen if tenant creation failed during signup
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    console.log("[DBG][api/auth/me] Found tenant:", tenant.id);

    // Return user object with real tenant ID
    const user = {
      id: cognitoSub,
      role: ["expert"],
      expertProfile: tenant.id,
      profile: {
        name: tenant.name || (decoded as { name?: string }).name || "User",
        email: tenant.email || (decoded as { email?: string }).email || "",
        avatar: tenant.avatar,
      },
    };

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("[DBG][api/auth/me] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
