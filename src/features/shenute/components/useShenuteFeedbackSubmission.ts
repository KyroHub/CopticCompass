import { useCallback, useState } from "react";

import type { ShenuteHandoffPageContext } from "@/features/shenute/handoff";
import {
  submitShenuteFeedbackOnline,
  type FeedbackResponsePayload,
  type SubmitShenuteFeedbackOptions,
} from "@/features/shenute/lib/client/shenuteClientApi";
import {
  getMessageText,
  type ChatMessageLike,
  type ShenuteFeedbackSignal,
  type ShenuteProvider,
  type ShenuteReactionSignal,
} from "@/features/shenute/shared";
import { getPublicErrorMessage, isAppErrorCode } from "@/lib/errors";
import type { Language } from "@/types/i18n";

export type ShenuteFeedbackState = {
  message: string;
  status: "error" | "pending" | "success";
};

export type ShenuteFeedbackStateByMessage = Record<
  string,
  ShenuteFeedbackState
>;

export type ShenuteFeedbackSubmissionCopy = {
  promptMissing: string;
  saveFailed: string;
  saved: string;
  savedLearningDelayed: string;
  savedWithRag: string;
  saving: string;
  signIn: string;
  writeAdminFeedback: string;
};

type SubmitFeedbackSignalOptions = {
  assistantMessage: ChatMessageLike;
  feedbackText?: string;
  promptMessage: ChatMessageLike | null;
  signal: ShenuteFeedbackSignal;
};

type UseShenuteFeedbackSubmissionOptions = {
  copy: ShenuteFeedbackSubmissionCopy;
  getShenuteSessionId: () => string;
  inferenceProvider: ShenuteProvider;
  isAuthenticated: boolean;
  language: Language;
  pageContext?: ShenuteHandoffPageContext | null;
  submitFeedback?: (
    options: SubmitShenuteFeedbackOptions,
  ) => ReturnType<typeof submitShenuteFeedbackOnline>;
};

export function getShenuteFeedbackFailureMessage(
  payload: FeedbackResponsePayload,
  fallback: string,
  language: Language,
) {
  return isAppErrorCode(payload.code)
    ? getPublicErrorMessage(payload.code, language, "feedback")
    : fallback;
}

export function getShenuteFeedbackSuccessMessage(
  payload: FeedbackResponsePayload,
  copy: Pick<
    ShenuteFeedbackSubmissionCopy,
    "saved" | "savedLearningDelayed" | "savedWithRag"
  >,
) {
  if (payload.ragIngested) {
    return copy.savedWithRag;
  }

  if (payload.ragWarning) {
    return copy.savedLearningDelayed;
  }

  return copy.saved;
}

export function useShenuteFeedbackSubmission({
  copy,
  getShenuteSessionId,
  inferenceProvider,
  isAuthenticated,
  language,
  pageContext,
  submitFeedback = submitShenuteFeedbackOnline,
}: UseShenuteFeedbackSubmissionOptions) {
  const {
    promptMissing,
    saveFailed,
    saved,
    savedLearningDelayed,
    savedWithRag,
    saving,
    signIn,
    writeAdminFeedback,
  } = copy;
  const [selectedReactionByMessage, setSelectedReactionByMessage] = useState<
    Record<string, ShenuteReactionSignal>
  >({});
  const [adminFeedbackDraftByMessage, setAdminFeedbackDraftByMessage] =
    useState<Record<string, string>>({});
  const [feedbackStateByMessage, setFeedbackStateByMessage] =
    useState<ShenuteFeedbackStateByMessage>({});

  const setAdminFeedbackDraft = useCallback(
    (messageId: string, value: string) => {
      setAdminFeedbackDraftByMessage((current) => ({
        ...current,
        [messageId]: value,
      }));
    },
    [],
  );

  const submitFeedbackSignal = useCallback(
    async (options: SubmitFeedbackSignalOptions) => {
      if (!isAuthenticated) {
        setFeedbackStateByMessage((current) => ({
          ...current,
          [options.assistantMessage.id]: {
            message: signIn,
            status: "error",
          },
        }));
        return false;
      }

      const assistantResponse = getMessageText(options.assistantMessage);
      const prompt = options.promptMessage
        ? getMessageText(options.promptMessage)
        : "";

      if (!assistantResponse || !prompt) {
        setFeedbackStateByMessage((current) => ({
          ...current,
          [options.assistantMessage.id]: {
            message: promptMissing,
            status: "error",
          },
        }));
        return false;
      }

      setFeedbackStateByMessage((current) => ({
        ...current,
        [options.assistantMessage.id]: {
          message: saving,
          status: "pending",
        },
      }));

      try {
        const { ok, payload } = await submitFeedback({
          assistantMessageId: options.assistantMessage.id,
          assistantResponse,
          feedbackText: options.feedbackText,
          inferenceProvider,
          pageContext: pageContext ?? undefined,
          prompt,
          shenuteSessionId: getShenuteSessionId(),
          signal: options.signal,
          userMessageId: options.promptMessage?.id,
        });

        if (!ok || !payload.success) {
          setFeedbackStateByMessage((current) => ({
            ...current,
            [options.assistantMessage.id]: {
              message: getShenuteFeedbackFailureMessage(
                payload,
                saveFailed,
                language,
              ),
              status: "error",
            },
          }));
          return false;
        }

        setFeedbackStateByMessage((current) => ({
          ...current,
          [options.assistantMessage.id]: {
            message: getShenuteFeedbackSuccessMessage(payload, {
              saved,
              savedLearningDelayed,
              savedWithRag,
            }),
            status: "success",
          },
        }));

        return true;
      } catch {
        setFeedbackStateByMessage((current) => ({
          ...current,
          [options.assistantMessage.id]: {
            message: saveFailed,
            status: "error",
          },
        }));
        return false;
      }
    },
    [
      getShenuteSessionId,
      inferenceProvider,
      isAuthenticated,
      language,
      pageContext,
      promptMissing,
      saveFailed,
      saved,
      savedLearningDelayed,
      savedWithRag,
      saving,
      signIn,
      submitFeedback,
    ],
  );

  const handleReaction = useCallback(
    async (
      signal: ShenuteReactionSignal,
      assistantMessage: ChatMessageLike,
      promptMessage: ChatMessageLike | null,
    ) => {
      const success = await submitFeedbackSignal({
        assistantMessage,
        promptMessage,
        signal,
      });

      if (!success) {
        return;
      }

      setSelectedReactionByMessage((current) => ({
        ...current,
        [assistantMessage.id]: signal,
      }));
    },
    [submitFeedbackSignal],
  );

  const handleAdminFeedbackSubmit = useCallback(
    async (
      assistantMessage: ChatMessageLike,
      promptMessage: ChatMessageLike | null,
    ) => {
      const draft =
        adminFeedbackDraftByMessage[assistantMessage.id]?.trim() ?? "";
      if (!draft) {
        setFeedbackStateByMessage((current) => ({
          ...current,
          [assistantMessage.id]: {
            message: writeAdminFeedback,
            status: "error",
          },
        }));
        return;
      }

      const success = await submitFeedbackSignal({
        assistantMessage,
        feedbackText: draft,
        promptMessage,
        signal: "admin_feedback",
      });

      if (!success) {
        return;
      }

      setAdminFeedbackDraftByMessage((current) => ({
        ...current,
        [assistantMessage.id]: "",
      }));
    },
    [adminFeedbackDraftByMessage, submitFeedbackSignal, writeAdminFeedback],
  );

  const resetFeedbackSubmissionState = useCallback(() => {
    setSelectedReactionByMessage({});
    setAdminFeedbackDraftByMessage({});
    setFeedbackStateByMessage({});
  }, []);

  return {
    adminFeedbackDraftByMessage,
    feedbackStateByMessage,
    handleAdminFeedbackSubmit,
    handleReaction,
    resetFeedbackSubmissionState,
    selectedReactionByMessage,
    setAdminFeedbackDraft,
  };
}
