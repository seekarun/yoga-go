/**
 * POST /api/auth/cognito/resend-code
 * Resend verification code
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  resendConfirmationCode,
  getCognitoErrorMessage,
  isCognitoError,
} from "@/lib/cognito-auth";

interface ResendCodeRequestBody {
  email: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ResendCodeRequestBody = await request.json();
    const { email } = body;

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required." },
        { status: 400 },
      );
    }

    console.log("[DBG][resend-code] Resending verification code for:", email);

    // Resend code with Cognito
    const result = await resendConfirmationCode({
      email: email.toLowerCase().trim(),
    });

    console.log("[DBG][resend-code] Result:", result);

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("[DBG][resend-code] Error:", error);

    // Handle rate limiting
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
