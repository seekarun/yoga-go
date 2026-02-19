/**
 * Cognito Authentication Functions
 * Direct Cognito API calls using AWS SDK for email/password auth
 */
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
  InitiateAuthCommand,
  GetUserCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  ChangePasswordCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { createHmac } from "crypto";
import { cognitoConfig } from "./cognito";

// Initialize Cognito client
const client = new CognitoIdentityProviderClient({
  region: cognitoConfig.region,
});

/**
 * Calculate SECRET_HASH for Cognito API calls
 * Required when using a client with a secret
 */
function calculateSecretHash(username: string): string {
  const message = username + cognitoConfig.clientId;
  const hmac = createHmac("sha256", cognitoConfig.clientSecret);
  hmac.update(message);
  return hmac.digest("base64");
}

export interface SignUpParams {
  email: string;
  password: string;
  name: string;
}

export interface SignUpResult {
  success: boolean;
  userSub?: string;
  message: string;
  requiresVerification: boolean;
}

/**
 * Register a new user with Cognito
 */
export async function signUp(params: SignUpParams): Promise<SignUpResult> {
  const { email, password, name } = params;

  const userAttributes = [
    { Name: "email", Value: email },
    { Name: "name", Value: name },
  ];

  try {
    const command = new SignUpCommand({
      ClientId: cognitoConfig.clientId,
      SecretHash: calculateSecretHash(email),
      Username: email,
      Password: password,
      UserAttributes: userAttributes,
    });

    const response = await client.send(command);

    return {
      success: true,
      userSub: response.UserSub,
      message:
        "Signup successful. Please check your email for verification code.",
      requiresVerification: !response.UserConfirmed,
    };
  } catch (error) {
    console.error("[DBG][cognito-auth] signUp error:", error);
    throw error;
  }
}

export interface ConfirmSignUpParams {
  email: string;
  code: string;
}

export interface ConfirmSignUpResult {
  success: boolean;
  message: string;
}

/**
 * Confirm user signup with verification code
 */
export async function confirmSignUp(
  params: ConfirmSignUpParams,
): Promise<ConfirmSignUpResult> {
  const { email, code } = params;

  try {
    const command = new ConfirmSignUpCommand({
      ClientId: cognitoConfig.clientId,
      SecretHash: calculateSecretHash(email),
      Username: email,
      ConfirmationCode: code,
    });

    await client.send(command);

    return {
      success: true,
      message: "Email verified successfully.",
    };
  } catch (error) {
    console.error("[DBG][cognito-auth] confirmSignUp error:", error);
    throw error;
  }
}

export interface ResendCodeParams {
  email: string;
}

export interface ResendCodeResult {
  success: boolean;
  message: string;
}

/**
 * Resend verification code
 */
export async function resendConfirmationCode(
  params: ResendCodeParams,
): Promise<ResendCodeResult> {
  const { email } = params;

  try {
    const command = new ResendConfirmationCodeCommand({
      ClientId: cognitoConfig.clientId,
      SecretHash: calculateSecretHash(email),
      Username: email,
    });

    await client.send(command);

    return {
      success: true,
      message: "Verification code sent to your email.",
    };
  } catch (error) {
    console.error("[DBG][cognito-auth] resendConfirmationCode error:", error);
    throw error;
  }
}

export interface SignInParams {
  email: string;
  password: string;
}

export interface SignInResult {
  success: boolean;
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  message: string;
}

/**
 * Authenticate user with Cognito
 */
export async function signIn(params: SignInParams): Promise<SignInResult> {
  const { email, password } = params;

  try {
    const command = new InitiateAuthCommand({
      ClientId: cognitoConfig.clientId,
      AuthFlow: "USER_PASSWORD_AUTH",
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
        SECRET_HASH: calculateSecretHash(email),
      },
    });

    const response = await client.send(command);

    if (response.AuthenticationResult) {
      return {
        success: true,
        accessToken: response.AuthenticationResult.AccessToken,
        idToken: response.AuthenticationResult.IdToken,
        refreshToken: response.AuthenticationResult.RefreshToken,
        expiresIn: response.AuthenticationResult.ExpiresIn,
        message: "Login successful.",
      };
    }

    // Handle challenges (MFA, new password required, etc.)
    if (response.ChallengeName) {
      return {
        success: false,
        message: `Authentication challenge required: ${response.ChallengeName}`,
      };
    }

    return {
      success: false,
      message: "Authentication failed.",
    };
  } catch (error) {
    console.error("[DBG][cognito-auth] signIn error:", error);
    throw error;
  }
}

export interface GetUserInfoParams {
  accessToken: string;
}

export interface CognitoUserInfo {
  sub: string;
  email: string;
  name?: string;
  emailVerified: boolean;
}

/**
 * Get user info from Cognito using access token
 */
export async function getUserInfo(
  params: GetUserInfoParams,
): Promise<CognitoUserInfo> {
  const { accessToken } = params;

  try {
    const command = new GetUserCommand({
      AccessToken: accessToken,
    });

    const response = await client.send(command);

    const attributes: Record<string, string> = {};
    response.UserAttributes?.forEach((attr) => {
      if (attr.Name && attr.Value) {
        attributes[attr.Name] = attr.Value;
      }
    });

    return {
      sub: attributes["sub"] || response.Username || "",
      email: attributes["email"] || "",
      name: attributes["name"],
      emailVerified: attributes["email_verified"] === "true",
    };
  } catch (error) {
    console.error("[DBG][cognito-auth] getUserInfo error:", error);
    throw error;
  }
}

export interface ForgotPasswordParams {
  email: string;
}

export interface ForgotPasswordResult {
  success: boolean;
  message: string;
}

/**
 * Initiate forgot password flow — sends a reset code to the user's email
 */
export async function forgotPassword(
  params: ForgotPasswordParams,
): Promise<ForgotPasswordResult> {
  const { email } = params;

  try {
    const command = new ForgotPasswordCommand({
      ClientId: cognitoConfig.clientId,
      SecretHash: calculateSecretHash(email),
      Username: email,
    });

    await client.send(command);

    return {
      success: true,
      message: "Password reset code sent to your email.",
    };
  } catch (error) {
    console.error("[DBG][cognito-auth] forgotPassword error:", error);
    throw error;
  }
}

export interface ConfirmForgotPasswordParams {
  email: string;
  code: string;
  newPassword: string;
}

export interface ConfirmForgotPasswordResult {
  success: boolean;
  message: string;
}

/**
 * Confirm forgot password — verifies the code and sets the new password
 */
export async function confirmForgotPassword(
  params: ConfirmForgotPasswordParams,
): Promise<ConfirmForgotPasswordResult> {
  const { email, code, newPassword } = params;

  try {
    const command = new ConfirmForgotPasswordCommand({
      ClientId: cognitoConfig.clientId,
      SecretHash: calculateSecretHash(email),
      Username: email,
      ConfirmationCode: code,
      Password: newPassword,
    });

    await client.send(command);

    return {
      success: true,
      message: "Password reset successfully.",
    };
  } catch (error) {
    console.error("[DBG][cognito-auth] confirmForgotPassword error:", error);
    throw error;
  }
}

export interface ChangePasswordParams {
  accessToken: string;
  previousPassword: string;
  proposedPassword: string;
}

export interface ChangePasswordResult {
  success: boolean;
  message: string;
}

/**
 * Change password for an authenticated user
 */
export async function changePassword(
  params: ChangePasswordParams,
): Promise<ChangePasswordResult> {
  const { accessToken, previousPassword, proposedPassword } = params;

  try {
    const command = new ChangePasswordCommand({
      AccessToken: accessToken,
      PreviousPassword: previousPassword,
      ProposedPassword: proposedPassword,
    });

    await client.send(command);

    return {
      success: true,
      message: "Password changed successfully.",
    };
  } catch (error) {
    console.error("[DBG][cognito-auth] changePassword error:", error);
    throw error;
  }
}

/**
 * Map Cognito error codes to user-friendly messages
 */
export function getCognitoErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "name" in error) {
    const errorName = (error as { name: string }).name;

    switch (errorName) {
      case "UsernameExistsException":
        return "An account with this email already exists. Please sign in instead.";
      case "InvalidPasswordException":
        return "Password must be at least 8 characters with uppercase, lowercase, and number.";
      case "CodeMismatchException":
        return "Invalid verification code. Please try again.";
      case "ExpiredCodeException":
        return "Verification code has expired. Please request a new one.";
      case "UserNotConfirmedException":
        return "Please verify your email before signing in.";
      case "NotAuthorizedException":
        return "Incorrect email or password.";
      case "UserNotFoundException":
        return "No account found with this email.";
      case "LimitExceededException":
        return "Too many attempts. Please try again later.";
      case "TooManyRequestsException":
        return "Too many requests. Please wait a moment and try again.";
      case "InvalidParameterException":
        return "Invalid input. Please check your details and try again.";
      default:
        return "An error occurred. Please try again.";
    }
  }
  return "An unexpected error occurred. Please try again.";
}

/**
 * Check if error is a specific Cognito error
 */
export function isCognitoError(error: unknown, errorName: string): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "name" in error &&
    (error as { name: string }).name === errorName
  );
}

export interface RefreshTokenParams {
  refreshToken: string;
  cognitoSub: string;
}

export interface RefreshTokenResult {
  success: boolean;
  accessToken?: string;
  idToken?: string;
  expiresIn?: number;
  message: string;
}

/**
 * Refresh access token using refresh token
 * Note: Cognito refresh does NOT return a new refresh token
 */
export async function refreshTokens(
  params: RefreshTokenParams,
): Promise<RefreshTokenResult> {
  const { refreshToken, cognitoSub } = params;

  try {
    console.log("[DBG][cognito-auth] Refreshing tokens for user:", cognitoSub);

    const command = new InitiateAuthCommand({
      ClientId: cognitoConfig.clientId,
      AuthFlow: "REFRESH_TOKEN_AUTH",
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
        SECRET_HASH: calculateSecretHash(cognitoSub),
      },
    });

    const response = await client.send(command);

    if (response.AuthenticationResult) {
      console.log("[DBG][cognito-auth] Token refresh successful");
      return {
        success: true,
        accessToken: response.AuthenticationResult.AccessToken,
        idToken: response.AuthenticationResult.IdToken,
        expiresIn: response.AuthenticationResult.ExpiresIn,
        message: "Token refreshed successfully.",
      };
    }

    return {
      success: false,
      message: "Token refresh failed.",
    };
  } catch (error) {
    console.error("[DBG][cognito-auth] refreshTokens error:", error);
    throw error;
  }
}
