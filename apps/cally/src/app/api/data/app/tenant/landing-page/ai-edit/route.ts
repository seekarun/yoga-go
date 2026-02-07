/**
 * POST /api/data/app/tenant/landing-page/ai-edit
 * Generate AI-powered landing page edits (authenticated)
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import { generateLandingPageEdit } from "@/lib/openai-landing-page";
import type { LandingPageConfig } from "@/types/landing-page";
import { isLandingPageConfigV2, migrateToV2 } from "@/types/landing-page";
import type { SimpleLandingPageConfig } from "@/types/landing-page";

interface AIEditRequestBody {
  prompt: string;
  currentConfig: LandingPageConfig;
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
    console.log(
      "[DBG][ai-edit] Processing AI edit request for user:",
      cognitoSub,
    );

    // Get tenant by user ID (for business info context)
    const tenant = await getTenantByUserId(cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    // Parse request body
    const body = (await request.json()) as AIEditRequestBody;

    if (!body.prompt || typeof body.prompt !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid prompt" },
        { status: 400 },
      );
    }

    if (!body.currentConfig) {
      return NextResponse.json(
        { success: false, error: "Missing currentConfig" },
        { status: 400 },
      );
    }

    // Ensure config is V2 format
    let currentConfig: LandingPageConfig;
    if (isLandingPageConfigV2(body.currentConfig)) {
      currentConfig = body.currentConfig;
    } else {
      currentConfig = migrateToV2(
        body.currentConfig as unknown as SimpleLandingPageConfig,
      );
    }

    console.log("[DBG][ai-edit] Prompt:", body.prompt);
    console.log(
      "[DBG][ai-edit] Current sections:",
      currentConfig.sections.length,
    );

    // Get business info from AI assistant config if available
    const businessInfo = tenant.aiAssistantConfig?.businessInfo;

    // Generate AI edit
    const result = await generateLandingPageEdit({
      prompt: body.prompt,
      currentConfig,
      businessInfo,
    });

    console.log(
      "[DBG][ai-edit] AI generated",
      result.sections.length,
      "sections",
    );
    console.log("[DBG][ai-edit] Summary:", result.summary);

    return NextResponse.json({
      success: true,
      data: {
        sections: result.sections,
        summary: result.summary,
        changes: result.changes,
      },
    });
  } catch (error) {
    console.error("[DBG][ai-edit] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: `AI edit failed: ${errorMessage}` },
      { status: 500 },
    );
  }
}
