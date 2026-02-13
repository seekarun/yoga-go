/**
 * RAG Provider Interface
 *
 * Abstraction over the vector storage backend.
 * Initial implementation uses DynamoDB with brute-force cosine similarity.
 * Can be swapped to a dedicated vector DB by implementing this interface.
 */

import type { RetrievedChunk } from "@/types";

export interface RagProvider {
  /** Store chunks with embeddings for a document */
  indexChunks(
    tenantId: string,
    docId: string,
    docTitle: string,
    chunks: Array<{ text: string; embedding: number[]; tokenCount: number }>,
  ): Promise<void>;

  /** Search for relevant chunks given a query embedding */
  search(
    tenantId: string,
    queryEmbedding: number[],
    topK: number,
  ): Promise<RetrievedChunk[]>;

  /** Delete all chunks for a document */
  deleteByDocId(tenantId: string, docId: string): Promise<void>;

  /** Delete all chunks for a tenant */
  deleteByTenant(tenantId: string): Promise<void>;
}
