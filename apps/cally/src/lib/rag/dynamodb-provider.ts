/**
 * DynamoDB RAG Provider
 *
 * Brute-force vector search using cosine similarity.
 * Loads all chunks for a tenant and computes similarity in-memory.
 * Suitable for small-to-medium knowledge bases (<1000 chunks).
 */

import { QueryCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, Tables, KnowledgePK, EntityType } from "../dynamodb";
import { cosineSimilarity } from "./embeddings";
import type { RagProvider } from "./types";
import type { RetrievedChunk, KnowledgeChunk } from "@/types";

interface DynamoDBChunkItem extends KnowledgeChunk {
  PK: string;
  SK: string;
  entityType: string;
}

export const dynamoDBRagProvider: RagProvider = {
  async indexChunks(tenantId, docId, docTitle, chunks) {
    console.log(
      "[DBG][dynamodb-rag] Indexing",
      chunks.length,
      "chunks for doc:",
      docId,
    );

    const now = new Date().toISOString();

    // Write chunks in batches of 25 (DynamoDB BatchWrite limit)
    for (let i = 0; i < chunks.length; i += 25) {
      const batch = chunks.slice(i, i + 25);
      const putRequests = batch.map((chunk, batchIdx) => {
        const chunkIndex = i + batchIdx;
        return {
          PutRequest: {
            Item: {
              PK: KnowledgePK.CHUNKS(tenantId),
              SK: KnowledgePK.CHUNK(chunkIndex, docId),
              entityType: EntityType.KNOWLEDGE_CHUNK,
              tenantId,
              docId,
              docTitle,
              chunkIndex,
              text: chunk.text,
              embedding: chunk.embedding,
              tokenCount: chunk.tokenCount,
              createdAt: now,
            },
          },
        };
      });

      await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [Tables.CORE]: putRequests,
          },
        }),
      );
    }

    console.log("[DBG][dynamodb-rag] Chunks indexed successfully");
  },

  async search(tenantId, queryEmbedding, topK) {
    console.log("[DBG][dynamodb-rag] Searching chunks for tenant:", tenantId);

    // Fetch ALL chunks for this tenant
    const result = await docClient.send(
      new QueryCommand({
        TableName: Tables.CORE,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": KnowledgePK.CHUNKS(tenantId),
          ":skPrefix": KnowledgePK.CHUNK_PREFIX,
        },
      }),
    );

    const items = (result.Items || []) as DynamoDBChunkItem[];
    console.log("[DBG][dynamodb-rag] Fetched", items.length, "chunks");

    if (items.length === 0) return [];

    // Compute cosine similarity for each chunk
    const scored: RetrievedChunk[] = items.map((item) => ({
      text: item.text,
      docId: item.docId,
      docTitle: item.docTitle,
      score: cosineSimilarity(queryEmbedding, item.embedding),
    }));

    // Sort by score descending, take topK
    scored.sort((a, b) => b.score - a.score);
    const results = scored.slice(0, topK);

    console.log(
      "[DBG][dynamodb-rag] Top scores:",
      results.map((r) => r.score.toFixed(3)),
    );

    return results;
  },

  async deleteByDocId(tenantId, docId) {
    console.log(
      "[DBG][dynamodb-rag] Deleting chunks for doc:",
      docId,
      "tenant:",
      tenantId,
    );

    // Query all chunks for this tenant, filter by docId
    const result = await docClient.send(
      new QueryCommand({
        TableName: Tables.CORE,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": KnowledgePK.CHUNKS(tenantId),
          ":skPrefix": KnowledgePK.CHUNK_PREFIX,
        },
        ProjectionExpression: "PK, SK, docId",
      }),
    );

    const items = (result.Items || []).filter((item) => item.docId === docId);

    if (items.length === 0) return;

    // Delete in batches of 25
    for (let i = 0; i < items.length; i += 25) {
      const batch = items.slice(i, i + 25);
      const deleteRequests = batch.map((item) => ({
        DeleteRequest: {
          Key: { PK: item.PK, SK: item.SK },
        },
      }));

      await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [Tables.CORE]: deleteRequests,
          },
        }),
      );
    }

    console.log("[DBG][dynamodb-rag] Deleted", items.length, "chunks");
  },

  async deleteByTenant(tenantId) {
    console.log(
      "[DBG][dynamodb-rag] Deleting all chunks for tenant:",
      tenantId,
    );

    const result = await docClient.send(
      new QueryCommand({
        TableName: Tables.CORE,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": KnowledgePK.CHUNKS(tenantId),
          ":skPrefix": KnowledgePK.CHUNK_PREFIX,
        },
        ProjectionExpression: "PK, SK",
      }),
    );

    const items = result.Items || [];

    if (items.length === 0) return;

    for (let i = 0; i < items.length; i += 25) {
      const batch = items.slice(i, i + 25);
      const deleteRequests = batch.map((item) => ({
        DeleteRequest: {
          Key: { PK: item.PK, SK: item.SK },
        },
      }));

      await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [Tables.CORE]: deleteRequests,
          },
        }),
      );
    }

    console.log("[DBG][dynamodb-rag] Deleted", items.length, "chunks");
  },
};

// Also export as default for direct import
export default dynamoDBRagProvider;
