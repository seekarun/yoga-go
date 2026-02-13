/**
 * Knowledge Base Types for tenant-scoped RAG system
 */

export type KnowledgeDocStatus = "processing" | "ready" | "failed";
export type KnowledgeDocSource = "text" | "file";

export interface KnowledgeDocument {
  id: string;
  tenantId: string;
  title: string;
  source: KnowledgeDocSource;
  content: string;
  chunkCount: number;
  status: KnowledgeDocStatus;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeChunk {
  tenantId: string;
  docId: string;
  docTitle: string;
  chunkIndex: number;
  text: string;
  embedding: number[];
  tokenCount: number;
  createdAt: string;
}

export interface RetrievedChunk {
  text: string;
  docId: string;
  docTitle: string;
  score: number;
}
