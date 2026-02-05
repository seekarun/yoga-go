/**
 * GET/PUT /api/data/app/phone/settings
 * Phone calling settings (authenticated)
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  updateTenant,
} from "@/lib/repositories/tenantRepository";
import type {
  PhoneConfig,
  UpdatePhoneSettingsRequest,
} from "@/types/phone-calling";
import { DEFAULT_PHONE_CONFIG } from "@/types/phone-calling";

/**
 * GET - Get current phone settings
 */
export async function GET() {
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
      "[DBG][phone-settings] Getting phone settings for user:",
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

    const config = tenant.phoneConfig || DEFAULT_PHONE_CONFIG;

    return NextResponse.json({
      success: true,
      data: {
        config,
        // Convenience fields for UI
        hasVerifiedPhone: config.phoneNumberVerified === true,
        isBriefingConfigured:
          config.morningBriefingEnabled &&
          config.phoneNumberVerified &&
          config.morningBriefingTime &&
          config.morningBriefingTimezone,
      },
    });
  } catch (error) {
    console.error("[DBG][phone-settings] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PUT - Update phone settings
 */
export async function PUT(request: NextRequest) {
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
      "[DBG][phone-settings] Updating phone settings for user:",
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
    const body = (await request.json()) as UpdatePhoneSettingsRequest;

    // Get current config
    const currentConfig = tenant.phoneConfig || DEFAULT_PHONE_CONFIG;

    // Build updated config (only update provided fields)
    const updatedConfig: PhoneConfig = { ...currentConfig };

    // Phone number changes require re-verification
    if (
      body.phoneNumber !== undefined &&
      body.phoneNumber !== currentConfig.phoneNumber
    ) {
      updatedConfig.phoneNumber = body.phoneNumber || undefined;
      updatedConfig.phoneNumberVerified = false;
      updatedConfig.phoneNumberVerifiedAt = undefined;
    }

    // Morning briefing settings
    if (body.morningBriefingEnabled !== undefined) {
      updatedConfig.morningBriefingEnabled = body.morningBriefingEnabled;
    }
    if (body.morningBriefingTime !== undefined) {
      updatedConfig.morningBriefingTime = body.morningBriefingTime;
    }
    if (body.morningBriefingTimezone !== undefined) {
      updatedConfig.morningBriefingTimezone = body.morningBriefingTimezone;
    }
    if (body.morningBriefingDays !== undefined) {
      updatedConfig.morningBriefingDays = body.morningBriefingDays;
    }

    // Voice preferences
    if (body.voiceId !== undefined) {
      updatedConfig.voiceId = body.voiceId;
    }

    // Content preferences
    if (body.includeCalendarEvents !== undefined) {
      updatedConfig.includeCalendarEvents = body.includeCalendarEvents;
    }
    if (body.includeUnreadEmails !== undefined) {
      updatedConfig.includeUnreadEmails = body.includeUnreadEmails;
    }

    // Update tenant
    const updatedTenant = await updateTenant(tenant.id, {
      phoneConfig: updatedConfig,
    });

    console.log(
      "[DBG][phone-settings] Updated phone settings for tenant:",
      tenant.id,
    );

    return NextResponse.json({
      success: true,
      data: {
        config: updatedTenant.phoneConfig,
        hasVerifiedPhone:
          updatedTenant.phoneConfig?.phoneNumberVerified === true,
        isBriefingConfigured:
          updatedTenant.phoneConfig?.morningBriefingEnabled &&
          updatedTenant.phoneConfig?.phoneNumberVerified &&
          updatedTenant.phoneConfig?.morningBriefingTime &&
          updatedTenant.phoneConfig?.morningBriefingTimezone,
      },
    });
  } catch (error) {
    console.error("[DBG][phone-settings] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: `Failed to update settings: ${errorMessage}` },
      { status: 500 },
    );
  }
}
