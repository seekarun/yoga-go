/**
 * POST /api/auth/cognito/change-password
 * Authenticated password change — verifies current password, sets new one
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import {
  signIn,
  changePassword,
  getCognitoErrorMessage,
  isCognitoError,
} from "@/lib/cognito-auth";

interface ChangePasswordRequestBody {
  currentPassword: string;
  newPassword: string;
}

export async function POST(_request: NextRequest) {
  console.log("[DBG][change-password] ========== CHANGE PASSWORD ==========");

  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json(
        { success: false, message: "Not authenticated." },
        { status: 401 },
      );
    }

    const body: ChangePasswordRequestBody = await _request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "Current password and new password are required.",
        },
        { status: 400 },
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        {
          success: false,
          message: "New password must be at least 8 characters.",
        },
        { status: 400 },
      );
    }

    // Get the user's email from tenant record
    const tenant = await getTenantByUserId(session.user.cognitoSub);
    if (!tenant?.email) {
      return NextResponse.json(
        { success: false, message: "Could not find account." },
        { status: 404 },
      );
    }

    console.log(
      "[DBG][change-password] Authenticating user to get accessToken",
    );

    // Sign in with current password to get a fresh access token
    const signInResult = await signIn({
      email: tenant.email,
      password: currentPassword,
    });

    if (!signInResult.success || !signInResult.accessToken) {
      return NextResponse.json(
        { success: false, message: "Incorrect current password." },
        { status: 400 },
      );
    }

    // Change the password using the fresh access token
    const result = await changePassword({
      accessToken: signInResult.accessToken,
      previousPassword: currentPassword,
      proposedPassword: newPassword,
    });

    console.log("[DBG][change-password] Password changed successfully");

    return NextResponse.json({
      success: result.success,
      message: result.message,
    });
  } catch (error) {
    console.error("[DBG][change-password] Error:", error);

    if (isCognitoError(error, "NotAuthorizedException")) {
      return NextResponse.json(
        { success: false, message: "Incorrect current password." },
        { status: 400 },
      );
    }

    if (isCognitoError(error, "InvalidPasswordException")) {
      return NextResponse.json(
        {
          success: false,
          message:
            "New password must be at least 8 characters with uppercase, lowercase, and number.",
        },
        { status: 400 },
      );
    }

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
