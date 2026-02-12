/**
 * POST /api/auth/cognito/reset-password
 * Confirm forgot password — verify code and set new password
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  confirmForgotPassword,
  getCognitoErrorMessage,
  isCognitoError,
} from "@/lib/cognito-auth";

interface ResetPasswordRequestBody {
  email: string;
  code: string;
  newPassword: string;
}

export async function POST(request: NextRequest) {
  console.log("[DBG][reset-password] ========== RESET PASSWORD ==========");

  try {
    const body: ResetPasswordRequestBody = await request.json();
    const { email, code, newPassword } = body;

    if (!email || !code || !newPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "Email, code, and new password are required.",
        },
        { status: 400 },
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        {
          success: false,
          message: "Password must be at least 8 characters.",
        },
        { status: 400 },
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log(
      "[DBG][reset-password] Resetting password for:",
      normalizedEmail,
    );

    const result = await confirmForgotPassword({
      email: normalizedEmail,
      code: code.trim(),
      newPassword,
    });

    return NextResponse.json({
      success: result.success,
      message: result.message,
    });
  } catch (error) {
    console.error("[DBG][reset-password] Error:", error);

    if (isCognitoError(error, "CodeMismatchException")) {
      return NextResponse.json(
        { success: false, message: "Invalid reset code. Please try again." },
        { status: 400 },
      );
    }

    if (isCognitoError(error, "ExpiredCodeException")) {
      return NextResponse.json(
        {
          success: false,
          message: "Reset code has expired. Please request a new one.",
        },
        { status: 400 },
      );
    }

    if (isCognitoError(error, "InvalidPasswordException")) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Password must be at least 8 characters with uppercase, lowercase, and number.",
        },
        { status: 400 },
      );
    }

    const message = getCognitoErrorMessage(error);
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
