import { describe, expect, it, vi } from "vitest";

import {
  submitFloatingShenuteComposer,
  type SubmitFloatingShenuteComposerOptions,
} from "./useFloatingShenuteComposerSubmit";

const pageContext = {
  excerpt: "Current page excerpt",
  path: "/en/grammar",
  title: "Grammar | Coptic Compass",
  url: "https://www.copticcompass.com/en/grammar",
};

function buildSubmitOptions(
  overrides: Partial<SubmitFloatingShenuteComposerOptions> = {},
): SubmitFloatingShenuteComposerOptions {
  return {
    clearSelectedImage: vi.fn(),
    closeAttachmentMenu: vi.fn(),
    imageContextLabel: "[Image OCR Context]",
    inferenceProvider: "thoth",
    inputValue: "  Explain this  ",
    isComposerDisabled: false,
    isShenuteAccessBlocked: false,
    language: "en",
    noTextExtractedMessage: "No text extracted from the selected image.",
    processImage: vi.fn<
      NonNullable<SubmitFloatingShenuteComposerOptions["processImage"]>
    >(async () => "OCR text"),
    readPageContext: vi.fn(() => pageContext),
    selectedImage: null,
    sendMessage: vi.fn(),
    setInputValue: vi.fn(),
    setIsAnswerStylePanelOpen: vi.fn(),
    setOcrError: vi.fn(),
    setOcrPending: vi.fn(),
    ...overrides,
  };
}

describe("floating Shenute composer submit workflow", () => {
  it("does nothing when Shenute access is blocked", async () => {
    const sendMessage = vi.fn();
    const options = buildSubmitOptions({
      isShenuteAccessBlocked: true,
      sendMessage,
    });

    await expect(submitFloatingShenuteComposer(options)).resolves.toEqual({
      reason: "access_blocked",
      submitted: false,
    });
    expect(sendMessage).not.toHaveBeenCalled();
    expect(options.readPageContext).not.toHaveBeenCalled();
  });

  it("does nothing for empty composer submissions", async () => {
    const sendMessage = vi.fn();
    const options = buildSubmitOptions({
      inputValue: "  ",
      sendMessage,
    });

    await expect(submitFloatingShenuteComposer(options)).resolves.toEqual({
      reason: "empty_prompt",
      submitted: false,
    });
    expect(sendMessage).not.toHaveBeenCalled();
    expect(options.setOcrError).not.toHaveBeenCalled();
  });

  it("sends trimmed text with a fresh page context and clears the UI", async () => {
    const clearSelectedImage = vi.fn();
    const closeAttachmentMenu = vi.fn();
    const sendMessage = vi.fn();
    const setInputValue = vi.fn();
    const setIsAnswerStylePanelOpen = vi.fn();
    const options = buildSubmitOptions({
      clearSelectedImage,
      closeAttachmentMenu,
      inferenceProvider: "gemini_nmt",
      sendMessage,
      setInputValue,
      setIsAnswerStylePanelOpen,
    });

    await expect(submitFloatingShenuteComposer(options)).resolves.toEqual({
      pageContext,
      prompt: "Explain this",
      submitted: true,
    });
    expect(sendMessage).toHaveBeenCalledWith(
      { text: "Explain this" },
      {
        body: {
          inferenceProvider: "gemini_nmt",
          pageContext,
        },
      },
    );
    expect(setInputValue).toHaveBeenCalledWith("");
    expect(setIsAnswerStylePanelOpen).toHaveBeenCalledWith(false);
    expect(closeAttachmentMenu).toHaveBeenCalledTimes(1);
    expect(clearSelectedImage).toHaveBeenCalledTimes(1);
  });

  it("runs OCR for image-backed submissions before sending", async () => {
    const image = new File(["fake"], "folio.png", { type: "image/png" });
    const composeOcrPrompt = vi.fn<
      NonNullable<SubmitFloatingShenuteComposerOptions["composeOcrPrompt"]>
    >(async () => ({
      prompt: "OCR-backed prompt",
      success: true,
    }));
    const processImage = vi.fn<
      NonNullable<SubmitFloatingShenuteComposerOptions["processImage"]>
    >(async () => "OCR text");
    const sendMessage = vi.fn();
    const setOcrError = vi.fn();
    const setOcrPending = vi.fn();
    const options = buildSubmitOptions({
      composeOcrPrompt,
      inputValue: "  Base prompt  ",
      processImage,
      selectedImage: image,
      sendMessage,
      setOcrError,
      setOcrPending,
    });

    await expect(submitFloatingShenuteComposer(options)).resolves.toEqual({
      pageContext,
      prompt: "OCR-backed prompt",
      submitted: true,
    });
    expect(composeOcrPrompt).toHaveBeenCalledWith({
      basePrompt: "Base prompt",
      image,
      imageContextLabel: "[Image OCR Context]",
      language: "en",
      maxOcrCharacters: 6000,
      processImage,
    });
    expect(setOcrPending.mock.calls).toEqual([[true], [false]]);
    expect(setOcrError).toHaveBeenCalledWith(null);
    expect(sendMessage).toHaveBeenCalledWith(
      { text: "OCR-backed prompt" },
      {
        body: {
          inferenceProvider: "thoth",
          pageContext,
        },
      },
    );
  });

  it("reports OCR failures without sending or clearing composer state", async () => {
    const image = new File(["fake"], "folio.png", { type: "image/png" });
    const clearSelectedImage = vi.fn();
    const closeAttachmentMenu = vi.fn();
    const composeOcrPrompt = vi.fn<
      NonNullable<SubmitFloatingShenuteComposerOptions["composeOcrPrompt"]>
    >(async () => ({
      error: "OCR failed.",
      success: false,
    }));
    const sendMessage = vi.fn();
    const setInputValue = vi.fn();
    const setOcrError = vi.fn();
    const setOcrPending = vi.fn();
    const options = buildSubmitOptions({
      clearSelectedImage,
      closeAttachmentMenu,
      composeOcrPrompt,
      selectedImage: image,
      sendMessage,
      setInputValue,
      setOcrError,
      setOcrPending,
    });

    await expect(submitFloatingShenuteComposer(options)).resolves.toEqual({
      reason: "ocr_failed",
      submitted: false,
    });
    expect(setOcrPending.mock.calls).toEqual([[true], [false]]);
    expect(setOcrError.mock.calls).toEqual([[null], ["OCR failed."]]);
    expect(sendMessage).not.toHaveBeenCalled();
    expect(setInputValue).not.toHaveBeenCalled();
    expect(closeAttachmentMenu).not.toHaveBeenCalled();
    expect(clearSelectedImage).not.toHaveBeenCalled();
  });

  it("shows the no-text message when composed prompt is empty", async () => {
    const image = new File(["fake"], "folio.png", { type: "image/png" });
    const composeOcrPrompt = vi.fn<
      NonNullable<SubmitFloatingShenuteComposerOptions["composeOcrPrompt"]>
    >(async () => ({
      prompt: "   ",
      success: true,
    }));
    const setOcrError = vi.fn();
    const options = buildSubmitOptions({
      composeOcrPrompt,
      inputValue: "",
      selectedImage: image,
      setOcrError,
    });

    await expect(submitFloatingShenuteComposer(options)).resolves.toEqual({
      reason: "no_text_extracted",
      submitted: false,
    });
    expect(setOcrError).toHaveBeenLastCalledWith(
      "No text extracted from the selected image.",
    );
    expect(options.sendMessage).not.toHaveBeenCalled();
  });
});
