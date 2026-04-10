/**
 * Shared server-action result shapes used by the admin workspace forms.
 */
export type ContentReleaseDraftState = {
  error?: string;
  success: boolean;
};

export type DeleteContentReleaseState = {
  message?: string;
  success: boolean;
};

export type SendContentReleaseState = {
  message?: string;
  success: boolean;
};

export type SyncAudienceContactsState = {
  message?: string;
  success: boolean;
};

export type RagIngestionState = {
  chunkStats?: {
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
  chunksInserted?: number;
  embeddingProvider?: "gemini" | "hf" | "openrouter";
  error?: string;
  ingestId?: string;
  logs?: Array<{
    line?: string;
    message: string;
    timestamp: string;
  }>;
  message?: string;
  ocrUsed?: boolean;
  sourceName?: string;
  success: boolean;
};
