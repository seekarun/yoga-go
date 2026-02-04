/**
 * GET/PUT /api/data/app/ai/settings
 * AI Assistant settings (authenticated)
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  updateTenant,
} from "@/lib/repositories/tenantRepository";
import type { AiAssistantConfig } from "@/types/ai-assistant";
import { DEFAULT_AI_ASSISTANT_CONFIG } from "@/types/ai-assistant";

/**
 * GET - Get current AI assistant settings
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
    console.log("[DBG][ai-settings] Getting AI settings for user:", cognitoSub);

    // Get tenant
    const tenant = await getTenantByUserId(cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const config = tenant.aiAssistantConfig || DEFAULT_AI_ASSISTANT_CONFIG;

    return NextResponse.json({
      success: true,
      data: {
        enabled: config.enabled,
        config,
      },
    });
  } catch (error) {
    console.error("[DBG][ai-settings] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PUT - Update AI assistant settings
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
      "[DBG][ai-settings] Updating AI settings for user:",
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

    // Parse request body - partial update
    const body = (await request.json()) as Partial<AiAssistantConfig>;

    // Merge with existing config
    const currentConfig =
      tenant.aiAssistantConfig || DEFAULT_AI_ASSISTANT_CONFIG;
    const updatedConfig: AiAssistantConfig = {
      ...currentConfig,
      ...body,
    };

    // If enabling for the first time, set enabledAt
    if (body.enabled === true && !currentConfig.enabled) {
      updatedConfig.enabledAt = new Date().toISOString();
    }

    // Update tenant
    const updatedTenant = await updateTenant(tenant.id, {
      aiAssistantConfig: updatedConfig,
    });

    console.log(
      "[DBG][ai-settings] Updated AI settings for tenant:",
      tenant.id,
    );

    return NextResponse.json({
      success: true,
      data: {
        enabled: updatedConfig.enabled,
        config: updatedTenant.aiAssistantConfig,
      },
    });
  } catch (error) {
    console.error("[DBG][ai-settings] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: `Failed to update settings: ${errorMessage}` },
      { status: 500 },
    );
  }
}
