import "server-only";
import { generateText } from "ai";

import {
  buildGeminiChunkEnrichmentPrompt,
  buildThothChunkEnrichmentPrompt,
  buildThothChunkProofcheckPrompt,
} from "@/lib/ai/prompts/ragIngestion";
import { getGeminiModel } from "@/lib/gemini";
import { tryParseJsonFromModelAnswer } from "@/lib/llm";
import {
  normalizeWhitespace,
  splitIntoSemanticSegments,
  toStringArray,
} from "@/lib/text";

import {
  CHUNK_OVERLAP,
  CHUNK_SIZE,
  EMBEDDING_BATCH_SIZE,
  INSERT_BATCH_SIZE,
  RAG_THOTH_PROOFCHECK_REQUIRED,
  THOTH_CHUNK_INPUT_LIMIT,
} from "./ragIngestionConfig";
import { logIngestion } from "./ragIngestionLogging";
import { hasThothAvailable, runThothStructuredTask } from "./ragIngestionUtils";
import { buildJsonOrXmlSourceChunks } from "./ragJsonSourceIngestion";

import type {
  RagChunkStats,
  RagChunkWithMetadata,
  RagIngestionLogEntry,
} from "./ragIngestionTypes";
import type { StructuredJsonChunkMode } from "./structuredJsonChunks";

type ChunkCategory = "document" | "grammar" | "vocabulary";

type ChunkEnrichmentResult = {
  category: ChunkCategory;
  metadata: Record<string, unknown>;
  rephrasedContent: string;
  retrievalKeywords: string[];
  retrievalSummary?: string;
};

type ThothProofcheckResult = {
  metadataPatch?: Record<string, unknown>;
  qualityScore?: number;
  retrievalKeywords?: string[];
  retrievalSummary?: string;
  rewrittenContent?: string;
};

function toChunkCategory(value: unknown): ChunkCategory {
  if (value === "grammar") {
    return "grammar";
  }

  if (value === "vocabulary") {
    return "vocabulary";
  }

  return "document";
}

/**
 * Validates model-generated enrichment output before it can influence stored
 * chunk content or metadata.
 */
function normalizeChunkEnrichment(
  value: unknown,
): ChunkEnrichmentResult | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as {
    category?: unknown;
    metadata?: unknown;
    rephrasedContent?: unknown;
    retrievalKeywords?: unknown;
    retrievalSummary?: unknown;
  };

  const rephrasedContent =
    typeof candidate.rephrasedContent === "string"
      ? normalizeWhitespace(candidate.rephrasedContent)
      : "";

  if (!rephrasedContent) {
    return null;
  }

  const metadata =
    candidate.metadata && typeof candidate.metadata === "object"
      ? (candidate.metadata as Record<string, unknown>)
      : {};

  const retrievalSummary =
    typeof candidate.retrievalSummary === "string"
      ? normalizeWhitespace(candidate.retrievalSummary).slice(0, 280)
      : undefined;

  return {
    category: toChunkCategory(candidate.category),
    metadata,
    rephrasedContent,
    retrievalKeywords: toStringArray(candidate.retrievalKeywords),
    retrievalSummary,
  };
}

/**
 * Folds retrieval keywords and summaries into both embedded content and
 * metadata. This gives vector search the retrieval hints while keeping the same
 * signals available for later filtering and diagnostics.
 */
function buildEnrichedChunkPayload(
  originalChunkText: string,
  enrichment: ChunkEnrichmentResult,
  provider: "gemini" | "thoth" = "thoth",
) {
  const retrievalSignals: string[] = [];
  if (enrichment.retrievalKeywords.length > 0) {
    retrievalSignals.push(
      `Retrieval keywords: ${enrichment.retrievalKeywords.join(", ")}`,
    );
  }

  if (enrichment.retrievalSummary) {
    retrievalSignals.push(`Retrieval summary: ${enrichment.retrievalSummary}`);
  }

  const enrichedContent = [
    enrichment.rephrasedContent,
    ...retrievalSignals,
  ].join("\n\n");

  return {
    content:
      normalizeWhitespace(enrichedContent).length > 0
        ? enrichedContent
        : originalChunkText,
    metadata: {
      ...enrichment.metadata,
      enrichment_provider: provider,
      retrieval_keywords: enrichment.retrievalKeywords,
      retrieval_summary: enrichment.retrievalSummary ?? null,
      type: enrichment.category,
    } satisfies Record<string, unknown>,
  };
}

/**
 * Asks THOTH to turn a raw chunk into retrieval-optimized text plus metadata.
 * The result is still normalized locally so malformed model output is ignored.
 */
async function enrichChunkWithThoth(options: {
  chunkText: string;
  ingestId: string;
  sourceFileName: string;
  userId: string;
}) {
  const parsed = await runThothStructuredTask({
    ingestId: options.ingestId,
    prompt: buildThothChunkEnrichmentPrompt({
      chunkText: options.chunkText,
      inputLimit: THOTH_CHUNK_INPUT_LIMIT,
      sourceFileName: options.sourceFileName,
    }),
    taskTag: "chunk-enrichment",
    userId: options.userId,
  });

  return normalizeChunkEnrichment(parsed);
}

/**
 * Applies optional THOTH enrichment to already-structured chunks, preserving
 * the original chunk whenever THOTH is unavailable or returns unusable JSON.
 */
async function applyThothEnrichmentToChunks(options: {
  chunks: RagChunkWithMetadata[];
  fileName: string;
  ingestId?: string;
  userId?: string;
}) {
  if (!options.ingestId || !options.userId || !hasThothAvailable()) {
    return options.chunks;
  }

  const enrichedChunks: RagChunkWithMetadata[] = [];

  for (let index = 0; index < options.chunks.length; index += 1) {
    const chunk = options.chunks[index];
    const enrichment = await enrichChunkWithThoth({
      chunkText: chunk.content,
      ingestId: options.ingestId,
      sourceFileName: options.fileName,
      userId: options.userId,
    });

    if (!enrichment) {
      enrichedChunks.push(chunk);
      continue;
    }

    const merged = buildEnrichedChunkPayload(chunk.content, enrichment);
    enrichedChunks.push({
      content: merged.content,
      metadata: {
        ...chunk.metadata,
        ...merged.metadata,
      },
    });
  }

  return enrichedChunks;
}

/**
 * Validates the stricter proofcheck response and clamps quality scores so
 * downstream metadata has a stable shape.
 */
function normalizeThothProofcheckResult(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as ThothProofcheckResult;
  const rewrittenContent =
    typeof candidate.rewrittenContent === "string"
      ? normalizeWhitespace(candidate.rewrittenContent)
      : "";

  if (!rewrittenContent) {
    return null;
  }

  const metadataPatch =
    candidate.metadataPatch && typeof candidate.metadataPatch === "object"
      ? candidate.metadataPatch
      : {};

  const qualityScore =
    typeof candidate.qualityScore === "number" &&
    Number.isFinite(candidate.qualityScore)
      ? Math.max(0, Math.min(1, candidate.qualityScore))
      : undefined;

  const retrievalSummary =
    typeof candidate.retrievalSummary === "string"
      ? normalizeWhitespace(candidate.retrievalSummary).slice(0, 280)
      : undefined;

  return {
    metadataPatch,
    qualityScore,
    retrievalKeywords: toStringArray(candidate.retrievalKeywords),
    retrievalSummary,
    rewrittenContent,
  };
}

/**
 * Applies the final THOTH quality gate before persistence. In strict mode a
 * failed proofcheck aborts ingestion; otherwise unverified chunks continue with
 * their existing content and metadata.
 */
export async function proofcheckChunksWithThoth(options: {
  chunks: RagChunkWithMetadata[];
  fileName: string;
  ingestId: string;
  logs: RagIngestionLogEntry[];
  skipProofcheck?: boolean;
  userId: string;
}) {
  if (options.skipProofcheck) {
    logIngestion(
      options.ingestId,
      "THOTH proofcheck skipped for this ingestion path.",
      options.logs,
    );
    return options.chunks;
  }

  if (!hasThothAvailable()) {
    if (RAG_THOTH_PROOFCHECK_REQUIRED) {
      throw new Error(
        "THOTH proofcheck is required before ingestion, but THOTH API is unavailable. Configure THOTH_API_KEY or set RAG_THOTH_PROOFCHECK_REQUIRED=false.",
      );
    }

    logIngestion(
      options.ingestId,
      "THOTH proofcheck skipped because THOTH is unavailable and strict mode is disabled.",
      options.logs,
    );
    return options.chunks;
  }

  const proofcheckedChunks: RagChunkWithMetadata[] = [];
  let proofcheckedCount = 0;

  for (let index = 0; index < options.chunks.length; index += 1) {
    const chunk = options.chunks[index];
    const parsed = await runThothStructuredTask({
      ingestId: options.ingestId,
      prompt: buildThothChunkProofcheckPrompt({
        chunkText: chunk.content,
        fileName: options.fileName,
        inputLimit: THOTH_CHUNK_INPUT_LIMIT,
        metadata: chunk.metadata,
      }),
      taskTag: "proofcheck",
      userId: options.userId,
    });
    const proofchecked = normalizeThothProofcheckResult(parsed);

    if (!proofchecked) {
      if (RAG_THOTH_PROOFCHECK_REQUIRED) {
        throw new Error(
          `THOTH proofcheck failed for chunk ${index + 1}/${options.chunks.length}. Aborting ingestion to avoid unverified chunks.`,
        );
      }

      proofcheckedChunks.push(chunk);
      continue;
    }

    proofcheckedCount += 1;
    proofcheckedChunks.push({
      content: proofchecked.rewrittenContent,
      metadata: {
        ...chunk.metadata,
        ...proofchecked.metadataPatch,
        enrichment_provider: "thoth",
        proofcheck_provider: "thoth",
        proofcheck_quality_score: proofchecked.qualityScore ?? null,
        retrieval_keywords:
          proofchecked.retrievalKeywords.length > 0
            ? proofchecked.retrievalKeywords
            : (chunk.metadata.retrieval_keywords ?? []),
        retrieval_summary:
          proofchecked.retrievalSummary ??
          (typeof chunk.metadata.retrieval_summary === "string"
            ? chunk.metadata.retrieval_summary
            : null),
      },
    });
  }

  logIngestion(
    options.ingestId,
    `THOTH proofcheck completed: ${proofcheckedCount}/${options.chunks.length} chunks rewritten and verified.`,
    options.logs,
  );

  return proofcheckedChunks;
}

function countWords(value: string) {
  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return 0;
  }

  return normalized.split(" ").length;
}

function estimateTokens(charCount: number) {
  return Math.max(1, Math.round(charCount / 4));
}

/**
 * Builds ingestion diagnostics from the final chunk set, including overlap
 * overhead and planned embedding/database batches for the admin progress logs.
 */
export function buildChunkStats(
  chunks: RagChunkWithMetadata[],
  sourceTextChars: number,
): RagChunkStats {
  const lengths = chunks.map((chunk) => chunk.content.length);
  const wordCounts = chunks.map((chunk) => countWords(chunk.content));
  const tokenEstimates = lengths.map((length) => estimateTokens(length));
  const totalChunkChars = lengths.reduce((sum, value) => sum + value, 0);
  const totalEstimatedTokens = tokenEstimates.reduce(
    (sum, value) => sum + value,
    0,
  );
  const totalChunkWords = wordCounts.reduce((sum, value) => sum + value, 0);
  const minChunkChars = lengths.length > 0 ? Math.min(...lengths) : 0;
  const maxChunkChars = lengths.length > 0 ? Math.max(...lengths) : 0;
  const minChunkWords = wordCounts.length > 0 ? Math.min(...wordCounts) : 0;
  const maxChunkWords = wordCounts.length > 0 ? Math.max(...wordCounts) : 0;
  const minChunkEstimatedTokens =
    tokenEstimates.length > 0 ? Math.min(...tokenEstimates) : 0;
  const maxChunkEstimatedTokens =
    tokenEstimates.length > 0 ? Math.max(...tokenEstimates) : 0;
  const overlapOverheadPct =
    sourceTextChars > 0
      ? Math.round(
          ((totalChunkChars - sourceTextChars) / sourceTextChars) * 1000,
        ) / 10
      : 0;

  return {
    avgChunkEstimatedTokens:
      tokenEstimates.length > 0
        ? Math.round((totalEstimatedTokens / tokenEstimates.length) * 10) / 10
        : 0,
    avgChunkChars:
      lengths.length > 0
        ? Math.round((totalChunkChars / lengths.length) * 10) / 10
        : 0,
    avgChunkWords:
      wordCounts.length > 0
        ? Math.round((totalChunkWords / wordCounts.length) * 10) / 10
        : 0,
    chunkOverlap: CHUNK_OVERLAP,
    chunkSizeTarget: CHUNK_SIZE,
    embeddingBatchesPlanned: Math.ceil(chunks.length / EMBEDDING_BATCH_SIZE),
    embeddingBatchSize: EMBEDDING_BATCH_SIZE,
    insertBatchesPlanned: Math.ceil(chunks.length / INSERT_BATCH_SIZE),
    insertBatchSize: INSERT_BATCH_SIZE,
    maxChunkEstimatedTokens,
    maxChunkChars,
    maxChunkWords,
    minChunkEstimatedTokens,
    minChunkChars,
    minChunkWords,
    overlapOverheadPct,
    totalChunkChars,
    totalEstimatedTokens,
    sourceTextChars,
    totalChunks: chunks.length,
  };
}

/**
 * Converts raw source text into RAG chunks. Structured JSON/XML sources are
 * handled first, then plain text is segmented and optionally enriched through
 * THOTH or Gemini fallback.
 */
export async function splitIntoChunks(
  text: string,
  fileName: string = "",
  options?: {
    ingestId?: string;
    jsonChunkMode?: StructuredJsonChunkMode;
    skipThothEnrichment?: boolean;
    userId?: string;
  },
  chunkSize = CHUNK_SIZE,
  overlap = CHUNK_OVERLAP,
): Promise<RagChunkWithMetadata[]> {
  const ingestId = options?.ingestId;
  const jsonChunkMode = options?.jsonChunkMode ?? "default";
  const skipThothEnrichment = options?.skipThothEnrichment ?? false;
  const userId = options?.userId;

  const structuredSourceChunks = await buildJsonOrXmlSourceChunks({
    enrichChunks: (chunks) =>
      applyThothEnrichmentToChunks({
        chunks,
        fileName,
        ingestId,
        userId,
      }),
    fileName,
    ingestId,
    jsonChunkMode,
    skipThothEnrichment,
    text,
    userId,
  });

  if (structuredSourceChunks) {
    return structuredSourceChunks;
  }

  const segments = splitIntoSemanticSegments(text);
  if (segments.length === 0) {
    return [];
  }

  const chunks: string[] = [];
  let currentChunk = "";

  for (const segment of segments) {
    if (currentChunk.length + segment.length < chunkSize) {
      currentChunk += (currentChunk ? " " : "") + segment;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }

      const overlapSeed =
        overlap > 0 && currentChunk.length > overlap
          ? currentChunk.slice(-overlap)
          : "";
      currentChunk =
        overlapSeed.length > 0 ? `${overlapSeed} ${segment}` : segment;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  const fallbackChunks =
    chunks.length > 0
      ? chunks
      : [normalizeWhitespace(text).slice(0, chunkSize)];

  const processedChunks: RagChunkWithMetadata[] = [];

  for (const chunkText of fallbackChunks) {
    if (ingestId && userId) {
      const thothEnrichment = await enrichChunkWithThoth({
        chunkText,
        ingestId,
        sourceFileName: fileName,
        userId,
      });

      if (thothEnrichment) {
        const thothChunk = buildEnrichedChunkPayload(
          chunkText,
          thothEnrichment,
          "thoth",
        );

        processedChunks.push({
          content: thothChunk.content,
          metadata: thothChunk.metadata,
        });
        continue;
      }
    }

    try {
      const result = await generateText({
        model: getGeminiModel(),
        prompt: buildGeminiChunkEnrichmentPrompt({
          chunkText,
          inputLimit: THOTH_CHUNK_INPUT_LIMIT,
        }),
      });

      const parsed = normalizeChunkEnrichment(
        tryParseJsonFromModelAnswer(result.text),
      );

      if (parsed) {
        const geminiChunk = buildEnrichedChunkPayload(
          chunkText,
          parsed,
          "gemini",
        );
        processedChunks.push(geminiChunk);
        continue;
      }

      processedChunks.push({
        content: chunkText,
        metadata: { type: "document" },
      });
    } catch {
      console.warn(
        "[RAG Ingestion] LLM chunk classification failed, falling back to raw chunk string.",
      );
      processedChunks.push({
        content: chunkText,
        metadata: { type: "document" },
      });
    }
  }

  return processedChunks.filter((chunk) => chunk.content.length > 10);
}
