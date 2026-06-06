import { useCallback, type FormEvent } from "react";

import { processOCRImage } from "@/actions/ocrActions";
import type { ShenuteProvider } from "@/features/shenute/shared";
import type { Language } from "@/types/i18n";

import {
  composeShenuteOcrPrompt,
  type ComposeShenuteOcrPromptOptions,
  type ProcessShenuteOcrImage,
} from "./shenuteOcrPrompt";

import type { FloatingShenutePageContext } from "./floatingShenuteContext";

const FLOATING_SHENUTE_OCR_CHARACTER_LIMIT = 6000;

type FloatingShenuteSendMessage = (
  message: { text: string },
  options: {
    body: {
      inferenceProvider: ShenuteProvider;
      pageContext: FloatingShenutePageContext;
    };
  },
) => unknown;

type ComposeFloatingShenuteOcrPrompt = (
  options: ComposeShenuteOcrPromptOptions,
) => ReturnType<typeof composeShenuteOcrPrompt>;

export type SubmitFloatingShenuteComposerOptions = {
  clearSelectedImage: () => void;
  closeAttachmentMenu: () => void;
  composeOcrPrompt?: ComposeFloatingShenuteOcrPrompt;
  imageContextLabel: string;
  inferenceProvider: ShenuteProvider;
  inputValue: string;
  isComposerDisabled: boolean;
  isShenuteAccessBlocked: boolean;
  language: Language;
  noTextExtractedMessage: string;
  processImage?: ProcessShenuteOcrImage;
  readPageContext: () => FloatingShenutePageContext;
  selectedImage: File | null;
  sendMessage: FloatingShenuteSendMessage;
  setInputValue: (value: string) => void;
  setIsAnswerStylePanelOpen: (value: boolean) => void;
  setOcrError: (value: string | null) => void;
  setOcrPending: (value: boolean) => void;
};

type SubmitFloatingShenuteComposerResult =
  | {
      reason:
        | "access_blocked"
        | "composer_disabled"
        | "empty_prompt"
        | "no_text_extracted"
        | "ocr_failed";
      submitted: false;
    }
  | {
      pageContext: FloatingShenutePageContext;
      prompt: string;
      submitted: true;
    };

export async function submitFloatingShenuteComposer({
  clearSelectedImage,
  closeAttachmentMenu,
  composeOcrPrompt = composeShenuteOcrPrompt,
  imageContextLabel,
  inferenceProvider,
  inputValue,
  isComposerDisabled,
  isShenuteAccessBlocked,
  language,
  noTextExtractedMessage,
  processImage = processOCRImage,
  readPageContext,
  selectedImage,
  sendMessage,
  setInputValue,
  setIsAnswerStylePanelOpen,
  setOcrError,
  setOcrPending,
}: SubmitFloatingShenuteComposerOptions): Promise<SubmitFloatingShenuteComposerResult> {
  if (isShenuteAccessBlocked) {
    return { reason: "access_blocked", submitted: false };
  }

  const trimmed = inputValue.trim();
  if (!trimmed && !selectedImage) {
    return { reason: "empty_prompt", submitted: false };
  }

  if (isComposerDisabled) {
    return { reason: "composer_disabled", submitted: false };
  }

  let composedPrompt = trimmed;

  if (selectedImage) {
    setOcrPending(true);
    setOcrError(null);

    const ocrPrompt = await composeOcrPrompt({
      basePrompt: composedPrompt,
      image: selectedImage,
      imageContextLabel,
      language,
      maxOcrCharacters: FLOATING_SHENUTE_OCR_CHARACTER_LIMIT,
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

  const pageContext = readPageContext();

  sendMessage(
    { text: composedPrompt },
    {
      body: {
        inferenceProvider,
        pageContext,
      },
    },
  );
  setInputValue("");
  setIsAnswerStylePanelOpen(false);
  closeAttachmentMenu();
  clearSelectedImage();

  return {
    pageContext,
    prompt: composedPrompt,
    submitted: true,
  };
}

export function useFloatingShenuteComposerSubmit({
  clearSelectedImage,
  closeAttachmentMenu,
  imageContextLabel,
  inferenceProvider,
  inputValue,
  isComposerDisabled,
  isShenuteAccessBlocked,
  language,
  noTextExtractedMessage,
  readPageContext,
  selectedImage,
  sendMessage,
  setInputValue,
  setIsAnswerStylePanelOpen,
  setOcrError,
  setOcrPending,
}: Omit<
  SubmitFloatingShenuteComposerOptions,
  "composeOcrPrompt" | "processImage"
>) {
  return useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      await submitFloatingShenuteComposer({
        clearSelectedImage,
        closeAttachmentMenu,
        imageContextLabel,
        inferenceProvider,
        inputValue,
        isComposerDisabled,
        isShenuteAccessBlocked,
        language,
        noTextExtractedMessage,
        readPageContext,
        selectedImage,
        sendMessage,
        setInputValue,
        setIsAnswerStylePanelOpen,
        setOcrError,
        setOcrPending,
      });
    },
    [
      clearSelectedImage,
      closeAttachmentMenu,
      imageContextLabel,
      inferenceProvider,
      inputValue,
      isComposerDisabled,
      isShenuteAccessBlocked,
      language,
      noTextExtractedMessage,
      readPageContext,
      selectedImage,
      sendMessage,
      setInputValue,
      setIsAnswerStylePanelOpen,
      setOcrError,
      setOcrPending,
    ],
  );
}
