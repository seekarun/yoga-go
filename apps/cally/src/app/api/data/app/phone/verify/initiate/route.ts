/**
 * POST /api/data/app/phone/verify/initiate
 * Initiate phone verification by sending SMS code
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  updateTenant,
} from "@/lib/repositories/tenantRepository";
import { sendVerificationCode, isValidE164, formatToE164 } from "@/lib/twilio";
import type { InitiateVerificationRequest } from "@/types/phone-calling";
import { DEFAULT_PHONE_CONFIG } from "@/types/phone-calling";

/**
 * POST - Initiate phone verification
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
      "[DBG][verify-initiate] Initiating verification for user:",
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
    const body = (await request.json()) as InitiateVerificationRequest;

    if (!body.phoneNumber) {
      return NextResponse.json(
        { success: false, error: "Phone number is required" },
        { status: 400 },
      );
    }

    // Format to E.164
    const formattedNumber = formatToE164(body.phoneNumber);

    // Validate E.164 format
    if (!isValidE164(formattedNumber)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid phone number format. Use E.164 format (e.g., +61412345678)",
        },
        { status: 400 },
      );
    }

    console.log("[DBG][verify-initiate] Formatted phone:", formattedNumber);

    // Send verification code
    const result = await sendVerificationCode(formattedNumber);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to send verification code",
        },
        { status: 500 },
      );
    }

    // Update tenant with pending phone number
    const currentConfig = tenant.phoneConfig || DEFAULT_PHONE_CONFIG;
    await updateTenant(tenant.id, {
      phoneConfig: {
        ...currentConfig,
        phoneNumber: formattedNumber,
        phoneNumberVerified: false,
        phoneNumberVerifiedAt: undefined,
      },
    });

    console.log("[DBG][verify-initiate] Verification code sent successfully");

    return NextResponse.json({
      success: true,
      data: {
        phoneNumber: formattedNumber,
        message: "Verification code sent via SMS",
      },
    });
  } catch (error) {
    console.error("[DBG][verify-initiate] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        success: false,
        error: `Failed to initiate verification: ${errorMessage}`,
      },
      { status: 500 },
    );
  }
}
