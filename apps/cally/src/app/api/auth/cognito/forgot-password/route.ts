/**
 * POST /api/auth/cognito/forgot-password
 * Initiate forgot password flow — sends reset code to email
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  forgotPassword,
  getCognitoErrorMessage,
  isCognitoError,
} from "@/lib/cognito-auth";

interface ForgotPasswordRequestBody {
  email: string;
}

export async function POST(request: NextRequest) {
  console.log("[DBG][forgot-password] ========== FORGOT PASSWORD ==========");

  try {
    const body: ForgotPasswordRequestBody = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required." },
        { status: 400 },
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log(
      "[DBG][forgot-password] Requesting reset for:",
      normalizedEmail,
    );

    const result = await forgotPassword({ email: normalizedEmail });

    return NextResponse.json({
      success: result.success,
      message: result.message,
    });
  } catch (error) {
    console.error("[DBG][forgot-password] Error:", error);

    // Don't reveal if user exists — return success anyway
    if (isCognitoError(error, "UserNotFoundException")) {
      return NextResponse.json({
        success: true,
        message:
          "If an account exists with this email, a reset code has been sent.",
      });
    }

    if (isCognitoError(error, "LimitExceededException")) {
      return NextResponse.json(
        {
          success: false,
          message: "Too many attempts. Please try again later.",
        },
        { status: 429 },
      );
    }

    const message = getCognitoErrorMessage(error);
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
