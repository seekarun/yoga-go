/**
 * POST /api/data/app/phone/verify/confirm
 * Confirm phone verification with SMS code
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  updateTenant,
} from "@/lib/repositories/tenantRepository";
import { verifyCode, isValidE164, formatToE164 } from "@/lib/twilio";
import type { ConfirmVerificationRequest } from "@/types/phone-calling";
import { DEFAULT_PHONE_CONFIG } from "@/types/phone-calling";

/**
 * POST - Confirm phone verification
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const cognitoSub = session.user.cognitoSub;
    console.log(
      "[DBG][verify-confirm] Confirming verification for user:",
      cognitoSub,
    );

    // Get tenant
    const tenant = await getTenantByUserId(cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    // Parse request body
    const body = (await request.json()) as ConfirmVerificationRequest;

    if (!body.phoneNumber || !body.code) {
      return NextResponse.json(
        {
          success: false,
          error: "Phone number and verification code are required",
        },
        { status: 400 },
      );
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(body.code)) {
      return NextResponse.json(
        { success: false, error: "Verification code must be 6 digits" },
        { status: 400 },
      );
    }

    // Format phone number to E.164
    const formattedNumber = formatToE164(body.phoneNumber);

    // Validate E.164 format
    if (!isValidE164(formattedNumber)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid phone number format",
        },
        { status: 400 },
      );
    }

    // Verify that this is the same number stored in tenant
    const currentConfig = tenant.phoneConfig || DEFAULT_PHONE_CONFIG;
    if (currentConfig.phoneNumber !== formattedNumber) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Phone number does not match. Please initiate verification again.",
        },
        { status: 400 },
      );
    }

    console.log("[DBG][verify-confirm] Verifying code for:", formattedNumber);

    // Verify the code with Twilio
    const result = await verifyCode(formattedNumber, body.code);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Invalid verification code" },
        { status: 400 },
      );
    }

    // Update tenant with verified phone number
    const now = new Date().toISOString();
    const updatedTenant = await updateTenant(tenant.id, {
      phoneConfig: {
        ...currentConfig,
        phoneNumber: formattedNumber,
        phoneNumberVerified: true,
        phoneNumberVerifiedAt: now,
      },
    });

    console.log("[DBG][verify-confirm] Phone number verified successfully");

    return NextResponse.json({
      success: true,
      data: {
        phoneNumber: formattedNumber,
        verified: true,
        verifiedAt: now,
        config: updatedTenant.phoneConfig,
      },
    });
  } catch (error) {
    console.error("[DBG][verify-confirm] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        success: false,
        error: `Failed to confirm verification: ${errorMessage}`,
      },
      { status: 500 },
    );
  }
}
