import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

import {
  createVectorLiteral,
  normalizeEmbeddingDimensions,
} from "./ragEmbeddings";
import {
  DB_INSERT_MAX_RETRIES,
  INSERT_BATCH_SIZE,
  RAG_VECTOR_DIMENSIONS,
  RETRY_BASE_MS,
} from "./ragIngestionConfig";
import { logIngestion } from "./ragIngestionLogging";
import { delay, shouldRetryNetworkError } from "./ragIngestionUtils";

import type {
  CopticDocumentsInsertRow,
  RagChunkWithMetadata,
  RagIngestionLogEntry,
  SourceType,
} from "./ragIngestionTypes";

function isMissingCopticDocumentsTable(error: { message: string }) {
  const normalized = error.message.toLowerCase();
  return (
    normalized.includes("could not find the table") &&
    normalized.includes("coptic_documents")
  );
}

function buildMissingCopticDocumentsTableError() {
  return [
    "Missing Supabase table: public.coptic_documents.",
    "Run migration 20260410000000_coptic_documents_pgvector.sql (or apply supabase/setup.sql) on your active Supabase project, then retry ingestion.",
  ].join(" ");
}

/**
 * Extracts the pgvector width from Supabase insert errors so ingestion can
 * adapt to deployed schemas whose vector dimensions differ from local config.
 */
function getExpectedVectorDimensionsFromInsertError(message: string) {
  const match = message.match(/expected\s+(\d+)\s+dimensions?,\s*not\s+\d+/i);
  if (!match) {
    return null;
  }

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Guards against rapid duplicate ingests and clears the previous source version
 * before replacement. The lookup remains source-name based to preserve the
 * current admin update behavior.
 */
export async function prepareRagDocumentUpdate(options: {
  ingestionId: string;
  logs: RagIngestionLogEntry[];
  sourceTitle: string;
}) {
  const serviceRoleClient = createServiceRoleClient();
  let isUpdate = false;

  logIngestion(
    options.ingestionId,
    `Checking for existing records for "${options.sourceTitle}"...`,
    options.logs,
  );

  const { data: existingDocs } = await serviceRoleClient
    .from("coptic_documents")
    .select("metadata")
    .eq("metadata->>sourceName", options.sourceTitle)
    .limit(1);

  if (existingDocs && existingDocs.length > 0) {
    isUpdate = true;
    const uploadedAtStr = (existingDocs[0].metadata as Record<string, unknown>)
      ?.uploadedAt;

    if (typeof uploadedAtStr === "string") {
      const uploadedAtMs = new Date(uploadedAtStr).getTime();
      if (Date.now() - uploadedAtMs < 15 * 60 * 1000) {
        throw new Error(
          `This file was recently ingested at ${new Date(uploadedAtMs).toLocaleTimeString()}. Please wait a few minutes before updating it again.`,
        );
      }
    }

    logIngestion(
      options.ingestionId,
      `Sweeping previous records for "${options.sourceTitle}" to prepare for update...`,
      options.logs,
    );
    const { error: sweepError } = await serviceRoleClient
      .from("coptic_documents")
      .delete()
      .eq("metadata->>sourceName", options.sourceTitle);

    if (
      sweepError &&
      !isMissingCopticDocumentsTable(sweepError as { message: string })
    ) {
      throw new Error(
        `Failed to sweep previous version of this document: ${sweepError.message}`,
      );
    }
  }

  return { isUpdate };
}

/**
 * Inserts RAG chunks in retryable batches and rebuilds pending rows if the
 * database reports a different vector width. This keeps provider embeddings and
 * pgvector storage compatible across deployments.
 */
export async function insertRagDocumentChunks(options: {
  chunks: RagChunkWithMetadata[];
  embeddingModelName: string;
  embeddings: number[][];
  file: File;
  ingestionId: string;
  logs: RagIngestionLogEntry[];
  ocrUsed: boolean;
  sourceDimensions: number;
  sourceTitle: string;
  sourceType: SourceType;
  uploadedAt: string;
  userId: string;
}) {
  const serviceRoleClient = createServiceRoleClient();

  function buildRows(targetDimensions: number): CopticDocumentsInsertRow[] {
    const normalizedEmbeddings = options.embeddings.map((embedding) =>
      normalizeEmbeddingDimensions(embedding, targetDimensions),
    );

    return options.chunks.map((chunk, index) => ({
      content: chunk.content,
      embedding: createVectorLiteral(normalizedEmbeddings[index]),
      metadata: {
        chunkIndex: index,
        embeddingDimensions: targetDimensions,
        fileName: options.file.name,
        mimeType: options.file.type || "application/octet-stream",
        ocrUsed: options.ocrUsed,
        sourceName: options.sourceTitle,
        sourceEmbeddingDimensions: options.sourceDimensions,
        sourceType: options.sourceType,
        totalChunks: options.chunks.length,
        uploadedAt: options.uploadedAt,
        uploadedBy: options.userId,
        embeddingModel: options.embeddingModelName,
        ...chunk.metadata,
      },
    }));
  }

  let activeVectorDimensions = RAG_VECTOR_DIMENSIONS;
  if (options.sourceDimensions !== activeVectorDimensions) {
    logIngestion(
      options.ingestionId,
      `Embedding dimension reconciliation applied: source=${options.sourceDimensions}, target=${activeVectorDimensions}.`,
      options.logs,
    );
  }

  let rows: CopticDocumentsInsertRow[] = buildRows(activeVectorDimensions);

  const copticDocumentsTable = serviceRoleClient.from(
    "coptic_documents",
  ) as unknown as {
    insert: (
      values: CopticDocumentsInsertRow[],
    ) => Promise<{ error: { message: string } | null }>;
  };

  const insertStartMs = Date.now();
  for (let start = 0; start < rows.length; start += INSERT_BATCH_SIZE) {
    const batchNumber = Math.floor(start / INSERT_BATCH_SIZE) + 1;
    const batchStartMs = Date.now();
    logIngestion(
      options.ingestionId,
      `Inserting database batch ${batchNumber} with ${Math.min(INSERT_BATCH_SIZE, rows.length - start)} rows...`,
      options.logs,
    );

    let inserted = false;
    for (let attempt = 1; attempt <= DB_INSERT_MAX_RETRIES; attempt += 1) {
      const batch = rows.slice(start, start + INSERT_BATCH_SIZE);
      const { error } = await copticDocumentsTable.insert(batch);

      if (!error) {
        inserted = true;
        break;
      }

      if (isMissingCopticDocumentsTable(error)) {
        throw new Error(buildMissingCopticDocumentsTableError());
      }

      const expectedDimensions = getExpectedVectorDimensionsFromInsertError(
        error.message,
      );
      if (expectedDimensions && expectedDimensions !== activeVectorDimensions) {
        activeVectorDimensions = expectedDimensions;
        rows = buildRows(activeVectorDimensions);
        logIngestion(
          options.ingestionId,
          `Database expects vector(${expectedDimensions}). Rebuilding embeddings for remaining batches with target=${expectedDimensions}.`,
          options.logs,
        );
        continue;
      }

      if (attempt >= DB_INSERT_MAX_RETRIES || !shouldRetryNetworkError(error)) {
        throw new Error(`Failed to insert document chunks: ${error.message}`);
      }

      logIngestion(
        options.ingestionId,
        `Retrying database batch ${batchNumber} after transient error: ${error.message}`,
        options.logs,
      );
      await delay(RETRY_BASE_MS * attempt);
    }

    if (!inserted) {
      throw new Error(
        `Failed to insert document batch ${batchNumber} after retries.`,
      );
    }

    logIngestion(
      options.ingestionId,
      `Completed database batch ${batchNumber} in ${Date.now() - batchStartMs} ms.`,
      options.logs,
    );
  }

  logIngestion(
    options.ingestionId,
    `Database insertion finished in ${Date.now() - insertStartMs} ms.`,
    options.logs,
  );

  return { rowsInserted: rows.length };
}
