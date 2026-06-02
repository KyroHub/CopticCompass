import {
  buildChunkStats,
  proofcheckChunksWithThoth,
  splitIntoChunks,
} from "./ragChunking";
import { generateEmbeddings, getEmbeddingModelName } from "./ragEmbeddings";
import {
  getRagIngestionLogs,
  logIngestion,
  markLiveIngestionDone,
} from "./ragIngestionLogging";
import { normalizeWhitespace } from "./ragIngestionUtils";
import {
  insertRagDocumentChunks,
  prepareRagDocumentUpdate,
} from "./ragPersistence";
import { detectSourceType, extractSourceText } from "./ragSourceReaders";

import type {
  IngestRagFileOptions,
  RagIngestionLogEntry,
  RagIngestionResult,
} from "./ragIngestionTypes";

export { getRagIngestionLogs };
export type { RagIngestionLogEntry } from "./ragIngestionTypes";

export async function ingestRagFile({
  embeddingProvider = "hf",
  enableOcr,
  forceOcr = false,
  file,
  ingestId,
  jsonChunkMode = "default",
  skipThothEnrichment = false,
  skipThothProofcheck = false,
  sourceTitle,
  userId,
}: IngestRagFileOptions): Promise<RagIngestionResult> {
  const ingestionId = ingestId ?? crypto.randomUUID();
  const startMs = Date.now();
  const logs: RagIngestionLogEntry[] = [];
  logIngestion(
    ingestionId,
    `Started ingestion for ${file.name} with provider=${embeddingProvider}, OCR=${enableOcr}, forceOcr=${forceOcr}.`,
    logs,
  );

  try {
    const { isUpdate } = await prepareRagDocumentUpdate({
      ingestionId,
      logs,
      sourceTitle,
    });

    const sourceType = detectSourceType(file);
    if (!sourceType) {
      logIngestion(
        ingestionId,
        `Rejected unsupported file type: ${file.type || "unknown"}.`,
        logs,
      );
      return {
        success: false,
        error:
          "Unsupported file type. Try PDF, DOCX, image, or plain text formats (txt/md/csv/json/xml/html).",
        logs,
      };
    }

    const extractStartMs = Date.now();
    logIngestion(
      ingestionId,
      `Extracting text from ${sourceType} source...`,
      logs,
    );
    const { ocrUsed, reconciliation, text } = await extractSourceText(
      file,
      sourceType,
      enableOcr,
      forceOcr,
      {
        ingestId: ingestionId,
        userId,
      },
    );
    logIngestion(
      ingestionId,
      `Text extraction finished in ${Date.now() - extractStartMs} ms (${text.length} chars, OCR used=${ocrUsed}).`,
      logs,
    );

    if (sourceType === "pdf" && reconciliation) {
      logIngestion(
        ingestionId,
        `PDF verification: strategy=${reconciliation.strategy}, similarity=${reconciliation.similarity.toFixed(2)}, extractedChars=${reconciliation.extractedChars}, ocrChars=${reconciliation.ocrChars}.`,
        logs,
      );
    }

    if (normalizeWhitespace(text).length < 60) {
      logIngestion(
        ingestionId,
        "Extraction produced insufficient text content.",
        logs,
      );
      return {
        success: false,
        error:
          "Could not extract enough text from this file. Try a clearer file or enable OCR.",
        logs,
      };
    }

    const chunkStartMs = Date.now();
    const baseChunks = await splitIntoChunks(text, file.name, {
      ingestId: ingestionId,
      jsonChunkMode,
      skipThothEnrichment,
      userId,
    });
    const normalizedSourceTextChars = normalizeWhitespace(text).length;
    logIngestion(
      ingestionId,
      `Chunking finished in ${Date.now() - chunkStartMs} ms (${baseChunks.length} chunks).`,
      logs,
    );

    if (baseChunks.length === 0) {
      return {
        success: false,
        error: "No chunks were produced from this file.",
        logs,
      };
    }

    const proofcheckStartMs = Date.now();
    const chunks = await proofcheckChunksWithThoth({
      chunks: baseChunks,
      fileName: file.name,
      ingestId: ingestionId,
      logs,
      skipProofcheck: skipThothProofcheck,
      userId,
    });
    logIngestion(
      ingestionId,
      `Proofcheck stage finished in ${Date.now() - proofcheckStartMs} ms.`,
      logs,
    );

    const chunkStats = buildChunkStats(chunks, normalizedSourceTextChars);
    logIngestion(
      ingestionId,
      `Chunk stats: min=${chunkStats.minChunkChars}, max=${chunkStats.maxChunkChars}, avg=${chunkStats.avgChunkChars}, avgWords=${chunkStats.avgChunkWords}, target=${chunkStats.chunkSizeTarget}, overlap=${chunkStats.chunkOverlap}, overhead=${chunkStats.overlapOverheadPct}%.`,
      logs,
    );

    const embeddingStartMs = Date.now();
    const embeddings = await generateEmbeddings(
      chunks,
      embeddingProvider,
      ingestionId,
      logs,
    );
    logIngestion(
      ingestionId,
      `Generated ${embeddings.length} embeddings in ${Date.now() - embeddingStartMs} ms.`,
      logs,
    );

    if (embeddings.length !== chunks.length) {
      logIngestion(
        ingestionId,
        `Embedding mismatch: expected ${chunks.length}, got ${embeddings.length}.`,
        logs,
      );
      return {
        success: false,
        error: "Embedding generation returned an unexpected result length.",
        logs,
      };
    }

    const sourceDimensions = embeddings[0]?.length ?? 0;
    const uploadedAt = new Date().toISOString();
    const { rowsInserted } = await insertRagDocumentChunks({
      chunks,
      embeddingModelName: getEmbeddingModelName(embeddingProvider),
      embeddings,
      file,
      ingestionId,
      logs,
      ocrUsed,
      sourceDimensions,
      sourceTitle,
      sourceType,
      uploadedAt,
      userId,
    });

    const totalMs = Date.now() - startMs;
    logIngestion(ingestionId, `Ingestion complete in ${totalMs} ms.`, logs);
    markLiveIngestionDone(ingestionId);

    return {
      success: true,
      chunkStats,
      chunksInserted: rowsInserted,
      logs,
      message: `${isUpdate ? "Re-ingested and updated" : "Ingested"} ${rowsInserted} chunks from ${sourceTitle} in ${
        Math.round(totalMs / 100) / 10
      }s.`,
      ocrUsed,
      sourceName: sourceTitle,
      sourceType,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Could not ingest this file into the RAG index.";
    logIngestion(ingestionId, `Ingestion failed: ${errorMessage}`, logs);
    markLiveIngestionDone(ingestionId, errorMessage);

    return {
      success: false,
      error: errorMessage,
      logs,
      sourceName: sourceTitle,
    };
  }
}
