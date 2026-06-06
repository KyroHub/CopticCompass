import { useMemo, type KeyboardEvent as ReactKeyboardEvent } from "react";

import type { ShenuteHandoffPageContext } from "@/features/shenute/handoff";
import {
  formatElapsedTime,
  getThinkingStatusMessage,
  type ChatMessageLike,
} from "@/features/shenute/shared";

import {
  formatFileSize,
  getChatMessagesSignature,
  getShenuteErrorMessage,
} from "./shenuteClientUtils";
import { getShenuteStarterPrompts } from "./shenuteOptions";

type ShenuteClientLanguage = Parameters<typeof formatFileSize>[1];

type ShenutePageViewModelCopy = Parameters<typeof getShenuteStarterPrompts>[0] &
  Parameters<typeof getThinkingStatusMessage>[1] &
  Parameters<typeof getShenuteErrorMessage>[1] & {
    autosaveHint: string;
    autosaveStatus: string;
    cancelResponse: string;
    imageAttached: string;
    placeholderImage: string;
    placeholderShort: string;
    runningOcr: string;
    saveHistory: string;
    saveHistorySaved: string;
    savingHistory: string;
    sendMessage: string;
    sessionCount: string;
    unsavedChanges: string;
  };

type ShenutePageImageLike = Pick<File, "name" | "size">;

export function getShenutePageMessageSignature(
  messages: readonly ChatMessageLike[],
) {
  return getChatMessagesSignature(messages);
}

export function hasShenutePageUnsavedConversationChanges({
  currentMessageSignature,
  lastSavedMessageSignature,
  typedMessagesLength,
}: {
  currentMessageSignature: string;
  lastSavedMessageSignature: string;
  typedMessagesLength: number;
}) {
  return (
    typedMessagesLength > 0 &&
    currentMessageSignature !== lastSavedMessageSignature
  );
}

export function getShenutePageComposerViewModel({
  copy,
  inputValue,
  isLoading,
  isShenuteAccessBlocked,
  language,
  ocrPending,
  selectedImage,
}: {
  copy: ShenutePageViewModelCopy;
  inputValue: string;
  isLoading: boolean;
  isShenuteAccessBlocked: boolean;
  language: ShenuteClientLanguage;
  ocrPending: boolean;
  selectedImage: ShenutePageImageLike | null;
}) {
  const hasConversationDraft =
    inputValue.trim().length > 0 || Boolean(selectedImage);
  const hasPromptContent = hasConversationDraft;
  const isComposerDisabled = isLoading || ocrPending || isShenuteAccessBlocked;
  let composerSubmitLabel: string = copy.sendMessage;
  if (isLoading) {
    composerSubmitLabel = copy.cancelResponse;
  } else if (ocrPending) {
    composerSubmitLabel = copy.runningOcr;
  }

  return {
    canSubmitPrompt: hasPromptContent && !isComposerDisabled,
    composerPlaceholder: selectedImage
      ? copy.placeholderImage
      : copy.placeholderShort,
    composerStateLabel: ocrPending ? copy.runningOcr : null,
    composerStateMeta:
      ocrPending && selectedImage
        ? selectedImage.name || copy.imageAttached
        : null,
    composerSubmitLabel,
    hasConversationDraft,
    hasPromptContent,
    isAttachmentMenuDisabled: isComposerDisabled,
    isComposerBusy: isLoading || ocrPending,
    isComposerDisabled,
    selectedImageSizeLabel: selectedImage
      ? formatFileSize(selectedImage.size, language)
      : null,
  };
}

export function getShenutePageHistoryViewModel({
  activeSessionId,
  autosaveStatus,
  copy,
  hasConversationDraft,
  hasUnsavedConversationChanges,
  historyActionStatus,
  isHistorySaving,
  isLoading,
  sessionsLength,
  typedMessagesLength,
}: {
  activeSessionId: string | null;
  autosaveStatus: string | null;
  copy: ShenutePageViewModelCopy;
  hasConversationDraft: boolean;
  hasUnsavedConversationChanges: boolean;
  historyActionStatus: string | null;
  isHistorySaving: boolean;
  isLoading: boolean;
  sessionsLength: number;
  typedMessagesLength: number;
}) {
  let saveButtonLabel: string = copy.saveHistorySaved;
  if (isHistorySaving) {
    saveButtonLabel = copy.savingHistory;
  } else if (hasUnsavedConversationChanges || typedMessagesLength === 0) {
    saveButtonLabel = copy.saveHistory;
  }

  let historyStatusMessage: string = autosaveStatus ?? copy.autosaveStatus;
  if (historyActionStatus) {
    historyStatusMessage = historyActionStatus;
  } else if (typedMessagesLength === 0) {
    historyStatusMessage = copy.autosaveHint;
  } else if (isHistorySaving) {
    historyStatusMessage = copy.savingHistory;
  } else if (hasUnsavedConversationChanges) {
    historyStatusMessage = copy.unsavedChanges;
  }

  let historyStatusDotClassName = "bg-muted/40";
  if (isLoading) {
    historyStatusDotClassName = "bg-coptic animate-pulse";
  } else if (isHistorySaving || hasUnsavedConversationChanges) {
    historyStatusDotClassName = "bg-warning";
  } else if (typedMessagesLength > 0) {
    historyStatusDotClassName = "bg-coptic";
  }

  return {
    canStartNewConversation:
      Boolean(activeSessionId) ||
      typedMessagesLength > 0 ||
      hasConversationDraft,
    historyStatusDotClassName,
    historyStatusMessage,
    saveButtonLabel,
    sessionCountLabel: `${sessionsLength} ${copy.sessionCount}`,
  };
}

export function getShenutePageHandoffContextLabel(
  handoffPageContext: ShenuteHandoffPageContext | null,
) {
  if (!handoffPageContext) {
    return null;
  }

  return (
    handoffPageContext.title.replace(/\s+\|\s+Coptic Compass$/, "").trim() ||
    handoffPageContext.path
  );
}

export function shouldExpandShenutePageUtilityChrome({
  cameraError,
  cameraOpen,
  historyActionStatus,
  isAnswerStylePanelOpen,
  isHistorySaving,
  isShenuteAccessBlocked,
  ocrError,
  ocrPending,
  requestError,
  sessionStatus,
  shenuteAccessError,
}: {
  cameraError: string | null;
  cameraOpen: boolean;
  historyActionStatus: string | null;
  isAnswerStylePanelOpen: boolean;
  isHistorySaving: boolean;
  isShenuteAccessBlocked: boolean;
  ocrError: string | null;
  ocrPending: boolean;
  requestError: unknown;
  sessionStatus: string | null;
  shenuteAccessError: string | null;
}) {
  return (
    isAnswerStylePanelOpen ||
    isHistorySaving ||
    Boolean(sessionStatus) ||
    Boolean(historyActionStatus) ||
    isShenuteAccessBlocked ||
    Boolean(shenuteAccessError) ||
    Boolean(requestError) ||
    Boolean(ocrError) ||
    Boolean(cameraError) ||
    cameraOpen ||
    ocrPending
  );
}

export function shouldSubmitShenutePromptKeyDown({
  isComposing,
  key,
  shiftKey,
}: {
  isComposing: boolean;
  key: string;
  shiftKey: boolean;
}) {
  return key === "Enter" && !shiftKey && !isComposing;
}

export function submitShenutePromptKeyDown(
  event: ReactKeyboardEvent<HTMLTextAreaElement>,
) {
  if (
    !shouldSubmitShenutePromptKeyDown({
      isComposing: event.nativeEvent.isComposing,
      key: event.key,
      shiftKey: event.shiftKey,
    })
  ) {
    return false;
  }

  event.preventDefault();
  event.currentTarget.form?.requestSubmit();
  return true;
}

export function useShenutePageViewModel({
  activeSessionId,
  autosaveStatus,
  cameraError,
  cameraOpen,
  copy,
  handoffPageContext,
  historyActionStatus,
  inputValue,
  isAnswerStylePanelOpen,
  isHistorySaving,
  isLoading,
  isShenuteAccessBlocked,
  language,
  lastSavedMessageSignature,
  ocrError,
  ocrPending,
  requestError,
  selectedImage,
  sessionsLength,
  sessionStatus,
  shenuteAccessError,
  thinkingElapsedSeconds,
  typedMessages,
}: {
  activeSessionId: string | null;
  autosaveStatus: string | null;
  cameraError: string | null;
  cameraOpen: boolean;
  copy: ShenutePageViewModelCopy;
  handoffPageContext: ShenuteHandoffPageContext | null;
  historyActionStatus: string | null;
  inputValue: string;
  isAnswerStylePanelOpen: boolean;
  isHistorySaving: boolean;
  isLoading: boolean;
  isShenuteAccessBlocked: boolean;
  language: ShenuteClientLanguage;
  lastSavedMessageSignature: string;
  ocrError: string | null;
  ocrPending: boolean;
  requestError: unknown;
  selectedImage: ShenutePageImageLike | null;
  sessionsLength: number;
  sessionStatus: string | null;
  shenuteAccessError: string | null;
  thinkingElapsedSeconds: number;
  typedMessages: readonly ChatMessageLike[];
}) {
  const currentMessageSignature = useMemo(
    () => getShenutePageMessageSignature(typedMessages),
    [typedMessages],
  );
  const starterPrompts = useMemo(() => getShenuteStarterPrompts(copy), [copy]);
  const hasUnsavedConversationChanges =
    hasShenutePageUnsavedConversationChanges({
      currentMessageSignature,
      lastSavedMessageSignature,
      typedMessagesLength: typedMessages.length,
    });
  const composer = getShenutePageComposerViewModel({
    copy,
    inputValue,
    isLoading,
    isShenuteAccessBlocked,
    language,
    ocrPending,
    selectedImage,
  });
  const history = getShenutePageHistoryViewModel({
    activeSessionId,
    autosaveStatus,
    copy,
    hasConversationDraft: composer.hasConversationDraft,
    hasUnsavedConversationChanges,
    historyActionStatus,
    isHistorySaving,
    isLoading,
    sessionsLength,
    typedMessagesLength: typedMessages.length,
  });

  return {
    ...composer,
    ...history,
    currentMessageSignature,
    forceUtilityChromeExpanded: shouldExpandShenutePageUtilityChrome({
      cameraError,
      cameraOpen,
      historyActionStatus,
      isAnswerStylePanelOpen,
      isHistorySaving,
      isShenuteAccessBlocked,
      ocrError,
      ocrPending,
      requestError,
      sessionStatus,
      shenuteAccessError,
    }),
    handoffContextLabel: getShenutePageHandoffContextLabel(handoffPageContext),
    hasUnsavedConversationChanges,
    requestErrorMessage: requestError
      ? getShenuteErrorMessage(requestError, copy, language)
      : null,
    starterPrompts,
    thinkingElapsedLabel: formatElapsedTime(thinkingElapsedSeconds),
    thinkingStatusMessage: getThinkingStatusMessage(
      thinkingElapsedSeconds,
      copy,
    ),
  };
}
