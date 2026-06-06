import "server-only";

import { generateTextEmbeddings } from "@/lib/ai/embeddings";
import {
  DEFAULT_RAG_VECTOR_DIMENSIONS,
  getRagVectorRuntimeConfig,
} from "@/lib/ai/ragRuntimeConfig";
import {
  matchCopticDocuments,
  searchCopticVocabularyDocumentsByContentFilters,
  type CopticDocumentMatch,
} from "@/lib/supabase/copticDocuments";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import {
  createVectorLiteral,
  normalizeEmbeddingDimensions,
} from "@/lib/vector";

const { geminiEmbeddingOutputDimension: GEMINI_EMBEDDING_OUTPUT_DIMENSION } =
  getRagVectorRuntimeConfig(process.env);

const embeddingFailureMessages = {
  gemini: "Gemini embedding failed",
  hf: "HF embedding failed",
  openrouter: "OpenRouter embedding failed",
} as const;

/**
 * Generates one query embedding through the selected RAG provider and rejects
 * empty provider responses before vector search reaches Supabase.
 */
async function generateQueryEmbedding(
  provider: "hf" | "gemini" | "openrouter",
  query: string,
): Promise<number[]> {
  const { embeddings } = await generateTextEmbeddings({
    provider,
    values: [query],
    geminiOutputDimension: GEMINI_EMBEDDING_OUTPUT_DIMENSION,
  });
  const embedding = embeddings[0];
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error(embeddingFailureMessages[provider]);
  }

  return embedding;
}

function sanitizeKeywordForIlike(keyword: string): string {
  return keyword.replace(/[^\p{L}\p{N}\s-]/gu, "").trim();
}

/**
 * Runs semantic RAG retrieval through the `match_coptic_documents` RPC with an
 * optional metadata filter for grammar-only or source-specific searches.
 */
export async function searchCopticDocuments(
  query: string,
  matchCount: number = 5,
  metadataFilter: Record<string, unknown> = {},
  provider: "hf" | "gemini" | "openrouter" = "hf",
): Promise<CopticDocumentMatch[]> {
  const rawEmbedding = await generateQueryEmbedding(provider, query);

  const queryEmbedding = normalizeEmbeddingDimensions(
    rawEmbedding,
    DEFAULT_RAG_VECTOR_DIMENSIONS,
  );

  const supabase = createServiceRoleClient();
  const { data, error } = await matchCopticDocuments(supabase, {
    query_embedding: createVectorLiteral(queryEmbedding),
    query_text: query,
    match_count: matchCount,
    filter_metadata: metadataFilter,
  });

  if (error) {
    throw new Error(`Vector search failed: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Performs a metadata/content keyword lookup against vocabulary chunks to catch
 * exact dictionary terms that vector search can miss.
 */
export async function searchVocabularyByKeywords(
  keywords: string[],
): Promise<CopticDocumentMatch[]> {
  if (!keywords || keywords.length === 0) {
    return [];
  }

  const sanitizedKeywords = keywords
    .map((keyword) => sanitizeKeywordForIlike(keyword))
    .filter(Boolean);
  if (sanitizedKeywords.length === 0) {
    return [];
  }

  const supabase = createServiceRoleClient();

  const orFilters = sanitizedKeywords
    .map((keyword) => `content.ilike.%${keyword}%`)
    .join(",");

  const { data, error } = await searchCopticVocabularyDocumentsByContentFilters(
    supabase,
    orFilters,
  );

  if (error) {
    console.error(
      "Failed to search vocabulary chunks by keyword:",
      error.message,
    );
    return [];
  }

  return data ?? [];
}
