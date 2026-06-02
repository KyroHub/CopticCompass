import { describe, expect, it } from "vitest";

import {
  calculateTokenJaccardSimilarity,
  reconcilePdfExtractedAndOcrText,
} from "./ragOcrReconciliation";

describe("RAG OCR reconciliation", () => {
  it("prefers the longer source when native extraction and OCR strongly match", async () => {
    const result = await reconcilePdfExtractedAndOcrText(
      "Coptic grammar lesson about nouns and articles.",
      "Coptic grammar lesson about nouns and articles examples.",
    );

    expect(result.summary.strategy).toBe("prefer_ocr");
    expect(result.summary.similarity).toBeGreaterThanOrEqual(0.85);
    expect(result.text).toContain("examples");
  });

  it("merges unique segments when extraction and OCR disagree substantially", async () => {
    const result = await reconcilePdfExtractedAndOcrText(
      "Native extraction keeps the table of Coptic noun endings.",
      "OCR captures a separate paragraph about Bohairic pronunciation.",
    );

    expect(result.summary.strategy).toBe("verified_merge");
    expect(result.text).toContain("Coptic noun endings");
    expect(result.text).toContain("Bohairic pronunciation");
  });

  it("returns OCR-only text when native PDF extraction is empty", async () => {
    const result = await reconcilePdfExtractedAndOcrText(
      "",
      "OCR recovered readable Coptic source text.",
    );

    expect(result.summary.strategy).toBe("ocr_only");
    expect(result.summary.extractedChars).toBe(0);
    expect(result.summary.ocrChars).toBeGreaterThan(0);
    expect(result.text).toBe("OCR recovered readable Coptic source text.");
  });

  it("calculates stable token similarity for reconciliation decisions", () => {
    expect(
      calculateTokenJaccardSimilarity(
        "Coptic grammar nouns articles",
        "Coptic grammar nouns articles",
      ),
    ).toBe(1);
    expect(
      calculateTokenJaccardSimilarity(
        "Coptic grammar nouns articles",
        "Bohairic pronunciation vowels",
      ),
    ).toBeLessThan(0.25);
  });
});
