/**
 * GET/DELETE /api/data/app/ai/knowledge/{docId}
 * Single knowledge document operations (authenticated)
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import {
  getKnowledgeDoc,
  deleteKnowledgeDoc,
} from "@/lib/repositories/knowledgeRepository";
import { getRagProvider } from "@/lib/rag";

interface RouteParams {
  params: Promise<{
    docId: string;
  }>;
}

/**
 * GET - Get a single knowledge document
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
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

    const { docId } = await params;
    console.log(
      "[DBG][ai-knowledge] Getting knowledge doc:",
      docId,
      "tenant:",
      tenant.id,
    );

    const doc = await getKnowledgeDoc(tenant.id, docId);
    if (!doc) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { document: doc },
    });
  } catch (error) {
    console.error("[DBG][ai-knowledge] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE - Delete a knowledge document and its chunks
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
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

    const { docId } = await params;
    console.log(
      "[DBG][ai-knowledge] Deleting knowledge doc:",
      docId,
      "tenant:",
      tenant.id,
    );

    // Verify doc exists
    const doc = await getKnowledgeDoc(tenant.id, docId);
    if (!doc) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 },
      );
    }

    // Delete chunks from RAG provider
    await getRagProvider().deleteByDocId(tenant.id, docId);

    // Delete document metadata
    await deleteKnowledgeDoc(tenant.id, docId);

    console.log("[DBG][ai-knowledge] Document and chunks deleted");

    return NextResponse.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    console.error("[DBG][ai-knowledge] DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
