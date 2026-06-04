import "server-only";
import mammoth from "mammoth";

import {
  buildOcrTargetUrl,
  extractOcrResponseText,
  getOcrUploadFieldCandidates,
  isUnexpectedOcrUploadFieldError,
} from "@/lib/server/ocrService";

import {
  OCR_MAX_RETRIES,
  OCR_MIN_TEXT_LENGTH,
  OCR_TIMEOUT_MS,
  RETRY_BASE_MS,
} from "./ragIngestionConfig";
import {
  delay,
  normalizeWhitespace,
  shouldRetryNetworkError,
} from "./ragIngestionUtils";
import { reconcilePdfExtractedAndOcrText } from "./ragOcrReconciliation";

import type { PdfReconciliationSummary, SourceType } from "./ragIngestionTypes";

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

function getFileExtension(fileName: string) {
  const extension = fileName.split(".").pop();
  return extension ? extension.toLowerCase() : "";
}

export function detectSourceType(file: File): SourceType | null {
  const extension = getFileExtension(file.name);

  if (file.type === PDF_MIME || extension === "pdf") {
    return "pdf";
  }

  if (
    file.type.startsWith(IMAGE_MIME_PREFIX) ||
    IMAGE_EXTENSIONS.has(extension)
  ) {
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

async function runOcr(file: File): Promise<string> {
  const ocrServiceUrl = process.env.OCR_SERVICE_URL;
  if (!ocrServiceUrl) {
    return "";
  }

  const targetUrl = buildOcrTargetUrl({ ocrServiceUrl });

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

          if (isUnexpectedOcrUploadFieldError(errorText)) {
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

        const extractedText = await extractOcrResponseText(response);

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

async function extractPdfText(_file: File): Promise<string> {
  throw new Error(
    "PDF processing is currently disabled due to dependency issues. Use JSON ingestion for now.",
  );
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

/**
 * Extracts readable source text while preserving OCR fallback behavior for
 * forced OCR, optional OCR, native PDF extraction, DOCX, images, and text files.
 */
export async function extractSourceText(
  file: File,
  sourceType: SourceType,
  enableOcr: boolean,
  forceOcr: boolean = false,
  context?: {
    ingestId?: string;
    userId?: string;
  },
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

  if (forceOcr) {
    let ocrText = "";
    try {
      ocrText =
        sourceType === "pdf" ? await runOcrOnPdf(file) : await runOcr(file);
    } catch (e) {
      console.warn(
        "[RAG Ingestion] Force OCR failed. Falling back to native PDF extraction.",
        e,
      );
    }

    let extractedText = "";
    try {
      extractedText = await extractPdfText(file);
    } catch {}

    if (ocrText && extractedText) {
      const reconciled = await reconcilePdfExtractedAndOcrText(
        extractedText,
        ocrText,
        context,
      );
      return {
        ocrUsed: true,
        reconciliation: reconciled.summary,
        text: reconciled.text,
      };
    }

    if (ocrText) {
      return { ocrUsed: true, text: normalizeWhitespace(ocrText) };
    }

    if (extractedText) {
      return { ocrUsed: false, text: normalizeWhitespace(extractedText) };
    }

    throw new Error(
      "Both OCR and native PDF extraction failed for this document.",
    );
  }

  const extractedText = await extractPdfText(file);

  if (!enableOcr) {
    return { ocrUsed: false, text: extractedText };
  }

  try {
    const ocrText =
      sourceType === "pdf" ? await runOcrOnPdf(file) : await runOcr(file);
    if (!ocrText) {
      return { ocrUsed: false, text: extractedText };
    }

    const reconciled = await reconcilePdfExtractedAndOcrText(
      extractedText,
      ocrText,
      context,
    );
    return {
      ocrUsed: true,
      reconciliation: reconciled.summary,
      text: reconciled.text,
    };
  } catch (error) {
    console.warn(
      "[RAG Ingestion] OCR failed. Falling back completely to extracted text.",
      error,
    );
    if (normalizeWhitespace(extractedText).length >= OCR_MIN_TEXT_LENGTH) {
      return { ocrUsed: false, text: extractedText };
    }

    if (normalizeWhitespace(extractedText).length > 0) {
      return { ocrUsed: false, text: extractedText };
    }

    throw new Error(
      `OCR processing failed and PDF extraction yielded no text. Original error: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
async function runOcrOnPdf(_file: File): Promise<string> {
  throw new Error(
    "PDF OCR is currently disabled due to dependency issues. Use JSON ingestion for now.",
  );
}
