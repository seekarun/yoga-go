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
import {
  processSetupChat,
  type SetupChatMessage,
  type KnowledgeEntry,
} from "@/lib/openai-setup";
import { createKnowledgeDoc } from "@/lib/repositories/knowledgeRepository";
import { processKnowledgeDocument } from "@/lib/processKnowledgeDoc";
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

      // Create knowledge documents from extracted entries
      if (result.knowledgeEntries && result.knowledgeEntries.length > 0) {
        console.log(
          "[DBG][ai-setup] Creating",
          result.knowledgeEntries.length,
          "knowledge docs",
        );

        await createKnowledgeDocs(tenant.id, result.knowledgeEntries);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        message: result.message,
        businessInfo: result.businessInfo,
        knowledgeEntries: result.knowledgeEntries,
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

/**
 * Create knowledge documents from setup chat entries.
 * Processes each entry through the RAG pipeline (chunk → embed → index).
 */
async function createKnowledgeDocs(
  tenantId: string,
  entries: KnowledgeEntry[],
): Promise<void> {
  for (const entry of entries) {
    try {
      const doc = await createKnowledgeDoc(tenantId, {
        title: entry.title,
        content: entry.content,
        source: "text",
      });

      await processKnowledgeDocument(tenantId, doc.id, doc.title, doc.content);

      console.log(
        "[DBG][ai-setup] Knowledge doc created and processed:",
        doc.id,
        "-",
        entry.title,
      );
    } catch (err) {
      console.error(
        "[DBG][ai-setup] Error creating knowledge doc:",
        entry.title,
        err,
      );
    }
  }
}
