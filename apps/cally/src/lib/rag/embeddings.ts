/**
 * Embedding utilities for RAG
 *
 * - Text chunking with paragraph/sentence splitting and overlap
 * - OpenAI text-embedding-3-small API calls
 * - Cosine similarity for brute-force search
 */

const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
const EMBEDDING_MODEL = "text-embedding-3-small";

interface EmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * Split text into chunks suitable for embedding.
 * Splits by paragraphs first, then merges small chunks to approach maxChunkSize.
 * Adds ~100 char overlap between chunks for context continuity.
 */
export function chunkText(text: string, maxChunkSize = 2000): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (paragraphs.length === 0) return [];

  const chunks: string[] = [];
  let current = "";
  const overlapSize = 100;

  for (const para of paragraphs) {
    // If a single paragraph exceeds maxChunkSize, split by sentences
    if (para.length > maxChunkSize) {
      if (current.length > 0) {
        chunks.push(current.trim());
        current = "";
      }
      const sentences = para.match(/[^.!?]+[.!?]+\s*/g) || [para];
      let sentenceChunk = "";
      for (const sentence of sentences) {
        if (
          sentenceChunk.length + sentence.length > maxChunkSize &&
          sentenceChunk.length > 0
        ) {
          chunks.push(sentenceChunk.trim());
          // Overlap: take last ~overlapSize chars
          const overlapStart = Math.max(0, sentenceChunk.length - overlapSize);
          sentenceChunk = sentenceChunk.slice(overlapStart) + sentence;
        } else {
          sentenceChunk += sentence;
        }
      }
      if (sentenceChunk.trim().length > 0) {
        current = sentenceChunk;
      }
      continue;
    }

    const combined = current.length > 0 ? current + "\n\n" + para : para;

    if (combined.length > maxChunkSize && current.length > 0) {
      chunks.push(current.trim());
      // Overlap: take last ~overlapSize chars from previous chunk
      const overlapStart = Math.max(0, current.length - overlapSize);
      current = current.slice(overlapStart) + "\n\n" + para;
    } else {
      current = combined;
    }
  }

  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }

  return chunks;
}

/**
 * Create embeddings for an array of texts using OpenAI API.
 * Returns embeddings in the same order as input texts.
 */
export async function createEmbeddings(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  if (texts.length === 0) return [];

  console.log(
    "[DBG][embeddings] Creating embeddings for",
    texts.length,
    "texts",
  );

  const response = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[DBG][embeddings] API error:", response.status, errorText);
    throw new Error(`OpenAI Embeddings API error: ${response.status}`);
  }

  const data = (await response.json()) as EmbeddingResponse;

  console.log(
    "[DBG][embeddings] Embeddings created, tokens used:",
    data.usage?.total_tokens,
  );

  // Sort by index to ensure correct order
  const sorted = [...data.data].sort((a, b) => a.index - b.index);
  return sorted.map((d) => d.embedding);
}

/**
 * Compute cosine similarity between two vectors.
 * Returns a value between -1 and 1 (1 = identical direction).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
  if (magnitude === 0) return 0;

  return dot / magnitude;
}
