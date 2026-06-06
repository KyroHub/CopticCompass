import "server-only";

import {
  generateTextEmbeddings,
  getTextEmbeddingModelName,
  getTextEmbeddingProviderName,
} from "@/lib/ai/embeddings";

import {
  EMBEDDING_BATCH_SIZE,
  GEMINI_EMBEDDING_OUTPUT_DIMENSION,
} from "./ragIngestionConfig";
import { logIngestion } from "./ragIngestionLogging";

import type {
  RagChunkWithMetadata,
  RagEmbeddingProvider,
  RagIngestionLogEntry,
} from "./ragIngestionTypes";

export function getEmbeddingModelName(provider: RagEmbeddingProvider) {
  return getTextEmbeddingModelName(provider);
}

/**
 * Generates embeddings through the selected provider while preserving common
 * batching and progress logging. Provider-specific calls stay isolated here so
 * ingestion orchestration does not need branching logic.
 */
export async function generateEmbeddings(
  chunks: RagChunkWithMetadata[],
  embeddingProvider: RagEmbeddingProvider,
  ingestId: string,
  logs: RagIngestionLogEntry[],
): Promise<number[][]> {
  const embeddings: number[][] = [];
  const providerName = getTextEmbeddingProviderName(embeddingProvider);
  const completionProviderName =
    embeddingProvider === "hf" ? "HF" : providerName;

  for (let start = 0; start < chunks.length; start += EMBEDDING_BATCH_SIZE) {
    const batch = chunks.slice(start, start + EMBEDDING_BATCH_SIZE);
    const batchContent = batch.map((c) => c.content);
    const batchStartMs = Date.now();
    logIngestion(
      ingestId,
      `Embedding batch ${Math.floor(start / EMBEDDING_BATCH_SIZE) + 1} (${providerName}) with ${batch.length} chunks...`,
      logs,
    );

    const { embeddings: batchEmbeddings } = await generateTextEmbeddings({
      provider: embeddingProvider,
      values: batchContent,
      geminiOutputDimension: GEMINI_EMBEDDING_OUTPUT_DIMENSION,
    });
    embeddings.push(...batchEmbeddings);

    logIngestion(
      ingestId,
      `Completed ${completionProviderName} embedding batch ${Math.floor(start / EMBEDDING_BATCH_SIZE) + 1} in ${Date.now() - batchStartMs} ms.`,
      logs,
    );
  }

  return embeddings;
}
