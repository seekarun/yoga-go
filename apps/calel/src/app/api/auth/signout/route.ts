/**
 * Sign Out API Route
 *
 * POST /auth/signout
 * Clears session cookies and signs out user.
 */

import { NextResponse } from "next/server";
import { clearSessionCookies } from "@/lib/auth-server";

export async function POST() {
  console.log("[DBG][auth/signout] Processing signout request");

  try {
    // Clear session cookies
    await clearSessionCookies();

    console.log("[DBG][auth/signout] User signed out");

    return NextResponse.json({
      success: true,
      data: {
        message: "Signed out successfully",
      },
    });
  } catch (error) {
    console.error("[DBG][auth/signout] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SIGNOUT_FAILED",
          message: "Failed to sign out",
        },
      },
      { status: 500 },
    );
  }
}
