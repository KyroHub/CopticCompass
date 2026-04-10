import { embedMany } from "ai";
import mammoth from "mammoth";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import {
  GEMINI_EMBEDDING_MODEL,
  getGeminiEmbeddingModel,
} from "@/lib/gemini";
import { HF_EMBEDDING_MODEL, generateHFEmbeddings } from "@/lib/hf";
import {
  OPENROUTER_EMBEDDING_MODEL,
  generateOpenRouterEmbeddings,
} from "@/lib/openrouter";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import type { Json } from "@/types/supabase";

const CHUNK_SIZE = 1600;
const CHUNK_OVERLAP = 200;
const OCR_MIN_TEXT_LENGTH = 250;
const EMBEDDING_BATCH_SIZE = Number(
  process.env.RAG_EMBEDDING_BATCH_SIZE ?? "32",
);
const GEMINI_EMBEDDING_OUTPUT_DIMENSION = Number(
  process.env.GEMINI_EMBEDDING_OUTPUT_DIMENSION ?? "3072",
);
const INSERT_BATCH_SIZE = Number(process.env.RAG_INSERT_BATCH_SIZE ?? "50");
const OCR_TIMEOUT_MS = Number(process.env.RAG_OCR_TIMEOUT_MS ?? "90000");
const OCR_MAX_RETRIES = Number(process.env.RAG_OCR_MAX_RETRIES ?? "2");
const DB_INSERT_MAX_RETRIES = Number(process.env.RAG_DB_INSERT_MAX_RETRIES ?? "3");
const RETRY_BASE_MS = Number(process.env.RAG_RETRY_BASE_MS ?? "1500");
const RAG_VECTOR_DIMENSIONS = Number(process.env.RAG_VECTOR_DIMENSIONS ?? "768");
const OCR_UPLOAD_FIELD_FALLBACKS = [
  "file",
  "image",
  "upload",
  "document",
  "photo",
  "files",
];
const OCR_TEXT_LIKE_KEYS = [
  "text",
  "extracted_text",
  "ocr_text",
  "output",
  "content",
  "transcript",
  "transcription",
  "result",
  "data",
  "message",
];

const IMAGE_MIME_PREFIX = "image/";
const PDF_MIME = "application/pdf";
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "bmp",
  "tif",
  "tiff",
]);

const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "markdown",
  "csv",
  "tsv",
  "json",
  "xml",
  "html",
  "htm",
  "yaml",
  "yml",
  "tex",
  "log",
  "js",
  "ts",
  "tsx",
  "jsx",
  "py",
  "java",
  "c",
  "cpp",
  "cs",
  "go",
  "rs",
  "sql",
]);

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

type SourceType = "pdf" | "image" | "docx" | "text";
export type RagEmbeddingProvider = "gemini" | "hf" | "openrouter";

export type IngestRagFileOptions = {
  embeddingProvider?: RagEmbeddingProvider;
  enableOcr: boolean;
  file: File;
  ingestId?: string;
  sourceTitle: string;
  userId: string;
};

type IngestionLogStoreEntry = {
  done: boolean;
  error?: string;
  logs: RagIngestionLogEntry[];
  updatedAt: number;
};

type CopticDocumentsInsertRow = {
  content: string;
  embedding: string;
  metadata: Json;
};

type PdfReconciliationSummary = {
  extractedChars: number;
  ocrChars: number;
  similarity: number;
  strategy:
    | "ocr_only"
    | "pdf_only"
    | "prefer_ocr"
    | "prefer_pdf"
    | "verified_match"
    | "verified_merge";
};

type GlobalWithRagLogStore = typeof globalThis & {
  __copticRagIngestionLogStore?: Map<string, IngestionLogStoreEntry>;
};

const LOG_STORE_TTL_MS = 2 * 60 * 60 * 1000;

function getLogStore() {
  const globalWithStore = globalThis as GlobalWithRagLogStore;
  if (!globalWithStore.__copticRagIngestionLogStore) {
    globalWithStore.__copticRagIngestionLogStore = new Map();
  }

  return globalWithStore.__copticRagIngestionLogStore;
}

function pruneExpiredLogStreams(store: Map<string, IngestionLogStoreEntry>) {
  const now = Date.now();

  for (const [ingestId, stream] of store.entries()) {
    if (now - stream.updatedAt > LOG_STORE_TTL_MS) {
      store.delete(ingestId);
    }
  }
}

function appendLiveIngestionLog(ingestId: string, entry: RagIngestionLogEntry) {
  const store = getLogStore();
  pruneExpiredLogStreams(store);

  const stream = store.get(ingestId) ?? {
    done: false,
    logs: [],
    updatedAt: Date.now(),
  };
  stream.logs.push(entry);
  stream.updatedAt = Date.now();
  store.set(ingestId, stream);
}

function markLiveIngestionDone(ingestId: string, error?: string) {
  const store = getLogStore();
  pruneExpiredLogStreams(store);

  const stream = store.get(ingestId) ?? {
    done: false,
    logs: [],
    updatedAt: Date.now(),
  };
  stream.done = true;
  stream.error = error;
  stream.updatedAt = Date.now();
  store.set(ingestId, stream);
}

export function getRagIngestionLogs(options: {
  ingestId: string;
  prefix?: boolean;
}) {
  const store = getLogStore();
  pruneExpiredLogStreams(store);

  const { ingestId, prefix = false } = options;
  const entries: RagIngestionLogEntry[] = [];

  for (const [streamIngestId, stream] of store.entries()) {
    const matched = prefix
      ? streamIngestId.startsWith(`${ingestId}-`) || streamIngestId === ingestId
      : streamIngestId === ingestId;

    if (!matched) {
      continue;
    }

    entries.push(...stream.logs);
  }

  entries.sort(
    (left, right) =>
      new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
  );

  return entries;
}

function logIngestion(
  ingestId: string,
  message: string,
  logs?: RagIngestionLogEntry[],
) {
  const entry = {
    line: `[RAG:${ingestId}] ${message}`,
    message,
    timestamp: new Date().toISOString(),
  };
  appendLiveIngestionLog(ingestId, entry);
  const line = `[RAG:${ingestId}] ${message}`;
  logs?.push(entry);
  console.info(line);
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function shouldRetryNetworkError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? `${error.message} ${(error as { cause?: unknown }).cause ?? ""}`
      : typeof error === "object" && error !== null
        ? `${(error as { message?: unknown }).message ?? ""} ${(error as { code?: unknown }).code ?? ""}`
        : String(error);

  const normalized = message.toLowerCase();
  return (
    normalized.includes("econnreset") ||
    normalized.includes("timeout") ||
    normalized.includes("fetch failed") ||
    normalized.includes("429") ||
    normalized.includes("503") ||
    normalized.includes("gateway")
  );
}

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

function getOcrUploadFieldCandidates() {
  const preferred = process.env.OCR_UPLOAD_FIELD?.trim();
  const candidates = [preferred, ...OCR_UPLOAD_FIELD_FALLBACKS].filter(
    (value): value is string => Boolean(value && value.length > 0),
  );

  return Array.from(new Set(candidates));
}

function isUnexpectedFieldErrorMessage(value: string) {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("multererror: unexpected field") ||
    normalized.includes("unexpected field")
  );
}

function stripHtml(input: string) {
  return input
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .trim();
}

function normalizeCandidateText(input: string) {
  return stripHtml(input).replace(/\s+/g, " ").trim();
}

function collectTextCandidates(payload: unknown, depth = 0): string[] {
  if (depth > 6 || payload == null) {
    return [];
  }

  if (typeof payload === "string") {
    const normalized = normalizeCandidateText(payload);
    return normalized ? [normalized] : [];
  }

  if (Array.isArray(payload)) {
    return payload.flatMap((entry) => collectTextCandidates(entry, depth + 1));
  }

  if (typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const collected: string[] = [];

  for (const [key, value] of Object.entries(record)) {
    const loweredKey = key.toLowerCase();
    if (
      OCR_TEXT_LIKE_KEYS.includes(loweredKey) &&
      typeof value === "string"
    ) {
      const normalized = normalizeCandidateText(value);
      if (normalized) {
        collected.push(normalized);
      }
      continue;
    }

    collected.push(...collectTextCandidates(value, depth + 1));
  }

  return collected;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function tokenizeForComparison(value: string) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(" ")
    .filter((token) => token.length >= 3);
}

function calculateTokenJaccardSimilarity(leftText: string, rightText: string) {
  const leftTokens = new Set(tokenizeForComparison(leftText));
  const rightTokens = new Set(tokenizeForComparison(rightText));

  if (leftTokens.size === 0 && rightTokens.size === 0) {
    return 1;
  }

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let overlapCount = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      overlapCount += 1;
    }
  }

  const unionCount = leftTokens.size + rightTokens.size - overlapCount;
  return unionCount > 0 ? overlapCount / unionCount : 0;
}

function splitIntoSemanticSegments(value: string) {
  return value
    .split(/\n{2,}|(?<=[.!?])\s+/u)
    .map((segment) => normalizeWhitespace(segment))
    .filter((segment) => segment.length > 0);
}

function mergeUniqueSegments(primaryText: string, secondaryText: string) {
  const merged: string[] = [];
  const seen = new Set<string>();

  for (const segment of [
    ...splitIntoSemanticSegments(primaryText),
    ...splitIntoSemanticSegments(secondaryText),
  ]) {
    const key = segment.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(segment);
  }

  return merged.join("\n\n");
}

function reconcilePdfExtractedAndOcrText(
  extractedText: string,
  ocrText: string,
): { summary: PdfReconciliationSummary; text: string } {
  const normalizedExtracted = normalizeWhitespace(extractedText);
  const normalizedOcr = normalizeWhitespace(ocrText);

  if (!normalizedExtracted && !normalizedOcr) {
    return {
      summary: {
        extractedChars: 0,
        ocrChars: 0,
        similarity: 1,
        strategy: "pdf_only",
      },
      text: "",
    };
  }

  if (!normalizedExtracted) {
    return {
      summary: {
        extractedChars: 0,
        ocrChars: normalizedOcr.length,
        similarity: 0,
        strategy: "ocr_only",
      },
      text: normalizedOcr,
    };
  }

  if (!normalizedOcr) {
    return {
      summary: {
        extractedChars: normalizedExtracted.length,
        ocrChars: 0,
        similarity: 0,
        strategy: "pdf_only",
      },
      text: normalizedExtracted,
    };
  }

  const similarity = calculateTokenJaccardSimilarity(
    normalizedExtracted,
    normalizedOcr,
  );

  if (similarity >= 0.85) {
    const preferredText =
      normalizedExtracted.length >= normalizedOcr.length
        ? normalizedExtracted
        : normalizedOcr;
    const strategy =
      preferredText === normalizedExtracted ? "prefer_pdf" : "prefer_ocr";

    return {
      summary: {
        extractedChars: normalizedExtracted.length,
        ocrChars: normalizedOcr.length,
        similarity,
        strategy,
      },
      text: preferredText,
    };
  }

  if (similarity >= 0.45) {
    const preferredText =
      normalizedExtracted.length >= normalizedOcr.length
        ? normalizedExtracted
        : normalizedOcr;

    return {
      summary: {
        extractedChars: normalizedExtracted.length,
        ocrChars: normalizedOcr.length,
        similarity,
        strategy: "verified_match",
      },
      text: preferredText,
    };
  }

  const mergedText = mergeUniqueSegments(normalizedExtracted, normalizedOcr);
  return {
    summary: {
      extractedChars: normalizedExtracted.length,
      ocrChars: normalizedOcr.length,
      similarity,
      strategy: "verified_merge",
    },
    text: mergedText,
  };
}

function getFileExtension(fileName: string) {
  const extension = fileName.split(".").pop();
  return extension ? extension.toLowerCase() : "";
}

function detectSourceType(file: File): SourceType | null {
  const extension = getFileExtension(file.name);

  if (file.type === PDF_MIME || extension === "pdf") {
    return "pdf";
  }

  if (file.type.startsWith(IMAGE_MIME_PREFIX) || IMAGE_EXTENSIONS.has(extension)) {
    return "image";
  }

  if (file.type === DOCX_MIME || extension === "docx") {
    return "docx";
  }

  if (TEXT_EXTENSIONS.has(extension) || file.type.startsWith("text/")) {
    return "text";
  }

  return null;
}

function splitIntoChunks(
  text: string,
  chunkSize = CHUNK_SIZE,
  overlap = CHUNK_OVERLAP,
) {
  const normalized = normalizeWhitespace(text);
  if (!normalized) {
    return [] as string[];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    const end = Math.min(start + chunkSize, normalized.length);
    chunks.push(normalized.slice(start, end));

    if (end >= normalized.length) {
      break;
    }

    start = Math.max(0, end - overlap);
  }

  return chunks;
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

function buildChunkStats(chunks: string[], sourceTextChars: number): RagChunkStats {
  const lengths = chunks.map((chunk) => chunk.length);
  const wordCounts = chunks.map((chunk) => countWords(chunk));
  const tokenEstimates = lengths.map((length) => estimateTokens(length));
  const totalChunkChars = lengths.reduce((sum, value) => sum + value, 0);
  const totalEstimatedTokens = tokenEstimates.reduce((sum, value) => sum + value, 0);
  const totalChunkWords = wordCounts.reduce((sum, value) => sum + value, 0);
  const minChunkChars = lengths.length > 0 ? Math.min(...lengths) : 0;
  const maxChunkChars = lengths.length > 0 ? Math.max(...lengths) : 0;
  const minChunkWords = wordCounts.length > 0 ? Math.min(...wordCounts) : 0;
  const maxChunkWords = wordCounts.length > 0 ? Math.max(...wordCounts) : 0;
  const minChunkEstimatedTokens = tokenEstimates.length > 0 ? Math.min(...tokenEstimates) : 0;
  const maxChunkEstimatedTokens = tokenEstimates.length > 0 ? Math.max(...tokenEstimates) : 0;
  const overlapOverheadPct =
    sourceTextChars > 0
      ? Math.round(((totalChunkChars - sourceTextChars) / sourceTextChars) * 1000) / 10
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

function createVectorLiteral(embedding: number[]) {
  return `[${embedding.join(",")}]`;
}

function normalizeEmbeddingDimensions(
  embedding: number[],
  targetDimensions = RAG_VECTOR_DIMENSIONS,
) {
  if (embedding.length === targetDimensions) {
    return embedding;
  }

  if (embedding.length > targetDimensions) {
    return embedding.slice(0, targetDimensions);
  }

  return [...embedding, ...new Array(targetDimensions - embedding.length).fill(0)];
}

function getExpectedVectorDimensionsFromInsertError(message: string) {
  const match = message.match(/expected\s+(\d+)\s+dimensions?,\s*not\s+\d+/i);
  if (!match) {
    return null;
  }

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function extractOcrText(payload: unknown): string {
  const candidates = collectTextCandidates(payload);
  return candidates.find((candidate) => candidate.length > 0) ?? "";
}

async function runOcr(file: File): Promise<string> {
  const ocrServiceUrl = process.env.OCR_SERVICE_URL;
  if (!ocrServiceUrl) {
    return "";
  }

  const targetUrl = new URL(ocrServiceUrl);
  targetUrl.searchParams.set("lang", "cop");

  const uploadFieldCandidates = getOcrUploadFieldCandidates();
  let lastError: unknown;
  let lastFailureMessage = "OCR request failed.";
  let sawSuccessfulResponse = false;

  for (const uploadField of uploadFieldCandidates) {
    for (let attempt = 1; attempt <= OCR_MAX_RETRIES; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        controller.abort();
      }, OCR_TIMEOUT_MS);

      try {
        const ocrFormData = new FormData();
        ocrFormData.append(uploadField, file, file.name);

        const response = await fetch(targetUrl.toString(), {
          method: "POST",
          body: ocrFormData,
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          lastFailureMessage = `OCR service failed: ${response.status} ${errorText}`;

          if (isUnexpectedFieldErrorMessage(errorText)) {
            break;
          }

          if (
            attempt >= OCR_MAX_RETRIES ||
            !shouldRetryNetworkError(`OCR ${response.status}: ${errorText}`)
          ) {
            throw new Error(lastFailureMessage);
          }

          await delay(RETRY_BASE_MS * attempt);
          continue;
        }

        sawSuccessfulResponse = true;

        const contentType = response.headers.get("content-type") ?? "";
        const extractedText = contentType.includes("application/json")
          ? extractOcrText(await response.json())
          : extractOcrText(await response.text());

        if (!extractedText) {
          break;
        }

        return extractedText;
      } catch (error) {
        lastError = error;
        if (attempt >= OCR_MAX_RETRIES || !shouldRetryNetworkError(error)) {
          throw error;
        }

        await delay(RETRY_BASE_MS * attempt);
      } finally {
        clearTimeout(timeout);
      }
    }
  }

  if (sawSuccessfulResponse) {
    return "";
  }

  throw new Error(
    `${lastFailureMessage} Tried OCR upload fields: ${uploadFieldCandidates.join(", ")}. Set OCR_UPLOAD_FIELD in environment to match your OCR backend. ${
      lastError instanceof Error ? lastError.message : ""
    }`.trim(),
  );
}

async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const parsed = await pdfParse(Buffer.from(arrayBuffer));
  return (parsed.text ?? "").trim();
}

async function extractDocxText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({
    buffer: Buffer.from(arrayBuffer),
  });

  return value.trim();
}

async function extractTextFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const decoder = new TextDecoder("utf-8", { fatal: false });
  return decoder.decode(arrayBuffer).trim();
}

async function extractSourceText(
  file: File,
  sourceType: SourceType,
  enableOcr: boolean,
): Promise<{
  ocrUsed: boolean;
  reconciliation?: PdfReconciliationSummary;
  text: string;
}> {
  if (sourceType === "image") {
    const text = await runOcr(file);
    return { ocrUsed: Boolean(text), text };
  }

  if (sourceType === "docx") {
    return { ocrUsed: false, text: await extractDocxText(file) };
  }

  if (sourceType === "text") {
    return { ocrUsed: false, text: await extractTextFile(file) };
  }

  const extractedText = await extractPdfText(file);

  if (!enableOcr) {
    return { ocrUsed: false, text: extractedText };
  }

  try {
    const ocrText = await runOcr(file);
    if (!ocrText) {
      return { ocrUsed: false, text: extractedText };
    }

    const reconciled = reconcilePdfExtractedAndOcrText(extractedText, ocrText);
    return {
      ocrUsed: true,
      reconciliation: reconciled.summary,
      text: reconciled.text,
    };
  } catch (error) {
    if (normalizeWhitespace(extractedText).length >= OCR_MIN_TEXT_LENGTH) {
      return { ocrUsed: false, text: extractedText };
    }

    throw error;
  }
}

async function generateEmbeddings(
  chunks: string[],
  embeddingProvider: RagEmbeddingProvider,
  ingestId: string,
  logs: RagIngestionLogEntry[],
) {
  const embeddings: number[][] = [];

  if (embeddingProvider === "gemini") {
    for (let start = 0; start < chunks.length; start += EMBEDDING_BATCH_SIZE) {
      const batch = chunks.slice(start, start + EMBEDDING_BATCH_SIZE);
      const batchStartMs = Date.now();
      logIngestion(
        ingestId,
        `Embedding batch ${Math.floor(start / EMBEDDING_BATCH_SIZE) + 1} (Gemini) with ${batch.length} chunks...`,
        logs,
      );

      const { embeddings: batchEmbeddings } = await embedMany({
        model: getGeminiEmbeddingModel(),
        values: batch,
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
      const batchStartMs = Date.now();
      logIngestion(
        ingestId,
        `Embedding batch ${Math.floor(start / EMBEDDING_BATCH_SIZE) + 1} (OpenRouter) with ${batch.length} chunks...`,
        logs,
      );

      const batchEmbeddings = await generateOpenRouterEmbeddings(batch);
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
    const batchStartMs = Date.now();
    logIngestion(
      ingestId,
      `Embedding batch ${Math.floor(start / EMBEDDING_BATCH_SIZE) + 1} (Hugging Face) with ${batch.length} chunks...`,
      logs,
    );

    const batchEmbeddings = await generateHFEmbeddings(batch);
    embeddings.push(...batchEmbeddings);

    logIngestion(
      ingestId,
      `Completed HF embedding batch ${Math.floor(start / EMBEDDING_BATCH_SIZE) + 1} in ${Date.now() - batchStartMs} ms.`,
      logs,
    );
  }

  return embeddings;
}

export async function ingestRagFile({
  embeddingProvider = "hf",
  enableOcr,
  file,
  ingestId,
  sourceTitle,
  userId,
}: IngestRagFileOptions): Promise<RagIngestionResult> {
  const ingestionId = ingestId ?? crypto.randomUUID();
  const startMs = Date.now();
  const logs: RagIngestionLogEntry[] = [];
  logIngestion(
    ingestionId,
    `Started ingestion for ${file.name} with provider=${embeddingProvider}, OCR=${enableOcr}.`,
    logs,
  );

  try {
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
    logIngestion(ingestionId, `Extracting text from ${sourceType} source...`, logs);
    const { ocrUsed, reconciliation, text } = await extractSourceText(
      file,
      sourceType,
      enableOcr,
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
      logIngestion(ingestionId, "Extraction produced insufficient text content.", logs);
      return {
        success: false,
        error:
          "Could not extract enough text from this file. Try a clearer file or enable OCR.",
        logs,
      };
    }

    const chunkStartMs = Date.now();
    const chunks = splitIntoChunks(text);
    const normalizedSourceTextChars = normalizeWhitespace(text).length;
    logIngestion(
      ingestionId,
      `Chunking finished in ${Date.now() - chunkStartMs} ms (${chunks.length} chunks).`,
      logs,
    );
    if (chunks.length === 0) {
      return {
        success: false,
        error: "No chunks were produced from this file.",
        logs,
      };
    }

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

    const serviceRoleClient = createServiceRoleClient();
    const uploadedAt = new Date().toISOString();

    const embeddingModelName =
      embeddingProvider === "gemini"
        ? GEMINI_EMBEDDING_MODEL
        : embeddingProvider === "openrouter"
          ? OPENROUTER_EMBEDDING_MODEL
          : HF_EMBEDDING_MODEL;

    function buildRows(targetDimensions: number): CopticDocumentsInsertRow[] {
      const normalizedEmbeddings = embeddings.map((embedding) =>
        normalizeEmbeddingDimensions(embedding, targetDimensions),
      );

      return chunks.map((chunk, index) => ({
        content: chunk,
        embedding: createVectorLiteral(normalizedEmbeddings[index]),
        metadata: {
          chunkIndex: index,
          embeddingDimensions: targetDimensions,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          ocrUsed,
          sourceName: sourceTitle,
          sourceEmbeddingDimensions: sourceDimensions,
          sourceType,
          totalChunks: chunks.length,
          uploadedAt,
          uploadedBy: userId,
          embeddingModel: embeddingModelName,
        },
      }));
    }

    let activeVectorDimensions = RAG_VECTOR_DIMENSIONS;
    if (sourceDimensions !== activeVectorDimensions) {
      logIngestion(
        ingestionId,
        `Embedding dimension reconciliation applied: source=${sourceDimensions}, target=${activeVectorDimensions}.`,
        logs,
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
        ingestionId,
        `Inserting database batch ${batchNumber} with ${Math.min(INSERT_BATCH_SIZE, rows.length - start)} rows...`,
        logs,
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
        if (
          expectedDimensions &&
          expectedDimensions !== activeVectorDimensions
        ) {
          activeVectorDimensions = expectedDimensions;
          rows = buildRows(activeVectorDimensions);
          logIngestion(
            ingestionId,
            `Database expects vector(${expectedDimensions}). Rebuilding embeddings for remaining batches with target=${expectedDimensions}.`,
            logs,
          );
          continue;
        }

        if (attempt >= DB_INSERT_MAX_RETRIES || !shouldRetryNetworkError(error)) {
          throw new Error(`Failed to insert document chunks: ${error.message}`);
        }

        logIngestion(
          ingestionId,
          `Retrying database batch ${batchNumber} after transient error: ${error.message}`,
          logs,
        );
        await delay(RETRY_BASE_MS * attempt);
      }

      if (!inserted) {
        throw new Error(`Failed to insert document batch ${batchNumber} after retries.`);
      }

      logIngestion(
        ingestionId,
        `Completed database batch ${batchNumber} in ${Date.now() - batchStartMs} ms.`,
        logs,
      );
    }

    logIngestion(
      ingestionId,
      `Database insertion finished in ${Date.now() - insertStartMs} ms.`,
      logs,
    );

    const totalMs = Date.now() - startMs;
    logIngestion(ingestionId, `Ingestion complete in ${totalMs} ms.`, logs);
    markLiveIngestionDone(ingestionId);

    return {
      success: true,
      chunkStats,
      chunksInserted: rows.length,
      logs,
      message: `Ingested ${rows.length} chunks from ${sourceTitle} in ${Math.round(totalMs / 100) / 10}s.`,
      ocrUsed,
      sourceName: sourceTitle,
      sourceType,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Could not ingest this file into the RAG index.";
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
