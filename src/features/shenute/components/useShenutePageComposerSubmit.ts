import { useCallback, type FormEvent } from "react";

import { processOCRImage } from "@/actions/ocrActions";
import type { ShenuteHandoffPageContext } from "@/features/shenute/handoff";
import type { ShenuteProvider } from "@/features/shenute/shared";
import type { Language } from "@/types/i18n";

import {
  composeShenuteOcrPrompt,
  type ComposeShenuteOcrPromptOptions,
  type ProcessShenuteOcrImage,
} from "./shenuteOcrPrompt";

const SHENUTE_PAGE_OCR_CHARACTER_LIMIT = 8000;

type ShenutePageSendMessage = (
  message: { text: string },
  options: {
    body: {
      inferenceProvider: ShenuteProvider;
      pageContext?: ShenuteHandoffPageContext;
    };
  },
) => unknown;

type ComposeShenutePageOcrPrompt = (
  options: ComposeShenuteOcrPromptOptions,
) => ReturnType<typeof composeShenuteOcrPrompt>;

export type SubmitShenutePageComposerOptions = {
  accessRequiredMessage: string;
  clearSelectedImage: () => void;
  closeOpenResponseDetails: () => void;
  closeOpenUtilityDetails: () => void;
  composeOcrPrompt?: ComposeShenutePageOcrPrompt;
  handoffPageContext: ShenuteHandoffPageContext | null;
  hasPromptContent: boolean;
  imageContextLabel: string;
  inferenceProvider: ShenuteProvider;
  inputValue: string;
  isComposerDisabled: boolean;
  isShenuteAccessBlocked: boolean;
  language: Language;
  noTextExtractedMessage: string;
  processImage?: ProcessShenuteOcrImage;
  requestAnimationFrame?: typeof window.requestAnimationFrame;
  scrollTranscriptToBottom: (behavior: ScrollBehavior) => void;
  selectedImage: File | null;
  sendMessage: ShenutePageSendMessage;
  setInputValue: (value: string) => void;
  setIsAnswerStylePanelOpen: (isOpen: boolean) => void;
  setIsTranscriptAtBottom: (isAtBottom: boolean) => void;
  setIsUtilityChromeCollapsed: (isCollapsed: boolean) => void;
  setMobileUtilitySheet: (sheet: "actions" | "history" | null) => void;
  setOcrError: (value: string | null) => void;
  setOcrPending: (value: boolean) => void;
  setShenuteAccessError: (value: string | null) => void;
};

type SubmitShenutePageComposerResult =
  | {
      reason:
        | "access_blocked"
        | "composer_disabled"
        | "no_prompt_content"
        | "no_text_extracted"
        | "ocr_failed";
      submitted: false;
    }
  | {
      pageContext?: ShenuteHandoffPageContext;
      prompt: string;
      submitted: true;
    };

export async function submitShenutePageComposer({
  accessRequiredMessage,
  clearSelectedImage,
  closeOpenResponseDetails,
  closeOpenUtilityDetails,
  composeOcrPrompt = composeShenuteOcrPrompt,
  handoffPageContext,
  hasPromptContent,
  imageContextLabel,
  inferenceProvider,
  inputValue,
  isComposerDisabled,
  isShenuteAccessBlocked,
  language,
  noTextExtractedMessage,
  processImage = processOCRImage,
  requestAnimationFrame = window.requestAnimationFrame,
  scrollTranscriptToBottom,
  selectedImage,
  sendMessage,
  setInputValue,
  setIsAnswerStylePanelOpen,
  setIsTranscriptAtBottom,
  setIsUtilityChromeCollapsed,
  setMobileUtilitySheet,
  setOcrError,
  setOcrPending,
  setShenuteAccessError,
}: SubmitShenutePageComposerOptions): Promise<SubmitShenutePageComposerResult> {
  if (isShenuteAccessBlocked) {
    setShenuteAccessError(accessRequiredMessage);
    return { reason: "access_blocked", submitted: false };
  }

  setShenuteAccessError(null);

  if (!hasPromptContent) {
    return { reason: "no_prompt_content", submitted: false };
  }

  if (isComposerDisabled) {
    return { reason: "composer_disabled", submitted: false };
  }

  let composedPrompt = inputValue.trim();

  if (selectedImage) {
    setOcrPending(true);
    setOcrError(null);

    const ocrPrompt = await composeOcrPrompt({
      basePrompt: composedPrompt,
      image: selectedImage,
      imageContextLabel,
      language,
      maxOcrCharacters: SHENUTE_PAGE_OCR_CHARACTER_LIMIT,
      processImage,
    });
    setOcrPending(false);

    if (!ocrPrompt.success) {
      setOcrError(ocrPrompt.error);
      return { reason: "ocr_failed", submitted: false };
    }

    composedPrompt = ocrPrompt.prompt;
  }

  if (!composedPrompt.trim()) {
    setOcrError(noTextExtractedMessage);
    return { reason: "no_text_extracted", submitted: false };
  }

  setIsTranscriptAtBottom(true);
  setIsUtilityChromeCollapsed(false);
  setMobileUtilitySheet(null);
  setIsAnswerStylePanelOpen(false);
  closeOpenUtilityDetails();
  closeOpenResponseDetails();
  sendMessage(
    { text: composedPrompt },
    {
      body: {
        inferenceProvider,
        pageContext: handoffPageContext ?? undefined,
      },
    },
  );
  setInputValue("");
  clearSelectedImage();
  requestAnimationFrame(() => {
    scrollTranscriptToBottom("smooth");
  });

  return {
    pageContext: handoffPageContext ?? undefined,
    prompt: composedPrompt,
    submitted: true,
  };
}

export function useShenutePageComposerSubmit({
  accessRequiredMessage,
  clearSelectedImage,
  closeOpenResponseDetails,
  closeOpenUtilityDetails,
  handoffPageContext,
  hasPromptContent,
  imageContextLabel,
  inferenceProvider,
  inputValue,
  isComposerDisabled,
  isShenuteAccessBlocked,
  language,
  noTextExtractedMessage,
  scrollTranscriptToBottom,
  selectedImage,
  sendMessage,
  setInputValue,
  setIsAnswerStylePanelOpen,
  setIsTranscriptAtBottom,
  setIsUtilityChromeCollapsed,
  setMobileUtilitySheet,
  setOcrError,
  setOcrPending,
  setShenuteAccessError,
}: Omit<
  SubmitShenutePageComposerOptions,
  "composeOcrPrompt" | "processImage" | "requestAnimationFrame"
>) {
  return useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      await submitShenutePageComposer({
        accessRequiredMessage,
        clearSelectedImage,
        closeOpenResponseDetails,
        closeOpenUtilityDetails,
        handoffPageContext,
        hasPromptContent,
        imageContextLabel,
        inferenceProvider,
        inputValue,
        isComposerDisabled,
        isShenuteAccessBlocked,
        language,
        noTextExtractedMessage,
        scrollTranscriptToBottom,
        selectedImage,
        sendMessage,
        setInputValue,
        setIsAnswerStylePanelOpen,
        setIsTranscriptAtBottom,
        setIsUtilityChromeCollapsed,
        setMobileUtilitySheet,
        setOcrError,
        setOcrPending,
        setShenuteAccessError,
      });
    },
    [
      accessRequiredMessage,
      clearSelectedImage,
      closeOpenResponseDetails,
      closeOpenUtilityDetails,
      handoffPageContext,
      hasPromptContent,
      imageContextLabel,
      inferenceProvider,
      inputValue,
      isComposerDisabled,
      isShenuteAccessBlocked,
      language,
      noTextExtractedMessage,
      scrollTranscriptToBottom,
      selectedImage,
      sendMessage,
      setInputValue,
      setIsAnswerStylePanelOpen,
      setIsTranscriptAtBottom,
      setIsUtilityChromeCollapsed,
      setMobileUtilitySheet,
      setOcrError,
      setOcrPending,
      setShenuteAccessError,
    ],
  );
}
