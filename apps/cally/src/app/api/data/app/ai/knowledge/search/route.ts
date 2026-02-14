/**
 * POST /api/data/app/ai/knowledge/search
 * Search the knowledge base for relevant chunks (authenticated).
 * Used by the voice function handler and potentially other internal consumers.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import { searchKnowledge } from "@/lib/rag";

interface SearchRequest {
  query: string;
  topK?: number;
}

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

    const body = (await request.json()) as SearchRequest;
    if (!body.query?.trim()) {
      return NextResponse.json(
        { success: false, error: "Query is required" },
        { status: 400 },
      );
    }

    const topK = body.topK ?? 3;
    console.log(
      "[DBG][knowledge-search] Searching for tenant:",
      tenant.id,
      "query:",
      body.query,
    );

    const chunks = await searchKnowledge(tenant.id, body.query.trim(), topK);

    return NextResponse.json({
      success: true,
      data: {
        chunks: chunks.map((c) => ({ text: c.text, score: c.score })),
      },
    });
  } catch (error) {
    console.error("[DBG][knowledge-search] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: `Search failed: ${errorMessage}` },
      { status: 500 },
    );
  }
}
