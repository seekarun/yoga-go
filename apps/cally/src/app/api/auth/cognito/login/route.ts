/**
 * POST /api/auth/cognito/login
 * Authenticate user with Cognito and create session
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  signIn,
  getUserInfo,
  getCognitoErrorMessage,
  isCognitoError,
} from "@/lib/cognito-auth";
import { encode } from "next-auth/jwt";
import { COOKIE_DOMAIN, IS_PRODUCTION } from "@/config/env";

interface LoginRequestBody {
  email: string;
  password: string;
}

export async function POST(request: NextRequest) {
  console.log("[DBG][login] ========== LOGIN ATTEMPT ==========");

  try {
    const body: LoginRequestBody = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required." },
        { status: 400 },
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log("[DBG][login] Attempting login for:", normalizedEmail);

    // Authenticate with Cognito
    const signInResult = await signIn({
      email: normalizedEmail,
      password,
    });

    if (!signInResult.success || !signInResult.accessToken) {
      return NextResponse.json(
        { success: false, message: signInResult.message },
        { status: 401 },
      );
    }

    console.log("[DBG][login] Cognito authentication successful");

    // Get user info from Cognito
    const userInfo = await getUserInfo({
      accessToken: signInResult.accessToken,
    });

    console.log("[DBG][login] Got user info:", {
      sub: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
    });

    // Create NextAuth JWT token
    const token = await encode({
      token: {
        cognitoSub: userInfo.sub,
        sub: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name,
      },
      secret: process.env.NEXTAUTH_SECRET!,
      salt: "authjs.session-token",
    });

    // Create response with session cookie
    const response = NextResponse.json({
      success: true,
      message: "Login successful.",
      redirectUrl: "/srv",
    });

    // Set the session cookie
    const cookieOptions: {
      httpOnly: boolean;
      secure: boolean;
      sameSite: "lax" | "strict" | "none";
      path: string;
      maxAge: number;
      domain?: string;
    } = {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    };

    // Set domain for production to work across subdomains
    if (COOKIE_DOMAIN) {
      cookieOptions.domain = COOKIE_DOMAIN;
    }

    response.cookies.set("authjs.session-token", token, cookieOptions);
    console.log("[DBG][login] Session cookie set");

    return response;
  } catch (error) {
    console.error("[DBG][login] Error:", error);

    // Handle user not confirmed
    if (isCognitoError(error, "UserNotConfirmedException")) {
      return NextResponse.json(
        {
          success: false,
          message: "Please verify your email before signing in.",
          code: "USER_NOT_CONFIRMED",
        },
        { status: 403 },
      );
    }

    // Handle incorrect credentials
    if (isCognitoError(error, "NotAuthorizedException")) {
      return NextResponse.json(
        { success: false, message: "Incorrect email or password." },
        { status: 401 },
      );
    }

    // Handle user not found
    if (isCognitoError(error, "UserNotFoundException")) {
      return NextResponse.json(
        { success: false, message: "No account found with this email." },
        { status: 404 },
      );
    }

    const message = getCognitoErrorMessage(error);
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
