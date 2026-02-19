/**
 * POST /api/auth/mobile/login
 * Mobile login endpoint — returns Cognito tokens in the response body
 * (instead of setting a cookie like the web version)
 */
import { NextResponse } from "next/server";
import {
  signIn,
  getUserInfo,
  getCognitoErrorMessage,
  isCognitoError,
} from "@/lib/cognito-auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";

interface LoginRequestBody {
  email: string;
  password: string;
}

export async function POST(request: Request) {
  console.log("[DBG][mobile/login] ========== MOBILE LOGIN ATTEMPT ==========");

  try {
    const body: LoginRequestBody = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required." },
        { status: 400 },
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log("[DBG][mobile/login] Attempting login for:", normalizedEmail);

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

    console.log("[DBG][mobile/login] Cognito authentication successful");

    // Get user info from Cognito
    const userInfo = await getUserInfo({
      accessToken: signInResult.accessToken,
    });

    console.log("[DBG][mobile/login] Got user info:", {
      sub: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
    });

    // Get tenant from DynamoDB
    const tenant = await getTenantByUserId(userInfo.sub);

    if (!tenant) {
      return NextResponse.json(
        {
          success: false,
          message: "No tenant account found. Please sign up via the web app.",
        },
        { status: 404 },
      );
    }

    console.log("[DBG][mobile/login] Tenant found:", tenant.id);

    return NextResponse.json({
      success: true,
      message: "Login successful.",
      accessToken: signInResult.accessToken,
      refreshToken: signInResult.refreshToken,
      expiresIn: signInResult.expiresIn || 3600,
      user: {
        id: tenant.id,
        cognitoSub: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name || tenant.name || "",
        tenantId: tenant.id,
      },
    });
  } catch (error) {
    console.error("[DBG][mobile/login] Error:", error);

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

    if (isCognitoError(error, "NotAuthorizedException")) {
      return NextResponse.json(
        { success: false, message: "Incorrect email or password." },
        { status: 401 },
      );
    }

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
