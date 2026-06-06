"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import { useLanguage } from "@/components/LanguageProvider";
import {
  formatElapsedTime,
  getThinkingStatusMessage,
  type ChatMessageLike,
} from "@/features/shenute/shared";
import { cx } from "@/lib/classes";
import { useOptionalAuthGate } from "@/lib/supabase/useOptionalAuthGate";
import { useMediaQuery } from "@/lib/useMediaQuery";
import type { Language } from "@/types/i18n";

import { FLOATING_SHENUTE_CONTAINER_CLASS } from "./floatingShenuteClasses";
import { FloatingShenuteComposer } from "./FloatingShenuteComposer";
import {
  getFloatingShenutePageContextLabel,
  readFloatingShenutePageContext,
} from "./floatingShenuteContext";
import { FloatingShenuteHeader } from "./FloatingShenuteHeader";
import { FloatingShenuteMessages } from "./FloatingShenuteMessages";
import { FloatingShenuteProviderControls } from "./FloatingShenuteProviderControls";
import { FloatingShenuteTrigger } from "./FloatingShenuteTrigger";
import { FloatingShenuteWindow } from "./FloatingShenuteWindow";
import { useFloatingShenuteChatHistoryDownload } from "./useFloatingShenuteChatHistoryDownload";
import { useFloatingShenuteComposerSubmit } from "./useFloatingShenuteComposerSubmit";
import {
  useFloatingShenuteAnswerStyleChrome,
  useFloatingShenuteAttachmentMenuChrome,
  useFloatingShenuteStopResponse,
  useFloatingShenuteWorkspaceHandoff,
} from "./useFloatingShenutePanelChrome";
import { useFloatingShenutePanelState } from "./useFloatingShenutePanelState";
import { useShenuteAdminFeedbackAccess } from "./useShenuteAdminFeedbackAccess";
import { useShenuteFeedbackSubmission } from "./useShenuteFeedbackSubmission";
import { useShenuteImageAttachment } from "./useShenuteImageAttachment";
import { useShenuteMessageCopy } from "./useShenuteMessageCopy";
import { useShenuteProviderSelection } from "./useShenuteProviderSelection";
import { useShenuteTemporaryMessageActions } from "./useShenuteTemporaryMessageActions";
import { useShenuteTextareaAutosize } from "./useShenuteTextareaAutosize";
import { useShenuteThinkingTimer } from "./useShenuteThinkingTimer";

const MESSAGE_INPUT_MIN_HEIGHT = 40;
const MESSAGE_INPUT_MOBILE_MAX_HEIGHT = 112;
const MESSAGE_INPUT_MAX_HEIGHT = 136;
const MOBILE_VIEWPORT_MEDIA_QUERY = "(max-width: 639px)";

const floatingShenuteCopy = {
  en: {
    addImage: "Add image",
    adminNotePlaceholder:
      "Admin only: add written feedback tied to this prompt/response.",
    adminNoteTitle: "Admin learning note",
    aiMode: "Answer style",
    aiModeDescription: "Choose how Shenute should balance depth and speed.",
    answerStyleControls: "Change answer style",
    camera: "Camera",
    cameraAccessFailed: "Could not access camera.",
    cameraFeedNotReady: "Camera feed is not ready yet. Try again.",
    cameraNotReady: "Camera is not ready.",
    cameraUnsupported: "Camera is not supported on this device/browser.",
    capture: "Capture",
    captureFailed: "Could not capture image from camera.",
    close: "Close",
    contextAware: "Page context",
    copiedResponse: "Copied.",
    copyResponse: "Copy",
    copyResponseManual: "Copy manually.",
    dislike: "Not helpful",
    emptyPrompt:
      "Ask anything about this page, Coptic grammar, vocabulary, or translation.",
    feedbackFailed: "Could not save feedback.",
    imageAttached: "Image attached",
    imageContext: "Image OCR Context",
    imageFromCamera: "camera",
    imageFromUpload: "upload",
    inputPlaceholder: "Ask Shenute...",
    like: "Helpful",
    minimize: "Minimize",
    noTextExtracted: "No text extracted from the selected image.",
    ocrFailed: "OCR failed for the selected image.",
    ocrPending: "OCR...",
    promptResolveFailed: "Could not resolve prompt/response for this feedback.",
    provider: "Style",
    providerGemini: "Fast answer",
    providerGeminiDescription:
      "Quicker help for direct grammar or vocabulary questions.",
    providerGeminiNmt: "Fast answer (RAG + NMT)",
    providerGeminiNmtDescription:
      "Gemini with strict retrieved-context grounding plus NMT translation hints.",
    providerHf: "Experimental",
    providerHfDescription: "A lighter experimental pass for comparison.",
    providerOpenRouter: "Reasoned answer",
    providerOpenRouterDescription:
      "More step-by-step structure for harder questions.",
    providerThoth: "Best answer",
    providerThothDescription: "The strongest default for Coptology questions.",
    ragWarning: "RAG ingest warning:",
    removeImage: "Remove",
    requestFailed:
      "Shenute is having trouble answering right now. Please try again in a moment.",
    responseFeedbackActions: "Feedback",
    responseUseActions: "Use answer",
    runningOcr: "Running OCR...",
    saved: "Saved.",
    savedRag: "Saved and added to RAG learning.",
    savedLearningDelayed: "Saved. The learning sync will catch up later.",
    savingFeedback: "Saving feedback...",
    selectedForOcrAlt: "Selected for OCR",
    send: "Send",
    signInBody:
      "Sign in to use Shenute AI on this page, ask follow-up questions, and send OCR-backed prompts.",
    signInFeedback: "Sign in to send learning feedback signals",
    signInTitle: "Sign in required",
    stopResponse: "Stop response",
    submitAdminNote: "Submit admin note",
    thinking: "Thinking...",
    thinkingComposing: "Composing answer",
    thinkingInitial: "Preparing answer",
    thinkingLong: "Still working",
    thinkingSearching: "Checking sources",
    fullWorkspace: "Open in Shenute AI",
    fullWorkspaceHint: "Continue this page-aware thread in the full workspace.",
    saveHistory: "Download transcript",
    savedHistory: "Transcript downloaded.",
    writeAdminFeedback: "Write admin feedback before submitting.",
  },
  nl: {
    addImage: "Afbeelding",
    adminNotePlaceholder:
      "Alleen admin: voeg feedback toe bij deze prompt en dit antwoord.",
    adminNoteTitle: "Leer-notitie voor beheerder",
    aiMode: "Antwoordstijl",
    aiModeDescription: "Kies hoe Shenute diepgang en snelheid moet balanceren.",
    answerStyleControls: "Antwoordstijl wijzigen",
    camera: "Camera",
    cameraAccessFailed: "Geen toegang tot de camera.",
    cameraFeedNotReady: "De camerafeed is nog niet klaar. Probeer opnieuw.",
    cameraNotReady: "De camera is nog niet klaar.",
    cameraUnsupported:
      "Camera wordt niet ondersteund op dit apparaat of in deze browser.",
    capture: "Vastleggen",
    captureFailed: "Afbeelding kon niet uit de camera worden vastgelegd.",
    close: "Sluiten",
    contextAware: "Pagina-context",
    copiedResponse: "Gekopieerd.",
    copyResponse: "Kopiëren",
    copyResponseManual: "Handmatig kopiëren.",
    dislike: "Niet behulpzaam",
    emptyPrompt:
      "Stel een vraag over deze pagina, Koptische grammatica, woordenschat of vertaling.",
    feedbackFailed: "Feedback kon niet worden opgeslagen.",
    imageAttached: "Afbeelding toegevoegd",
    imageContext: "OCR-context van afbeelding",
    imageFromCamera: "camera",
    imageFromUpload: "upload",
    inputPlaceholder: "Vraag Shenute...",
    like: "Behulpzaam",
    minimize: "Minimaliseren",
    noTextExtracted:
      "Er is geen tekst uit de geselecteerde afbeelding gehaald.",
    ocrFailed: "OCR is mislukt voor de geselecteerde afbeelding.",
    ocrPending: "OCR...",
    promptResolveFailed:
      "Prompt en antwoord konden niet aan deze feedback worden gekoppeld.",
    provider: "Stijl",
    providerGemini: "Snel antwoord",
    providerGeminiDescription:
      "Snellere hulp voor directe grammatica- of woordenschatvragen.",
    providerGeminiNmt: "Snel antwoord (RAG + NMT)",
    providerGeminiNmtDescription:
      "Gemini met strikte contextverankering en NMT-vertaalsuggesties.",
    providerHf: "Experimenteel",
    providerHfDescription: "Een lichtere experimentele vergelijking.",
    providerOpenRouter: "Uitgewerkt antwoord",
    providerOpenRouterDescription:
      "Meer stapsgewijze structuur voor moeilijkere vragen.",
    providerThoth: "Beste antwoord",
    providerThothDescription:
      "De sterkste standaard voor koptologische vragen.",
    ragWarning: "RAG-invoerwaarschuwing:",
    removeImage: "Verwijderen",
    requestFailed:
      "Shenute heeft nu moeite met antwoorden. Probeer het zo opnieuw.",
    responseFeedbackActions: "Feedback",
    responseUseActions: "Antwoord gebruiken",
    runningOcr: "OCR uitvoeren...",
    saved: "Opgeslagen.",
    savedRag: "Opgeslagen en toegevoegd aan RAG-leren.",
    savedLearningDelayed:
      "Opgeslagen. De leersynchronisatie wordt later bijgewerkt.",
    savingFeedback: "Feedback opslaan...",
    selectedForOcrAlt: "Geselecteerd voor OCR",
    send: "Versturen",
    signInBody:
      "Meld u aan om Shenute AI op deze pagina te gebruiken, vervolgvragen te stellen en OCR-prompts te versturen.",
    signInFeedback: "Meld u aan om leersignalen te versturen",
    signInTitle: "Aanmelden vereist",
    stopResponse: "Antwoord stoppen",
    submitAdminNote: "Adminnotitie versturen",
    thinking: "Denkt na...",
    thinkingComposing: "Antwoord opstellen",
    thinkingInitial: "Antwoord voorbereiden",
    thinkingLong: "Nog bezig",
    thinkingSearching: "Bronnen controleren",
    fullWorkspace: "Openen in Shenute AI",
    fullWorkspaceHint:
      "Ga verder met deze pagina-bewuste thread in de volledige werkruimte.",
    saveHistory: "Transcript downloaden",
    savedHistory: "Transcript gedownload.",
    writeAdminFeedback: "Schrijf adminfeedback voordat u die verstuurt.",
  },
} as const satisfies Record<Language, Record<string, string>>;

type FloatingShenutePanelProps = {
  initialOpen?: boolean;
};

export function FloatingShenutePanel({
  initialOpen = false,
}: FloatingShenutePanelProps) {
  const pathname = usePathname();
  const { language, t } = useLanguage();
  const isMobileViewport = useMediaQuery(MOBILE_VIEWPORT_MEDIA_QUERY);
  const copy = floatingShenuteCopy[language];
  const { isOpen, launcherOpacity, setIsOpen } = useFloatingShenutePanelState({
    initialOpen,
  });
  const [inputValue, setInputValue] = useState("");
  const {
    inferenceProvider,
    providerOptions,
    selectedProviderOption,
    setInferenceProvider,
  } = useShenuteProviderSelection(copy);
  const [ocrPending, setOcrPending] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const attachmentMenuDetailsRef = useRef<HTMLDetailsElement | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
  const { isAnswerStylePanelOpen, setIsAnswerStylePanelOpen } =
    useFloatingShenuteAnswerStyleChrome();
  const { closeAttachmentMenu, handleAttachmentMenuToggle } =
    useFloatingShenuteAttachmentMenuChrome({
      attachmentMenuDetailsRef,
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
      cameraAccessFailed: copy.cameraAccessFailed,
      cameraFrameFailed: copy.captureFailed,
      cameraImageFailed: copy.captureFailed,
      cameraNotReady: copy.cameraNotReady,
      cameraNotSupported: copy.cameraUnsupported,
      cameraStillLoading: copy.cameraFeedNotReady,
    },
    onAttachmentChange: () => setOcrError(null),
  });

  const { isAuthenticated, isReady, user } = useOptionalAuthGate();
  const pageContext = useMemo(
    () => readFloatingShenutePageContext(pathname),
    [pathname],
  );
  const readCurrentPageContext = useCallback(
    () => readFloatingShenutePageContext(pathname),
    [pathname],
  );
  const getShenuteSessionId = useCallback(
    () => shenuteSessionIdRef.current,
    [],
  );
  const {
    adminFeedbackDraftByMessage,
    feedbackStateByMessage,
    handleAdminFeedbackSubmit,
    handleReaction,
    selectedReactionByMessage,
    setAdminFeedbackDraft,
  } = useShenuteFeedbackSubmission({
    copy: {
      promptMissing: copy.promptResolveFailed,
      saveFailed: copy.feedbackFailed,
      saved: copy.saved,
      savedLearningDelayed: copy.savedLearningDelayed,
      savedWithRag: copy.savedRag,
      saving: copy.savingFeedback,
      signIn: copy.signInFeedback,
      writeAdminFeedback: copy.writeAdminFeedback,
    },
    getShenuteSessionId,
    inferenceProvider,
    isAuthenticated,
    language,
    pageContext,
  });
  const { messageActionStateByMessage, setTemporaryMessageActionState } =
    useShenuteTemporaryMessageActions();
  const handleCopyMessage = useShenuteMessageCopy({
    copy,
    setTemporaryMessageActionState,
  });
  const canSubmitAdminFeedback = useShenuteAdminFeedbackAccess({
    isAuthenticated,
    userId: user?.id,
  });

  const pageContextLabel = useMemo(
    () => getFloatingShenutePageContextLabel(pageContext, language),
    [language, pageContext],
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/shenute",
      }),
    [],
  );

  const { messages, sendMessage, status, stop, error } = useChat({
    transport,
  });

  const isLoading = status !== "ready";
  const thinkingElapsedSeconds = useShenuteThinkingTimer(isLoading);
  const isShenuteAccessBlocked = isReady && !isAuthenticated;
  const typedMessages = messages as ChatMessageLike[];
  const handleStopResponseFromComposer = useFloatingShenuteStopResponse({
    closeAttachmentMenu,
    messageInputRef,
    setIsAnswerStylePanelOpen,
    stop,
  });
  const persistShenuteHandoff = useFloatingShenuteWorkspaceHandoff({
    inferenceProvider,
    messages: typedMessages,
    readPageContext: readCurrentPageContext,
  });
  const { handleSaveChatHistory, saveStatus } =
    useFloatingShenuteChatHistoryDownload({
      messages: typedMessages,
      pageContext,
      provider: inferenceProvider,
      savedHistoryMessage: copy.savedHistory,
    });
  const hasPromptContent =
    inputValue.trim().length > 0 || Boolean(selectedImage);
  const isComposerDisabled = isLoading || ocrPending || isShenuteAccessBlocked;
  const handleSubmit = useFloatingShenuteComposerSubmit({
    clearSelectedImage,
    closeAttachmentMenu,
    imageContextLabel: `[${copy.imageContext}]`,
    inferenceProvider,
    inputValue,
    isComposerDisabled,
    isShenuteAccessBlocked,
    language,
    noTextExtractedMessage: copy.noTextExtracted,
    readPageContext: readCurrentPageContext,
    selectedImage,
    sendMessage,
    setInputValue,
    setIsAnswerStylePanelOpen,
    setOcrError,
    setOcrPending,
  });
  const canSubmitPrompt = hasPromptContent && !isComposerDisabled;
  const isAttachmentMenuDisabled = isComposerDisabled;
  const thinkingStatusMessage = getThinkingStatusMessage(
    thinkingElapsedSeconds,
    copy,
  );
  const thinkingElapsedLabel = formatElapsedTime(thinkingElapsedSeconds);
  const composerPlaceholder = copy.inputPlaceholder;

  let composerStateLabel: string | null = null;
  if (ocrPending) {
    composerStateLabel = copy.runningOcr;
  }

  let composerStateMeta: string | null = null;
  if (ocrPending && selectedImage) {
    composerStateMeta = selectedImage.name || copy.imageAttached;
  }

  const composerSubmitLabel = isLoading ? copy.stopResponse : copy.send;
  const floatingContainerClassName = isOpen
    ? "fixed inset-0 z-50 flex items-end justify-center pointer-events-none sm:inset-auto sm:bottom-5 sm:right-5 sm:block"
    : cx(
        FLOATING_SHENUTE_CONTAINER_CLASS,
        "opacity-[var(--floating-shenute-opacity)]",
      );
  const floatingContainerStyle = !isOpen
    ? ({
        "--floating-shenute-opacity": launcherOpacity.toFixed(2),
      } as CSSProperties)
    : undefined;

  useShenuteTextareaAutosize({
    inputValue,
    isMobileViewport,
    maxHeight: MESSAGE_INPUT_MAX_HEIGHT,
    minHeight: MESSAGE_INPUT_MIN_HEIGHT,
    mobileMaxHeight: MESSAGE_INPUT_MOBILE_MAX_HEIGHT,
    textareaRef: messageInputRef,
  });

  function handlePromptKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return;
    }

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <div
      className={floatingContainerClassName}
      data-testid={!isOpen ? "floating-shenute-launcher" : undefined}
      style={floatingContainerStyle}
    >
      {isOpen ? (
        <FloatingShenuteWindow onClose={() => setIsOpen(false)}>
          <FloatingShenuteHeader
            copy={copy}
            onMinimize={() => setIsOpen(false)}
            onOpenWorkspace={persistShenuteHandoff}
            onSaveHistory={handleSaveChatHistory}
            pageContextLabel={pageContextLabel}
            saveStatus={saveStatus}
            typedMessages={typedMessages}
          />
          <FloatingShenuteProviderControls
            copy={copy}
            inferenceProvider={inferenceProvider}
            isAnswerStylePanelOpen={isAnswerStylePanelOpen}
            isDisabled={isLoading || isShenuteAccessBlocked}
            onSelectProvider={(provider) => {
              setInferenceProvider(provider);
              setIsAnswerStylePanelOpen(false);
            }}
            onTogglePanel={() => {
              setIsAnswerStylePanelOpen((current) => !current);
            }}
            providerOptions={providerOptions}
            selectedProviderOption={selectedProviderOption}
          />
          <FloatingShenuteMessages
            adminFeedbackDraftByMessage={adminFeedbackDraftByMessage}
            canSubmitAdminFeedback={canSubmitAdminFeedback}
            copy={copy}
            feedbackStateByMessage={feedbackStateByMessage}
            isAuthenticated={isAuthenticated}
            isLoading={isLoading}
            isReady={isReady}
            isShenuteAccessBlocked={isShenuteAccessBlocked}
            messageActionStateByMessage={messageActionStateByMessage}
            onAdminFeedbackDraftChange={setAdminFeedbackDraft}
            onAdminFeedbackSubmit={(assistantMessage, promptMessage) => {
              void handleAdminFeedbackSubmit(assistantMessage, promptMessage);
            }}
            onCopyMessage={(message) => {
              void handleCopyMessage(message);
            }}
            onOpenWorkspace={persistShenuteHandoff}
            onReaction={(signal, assistantMessage, promptMessage) => {
              void handleReaction(signal, assistantMessage, promptMessage);
            }}
            selectedReactionByMessage={selectedReactionByMessage}
            thinkingElapsedLabel={thinkingElapsedLabel}
            thinkingStatusMessage={thinkingStatusMessage}
            typedMessages={typedMessages}
          />
          <FloatingShenuteComposer
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
            error={error}
            fileInputRef={fileInputRef}
            inputValue={inputValue}
            isAttachmentMenuDisabled={isAttachmentMenuDisabled}
            isComposerDisabled={isComposerDisabled}
            isLoading={isLoading}
            messageInputRef={messageInputRef}
            ocrError={ocrError}
            ocrPending={ocrPending}
            onCaptureFromCamera={() => {
              void captureFromCamera();
            }}
            onClearSelectedImage={clearSelectedImage}
            onCloseAttachmentMenu={closeAttachmentMenu}
            onInputChange={setInputValue}
            onOpenCamera={() => {
              void openCamera();
            }}
            onPromptKeyDown={handlePromptKeyDown}
            onStopCamera={stopCamera}
            onStopResponse={handleStopResponseFromComposer}
            onSubmit={handleSubmit}
            onToggleAttachmentMenu={handleAttachmentMenuToggle}
            selectedImage={selectedImage}
            selectedImagePreviewUrl={selectedImagePreviewUrl}
            selectedImageSource={selectedImageSource}
            setImageAttachment={setImageAttachment}
            videoRef={videoRef}
          />
        </FloatingShenuteWindow>
      ) : null}

      {!isOpen ? (
        <FloatingShenuteTrigger
          label={t("shenute.launcher.open")}
          onClick={() => setIsOpen(true)}
        />
      ) : null}
    </div>
  );
}
