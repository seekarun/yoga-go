/**
 * RAG Module Entry Point
 *
 * Exports the provider factory and convenience search function.
 * Consumers should use searchKnowledge() for RAG retrieval.
 */

import { dynamoDBRagProvider } from "./dynamodb-provider";
import { createEmbeddings } from "./embeddings";
import type { RagProvider } from "./types";
import type { RetrievedChunk } from "@/types";

/**
 * Get the active RAG provider.
 * Currently returns DynamoDB provider. Swap here to use a vector DB.
 */
export function getRagProvider(): RagProvider {
  return dynamoDBRagProvider;
}

/**
 * Search knowledge base for relevant chunks.
 * Main entry point for RAG retrieval used by chat routes.
 */
export async function searchKnowledge(
  tenantId: string,
  query: string,
  topK = 3,
): Promise<RetrievedChunk[]> {
  console.log("[DBG][rag] Searching knowledge for tenant:", tenantId);

  try {
    const [queryEmbedding] = await createEmbeddings([query]);
    const results = await getRagProvider().search(
      tenantId,
      queryEmbedding,
      topK,
    );

    // Filter out low-relevance results (score < 0.3)
    const filtered = results.filter((r) => r.score >= 0.3);

    console.log(
      "[DBG][rag] Found",
      filtered.length,
      "relevant chunks (of",
      results.length,
      "total)",
    );

    return filtered;
  } catch (error) {
    console.error("[DBG][rag] Search error:", error);
    // Return empty on error - chat should still work without RAG
    return [];
  }
}

export { createEmbeddings, chunkText } from "./embeddings";
export type { RagProvider } from "./types";
