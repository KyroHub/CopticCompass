import { describe, expect, it, vi } from "vitest";

import {
  submitShenutePageComposer,
  type SubmitShenutePageComposerOptions,
} from "./useShenutePageComposerSubmit";

const handoffPageContext = {
  excerpt: "Current page excerpt",
  path: "/en/grammar",
  title: "Grammar | Coptic Compass",
  url: "https://www.copticcompass.com/en/grammar",
};

function buildSubmitOptions(
  overrides: Partial<SubmitShenutePageComposerOptions> = {},
): SubmitShenutePageComposerOptions {
  return {
    accessRequiredMessage: "Please sign in to access Shenute AI.",
    clearSelectedImage: vi.fn(),
    closeOpenResponseDetails: vi.fn(),
    closeOpenUtilityDetails: vi.fn(),
    handoffPageContext,
    hasPromptContent: true,
    imageContextLabel: "[Image OCR Context]",
    inferenceProvider: "thoth",
    inputValue: "  Explain this  ",
    isComposerDisabled: false,
    isShenuteAccessBlocked: false,
    language: "en",
    noTextExtractedMessage: "No text extracted from the selected image.",
    processImage: vi.fn<
      NonNullable<SubmitShenutePageComposerOptions["processImage"]>
    >(async () => "OCR text"),
    requestAnimationFrame: vi.fn((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    }),
    scrollTranscriptToBottom: vi.fn(),
    selectedImage: null,
    sendMessage: vi.fn(),
    setInputValue: vi.fn(),
    setIsAnswerStylePanelOpen: vi.fn(),
    setIsTranscriptAtBottom: vi.fn(),
    setIsUtilityChromeCollapsed: vi.fn(),
    setMobileUtilitySheet: vi.fn(),
    setOcrError: vi.fn(),
    setOcrPending: vi.fn(),
    setShenuteAccessError: vi.fn(),
    ...overrides,
  };
}

describe("Shenute page composer submit workflow", () => {
  it("shows the access error when Shenute is blocked", async () => {
    const sendMessage = vi.fn();
    const setShenuteAccessError = vi.fn();
    const options = buildSubmitOptions({
      isShenuteAccessBlocked: true,
      sendMessage,
      setShenuteAccessError,
    });

    await expect(submitShenutePageComposer(options)).resolves.toEqual({
      reason: "access_blocked",
      submitted: false,
    });
    expect(setShenuteAccessError).toHaveBeenCalledWith(
      "Please sign in to access Shenute AI.",
    );
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("clears stale access errors before ignoring empty submissions", async () => {
    const setShenuteAccessError = vi.fn();
    const options = buildSubmitOptions({
      hasPromptContent: false,
      setShenuteAccessError,
    });

    await expect(submitShenutePageComposer(options)).resolves.toEqual({
      reason: "no_prompt_content",
      submitted: false,
    });
    expect(setShenuteAccessError).toHaveBeenCalledWith(null);
    expect(options.sendMessage).not.toHaveBeenCalled();
  });

  it("sends trimmed text with handoff context and resets composer chrome", async () => {
    const clearSelectedImage = vi.fn();
    const closeOpenResponseDetails = vi.fn();
    const closeOpenUtilityDetails = vi.fn();
    const frameCallbacks: FrameRequestCallback[] = [];
    const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      frameCallbacks.push(callback);
      return 1;
    });
    const scrollTranscriptToBottom = vi.fn();
    const sendMessage = vi.fn();
    const setInputValue = vi.fn();
    const setIsAnswerStylePanelOpen = vi.fn();
    const setIsTranscriptAtBottom = vi.fn();
    const setIsUtilityChromeCollapsed = vi.fn();
    const setMobileUtilitySheet = vi.fn();
    const options = buildSubmitOptions({
      clearSelectedImage,
      closeOpenResponseDetails,
      closeOpenUtilityDetails,
      inferenceProvider: "gemini_nmt",
      requestAnimationFrame,
      scrollTranscriptToBottom,
      sendMessage,
      setInputValue,
      setIsAnswerStylePanelOpen,
      setIsTranscriptAtBottom,
      setIsUtilityChromeCollapsed,
      setMobileUtilitySheet,
    });

    await expect(submitShenutePageComposer(options)).resolves.toEqual({
      pageContext: handoffPageContext,
      prompt: "Explain this",
      submitted: true,
    });
    expect(sendMessage).toHaveBeenCalledWith(
      { text: "Explain this" },
      {
        body: {
          inferenceProvider: "gemini_nmt",
          pageContext: handoffPageContext,
        },
      },
    );
    expect(setIsTranscriptAtBottom).toHaveBeenCalledWith(true);
    expect(setIsUtilityChromeCollapsed).toHaveBeenCalledWith(false);
    expect(setMobileUtilitySheet).toHaveBeenCalledWith(null);
    expect(setIsAnswerStylePanelOpen).toHaveBeenCalledWith(false);
    expect(closeOpenUtilityDetails).toHaveBeenCalledTimes(1);
    expect(closeOpenResponseDetails).toHaveBeenCalledTimes(1);
    expect(setInputValue).toHaveBeenCalledWith("");
    expect(clearSelectedImage).toHaveBeenCalledTimes(1);
    expect(scrollTranscriptToBottom).not.toHaveBeenCalled();

    frameCallbacks[0]?.(0);
    expect(scrollTranscriptToBottom).toHaveBeenCalledWith("smooth");
  });

  it("runs OCR with the full-page character limit before sending", async () => {
    const image = new File(["fake"], "folio.png", { type: "image/png" });
    const composeOcrPrompt = vi.fn<
      NonNullable<SubmitShenutePageComposerOptions["composeOcrPrompt"]>
    >(async () => ({
      prompt: "OCR-backed prompt",
      success: true,
    }));
    const processImage = vi.fn<
      NonNullable<SubmitShenutePageComposerOptions["processImage"]>
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

    await expect(submitShenutePageComposer(options)).resolves.toEqual({
      pageContext: handoffPageContext,
      prompt: "OCR-backed prompt",
      submitted: true,
    });
    expect(composeOcrPrompt).toHaveBeenCalledWith({
      basePrompt: "Base prompt",
      image,
      imageContextLabel: "[Image OCR Context]",
      language: "en",
      maxOcrCharacters: 8000,
      processImage,
    });
    expect(setOcrPending.mock.calls).toEqual([[true], [false]]);
    expect(setOcrError).toHaveBeenCalledWith(null);
    expect(sendMessage).toHaveBeenCalledWith(
      { text: "OCR-backed prompt" },
      {
        body: {
          inferenceProvider: "thoth",
          pageContext: handoffPageContext,
        },
      },
    );
  });

  it("reports OCR failures without sending or clearing composer state", async () => {
    const image = new File(["fake"], "folio.png", { type: "image/png" });
    const clearSelectedImage = vi.fn();
    const composeOcrPrompt = vi.fn<
      NonNullable<SubmitShenutePageComposerOptions["composeOcrPrompt"]>
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
      composeOcrPrompt,
      selectedImage: image,
      sendMessage,
      setInputValue,
      setOcrError,
      setOcrPending,
    });

    await expect(submitShenutePageComposer(options)).resolves.toEqual({
      reason: "ocr_failed",
      submitted: false,
    });
    expect(setOcrPending.mock.calls).toEqual([[true], [false]]);
    expect(setOcrError.mock.calls).toEqual([[null], ["OCR failed."]]);
    expect(sendMessage).not.toHaveBeenCalled();
    expect(setInputValue).not.toHaveBeenCalled();
    expect(clearSelectedImage).not.toHaveBeenCalled();
  });
});
