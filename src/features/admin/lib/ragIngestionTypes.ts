import type { ReadableSourceType } from "@/lib/sourceFiles";

import type { StructuredJsonChunkMode } from "./structuredJsonChunks";

export type RagIngestionResult = {
  chunkStats?: RagChunkStats;
  chunksInserted?: number;
  error?: string;
  logs?: RagIngestionLogEntry[];
  message?: string;
  ocrUsed?: boolean;
  sourceName?: string;
  sourceType?: string;
  success: boolean;
};

export type RagIngestionState = RagIngestionResult & {
  embeddingProvider?: RagEmbeddingProvider;
  ingestId?: string;
};

export type RagIngestionLogEntry = {
  line?: string;
  message: string;
  timestamp: string;
};

export type RagChunkStats = {
  avgChunkEstimatedTokens: number;
  avgChunkChars: number;
  avgChunkWords: number;
  chunkOverlap: number;
  chunkSizeTarget: number;
  embeddingBatchesPlanned: number;
  embeddingBatchSize: number;
  insertBatchesPlanned: number;
  insertBatchSize: number;
  maxChunkEstimatedTokens: number;
  maxChunkChars: number;
  maxChunkWords: number;
  minChunkEstimatedTokens: number;
  minChunkChars: number;
  minChunkWords: number;
  overlapOverheadPct: number;
  totalChunkChars: number;
  totalEstimatedTokens: number;
  sourceTextChars: number;
  totalChunks: number;
};

export type SourceType = ReadableSourceType;
export type RagEmbeddingProvider = "gemini" | "hf" | "openrouter";

export type IngestRagFileOptions = {
  embeddingProvider?: RagEmbeddingProvider;
  enableOcr: boolean;
  forceOcr?: boolean;
  file: File;
  ingestId?: string;
  jsonChunkMode?: StructuredJsonChunkMode;
  skipThothEnrichment?: boolean;
  skipThothProofcheck?: boolean;
  sourceTitle: string;
  userId: string;
};

export type PdfReconciliationSummary = {
  extractedChars: number;
  ocrChars: number;
  similarity: number;
  strategy:
    | "ocr_only"
    | "pdf_only"
    | "prefer_ocr"
    | "prefer_pdf"
    | "thoth_reconcile"
    | "verified_match"
    | "verified_merge";
};

export type RagChunkWithMetadata = {
  content: string;
  metadata: Record<string, unknown>;
};
