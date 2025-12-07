/**
 * Confirm Email API Route
 *
 * POST /auth/confirm
 * Confirms user's email with verification code.
 */

import { NextResponse } from "next/server";
import {
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
  CodeMismatchException,
  ExpiredCodeException,
  UserNotFoundException,
} from "@aws-sdk/client-cognito-identity-provider";

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || "ap-southeast-2",
});

const CLIENT_ID = process.env.COGNITO_CLIENT_ID || "";

interface ConfirmRequest {
  email: string;
  code: string;
}

interface ResendRequest {
  email: string;
}

/**
 * POST - Confirm email with code
 */
export async function POST(request: Request) {
  console.log("[DBG][auth/confirm] Processing confirm request");

  try {
    const body: ConfirmRequest = await request.json();
    const { email, code } = body;

    // Validate input
    if (!email || !code) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Email and code are required",
          },
        },
        { status: 400 },
      );
    }

    // Confirm via Cognito
    const command = new ConfirmSignUpCommand({
      ClientId: CLIENT_ID,
      Username: email,
      ConfirmationCode: code,
    });

    await cognitoClient.send(command);

    console.log("[DBG][auth/confirm] Email confirmed:", email);

    return NextResponse.json({
      success: true,
      data: {
        confirmed: true,
        message: "Email confirmed successfully. You can now sign in.",
      },
    });
  } catch (error) {
    console.error("[DBG][auth/confirm] Error:", error);

    if (error instanceof CodeMismatchException) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CODE",
            message: "Invalid verification code",
          },
        },
        { status: 400 },
      );
    }

    if (error instanceof ExpiredCodeException) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "EXPIRED_CODE",
            message: "Verification code has expired. Please request a new one.",
          },
        },
        { status: 400 },
      );
    }

    if (error instanceof UserNotFoundException) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found",
          },
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CONFIRM_FAILED",
          message: "Failed to confirm email",
        },
      },
      { status: 500 },
    );
  }
}

/**
 * PUT - Resend confirmation code
 */
export async function PUT(request: Request) {
  console.log("[DBG][auth/confirm] Processing resend request");

  try {
    const body: ResendRequest = await request.json();
    const { email } = body;

    // Validate input
    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Email is required" },
        },
        { status: 400 },
      );
    }

    // Resend via Cognito
    const command = new ResendConfirmationCodeCommand({
      ClientId: CLIENT_ID,
      Username: email,
    });

    const result = await cognitoClient.send(command);

    console.log("[DBG][auth/confirm] Code resent to:", email);

    return NextResponse.json({
      success: true,
      data: {
        destination: result.CodeDeliveryDetails?.Destination,
        message: "Verification code sent",
      },
    });
  } catch (error) {
    console.error("[DBG][auth/confirm] Resend error:", error);

    if (error instanceof UserNotFoundException) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found",
          },
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "RESEND_FAILED",
          message: "Failed to resend verification code",
        },
      },
      { status: 500 },
    );
  }
}
