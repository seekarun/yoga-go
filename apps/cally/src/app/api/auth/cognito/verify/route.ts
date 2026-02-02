/**
 * POST /api/auth/cognito/verify
 * Verify email with confirmation code
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  confirmSignUp,
  getCognitoErrorMessage,
  isCognitoError,
} from "@/lib/cognito-auth";

interface VerifyRequestBody {
  email: string;
  code: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: VerifyRequestBody = await request.json();
    const { email, code } = body;

    // Validate required fields
    if (!email || !code) {
      return NextResponse.json(
        {
          success: false,
          message: "Email and verification code are required.",
        },
        { status: 400 },
      );
    }

    console.log("[DBG][verify] Attempting verification for:", email);

    // Confirm signup with Cognito
    const result = await confirmSignUp({
      email: email.toLowerCase().trim(),
      code: code.trim(),
    });

    console.log("[DBG][verify] Verification result:", result);

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("[DBG][verify] Error:", error);

    // Handle invalid code
    if (isCognitoError(error, "CodeMismatchException")) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid verification code. Please try again.",
        },
        { status: 400 },
      );
    }

    // Handle expired code
    if (isCognitoError(error, "ExpiredCodeException")) {
      return NextResponse.json(
        {
          success: false,
          message: "Verification code has expired. Please request a new one.",
          code: "CODE_EXPIRED",
        },
        { status: 400 },
      );
    }

    const message = getCognitoErrorMessage(error);
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
