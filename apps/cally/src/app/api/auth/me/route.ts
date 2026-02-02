import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decode } from "next-auth/jwt";

/**
 * API route to get the current authenticated user
 * For now, this is a placeholder - in production, you would:
 * 1. Decode the session token
 * 2. Look up the user in DynamoDB
 * 3. Return the user data
 *
 * Since cally shares infrastructure with yoga, we can use the same session.
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

    // For now, return a minimal user object
    // In production, you would fetch the full user from DynamoDB
    const cognitoSub =
      (decoded as { cognitoSub?: string; sub?: string }).cognitoSub ||
      (decoded as { sub?: string }).sub;

    if (!cognitoSub) {
      return NextResponse.json(
        { success: false, error: "Invalid session - no user ID" },
        { status: 401 },
      );
    }

    // TODO: Fetch user from DynamoDB using cognitoSub
    // For now, return a mock user
    const user = {
      id: cognitoSub,
      role: ["expert"],
      expertProfile: "demo", // This would come from DynamoDB
      profile: {
        name: (decoded as { name?: string }).name || "User",
        email: (decoded as { email?: string }).email || "",
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
