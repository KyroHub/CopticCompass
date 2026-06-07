"use client";

import {
  ArrowDownToLine,
  Clock3,
  MessageSquarePlus,
  MoreHorizontal,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { BreadcrumbTrail } from "@/components/BreadcrumbTrail";
import { buttonClassName } from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import { PageShell, pageShellAccents } from "@/components/PageShell";
import { surfacePanelClassName } from "@/components/SurfacePanel";
import { useSpeech } from "@/features/dictionary/hooks/useSpeech";
import type { ShenuteHandoffPageContext } from "@/features/shenute/handoff";
import type { SavedChatSession } from "@/features/shenute/lib/client/shenuteClientApi";
import { cx } from "@/lib/classes";
import { getLocalizedHomePath } from "@/lib/locale";
import { useOptionalAuthGate } from "@/lib/supabase/useOptionalAuthGate";

import { ShenuteAnswerStylePanel } from "./ShenuteAnswerStylePanel";
import {
  SHENUTE_DIALOG_BACKDROP_CLASS,
  SHENUTE_ICON_CLASS,
  SHENUTE_MOBILE_SHEET_CLASS,
  SHENUTE_UTILITY_BADGE_CLASS,
  SHENUTE_UTILITY_BUTTON_CLASS,
  SHENUTE_UTILITY_SUMMARY_CLASS,
  ShenuteSurfaceHeader,
} from "./ShenuteClientPrimitives";
import {
  closeOpenResponseDetails,
  closeOpenUtilityDetails,
} from "./shenuteClientUtils";
import { ShenuteComposer } from "./ShenuteComposer";
import { ShenuteConversationActionsPanel } from "./ShenuteConversationActionsPanel";
import { ShenuteConversationShell } from "./ShenuteConversationShell";
import { SHENUTE_COPY } from "./shenuteCopy";
import { ShenuteCopyFallbackDialog } from "./ShenuteCopyFallbackDialog";
import { ShenuteMessageList } from "./ShenuteMessageList";
import { ShenuteProviderControls } from "./ShenuteProviderControls";
import { ShenuteSavedSessionsPanel } from "./ShenuteSavedSessionsPanel";
import { ShenuteSessionSidebar } from "./ShenuteSessionSidebar";
import { useShenuteAdminFeedbackAccess } from "./useShenuteAdminFeedbackAccess";
import { useShenuteFeedbackSubmission } from "./useShenuteFeedbackSubmission";
import { useShenuteImageAttachment } from "./useShenuteImageAttachment";
import { useShenuteMessageCopy } from "./useShenuteMessageCopy";
import { useShenutePageChatRuntime } from "./useShenutePageChatRuntime";
import {
  useShenutePageAnswerStyleChrome,
  useShenutePageAttachmentMenuChrome,
  useShenutePageCopyFallbackChrome,
  useShenutePageMobileUtilitySheetChrome,
  useShenutePageStopResponse,
  useShenutePageUtilityChromeActions,
} from "./useShenutePageChrome";
import { useShenutePageComposerSubmit } from "./useShenutePageComposerSubmit";
import { useShenutePageConversationActions } from "./useShenutePageConversationActions";
import {
  useShenuteHistoryActionStatus,
  useShenutePageHistoryPersistence,
  useShenutePageHistoryWorkflow,
} from "./useShenutePageHistoryPersistence";
import {
  getShenutePageMessageSignature,
  submitShenutePromptKeyDown,
  useShenutePageViewModel,
} from "./useShenutePageViewModel";
import { useShenuteProviderSelection } from "./useShenuteProviderSelection";
import { useShenuteTemporaryMessageActions } from "./useShenuteTemporaryMessageActions";
import { useShenuteTextareaAutosize } from "./useShenuteTextareaAutosize";
import { useShenuteThinkingTimer } from "./useShenuteThinkingTimer";
import { useShenuteTranscriptChrome } from "./useShenuteTranscriptChrome";

const MESSAGE_INPUT_MIN_HEIGHT = 44;
const MESSAGE_INPUT_MOBILE_MAX_HEIGHT = 128;
const MESSAGE_INPUT_MAX_HEIGHT = 160;

export default function ShenutePageClient() {
  const { language, t } = useLanguage();
  const copy = SHENUTE_COPY[language];
  const {
    inferenceProvider,
    providerOptions,
    selectedProviderOption,
    setInferenceProvider,
  } = useShenuteProviderSelection(copy);
  const [inputValue, setInputValue] = useState("");
  const [ocrPending, setOcrPending] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [shenuteAccessError, setShenuteAccessError] = useState<string | null>(
    null,
  );
  const [handoffPageContext, setHandoffPageContext] =
    useState<ShenuteHandoffPageContext | null>(null);

  const attachmentMenuDetailsRef = useRef<HTMLDetailsElement | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
  const copyFallbackTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { copyFallbackText, setCopyFallbackText } =
    useShenutePageCopyFallbackChrome({
      textareaRef: copyFallbackTextareaRef,
    });
  const shenuteSessionIdRef = useRef(crypto.randomUUID());
  const {
    cameraError,
    cameraOpen,
    captureCanvasRef,
    captureFromCamera,
    clearSelectedImage,
    fileInputRef,
    openCamera,
    selectedImage,
    selectedImagePreviewUrl,
    selectedImageSource,
    setImageAttachment,
    stopCamera,
    videoRef,
  } = useShenuteImageAttachment({
    copy: {
      cameraAccessFailed: copy.cameraNotSupported,
      cameraFrameFailed: copy.cameraFrameFailed,
      cameraImageFailed: copy.cameraImageFailed,
      cameraNotReady: copy.cameraNotReady,
      cameraNotSupported: copy.cameraNotSupported,
      cameraStillLoading: copy.cameraStillLoading,
    },
    onAttachmentChange: () => setOcrError(null),
  });

  const { isAuthenticated, isReady, user } = useOptionalAuthGate();
  const getShenuteSessionId = useCallback(
    () => shenuteSessionIdRef.current,
    [],
  );
  const {
    adminFeedbackDraftByMessage,
    feedbackStateByMessage,
    handleAdminFeedbackSubmit,
    handleReaction,
    resetFeedbackSubmissionState,
    selectedReactionByMessage,
    setAdminFeedbackDraft,
  } = useShenuteFeedbackSubmission({
    copy: {
      promptMissing: copy.feedbackPromptMissing,
      saveFailed: copy.feedbackSaveFailed,
      saved: copy.feedbackSaved,
      savedLearningDelayed: copy.feedbackSavedLearningDelayed,
      savedWithRag: copy.feedbackSavedWithRag,
      saving: copy.feedbackSaving,
      signIn: copy.feedbackSignIn,
      writeAdminFeedback: copy.writeAdminFeedback,
    },
    getShenuteSessionId,
    inferenceProvider,
    isAuthenticated,
    language,
    pageContext: handoffPageContext,
  });
  const {
    messageActionStateByMessage,
    resetMessageActionStates,
    setTemporaryMessageActionState,
  } = useShenuteTemporaryMessageActions();
  const handleCopyMessage = useShenuteMessageCopy({
    copy,
    onManualCopyRequired: setCopyFallbackText,
    onSuccessfulCopy: () => setCopyFallbackText(null),
    setTemporaryMessageActionState,
  });
  const canSubmitAdminFeedback = useShenuteAdminFeedbackAccess({
    isAuthenticated,
    userId: user?.id,
  });
  const isSavingRef = useRef(false);
  const [lastSavedMessageSignature, setLastSavedMessageSignature] = useState(
    getShenutePageMessageSignature([]),
  );

  const {
    error,
    regenerate,
    sendMessage,
    setHistoryMessages,
    status,
    stopChatResponse,
    typedMessages,
  } = useShenutePageChatRuntime();

  const {
    speakMixed,
    stop: stopSpeech,
    isSpeaking,
    isPremiumLoading,
  } = useSpeech();

  const [autosaveStatus, setAutosaveStatus] = useState<string | null>(null);
  const [isHistorySaving, setIsHistorySaving] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SavedChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionLoadingId, setSessionLoadingId] = useState<string | null>(null);
  const [hasRestoredHistory, setHasRestoredHistory] = useState(false);
  const { historyActionStatus, setTemporaryHistoryActionStatus } =
    useShenuteHistoryActionStatus();
  const isLoading = status !== "ready";
  const thinkingElapsedSeconds = useShenuteThinkingTimer(isLoading);
  const isShenuteAccessBlocked = isReady && !isAuthenticated;
  const {
    closeAnswerStylePanel,
    isAnswerStylePanelOpen,
    setIsAnswerStylePanelOpen,
  } = useShenutePageAnswerStyleChrome({
    isShenuteAccessBlocked,
  });
  const {
    canStartNewConversation,
    canSubmitPrompt,
    composerPlaceholder,
    composerStateLabel,
    composerStateMeta,
    composerSubmitLabel,
    currentMessageSignature,
    forceUtilityChromeExpanded,
    handoffContextLabel,
    hasPromptContent,
    hasUnsavedConversationChanges,
    historyStatusDotClassName,
    historyStatusMessage,
    isAttachmentMenuDisabled,
    isComposerBusy,
    isComposerDisabled,
    requestErrorMessage,
    saveButtonLabel,
    selectedImageSizeLabel,
    sessionCountLabel,
    starterPrompts,
    thinkingElapsedLabel,
    thinkingStatusMessage,
  } = useShenutePageViewModel({
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
    requestError: error,
    selectedImage,
    sessionsLength: sessions.length,
    sessionStatus,
    shenuteAccessError,
    thinkingElapsedSeconds,
    typedMessages,
  });

  const {
    isMobileViewport,
    isTranscriptAtBottom,
    isUtilityChromeCollapsed,
    messagesEndRef,
    scrollTranscriptToBottom,
    setIsTranscriptAtBottom,
    setIsUtilityChromeCollapsed,
    transcriptScrollRef,
    updateTranscriptScrollState,
  } = useShenuteTranscriptChrome({
    forceUtilityChromeExpanded,
    hasRestoredHistory,
    isLoading,
    typedMessagesLength: typedMessages.length,
  });
  const { closeMobileUtilitySheet, mobileUtilitySheet, setMobileUtilitySheet } =
    useShenutePageMobileUtilitySheetChrome({
      isMobileViewport,
    });
  const {
    expandUtilityChrome,
    handleActionsMobileUtilitySheetToggle,
    handleAttachmentMenuOpen,
    handleAnswerStylePanelToggle,
    handleAnswerStyleProviderSelect,
    handleHistoryMobileUtilitySheetToggle,
    handleResponseDetailsToggle,
    handleUtilityDetailsToggle,
    prepareNewConversationChrome,
  } = useShenutePageUtilityChromeActions({
    closeOpenResponseDetails,
    closeOpenUtilityDetails,
    setInferenceProvider,
    setIsAnswerStylePanelOpen,
    setIsUtilityChromeCollapsed,
    setMobileUtilitySheet,
  });
  const { handleComposerDetailsToggle } = useShenutePageAttachmentMenuChrome({
    attachmentMenuDetailsRef,
    onOpen: handleAttachmentMenuOpen,
  });
  const handleStopResponseFromComposer = useShenutePageStopResponse({
    closeOpenResponseDetails,
    closeOpenUtilityDetails,
    messageInputRef,
    setIsAnswerStylePanelOpen,
    setIsUtilityChromeCollapsed,
    setMobileUtilitySheet,
    stopChatResponse,
  });
  const handleFormSubmit = useShenutePageComposerSubmit({
    accessRequiredMessage: copy.accessRequired,
    clearSelectedImage,
    closeOpenResponseDetails,
    closeOpenUtilityDetails,
    handoffPageContext,
    hasPromptContent,
    imageContextLabel: copy.imageOcrContext,
    inferenceProvider,
    inputValue,
    isComposerDisabled,
    isShenuteAccessBlocked,
    language,
    noTextExtractedMessage: copy.noTextExtracted,
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
  const {
    handleContinueConversation,
    handleMessageInputFocus,
    handleRegenerateMessage,
    handleStarterPrompt,
    scrollToLatestMessage,
  } = useShenutePageConversationActions({
    continuePrompt: copy.continuePrompt,
    handoffPageContext,
    inferenceProvider,
    isLoading,
    isShenuteAccessBlocked,
    messageInputRef,
    regenerate,
    scrollTranscriptToBottom,
    sendMessage,
    setInputValue,
    setIsTranscriptAtBottom,
    setIsUtilityChromeCollapsed,
    setShenuteAccessError,
    shenuteAccessError,
    typedMessagesLength: typedMessages.length,
  });

  useShenuteTextareaAutosize({
    inputValue,
    isMobileViewport,
    maxHeight: MESSAGE_INPUT_MAX_HEIGHT,
    minHeight: MESSAGE_INPUT_MIN_HEIGHT,
    mobileMaxHeight: MESSAGE_INPUT_MOBILE_MAX_HEIGHT,
    textareaRef: messageInputRef,
  });

  const { handleSaveHistory } = useShenutePageHistoryPersistence({
    autosaveStatusMessage: copy.autosaveStatus,
    currentMessageSignature,
    failureMessage: copy.saveHistoryFailed,
    hasRestoredHistory,
    hasUnsavedConversationChanges,
    isAuthenticated,
    isHistorySaving,
    isLoading,
    isReady,
    isSavingRef,
    manualSaveSuccessMessage: copy.savedHistory,
    setActiveSessionId,
    setAutosaveStatus,
    setIsHistorySaving,
    setLastSavedMessageSignature,
    setSessions,
    setTemporaryHistoryActionStatus,
    shenuteSessionIdRef,
    typedMessages,
  });
  const { clearCurrentConversation, loadShenuteSession, startNewConversation } =
    useShenutePageHistoryWorkflow({
      activeSessionId,
      canStartNewConversation,
      clearSelectedImage,
      copy: {
        clearConversationConfirm: copy.clearConversationConfirm,
        clearConversationFailed: copy.clearConversationFailed,
        clearingConversation: copy.clearingConversation,
        conversationCleared: copy.conversationCleared,
        historyUnavailable: copy.historyUnavailable,
        loadingSession: copy.loadingSession,
        newConversationStarted: copy.newConversationStarted,
        saveHistoryFailed: copy.saveHistoryFailed,
      },
      hasRestoredHistory,
      hasUnsavedConversationChanges,
      isAuthenticated,
      isHistorySaving,
      isLoading,
      isReady,
      isSavingRef,
      resetFeedbackSubmissionState,
      resetMessageActionStates,
      scrollTranscriptToBottom,
      sessions,
      setActiveSessionId,
      setAutosaveStatus,
      setHandoffPageContext,
      setHasRestoredHistory,
      setInferenceProvider,
      setInputValue,
      setIsHistorySaving,
      setIsTranscriptAtBottom,
      setIsUtilityChromeCollapsed,
      setLastSavedMessageSignature,
      setMessages: setHistoryMessages,
      setOcrError,
      setSessionLoadingId,
      setSessionStatus,
      setSessions,
      setShenuteAccessError,
      setTemporaryHistoryActionStatus,
      shenuteSessionIdRef,
      stopCamera,
      stopSpeech,
      typedMessages,
    });

  return (
    <PageShell
      className="app-page-shell min-h-[calc(100dvh-4.75rem)] px-3 pb-3 pt-3 md:min-h-screen md:px-10 md:pb-20 md:pt-10"
      contentClassName="app-page-content space-y-3 pt-3 md:pt-8"
      width="standard"
      accents={[
        pageShellAccents.heroCopticBand,
        pageShellAccents.topRightGoldWashInset,
      ]}
    >
      <header className="mb-2 space-y-2 md:mb-6 md:space-y-5">
        <BreadcrumbTrail
          className="hidden sm:block"
          items={[
            { label: t("nav.home"), href: getLocalizedHomePath(language) },
            { label: t("nav.shenute") },
          ]}
        />
        <div className="min-w-0">
          <h1 className="truncate pb-1 text-2xl font-extrabold tracking-tight text-coptic md:pb-2 md:text-4xl">
            {copy.title}
          </h1>
          <p className="hidden max-w-3xl text-base font-medium text-muted md:block md:text-lg">
            {copy.intro}
          </p>
        </div>
      </header>

      <ShenuteConversationShell
        accessMessage={copy.accessRequired}
        isAccessBlocked={isShenuteAccessBlocked}
        title={copy.title}
      >
        <div
          className={cx(
            "relative z-30 transition-all duration-200",
            isUtilityChromeCollapsed && "hidden sm:block",
          )}
        >
          <div
            className={surfacePanelClassName({
              className:
                "flex min-h-14 items-center justify-between gap-2 border-b border-line/80 px-3 py-1.5 text-xs text-muted sm:px-4 sm:py-2 sm:text-sm md:px-5",
            })}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <span
                aria-hidden="true"
                className={cx(
                  "h-2 w-2 shrink-0 rounded-full",
                  historyStatusDotClassName,
                )}
              />
              <p className="min-w-0 flex-1 truncate text-xs sm:hidden">
                {historyStatusMessage} ·{" "}
                {handoffContextLabel
                  ? `${copy.pageContextBadge}: ${handoffContextLabel}`
                  : selectedProviderOption.label}
              </p>
              <p className="hidden min-w-0 flex-1 truncate sm:block">
                {historyStatusMessage}
              </p>
              <span className="hidden max-w-full items-center rounded-md bg-elevated px-2 py-0.5 text-xs font-semibold text-muted sm:inline-flex">
                <span className="truncate">
                  {copy.aiMode}: {selectedProviderOption.label}
                </span>
              </span>
              {handoffContextLabel ? (
                <span
                  className="hidden max-w-[14rem] items-center rounded-md bg-coptic-soft px-2 py-0.5 text-xs font-semibold text-coptic sm:inline-flex"
                  title={handoffPageContext?.url || handoffPageContext?.path}
                >
                  <span className="truncate">
                    {copy.pageContextBadge}: {handoffContextLabel}
                  </span>
                </span>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
              {sessions.length > 0 ? (
                <>
                  <button
                    type="button"
                    aria-controls="shenute-mobile-utility-sheet"
                    aria-expanded={mobileUtilitySheet === "history"}
                    aria-haspopup="dialog"
                    aria-label={`${copy.conversationHistory}: ${sessionCountLabel}`}
                    title={copy.conversationHistory}
                    onClick={handleHistoryMobileUtilitySheetToggle}
                    className={buttonClassName({
                      size: "sm",
                      variant: "secondary",
                      className: cx(
                        SHENUTE_UTILITY_BUTTON_CLASS,
                        "relative sm:hidden",
                        mobileUtilitySheet === "history" &&
                          "border-coptic/45 bg-coptic-soft/70 text-coptic",
                      ),
                    })}
                  >
                    <Clock3 className={SHENUTE_ICON_CLASS.action} />
                    <span className={SHENUTE_UTILITY_BADGE_CLASS}>
                      {sessions.length}
                    </span>
                  </button>
                  <ShenuteSessionSidebar
                    activeSessionId={activeSessionId}
                    copy={copy}
                    hasUnsavedConversationChanges={
                      hasUnsavedConversationChanges
                    }
                    language={language}
                    onLoadSession={loadShenuteSession}
                    onToggle={handleUtilityDetailsToggle}
                    sessionCountLabel={sessionCountLabel}
                    sessionLoadingId={sessionLoadingId}
                    sessionStatus={sessionStatus}
                    sessions={sessions}
                  />
                </>
              ) : null}
              {typedMessages.length > 0 && !isTranscriptAtBottom ? (
                <button
                  type="button"
                  aria-label={copy.jumpToLatest}
                  title={copy.jumpToLatest}
                  onClick={scrollToLatestMessage}
                  className={buttonClassName({
                    size: "sm",
                    variant: "secondary",
                    className: SHENUTE_UTILITY_BUTTON_CLASS,
                  })}
                >
                  <ArrowDownToLine className={SHENUTE_ICON_CLASS.action} />
                </button>
              ) : null}
              <ShenuteProviderControls
                controlsLabel={copy.answerStyleControls}
                isOpen={isAnswerStylePanelOpen}
                onToggle={handleAnswerStylePanelToggle}
              />
              <button
                type="button"
                aria-label={copy.newConversation}
                title={copy.newConversation}
                onClick={() => {
                  prepareNewConversationChrome();
                  void startNewConversation();
                }}
                disabled={
                  isLoading || isHistorySaving || !canStartNewConversation
                }
                className={buttonClassName({
                  size: "sm",
                  variant: "secondary",
                  className: SHENUTE_UTILITY_BUTTON_CLASS,
                })}
              >
                <MessageSquarePlus className={SHENUTE_ICON_CLASS.action} />
              </button>
              <button
                type="button"
                aria-controls="shenute-mobile-utility-sheet"
                aria-expanded={mobileUtilitySheet === "actions"}
                aria-haspopup="dialog"
                aria-label={copy.conversationActions}
                title={copy.conversationActions}
                onClick={handleActionsMobileUtilitySheetToggle}
                className={buttonClassName({
                  size: "sm",
                  variant: "secondary",
                  className: cx(
                    SHENUTE_UTILITY_BUTTON_CLASS,
                    "sm:hidden",
                    mobileUtilitySheet === "actions" &&
                      "border-coptic/45 bg-coptic-soft/70 text-coptic",
                  ),
                })}
              >
                <MoreHorizontal className={SHENUTE_ICON_CLASS.action} />
              </button>
              <details
                data-shenute-utility-details
                className="group relative hidden shrink-0 sm:block"
                onToggle={handleUtilityDetailsToggle}
              >
                <summary
                  aria-label={copy.conversationActions}
                  title={copy.conversationActions}
                  className={buttonClassName({
                    size: "sm",
                    variant: "secondary",
                    className: SHENUTE_UTILITY_SUMMARY_CLASS,
                  })}
                >
                  <MoreHorizontal className={SHENUTE_ICON_CLASS.action} />
                </summary>
                <div
                  className={surfacePanelClassName({
                    shadow: "panel",
                    className:
                      "absolute right-0 top-full z-50 mt-2 hidden w-64 p-2 group-open:block",
                  })}
                >
                  <ShenuteConversationActionsPanel
                    activeSessionId={activeSessionId}
                    copy={copy}
                    hasUnsavedConversationChanges={
                      hasUnsavedConversationChanges
                    }
                    isHistorySaving={isHistorySaving}
                    isLoading={isLoading}
                    language={language}
                    onClearConversation={clearCurrentConversation}
                    onSaveHistory={handleSaveHistory}
                    saveButtonLabel={saveButtonLabel}
                    typedMessagesCount={typedMessages.length}
                  />
                </div>
              </details>
            </div>
          </div>
        </div>
        <button
          type="button"
          aria-label={copy.expandControls}
          title={copy.expandControls}
          onClick={expandUtilityChrome}
          className={cx(
            "relative z-30 h-10 items-center gap-2 border-b border-line bg-surface/88 px-3 py-1 text-left text-xs text-muted shadow-sm transition hover:bg-elevated sm:hidden",
            isUtilityChromeCollapsed ? "flex" : "hidden",
          )}
        >
          <span
            aria-hidden="true"
            className={cx(
              "h-2 w-2 shrink-0 rounded-full",
              historyStatusDotClassName,
            )}
          />
          <span className="min-w-0 flex-1 truncate">
            <span className="font-semibold text-ink">{copy.title}</span>
            <span aria-hidden="true"> · </span>
            {selectedProviderOption.label}
            <span aria-hidden="true"> · </span>
            {historyStatusMessage}
          </span>
          <MoreHorizontal
            className={cx(SHENUTE_ICON_CLASS.action, "shrink-0")}
          />
        </button>
        <ShenuteMessageList
          adminFeedbackDraftByMessage={adminFeedbackDraftByMessage}
          canSubmitAdminFeedback={canSubmitAdminFeedback}
          copy={copy}
          feedbackStateByMessage={feedbackStateByMessage}
          inferenceProvider={inferenceProvider}
          isAuthenticated={isAuthenticated}
          isLoading={isLoading}
          isPremiumLoading={isPremiumLoading}
          isReady={isReady}
          isShenuteAccessBlocked={isShenuteAccessBlocked}
          isSpeaking={isSpeaking}
          messageActionStateByMessage={messageActionStateByMessage}
          messagesEndRef={messagesEndRef}
          onAdminDraftChange={setAdminFeedbackDraft}
          onAdminFeedbackSubmit={(assistantMessage, promptMessage) => {
            void handleAdminFeedbackSubmit(assistantMessage, promptMessage);
          }}
          onContinueConversation={handleContinueConversation}
          onCopyMessage={(message) => {
            void handleCopyMessage(message);
          }}
          onReaction={(signal, assistantMessage, promptMessage) => {
            void handleReaction(signal, assistantMessage, promptMessage);
          }}
          onRegenerateMessage={handleRegenerateMessage}
          onResponseDetailsToggle={handleResponseDetailsToggle}
          onSelectStarterPrompt={handleStarterPrompt}
          onSpeakText={(text) => {
            void speakMixed(text);
          }}
          onStopSpeech={stopSpeech}
          onTranscriptScroll={updateTranscriptScrollState}
          selectedProviderOption={selectedProviderOption}
          selectedReactionByMessage={selectedReactionByMessage}
          starterPrompts={starterPrompts}
          thinkingElapsedLabel={thinkingElapsedLabel}
          thinkingElapsedSeconds={thinkingElapsedSeconds}
          thinkingStatusMessage={thinkingStatusMessage}
          transcriptScrollRef={transcriptScrollRef}
          typedMessages={typedMessages}
        />

        <ShenuteComposer
          attachmentMenuDetailsRef={attachmentMenuDetailsRef}
          cameraError={cameraError}
          cameraOpen={cameraOpen}
          canSubmitPrompt={canSubmitPrompt}
          captureCanvasRef={captureCanvasRef}
          composerPlaceholder={composerPlaceholder}
          composerStateLabel={composerStateLabel}
          composerStateMeta={composerStateMeta}
          composerSubmitLabel={composerSubmitLabel}
          copy={copy}
          fileInputRef={fileInputRef}
          inputValue={inputValue}
          isAttachmentMenuDisabled={isAttachmentMenuDisabled}
          isComposerBusy={isComposerBusy}
          isComposerDisabled={isComposerDisabled}
          isLoading={isLoading}
          isShenuteAccessBlocked={isShenuteAccessBlocked}
          messageInputRef={messageInputRef}
          ocrError={ocrError}
          ocrPending={ocrPending}
          onCaptureFromCamera={() => {
            void captureFromCamera();
          }}
          onClearSelectedImage={clearSelectedImage}
          onInputChange={(value) => {
            setInputValue(value);
            if (shenuteAccessError) {
              setShenuteAccessError(null);
            }
          }}
          onMessageInputFocus={handleMessageInputFocus}
          onOpenCamera={() => {
            void openCamera();
          }}
          onPromptKeyDown={submitShenutePromptKeyDown}
          onStopCamera={stopCamera}
          onStopResponse={handleStopResponseFromComposer}
          onSubmit={handleFormSubmit}
          onToggleAttachmentMenu={handleComposerDetailsToggle}
          requestErrorMessage={requestErrorMessage}
          selectedImage={selectedImage}
          selectedImagePreviewUrl={selectedImagePreviewUrl}
          selectedImageSizeLabel={selectedImageSizeLabel}
          selectedImageSource={selectedImageSource}
          setImageAttachment={setImageAttachment}
          shenuteAccessError={shenuteAccessError}
          videoRef={videoRef}
        />
      </ShenuteConversationShell>

      {copyFallbackText ? (
        <ShenuteCopyFallbackDialog
          copy={copy}
          fallbackText={copyFallbackText}
          onClose={() => setCopyFallbackText(null)}
          textareaRef={copyFallbackTextareaRef}
        />
      ) : null}

      {mobileUtilitySheet ? (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            className={cx(SHENUTE_DIALOG_BACKDROP_CLASS, "z-[60] sm:hidden")}
            onClick={closeMobileUtilitySheet}
          />
          <div
            id="shenute-mobile-utility-sheet"
            role="dialog"
            aria-labelledby="shenute-mobile-utility-title"
            className={cx(SHENUTE_MOBILE_SHEET_CLASS, "z-[70] sm:hidden")}
          >
            <ShenuteSurfaceHeader
              closeLabel={copy.closeMenu}
              className="mb-3"
              onClose={closeMobileUtilitySheet}
              titleId="shenute-mobile-utility-title"
            >
              {mobileUtilitySheet === "history"
                ? copy.conversationHistory
                : copy.conversationActions}
            </ShenuteSurfaceHeader>
            {mobileUtilitySheet === "history" ? (
              <ShenuteSavedSessionsPanel
                activeSessionId={activeSessionId}
                copy={copy}
                hasUnsavedConversationChanges={hasUnsavedConversationChanges}
                language={language}
                onClose={closeMobileUtilitySheet}
                onLoadSession={loadShenuteSession}
                sessionLoadingId={sessionLoadingId}
                sessions={sessions}
                showMobileHeader={false}
              />
            ) : (
              <ShenuteConversationActionsPanel
                activeSessionId={activeSessionId}
                copy={copy}
                hasUnsavedConversationChanges={hasUnsavedConversationChanges}
                isHistorySaving={isHistorySaving}
                isLoading={isLoading}
                language={language}
                onClearConversation={clearCurrentConversation}
                onClose={closeMobileUtilitySheet}
                onSaveHistory={handleSaveHistory}
                saveButtonLabel={saveButtonLabel}
                typedMessagesCount={typedMessages.length}
              />
            )}
          </div>
        </>
      ) : null}

      {isAnswerStylePanelOpen ? (
        <ShenuteAnswerStylePanel
          copy={copy}
          inferenceProvider={inferenceProvider}
          isLoading={isLoading}
          isShenuteAccessBlocked={isShenuteAccessBlocked}
          onClose={closeAnswerStylePanel}
          onSelectProvider={handleAnswerStyleProviderSelect}
          providerOptions={providerOptions}
          selectedProviderOption={selectedProviderOption}
        />
      ) : null}
    </PageShell>
  );
}
