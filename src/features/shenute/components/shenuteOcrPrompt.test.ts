import { describe, expect, it, vi } from "vitest";

import {
  buildShenuteImagePrompt,
  composeShenuteOcrPrompt,
  normalizeShenuteOcrText,
  type ProcessShenuteOcrImage,
} from "./shenuteOcrPrompt";

describe("Shenute OCR prompt helpers", () => {
  it("normalizes OCR text with the configured character limit", () => {
    expect(normalizeShenuteOcrText("  Alpha\n\n\tBeta   Gamma  ", 12)).toBe(
      "Alpha Beta G",
    );
  });

  it("builds the image prompt while dropping empty parts", () => {
    expect(
      buildShenuteImagePrompt({
        basePrompt: "",
        imageContextLabel: "[Image OCR Context]",
        imageName: "folio.png",
        ocrText: "ⲡⲉ text",
      }),
    ).toBe("[Image OCR Context]\n\nImage: folio.png\n\nⲡⲉ text");
  });

  it("uploads the image and composes a Shenute OCR prompt", async () => {
    const image = new File(["fake"], "folio.png", { type: "image/png" });
    const uploadedFormData: FormData[] = [];
    const processImage = vi.fn<ProcessShenuteOcrImage>(async (formData) => {
      uploadedFormData.push(formData);
      return "  Line one\n\nLine two  ";
    });

    await expect(
      composeShenuteOcrPrompt({
        basePrompt: "Explain this",
        image,
        imageContextLabel: "[Image OCR Context]",
        language: "en",
        maxOcrCharacters: 8000,
        processImage,
      }),
    ).resolves.toEqual({
      prompt:
        "Explain this\n\n[Image OCR Context]\n\nImage: folio.png\n\nLine one Line two",
      success: true,
    });
    expect(processImage).toHaveBeenCalledTimes(1);
    expect(uploadedFormData[0]?.get("file")).toBe(image);
  });

  it("returns localized public OCR errors", async () => {
    const image = new File(["fake"], "folio.png", { type: "image/png" });
    const processImage = vi.fn<ProcessShenuteOcrImage>(async () => {
      throw new Error("No valid file uploaded.");
    });

    await expect(
      composeShenuteOcrPrompt({
        basePrompt: "Explain this",
        image,
        imageContextLabel: "[Image OCR Context]",
        language: "en",
        maxOcrCharacters: 8000,
        processImage,
      }),
    ).resolves.toEqual({
      error: "Please choose a readable image and try again.",
      success: false,
    });
  });
});
