/**
 * Knowledge Document Processing Pipeline
 *
 * Chunks text -> creates embeddings -> stores in RAG provider -> updates doc status.
 * Called synchronously from API route (embedding small docs takes <2s).
 */

import { chunkText, createEmbeddings, getRagProvider } from "./rag";
import { updateKnowledgeDocStatus } from "./repositories/knowledgeRepository";

/**
 * Process a knowledge document: chunk, embed, and index.
 * Updates document status to "ready" on success or "failed" on error.
 */
export async function processKnowledgeDocument(
  tenantId: string,
  docId: string,
  title: string,
  content: string,
): Promise<void> {
  console.log(
    "[DBG][processKnowledgeDoc] Processing doc:",
    docId,
    "tenant:",
    tenantId,
  );

  try {
    // Step 1: Chunk the text
    const chunks = chunkText(content);
    console.log("[DBG][processKnowledgeDoc] Created", chunks.length, "chunks");

    if (chunks.length === 0) {
      await updateKnowledgeDocStatus(tenantId, docId, "failed", {
        errorMessage: "No content to process",
      });
      return;
    }

    // Step 2: Create embeddings for all chunks
    const embeddings = await createEmbeddings(chunks);
    console.log(
      "[DBG][processKnowledgeDoc] Created",
      embeddings.length,
      "embeddings",
    );

    // Step 3: Index chunks in RAG provider
    const indexChunks = chunks.map((text, i) => ({
      text,
      embedding: embeddings[i],
      tokenCount: Math.ceil(text.length / 4), // rough token estimate
    }));

    await getRagProvider().indexChunks(tenantId, docId, title, indexChunks);

    // Step 4: Update document status to ready
    await updateKnowledgeDocStatus(tenantId, docId, "ready", {
      chunkCount: chunks.length,
    });

    console.log("[DBG][processKnowledgeDoc] Document processed successfully");
  } catch (error) {
    console.error("[DBG][processKnowledgeDoc] Processing failed:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown processing error";

    await updateKnowledgeDocStatus(tenantId, docId, "failed", {
      errorMessage,
    });
  }
}
