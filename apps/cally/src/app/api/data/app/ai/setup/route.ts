/**
 * POST /api/data/app/ai/setup
 * AI-driven business setup chat (authenticated)
 * Uses function calling to extract business information
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  updateTenant,
} from "@/lib/repositories/tenantRepository";
import { processSetupChat, type SetupChatMessage } from "@/lib/openai-setup";
import type { BusinessInfo } from "@/types/ai-assistant";

interface SetupChatRequest {
  messages: SetupChatMessage[];
  saveIfComplete?: boolean;
}

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
    console.log("[DBG][ai-setup] Setup chat for user:", cognitoSub);

    // Get tenant
    const tenant = await getTenantByUserId(cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    // Parse request body
    const body = (await request.json()) as SetupChatRequest;

    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { success: false, error: "Messages array is required" },
        { status: 400 },
      );
    }

    // Process chat
    const result = await processSetupChat(body.messages);

    // If complete and saveIfComplete is true, save the business info
    if (result.isComplete && result.businessInfo && body.saveIfComplete) {
      console.log(
        "[DBG][ai-setup] Saving business info for tenant:",
        tenant.id,
      );

      // Merge with existing config
      const currentConfig = tenant.aiAssistantConfig || {
        enabled: false,
        widgetPosition: "bottom-right" as const,
        welcomeMessage: "Hi! How can I help you today?",
        placeholderText: "Type your message...",
      };

      // Merge business info (new values override old)
      const mergedBusinessInfo: BusinessInfo = {
        ...currentConfig.businessInfo,
        ...result.businessInfo,
      };

      await updateTenant(tenant.id, {
        aiAssistantConfig: {
          ...currentConfig,
          businessInfo: mergedBusinessInfo,
        },
      });

      console.log("[DBG][ai-setup] Business info saved");
    }

    return NextResponse.json({
      success: true,
      data: {
        message: result.message,
        businessInfo: result.businessInfo,
        isComplete: result.isComplete,
      },
    });
  } catch (error) {
    console.error("[DBG][ai-setup] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: `Setup chat failed: ${errorMessage}` },
      { status: 500 },
    );
  }
}
