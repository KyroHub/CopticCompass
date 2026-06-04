import "server-only";
import { embedMany } from "ai";

import { GEMINI_EMBEDDING_MODEL, getGeminiEmbeddingModel } from "@/lib/gemini";
import { HF_EMBEDDING_MODEL, generateHFEmbeddings } from "@/lib/hf";
import {
  OPENROUTER_EMBEDDING_MODEL,
  generateOpenRouterEmbeddings,
} from "@/lib/openrouter";

import {
  EMBEDDING_BATCH_SIZE,
  GEMINI_EMBEDDING_OUTPUT_DIMENSION,
  RAG_VECTOR_DIMENSIONS,
} from "./ragIngestionConfig";
import { logIngestion } from "./ragIngestionLogging";

import type {
  RagChunkWithMetadata,
  RagEmbeddingProvider,
  RagIngestionLogEntry,
} from "./ragIngestionTypes";

export function createVectorLiteral(embedding: number[]) {
  return `[${embedding.join(",")}]`;
}

/**
 * Fits provider embeddings to the configured pgvector width by truncating or
 * zero-padding. The source dimension is still persisted as metadata for audit
 * and future re-embedding decisions.
 */
export function normalizeEmbeddingDimensions(
  embedding: number[],
  targetDimensions = RAG_VECTOR_DIMENSIONS,
) {
  if (embedding.length === targetDimensions) {
    return embedding;
  }

  if (embedding.length > targetDimensions) {
    return embedding.slice(0, targetDimensions);
  }

  return [
    ...embedding,
    ...new Array(targetDimensions - embedding.length).fill(0),
  ];
}

export function getEmbeddingModelName(provider: RagEmbeddingProvider) {
  if (provider === "gemini") {
    return GEMINI_EMBEDDING_MODEL;
  }

  if (provider === "openrouter") {
    return OPENROUTER_EMBEDDING_MODEL;
  }

  return HF_EMBEDDING_MODEL;
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

  if (embeddingProvider === "gemini") {
    for (let start = 0; start < chunks.length; start += EMBEDDING_BATCH_SIZE) {
      const batch = chunks.slice(start, start + EMBEDDING_BATCH_SIZE);
      const batchContent = batch.map((c) => c.content);
      const batchStartMs = Date.now();
      logIngestion(
        ingestId,
        `Embedding batch ${Math.floor(start / EMBEDDING_BATCH_SIZE) + 1} (Gemini) with ${batch.length} chunks...`,
        logs,
      );

      const { embeddings: batchEmbeddings } = await embedMany({
        model: getGeminiEmbeddingModel(),
        values: batchContent,
        providerOptions: {
          google: {
            outputDimensionality: GEMINI_EMBEDDING_OUTPUT_DIMENSION,
            taskType: "RETRIEVAL_DOCUMENT",
          },
        },
      });

      embeddings.push(...batchEmbeddings);
      logIngestion(
        ingestId,
        `Completed Gemini embedding batch ${Math.floor(start / EMBEDDING_BATCH_SIZE) + 1} in ${Date.now() - batchStartMs} ms.`,
        logs,
      );
    }

    return embeddings;
  }

  if (embeddingProvider === "openrouter") {
    for (let start = 0; start < chunks.length; start += EMBEDDING_BATCH_SIZE) {
      const batch = chunks.slice(start, start + EMBEDDING_BATCH_SIZE);
      const batchContent = batch.map((c) => c.content);
      const batchStartMs = Date.now();
      logIngestion(
        ingestId,
        `Embedding batch ${Math.floor(start / EMBEDDING_BATCH_SIZE) + 1} (OpenRouter) with ${batch.length} chunks...`,
        logs,
      );

      const batchEmbeddings = await generateOpenRouterEmbeddings(batchContent);
      embeddings.push(...batchEmbeddings);

      logIngestion(
        ingestId,
        `Completed OpenRouter embedding batch ${Math.floor(start / EMBEDDING_BATCH_SIZE) + 1} in ${Date.now() - batchStartMs} ms.`,
        logs,
      );
    }

    return embeddings;
  }

  for (let start = 0; start < chunks.length; start += EMBEDDING_BATCH_SIZE) {
    const batch = chunks.slice(start, start + EMBEDDING_BATCH_SIZE);
    const batchContent = batch.map((c) => c.content);
    const batchStartMs = Date.now();
    logIngestion(
      ingestId,
      `Embedding batch ${Math.floor(start / EMBEDDING_BATCH_SIZE) + 1} (Hugging Face) with ${batch.length} chunks...`,
      logs,
    );

    const batchEmbeddings = await generateHFEmbeddings(batchContent);
    embeddings.push(...batchEmbeddings);

    logIngestion(
      ingestId,
      `Completed HF embedding batch ${Math.floor(start / EMBEDDING_BATCH_SIZE) + 1} in ${Date.now() - batchStartMs} ms.`,
      logs,
    );
  }

  return embeddings;
}
