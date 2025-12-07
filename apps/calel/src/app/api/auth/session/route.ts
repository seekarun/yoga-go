/**
 * Session API Route
 *
 * GET /auth/session
 * Returns current user session.
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-server";

export async function GET() {
  console.log("[DBG][auth/session] Getting session");

  try {
    const session = await getSession();

    if (!session.isAuthenticated) {
      return NextResponse.json({
        success: true,
        data: {
          isAuthenticated: false,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        isAuthenticated: true,
        user: session.user,
      },
    });
  } catch (error) {
    console.error("[DBG][auth/session] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SESSION_ERROR",
          message: "Failed to get session",
        },
      },
      { status: 500 },
    );
  }
}
