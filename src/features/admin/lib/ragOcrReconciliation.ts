import { THOTH_RECONCILE_TEXT_LIMIT } from "./ragIngestionConfig";
import {
  hasThothAvailable,
  normalizeWhitespace,
  runThothStructuredTask,
  splitIntoSemanticSegments,
} from "./ragIngestionUtils";

import type { PdfReconciliationSummary } from "./ragIngestionTypes";

type ThothPdfReconciliationResult = {
  confidence?: number;
  reconciledText?: string;
  strategy?: "merge" | "ocr" | "pdf";
};

function tokenizeForComparison(value: string) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(" ")
    .filter((token) => token.length >= 3);
}

/**
 * Compares native PDF extraction and OCR output using coarse token overlap.
 * Short tokens and punctuation are ignored so OCR noise does not dominate the
 * reconciliation choice.
 */
export function calculateTokenJaccardSimilarity(
  leftText: string,
  rightText: string,
) {
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

/**
 * Selects the safest PDF/OCR reconciliation path. High similarity prefers the
 * richer source, medium similarity treats the longer source as verified, and
 * low similarity asks THOTH to reconcile before falling back to merged segments.
 */
export async function reconcilePdfExtractedAndOcrText(
  extractedText: string,
  ocrText: string,
  options?: {
    ingestId?: string;
    userId?: string;
  },
): Promise<{ summary: PdfReconciliationSummary; text: string }> {
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

  if (
    similarity < 0.85 &&
    options?.ingestId &&
    options?.userId &&
    hasThothAvailable()
  ) {
    const thothParsed = (await runThothStructuredTask({
      ingestId: options.ingestId,
      prompt: `You are THOTH AI reconciling OCR and native PDF extraction for Coptic language sources.
Return only valid JSON with schema:
{
  "strategy": "merge" | "ocr" | "pdf",
  "confidence": 0.0,
  "reconciledText": "single cleaned text"
}

Native PDF text:
${normalizedExtracted.slice(0, THOTH_RECONCILE_TEXT_LIMIT)}

OCR text:
${normalizedOcr.slice(0, THOTH_RECONCILE_TEXT_LIMIT)}`,
      taskTag: "pdf-ocr-reconcile",
      userId: options.userId,
    })) as ThothPdfReconciliationResult | null;

    const thothText =
      thothParsed && typeof thothParsed.reconciledText === "string"
        ? normalizeWhitespace(thothParsed.reconciledText)
        : "";

    if (thothText.length > 0) {
      const boundedConfidence =
        typeof thothParsed?.confidence === "number" &&
        Number.isFinite(thothParsed.confidence)
          ? Math.max(0, Math.min(1, thothParsed.confidence))
          : similarity;

      return {
        summary: {
          extractedChars: normalizedExtracted.length,
          ocrChars: normalizedOcr.length,
          similarity: boundedConfidence,
          strategy: "thoth_reconcile",
        },
        text: thothText,
      };
    }
  }

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
