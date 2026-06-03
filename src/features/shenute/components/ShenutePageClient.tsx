"use client";

/* eslint-disable react-hooks/set-state-in-effect -- Shenute uses imperative chat scroll and restoration state that is not compiler-clean yet. */

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  ArrowDownToLine,
  Clock3,
  MessageSquarePlus,
  MoreHorizontal,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { processOCRImage } from "@/actions/ocrActions";
import { BreadcrumbTrail } from "@/components/BreadcrumbTrail";
import { buttonClassName } from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import { PageShell, pageShellAccents } from "@/components/PageShell";
import { useSpeech } from "@/features/dictionary/hooks/useSpeech";
import type { ShenuteHandoffPageContext } from "@/features/shenute/handoff";
import {
  copyTextToClipboard,
  formatElapsedTime,
  getMessageText,
  getThinkingStatusMessage,
  type ChatMessageLike,
  type ShenuteFeedbackSignal,
  type ShenuteReactionSignal,
} from "@/features/shenute/shared";
import { cx } from "@/lib/classes";
import { getLocalizedHomePath } from "@/lib/locale";
import { getPublicOcrErrorMessage } from "@/lib/ocrErrors";
import { createClient } from "@/lib/supabase/client";
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
  formatFileSize,
  getChatMessagesSignature,
  getFeedbackErrorMessage,
  getShenuteErrorMessage,
  normalizeChatMessages,
  readFeedbackResponsePayload,
  readShenuteHandoffPayload,
  saveChatHistoryOnline,
  type SavedChatSession,
} from "./shenuteClientUtils";
import { ShenuteComposer } from "./ShenuteComposer";
import { ShenuteConversationActionsPanel } from "./ShenuteConversationActionsPanel";
import { ShenuteConversationShell } from "./ShenuteConversationShell";
import { SHENUTE_COPY } from "./shenuteCopy";
import { ShenuteCopyFallbackDialog } from "./ShenuteCopyFallbackDialog";
import { ShenuteMessageList } from "./ShenuteMessageList";
import { getShenuteStarterPrompts } from "./shenuteOptions";
import { ShenuteProviderControls } from "./ShenuteProviderControls";
import { ShenuteSavedSessionsPanel } from "./ShenuteSavedSessionsPanel";
import { ShenuteSessionSidebar } from "./ShenuteSessionSidebar";
import { useShenuteImageAttachment } from "./useShenuteImageAttachment";
import { useShenuteProviderSelection } from "./useShenuteProviderSelection";
import { useShenuteTextareaAutosize } from "./useShenuteTextareaAutosize";
import { useShenuteThinkingTimer } from "./useShenuteThinkingTimer";
import { useShenuteTranscriptChrome } from "./useShenuteTranscriptChrome";

type MobileUtilitySheet = "actions" | "history" | null;

type FeedbackStateByMessage = Record<
  string,
  {
    message: string;
    status: "error" | "pending" | "success";
  }
>;

type MessageActionStateByMessage = Record<
  string,
  {
    message: string;
    status: "error" | "pending" | "success";
  }
>;

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
  const [isAnswerStylePanelOpen, setIsAnswerStylePanelOpen] = useState(false);
  const [mobileUtilitySheet, setMobileUtilitySheet] =
    useState<MobileUtilitySheet>(null);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [copyFallbackText, setCopyFallbackText] = useState<string | null>(null);

  const attachmentMenuDetailsRef = useRef<HTMLDetailsElement | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
  const copyFallbackTextareaRef = useRef<HTMLTextAreaElement | null>(null);
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
  const [selectedReactionByMessage, setSelectedReactionByMessage] = useState<
    Record<string, ShenuteReactionSignal>
  >({});
  const [adminFeedbackDraftByMessage, setAdminFeedbackDraftByMessage] =
    useState<Record<string, string>>({});
  const [feedbackStateByMessage, setFeedbackStateByMessage] =
    useState<FeedbackStateByMessage>({});
  const [messageActionStateByMessage, setMessageActionStateByMessage] =
    useState<MessageActionStateByMessage>({});
  const [canSubmitAdminFeedback, setCanSubmitAdminFeedback] = useState(false);
  const isSavingRef = useRef(false);
  const lastSavedMessageSignatureRef = useRef(getChatMessagesSignature([]));

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/shenute",
      }),
    [],
  );

  const {
    messages,
    setMessages,
    sendMessage,
    regenerate,
    stop: stopChatResponse,
    status,
    error,
  } = useChat({
    transport,
  });

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
  const [historyActionStatus, setHistoryActionStatus] = useState<string | null>(
    null,
  );
  const isLoading = status !== "ready";
  const thinkingElapsedSeconds = useShenuteThinkingTimer(isLoading);
  const isShenuteAccessBlocked = isReady && !isAuthenticated;
  const typedMessages = useMemo(
    () => normalizeChatMessages(messages as ChatMessageLike[]),
    [messages],
  );
  const currentMessageSignature = useMemo(
    () => getChatMessagesSignature(typedMessages),
    [typedMessages],
  );
  const hasUnsavedConversationChanges =
    typedMessages.length > 0 &&
    currentMessageSignature !== lastSavedMessageSignatureRef.current;
  const hasConversationDraft =
    inputValue.trim().length > 0 || Boolean(selectedImage);
  const selectedImageSizeLabel = selectedImage
    ? formatFileSize(selectedImage.size, language)
    : null;
  const hasPromptContent =
    inputValue.trim().length > 0 || Boolean(selectedImage);
  const isComposerDisabled = isLoading || ocrPending || isShenuteAccessBlocked;
  const canSubmitPrompt = hasPromptContent && !isComposerDisabled;
  const isAttachmentMenuDisabled = isComposerDisabled;
  const isComposerBusy = isLoading || ocrPending;
  const canStartNewConversation =
    Boolean(activeSessionId) ||
    typedMessages.length > 0 ||
    hasConversationDraft;
  const starterPrompts = useMemo(() => getShenuteStarterPrompts(copy), [copy]);
  const sessionCountLabel = `${sessions.length} ${copy.sessionCount}`;
  const thinkingStatusMessage = getThinkingStatusMessage(
    thinkingElapsedSeconds,
    copy,
  );
  const thinkingElapsedLabel = formatElapsedTime(thinkingElapsedSeconds);
  let composerPlaceholder: string = copy.placeholderShort;
  if (selectedImage) {
    composerPlaceholder = copy.placeholderImage;
  }

  let composerStateLabel: string | null = null;
  if (ocrPending) {
    composerStateLabel = copy.runningOcr;
  }

  let composerStateMeta: string | null = null;
  if (ocrPending && selectedImage) {
    composerStateMeta = selectedImage.name || copy.imageAttached;
  }

  let composerSubmitLabel: string = copy.sendMessage;
  if (isLoading) {
    composerSubmitLabel = copy.cancelResponse;
  } else if (ocrPending) {
    composerSubmitLabel = copy.runningOcr;
  }
  const requestErrorMessage = error
    ? getShenuteErrorMessage(error, copy, language)
    : null;

  let saveButtonLabel: string = copy.saveHistorySaved;
  if (isHistorySaving) {
    saveButtonLabel = copy.savingHistory;
  } else if (hasUnsavedConversationChanges || typedMessages.length === 0) {
    saveButtonLabel = copy.saveHistory;
  }

  let historyStatusMessage: string = autosaveStatus ?? copy.autosaveStatus;
  if (historyActionStatus) {
    historyStatusMessage = historyActionStatus;
  } else if (typedMessages.length === 0) {
    historyStatusMessage = copy.autosaveHint;
  } else if (isHistorySaving) {
    historyStatusMessage = copy.savingHistory;
  } else if (hasUnsavedConversationChanges) {
    historyStatusMessage = copy.unsavedChanges;
  }
  const handoffContextLabel = handoffPageContext
    ? handoffPageContext.title.replace(/\s+\|\s+Coptic Compass$/, "").trim() ||
      handoffPageContext.path
    : null;
  let historyStatusDotClassName = "bg-muted/40";
  if (isLoading) {
    historyStatusDotClassName = "bg-coptic animate-pulse";
  } else if (isHistorySaving || hasUnsavedConversationChanges) {
    historyStatusDotClassName = "bg-warning";
  } else if (typedMessages.length > 0) {
    historyStatusDotClassName = "bg-coptic";
  }
  const forceUtilityChromeExpanded =
    isAnswerStylePanelOpen ||
    isHistorySaving ||
    Boolean(sessionStatus) ||
    Boolean(historyActionStatus) ||
    isShenuteAccessBlocked ||
    Boolean(shenuteAccessError) ||
    Boolean(error) ||
    Boolean(ocrError) ||
    Boolean(cameraError) ||
    cameraOpen ||
    ocrPending;

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

  useEffect(() => {
    if (typedMessages.length === messages.length) {
      return;
    }

    setMessages(typedMessages as UIMessage[]);
  }, [messages.length, setMessages, typedMessages]);

  useEffect(() => {
    if (!isAnswerStylePanelOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAnswerStylePanelOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAnswerStylePanelOpen]);

  useEffect(() => {
    if (!mobileUtilitySheet) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileUtilitySheet(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileUtilitySheet]);

  useEffect(() => {
    if (!copyFallbackText) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      copyFallbackTextareaRef.current?.focus();
      copyFallbackTextareaRef.current?.select();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [copyFallbackText]);

  useEffect(() => {
    if (!copyFallbackText) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCopyFallbackText(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [copyFallbackText]);

  useEffect(() => {
    if (isShenuteAccessBlocked) {
      setIsAnswerStylePanelOpen(false);
    }
  }, [isShenuteAccessBlocked]);

  useEffect(() => {
    if (!isMobileViewport) {
      setMobileUtilitySheet(null);
    }
  }, [isMobileViewport]);

  useEffect(() => {
    if (!isAttachmentMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const details = attachmentMenuDetailsRef.current;
      if (!details || details.contains(event.target as Node)) {
        return;
      }

      details.open = false;
      setIsAttachmentMenuOpen(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [isAttachmentMenuOpen]);

  useShenuteTextareaAutosize({
    inputValue,
    isMobileViewport,
    maxHeight: MESSAGE_INPUT_MAX_HEIGHT,
    minHeight: MESSAGE_INPUT_MIN_HEIGHT,
    mobileMaxHeight: MESSAGE_INPUT_MOBILE_MAX_HEIGHT,
    textareaRef: messageInputRef,
  });

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setCanSubmitAdminFeedback(false);
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setCanSubmitAdminFeedback(false);
      return;
    }

    let isMounted = true;
    const loadAdminFeedbackAccess = async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (!isMounted) {
          return;
        }

        setCanSubmitAdminFeedback(data?.role === "admin");
      } catch {
        if (isMounted) {
          setCanSubmitAdminFeedback(false);
        }
      }
    };

    void loadAdminFeedbackAccess();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (hasRestoredHistory || !isReady || !isAuthenticated) {
      return;
    }

    const handoffPayload = readShenuteHandoffPayload();
    if (handoffPayload) {
      const handoffMessages = normalizeChatMessages(handoffPayload.messages);
      setInferenceProvider(handoffPayload.inferenceProvider);
      setHandoffPageContext(handoffPayload.pageContext);
      setMessages(handoffMessages as UIMessage[]);
      lastSavedMessageSignatureRef.current = getChatMessagesSignature([]);
      setActiveSessionId(null);
      shenuteSessionIdRef.current = crypto.randomUUID();
      setIsTranscriptAtBottom(true);
      setHasRestoredHistory(true);
      window.requestAnimationFrame(() => {
        scrollTranscriptToBottom("auto");
      });
      return;
    }

    const restoreHistory = async () => {
      try {
        const response = await fetch("/api/shenute/history");
        if (!response.ok) {
          setTemporaryHistoryActionStatus(copy.historyUnavailable);
          setHasRestoredHistory(true);
          return;
        }

        const payload = (await response.json()) as {
          success: boolean;
          sessionId?: string;
          sessions?: Array<SavedChatSession>;
          messages?: Array<ChatMessageLike>;
        };

        if (payload.success) {
          if (Array.isArray(payload.sessions)) {
            setSessions(payload.sessions);
          }

          if (payload.sessionId) {
            shenuteSessionIdRef.current = payload.sessionId;
            setActiveSessionId(payload.sessionId);
          }

          if (Array.isArray(payload.messages)) {
            const restoredMessages = normalizeChatMessages(payload.messages);
            setHandoffPageContext(null);
            lastSavedMessageSignatureRef.current =
              getChatMessagesSignature(restoredMessages);
            setMessages(restoredMessages as UIMessage[]);
            setIsTranscriptAtBottom(true);
            window.requestAnimationFrame(() => {
              scrollTranscriptToBottom("auto");
            });
          } else {
            lastSavedMessageSignatureRef.current = getChatMessagesSignature([]);
          }
        }
      } catch {
        setTemporaryHistoryActionStatus(copy.historyUnavailable);
      } finally {
        setHasRestoredHistory(true);
      }
    };

    void restoreHistory();
  }, [
    hasRestoredHistory,
    isAuthenticated,
    isReady,
    copy.historyUnavailable,
    scrollTranscriptToBottom,
    setMessages,
    setIsTranscriptAtBottom,
    setInferenceProvider,
  ]);

  useEffect(() => {
    if (
      typedMessages.length === 0 ||
      !isReady ||
      !isAuthenticated ||
      !hasRestoredHistory ||
      isLoading ||
      !hasUnsavedConversationChanges
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (isSavingRef.current) {
        return;
      }

      const messagesToSave = typedMessages;
      const savedSignature = currentMessageSignature;
      isSavingRef.current = true;
      setIsHistorySaving(true);
      void saveChatHistoryOnline(
        messagesToSave,
        shenuteSessionIdRef.current,
      ).then((result) => {
        isSavingRef.current = false;
        setIsHistorySaving(false);
        if (result.success) {
          if (result.sessionId) {
            shenuteSessionIdRef.current = result.sessionId;
            setActiveSessionId(result.sessionId);
          }
          if (Array.isArray(result.sessions)) {
            setSessions(result.sessions);
          }
          lastSavedMessageSignatureRef.current = savedSignature;
          setAutosaveStatus(copy.autosaveStatus);
        } else {
          setTemporaryHistoryActionStatus(copy.saveHistoryFailed);
        }
      });
    }, 1000);

    const clearTimer = () => window.clearTimeout(timer);
    return clearTimer;
  }, [
    typedMessages,
    currentMessageSignature,
    copy.autosaveStatus,
    copy.saveHistoryFailed,
    hasUnsavedConversationChanges,
    hasRestoredHistory,
    isLoading,
    isReady,
    isAuthenticated,
  ]);

  function handleSaveHistory() {
    if (isHistorySaving || !hasUnsavedConversationChanges) {
      return;
    }

    const messagesToSave = typedMessages;
    const savedSignature = currentMessageSignature;
    setIsHistorySaving(true);
    isSavingRef.current = true;

    void saveChatHistoryOnline(
      messagesToSave,
      shenuteSessionIdRef.current,
    ).then((result) => {
      isSavingRef.current = false;
      setIsHistorySaving(false);
      if (!result.success) {
        setTemporaryHistoryActionStatus(copy.saveHistoryFailed);
        return;
      }

      if (result.sessionId) {
        shenuteSessionIdRef.current = result.sessionId;
        setActiveSessionId(result.sessionId);
      }
      if (Array.isArray(result.sessions)) {
        setSessions(result.sessions);
      }
      lastSavedMessageSignatureRef.current = savedSignature;
      setAutosaveStatus(copy.autosaveStatus);
      setTemporaryHistoryActionStatus(copy.savedHistory);
    });
  }

  async function loadShenuteSession(sessionId: string) {
    if (!sessionId || sessionId === activeSessionId) {
      return { success: false };
    }

    setIsUtilityChromeCollapsed(false);
    setSessionLoadingId(sessionId);
    setSessionStatus(copy.loadingSession);

    try {
      const response = await fetch(
        `/api/shenute/history?sessionId=${encodeURIComponent(sessionId)}`,
      );

      if (!response.ok) {
        setTemporaryHistoryActionStatus(copy.historyUnavailable);
        return { success: false };
      }

      const payload = (await response.json()) as {
        success: boolean;
        sessionId?: string;
        sessions?: Array<SavedChatSession>;
        messages?: Array<ChatMessageLike>;
      };

      if (!payload.success || !payload.sessionId) {
        setTemporaryHistoryActionStatus(copy.historyUnavailable);
        return { success: false };
      }

      setSessions(
        Array.isArray(payload.sessions) ? payload.sessions : sessions,
      );
      const loadedMessages = Array.isArray(payload.messages)
        ? normalizeChatMessages(payload.messages)
        : [];
      lastSavedMessageSignatureRef.current =
        getChatMessagesSignature(loadedMessages);
      setMessages(loadedMessages as UIMessage[]);
      setHandoffPageContext(null);
      setActiveSessionId(payload.sessionId);
      shenuteSessionIdRef.current = payload.sessionId;
      setIsTranscriptAtBottom(true);
      window.requestAnimationFrame(() => {
        scrollTranscriptToBottom("auto");
      });

      return { success: true, sessionId: payload.sessionId };
    } catch {
      setTemporaryHistoryActionStatus(copy.historyUnavailable);
      return { success: false };
    } finally {
      setSessionLoadingId(null);
      setSessionStatus(null);
    }
  }

  function setTemporaryHistoryActionStatus(message: string) {
    setHistoryActionStatus(message);
    window.setTimeout(() => {
      setHistoryActionStatus((current) =>
        current === message ? null : current,
      );
    }, 3000);
  }

  function resetConversationWorkspace() {
    stopSpeech();
    stopCamera();
    clearSelectedImage();
    setInputValue("");
    setOcrError(null);
    setShenuteAccessError(null);
    setSelectedReactionByMessage({});
    setAdminFeedbackDraftByMessage({});
    setFeedbackStateByMessage({});
    setMessageActionStateByMessage({});
    setAutosaveStatus(null);
    setSessionStatus(null);
    setSessionLoadingId(null);
    setHandoffPageContext(null);
    setIsTranscriptAtBottom(true);
  }

  async function startNewConversation() {
    if (isLoading || isHistorySaving || !canStartNewConversation) {
      return;
    }

    setIsUtilityChromeCollapsed(false);
    if (
      typedMessages.length > 0 &&
      isAuthenticated &&
      hasUnsavedConversationChanges
    ) {
      setIsHistorySaving(true);
      isSavingRef.current = true;
      const result = await saveChatHistoryOnline(
        typedMessages,
        shenuteSessionIdRef.current,
      );
      isSavingRef.current = false;
      setIsHistorySaving(false);

      if (!result.success) {
        setTemporaryHistoryActionStatus(copy.saveHistoryFailed);
        return;
      }

      if (Array.isArray(result.sessions)) {
        setSessions(result.sessions);
      }
    }

    resetConversationWorkspace();
    setMessages([]);
    lastSavedMessageSignatureRef.current = getChatMessagesSignature([]);
    setActiveSessionId(null);
    shenuteSessionIdRef.current = crypto.randomUUID();
    setTemporaryHistoryActionStatus(copy.newConversationStarted);
  }

  async function clearCurrentConversation() {
    if (isLoading) {
      return;
    }

    if (!activeSessionId && typedMessages.length === 0) {
      await startNewConversation();
      return;
    }

    if (!window.confirm(copy.clearConversationConfirm)) {
      return;
    }

    const sessionIdToClear = activeSessionId;
    setSessionStatus(copy.clearingConversation);

    try {
      if (sessionIdToClear && isAuthenticated) {
        const response = await fetch(
          `/api/shenute/history?sessionId=${encodeURIComponent(
            sessionIdToClear,
          )}`,
          { method: "DELETE" },
        );

        if (!response.ok) {
          throw new Error(copy.clearConversationFailed);
        }
      }

      resetConversationWorkspace();
      setMessages([]);
      lastSavedMessageSignatureRef.current = getChatMessagesSignature([]);
      setActiveSessionId(null);
      if (sessionIdToClear) {
        setSessions((current) =>
          current.filter((session) => session.id !== sessionIdToClear),
        );
      }
      shenuteSessionIdRef.current = crypto.randomUUID();
      setTemporaryHistoryActionStatus(copy.conversationCleared);
    } catch {
      setSessionStatus(null);
      setTemporaryHistoryActionStatus(copy.clearConversationFailed);
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isShenuteAccessBlocked) {
      setShenuteAccessError(copy.accessRequired);
      return;
    }

    setShenuteAccessError(null);

    if (!hasPromptContent || isComposerDisabled) {
      return;
    }

    let composedPrompt = inputValue.trim();

    if (selectedImage) {
      setOcrPending(true);
      setOcrError(null);

      try {
        const ocrFormData = new FormData();
        ocrFormData.append("file", selectedImage);
        const ocrText = await processOCRImage(ocrFormData);
        const trimmedOcrText = ocrText
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 8000);

        composedPrompt = [
          composedPrompt,
          copy.imageOcrContext,
          `Image: ${selectedImage.name}`,
          trimmedOcrText,
        ]
          .filter((part) => part.length > 0)
          .join("\n\n");
      } catch (ocrProcessingError) {
        setOcrError(getPublicOcrErrorMessage(ocrProcessingError, language));
        setOcrPending(false);
        return;
      } finally {
        setOcrPending(false);
      }
    }

    if (!composedPrompt.trim()) {
      setOcrError(copy.noTextExtracted);
      return;
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
    window.requestAnimationFrame(() => {
      scrollTranscriptToBottom("smooth");
    });
  };

  function handlePromptKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) {
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

  function setTemporaryMessageActionState(
    messageId: string,
    message: string,
    status: "error" | "pending" | "success",
  ) {
    setMessageActionStateByMessage((current) => ({
      ...current,
      [messageId]: { message, status },
    }));
    window.setTimeout(() => {
      setMessageActionStateByMessage((current) => {
        if (current[messageId]?.message !== message) {
          return current;
        }

        const next = { ...current };
        delete next[messageId];
        return next;
      });
    }, 2500);
  }

  async function handleCopyMessage(message: ChatMessageLike) {
    const text = getMessageText(message);
    if (!text) {
      return;
    }

    try {
      const didCopy = await copyTextToClipboard(text);
      if (!didCopy) {
        throw new Error("Clipboard write failed.");
      }

      setCopyFallbackText(null);
      setTemporaryMessageActionState(
        message.id,
        copy.copiedResponse,
        "success",
      );
    } catch {
      setCopyFallbackText(text);
      setTemporaryMessageActionState(
        message.id,
        copy.copyResponseManual,
        "pending",
      );
    }
  }

  function handleRegenerateMessage(message: ChatMessageLike) {
    if (isLoading || message.role !== "assistant") {
      return;
    }

    setIsTranscriptAtBottom(true);
    setIsUtilityChromeCollapsed(false);
    void regenerate({
      messageId: message.id,
      body: {
        inferenceProvider,
        pageContext: handoffPageContext ?? undefined,
      },
    });
    window.requestAnimationFrame(() => {
      scrollTranscriptToBottom("smooth");
    });
  }

  function handleContinueConversation() {
    if (isLoading || isShenuteAccessBlocked) {
      return;
    }

    setIsTranscriptAtBottom(true);
    setIsUtilityChromeCollapsed(false);
    sendMessage(
      { text: copy.continuePrompt },
      {
        body: {
          inferenceProvider,
          pageContext: handoffPageContext ?? undefined,
        },
      },
    );
    window.requestAnimationFrame(() => {
      scrollTranscriptToBottom("smooth");
    });
  }

  function handleStopResponseFromComposer() {
    stopChatResponse();
    setIsUtilityChromeCollapsed(false);
    setMobileUtilitySheet(null);
    setIsAnswerStylePanelOpen(false);
    closeOpenUtilityDetails();
    closeOpenResponseDetails();
    window.requestAnimationFrame(() => {
      messageInputRef.current?.focus({ preventScroll: true });
    });
  }

  function handleStarterPrompt(prompt: string) {
    setIsUtilityChromeCollapsed(false);
    setInputValue(prompt);
    if (shenuteAccessError) {
      setShenuteAccessError(null);
    }
    window.requestAnimationFrame(() => {
      messageInputRef.current?.focus();
    });
  }

  function scrollToLatestMessage() {
    setIsUtilityChromeCollapsed(false);
    scrollTranscriptToBottom("smooth");
    messageInputRef.current?.focus({ preventScroll: true });
  }

  function handleMessageInputFocus() {
    setIsUtilityChromeCollapsed(false);
    if (typedMessages.length === 0) {
      return;
    }

    window.setTimeout(() => {
      scrollTranscriptToBottom("smooth");
    }, 160);
  }

  function handleUtilityDetailsToggle(
    event: React.SyntheticEvent<HTMLDetailsElement>,
  ) {
    if (event.currentTarget.open) {
      setIsUtilityChromeCollapsed(false);
      setMobileUtilitySheet(null);
      setIsAnswerStylePanelOpen(false);
      closeOpenUtilityDetails(event.currentTarget);
    }
  }

  function handleResponseDetailsToggle(
    event: React.SyntheticEvent<HTMLDetailsElement>,
  ) {
    if (event.currentTarget.open) {
      setIsUtilityChromeCollapsed(false);
      setMobileUtilitySheet(null);
      setIsAnswerStylePanelOpen(false);
      closeOpenUtilityDetails();
      closeOpenResponseDetails(event.currentTarget);
    }
  }

  function handleComposerDetailsToggle(
    event: React.SyntheticEvent<HTMLDetailsElement>,
  ) {
    setIsAttachmentMenuOpen(event.currentTarget.open);

    if (event.currentTarget.open) {
      setIsUtilityChromeCollapsed(false);
      setMobileUtilitySheet(null);
      setIsAnswerStylePanelOpen(false);
      closeOpenUtilityDetails();
      closeOpenResponseDetails();
    }
  }

  async function submitFeedbackSignal(options: {
    assistantMessage: ChatMessageLike;
    feedbackText?: string;
    promptMessage: ChatMessageLike | null;
    signal: ShenuteFeedbackSignal;
  }) {
    if (!isAuthenticated) {
      setFeedbackStateByMessage((current) => ({
        ...current,
        [options.assistantMessage.id]: {
          message: copy.feedbackSignIn,
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
          message: copy.feedbackPromptMissing,
          status: "error",
        },
      }));
      return false;
    }

    setFeedbackStateByMessage((current) => ({
      ...current,
      [options.assistantMessage.id]: {
        message: copy.feedbackSaving,
        status: "pending",
      },
    }));

    try {
      const response = await fetch("/api/shenute/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assistantMessageId: options.assistantMessage.id,
          assistantResponse,
          shenuteSessionId: shenuteSessionIdRef.current,
          feedbackText: options.feedbackText,
          inferenceProvider,
          pageContext: handoffPageContext ?? undefined,
          prompt,
          signal: options.signal,
          userMessageId: options.promptMessage?.id,
        }),
      });

      const payload = await readFeedbackResponsePayload(response);

      if (!response.ok || !payload.success) {
        setFeedbackStateByMessage((current) => ({
          ...current,
          [options.assistantMessage.id]: {
            message: getFeedbackErrorMessage(payload, copy, language),
            status: "error",
          },
        }));
        return false;
      }

      let successMessage: string = copy.feedbackSaved;
      if (payload.ragIngested) {
        successMessage = copy.feedbackSavedWithRag;
      } else if (payload.ragWarning) {
        successMessage = copy.feedbackSavedLearningDelayed;
      }

      setFeedbackStateByMessage((current) => ({
        ...current,
        [options.assistantMessage.id]: {
          message: successMessage,
          status: "success",
        },
      }));

      return true;
    } catch {
      setFeedbackStateByMessage((current) => ({
        ...current,
        [options.assistantMessage.id]: {
          message: copy.feedbackSaveFailed,
          status: "error",
        },
      }));
      return false;
    }
  }

  async function handleReaction(
    signal: ShenuteReactionSignal,
    assistantMessage: ChatMessageLike,
    promptMessage: ChatMessageLike | null,
  ) {
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
  }

  async function handleAdminFeedbackSubmit(
    assistantMessage: ChatMessageLike,
    promptMessage: ChatMessageLike | null,
  ) {
    const draft =
      adminFeedbackDraftByMessage[assistantMessage.id]?.trim() ?? "";
    if (!draft) {
      setFeedbackStateByMessage((current) => ({
        ...current,
        [assistantMessage.id]: {
          message: copy.writeAdminFeedback,
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
  }

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
          <div className="flex min-h-14 items-center justify-between gap-2 border-b border-line/80 bg-surface/65 px-3 py-1.5 text-xs text-muted backdrop-blur-md sm:px-4 sm:py-2 sm:text-sm md:px-5">
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
              <span className="hidden max-w-full items-center rounded-full bg-elevated px-2 py-0.5 text-xs font-semibold text-muted sm:inline-flex">
                <span className="truncate">
                  {copy.aiMode}: {selectedProviderOption.label}
                </span>
              </span>
              {handoffContextLabel ? (
                <span
                  className="hidden max-w-[14rem] items-center rounded-full bg-coptic-soft px-2 py-0.5 text-xs font-semibold text-coptic sm:inline-flex"
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
                    onClick={() => {
                      closeOpenUtilityDetails();
                      setIsUtilityChromeCollapsed(false);
                      setIsAnswerStylePanelOpen(false);
                      setMobileUtilitySheet((current) =>
                        current === "history" ? null : "history",
                      );
                    }}
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
                onToggle={() => {
                  closeOpenUtilityDetails();
                  setIsUtilityChromeCollapsed(false);
                  setMobileUtilitySheet(null);
                  setIsAnswerStylePanelOpen((current) => !current);
                }}
              />
              <button
                type="button"
                aria-label={copy.newConversation}
                title={copy.newConversation}
                onClick={() => {
                  closeOpenUtilityDetails();
                  setMobileUtilitySheet(null);
                  setIsAnswerStylePanelOpen(false);
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
                onClick={() => {
                  closeOpenUtilityDetails();
                  setIsUtilityChromeCollapsed(false);
                  setIsAnswerStylePanelOpen(false);
                  setMobileUtilitySheet((current) =>
                    current === "actions" ? null : "actions",
                  );
                }}
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
                <div className="absolute right-0 top-full z-50 mt-2 hidden w-64 rounded-lg border border-line bg-surface p-2 shadow-panel group-open:block">
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
          onClick={() => setIsUtilityChromeCollapsed(false)}
          className={cx(
            "relative z-30 h-10 items-center gap-2 border-b border-line bg-surface/80 px-3 py-1 text-left text-xs text-muted shadow-sm transition hover:bg-elevated sm:hidden",
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
          onAdminDraftChange={(messageId, value) => {
            setAdminFeedbackDraftByMessage((current) => ({
              ...current,
              [messageId]: value,
            }));
          }}
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
          onPromptKeyDown={handlePromptKeyDown}
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
            onClick={() => setMobileUtilitySheet(null)}
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
              onClose={() => setMobileUtilitySheet(null)}
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
                onClose={() => setMobileUtilitySheet(null)}
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
                onClose={() => setMobileUtilitySheet(null)}
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
          onClose={() => setIsAnswerStylePanelOpen(false)}
          onSelectProvider={(provider) => {
            setIsUtilityChromeCollapsed(false);
            setInferenceProvider(provider);
            setIsAnswerStylePanelOpen(false);
          }}
          providerOptions={providerOptions}
          selectedProviderOption={selectedProviderOption}
        />
      ) : null}
    </PageShell>
  );
}
