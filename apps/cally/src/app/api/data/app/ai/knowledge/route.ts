/**
 * GET/POST /api/data/app/ai/knowledge
 * Knowledge base document management (authenticated)
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import {
  createKnowledgeDoc,
  getKnowledgeDocsByTenant,
} from "@/lib/repositories/knowledgeRepository";
import { processKnowledgeDocument } from "@/lib/processKnowledgeDoc";

/**
 * GET - List all knowledge documents for the authenticated tenant
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(session.user.cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    console.log(
      "[DBG][ai-knowledge] Listing knowledge docs for tenant:",
      tenant.id,
    );

    const docs = await getKnowledgeDocsByTenant(tenant.id);

    return NextResponse.json({
      success: true,
      data: { documents: docs },
    });
  } catch (error) {
    console.error("[DBG][ai-knowledge] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

interface CreateKnowledgeBody {
  title: string;
  content: string;
}

/**
 * POST - Create a new knowledge document
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(session.user.cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const body = (await request.json()) as CreateKnowledgeBody;

    if (!body.title || typeof body.title !== "string") {
      return NextResponse.json(
        { success: false, error: "Title is required" },
        { status: 400 },
      );
    }
    if (!body.content || typeof body.content !== "string") {
      return NextResponse.json(
        { success: false, error: "Content is required" },
        { status: 400 },
      );
    }

    console.log(
      "[DBG][ai-knowledge] Creating knowledge doc for tenant:",
      tenant.id,
    );

    // Create document metadata
    const doc = await createKnowledgeDoc(tenant.id, {
      title: body.title.trim(),
      content: body.content.trim(),
    });

    // Process inline (chunk + embed + index)
    await processKnowledgeDocument(tenant.id, doc.id, doc.title, doc.content);

    // Re-fetch to get updated status
    const { getKnowledgeDoc } =
      await import("@/lib/repositories/knowledgeRepository");
    const updatedDoc = await getKnowledgeDoc(tenant.id, doc.id);

    return NextResponse.json({
      success: true,
      data: { document: updatedDoc || doc },
    });
  } catch (error) {
    console.error("[DBG][ai-knowledge] POST error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        success: false,
        error: `Failed to create knowledge document: ${errorMessage}`,
      },
      { status: 500 },
    );
  }
}
