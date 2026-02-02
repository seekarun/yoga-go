/**
 * POST /api/auth/cognito/signup
 * Register a new user with Cognito
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  signUp,
  getCognitoErrorMessage,
  isCognitoError,
} from "@/lib/cognito-auth";

interface SignupRequestBody {
  email: string;
  password: string;
  name: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SignupRequestBody = await request.json();
    const { email, password, name } = body;

    // Validate required fields
    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, message: "Email, password, and name are required." },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    // Validate password length (Cognito requires 8+)
    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          message: "Password must be at least 8 characters.",
        },
        { status: 400 },
      );
    }

    console.log("[DBG][signup] Attempting signup for:", email);

    // Sign up with Cognito
    const result = await signUp({
      email: email.toLowerCase().trim(),
      password,
      name: name.trim(),
    });

    console.log("[DBG][signup] Cognito signup result:", {
      success: result.success,
      userSub: result.userSub,
      requiresVerification: result.requiresVerification,
    });

    return NextResponse.json({
      success: true,
      message: result.message,
      email: email.toLowerCase().trim(),
      requiresVerification: result.requiresVerification,
    });
  } catch (error) {
    console.error("[DBG][signup] Error:", error);

    // Handle user already exists
    if (isCognitoError(error, "UsernameExistsException")) {
      return NextResponse.json(
        {
          success: false,
          message:
            "An account with this email already exists. Please sign in instead.",
          code: "USER_EXISTS",
        },
        { status: 409 },
      );
    }

    const message = getCognitoErrorMessage(error);
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
