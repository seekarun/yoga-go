/**
 * Sign Up API Route
 *
 * POST /auth/signup
 * Creates a new user account via Cognito.
 */

import { NextResponse } from "next/server";
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  UsernameExistsException,
  InvalidPasswordException,
  InvalidParameterException,
} from "@aws-sdk/client-cognito-identity-provider";

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || "ap-southeast-2",
});

const CLIENT_ID = process.env.COGNITO_CLIENT_ID || "";

interface SignUpRequest {
  email: string;
  password: string;
  givenName?: string;
  familyName?: string;
}

export async function POST(request: Request) {
  console.log("[DBG][auth/signup] Processing signup request");

  try {
    const body: SignUpRequest = await request.json();
    const { email, password, givenName, familyName } = body;

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

    // Build user attributes
    const userAttributes = [{ Name: "email", Value: email }];

    if (givenName) {
      userAttributes.push({ Name: "given_name", Value: givenName });
    }

    if (familyName) {
      userAttributes.push({ Name: "family_name", Value: familyName });
    }

    // Sign up via Cognito
    const command = new SignUpCommand({
      ClientId: CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: userAttributes,
    });

    const result = await cognitoClient.send(command);

    console.log("[DBG][auth/signup] User created:", result.UserSub);

    return NextResponse.json({
      success: true,
      data: {
        userSub: result.UserSub,
        confirmationRequired: !result.UserConfirmed,
        codeDeliveryDetails: result.CodeDeliveryDetails
          ? {
              destination: result.CodeDeliveryDetails.Destination,
              deliveryMedium: result.CodeDeliveryDetails.DeliveryMedium,
            }
          : undefined,
      },
    });
  } catch (error) {
    console.error("[DBG][auth/signup] Error:", error);

    if (error instanceof UsernameExistsException) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "USER_EXISTS",
            message: "An account with this email already exists",
          },
        },
        { status: 409 },
      );
    }

    if (error instanceof InvalidPasswordException) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_PASSWORD",
            message:
              "Password must be at least 8 characters with uppercase, lowercase, and numbers",
          },
        },
        { status: 400 },
      );
    }

    if (error instanceof InvalidParameterException) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_PARAMETER",
            message: (error as Error).message || "Invalid input",
          },
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SIGNUP_FAILED",
          message: "Failed to create account",
        },
      },
      { status: 500 },
    );
  }
}
