/**
 * Sign In API Route
 *
 * POST /auth/signin
 * Authenticates user and returns session tokens.
 */

import { NextResponse } from "next/server";
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  NotAuthorizedException,
  UserNotFoundException,
  UserNotConfirmedException,
} from "@aws-sdk/client-cognito-identity-provider";
import { setSessionCookies } from "@/lib/auth-server";

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || "ap-southeast-2",
});

const CLIENT_ID = process.env.COGNITO_CLIENT_ID || "";

interface SignInRequest {
  email: string;
  password: string;
}

export async function POST(request: Request) {
  console.log("[DBG][auth/signin] Processing signin request");

  try {
    const body: SignInRequest = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Email and password are required",
          },
        },
        { status: 400 },
      );
    }

    // Sign in via Cognito
    const command = new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    });

    const result = await cognitoClient.send(command);
    const authResult = result.AuthenticationResult;

    if (!authResult || !authResult.AccessToken || !authResult.IdToken) {
      console.error("[DBG][auth/signin] No auth result");
      return NextResponse.json(
        {
          success: false,
          error: { code: "AUTH_FAILED", message: "Authentication failed" },
        },
        { status: 401 },
      );
    }

    console.log("[DBG][auth/signin] User authenticated:", email);

    // Set session cookies
    await setSessionCookies(
      authResult.AccessToken,
      authResult.IdToken,
      authResult.RefreshToken,
    );

    // Decode ID token to get user info
    const idTokenPayload = JSON.parse(
      Buffer.from(authResult.IdToken.split(".")[1], "base64").toString(),
    );

    return NextResponse.json({
      success: true,
      data: {
        user: {
          email: idTokenPayload.email,
          sub: idTokenPayload.sub,
          tenantId: idTokenPayload["custom:tenantId"],
          tenantName: idTokenPayload["custom:tenantName"],
        },
        expiresIn: authResult.ExpiresIn,
      },
    });
  } catch (error) {
    console.error("[DBG][auth/signin] Error:", error);

    if (error instanceof NotAuthorizedException) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password",
          },
        },
        { status: 401 },
      );
    }

    if (error instanceof UserNotFoundException) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "No account found with this email",
          },
        },
        { status: 404 },
      );
    }

    if (error instanceof UserNotConfirmedException) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "USER_NOT_CONFIRMED",
            message: "Please verify your email before signing in",
          },
        },
        { status: 403 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SIGNIN_FAILED",
          message: "Failed to sign in",
        },
      },
      { status: 500 },
    );
  }
}
