"use client";

/* eslint-disable react-hooks/set-state-in-effect -- Shenute uses imperative chat scroll and restoration state that is not compiler-clean yet. */

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  ArrowDownToLine,
  Camera,
  Clock3,
  Copy,
  CornerDownRight,
  ImagePlus,
  LoaderCircle,
  MessageSquarePlus,
  MoreHorizontal,
  RotateCcw,
  SendHorizontal,
  SlidersHorizontal,
  Square,
  ThumbsDown,
  ThumbsUp,
  UserRound,
  Volume2,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { processOCRImage } from "@/actions/ocrActions";
import {
  AuthGateInlinePrompt,
  AuthGateNotice,
} from "@/components/AuthGateNotice";
import { Badge } from "@/components/Badge";
import { BreadcrumbTrail } from "@/components/BreadcrumbTrail";
import { buttonClassName } from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import { PageShell, pageShellAccents } from "@/components/PageShell";
import { StatusNotice } from "@/components/StatusNotice";
import { SurfacePanel } from "@/components/SurfacePanel";
import { useSpeech } from "@/features/dictionary/hooks/useSpeech";
import type { ShenuteHandoffPageContext } from "@/features/shenute/handoff";
import {
  copyTextToClipboard,
  findPreviousUserMessage,
  formatElapsedTime,
  getMessageText,
  getThinkingStatusMessage,
  type ChatMessageLike,
  type ShenuteFeedbackSignal,
  type ShenuteProvider,
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
  SHENUTE_INLINE_ACTION_BUTTON_CLASS,
  SHENUTE_MENU_ACTION_BUTTON_CLASS,
  SHENUTE_MOBILE_SHEET_CLASS,
  SHENUTE_SHEET_ACTION_BUTTON_CLASS,
  SHENUTE_UTILITY_BADGE_CLASS,
  SHENUTE_UTILITY_BUTTON_CLASS,
  SHENUTE_UTILITY_SUMMARY_CLASS,
  ShenuteActionButton,
  ShenuteActionGroupLabel,
  ShenuteSurfaceHeader,
  ShenuteSurfaceHeading,
} from "./ShenuteClientPrimitives";
import {
  closeContainingDetails,
  closeOpenResponseDetails,
  closeOpenUtilityDetails,
  formatFileSize,
  getChatMessagesSignature,
  getFeedbackErrorMessage,
  getFeedbackStatusClass,
  getMessageAvatarClassName,
  getMessageBubbleClassName,
  getProviderLabel,
  getReactionButtonClassName,
  getShenuteErrorMessage,
  normalizeChatMessages,
  readFeedbackResponsePayload,
  readShenuteHandoffPayload,
  saveChatHistoryOnline,
  type SavedChatSession,
} from "./shenuteClientUtils";
import { ShenuteConversationActionsPanel } from "./ShenuteConversationActionsPanel";
import { SHENUTE_COPY } from "./shenuteCopy";
import { ShenuteCopyFallbackDialog } from "./ShenuteCopyFallbackDialog";
import {
  getShenuteProviderOptions,
  getShenuteStarterPrompts,
} from "./shenuteOptions";
import { ShenuteSavedSessionsPanel } from "./ShenuteSavedSessionsPanel";
import { ShenuteThinkingIndicator } from "./ShenuteThinkingIndicator";
import { ShenuteWelcomePanel } from "./ShenuteWelcomePanel";
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
  const [inferenceProvider, setInferenceProvider] =
    useState<ShenuteProvider>("thoth");
  const [inputValue, setInputValue] = useState("");
  const [ocrPending, setOcrPending] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [shenuteAccessError, setShenuteAccessError] = useState<string | null>(
    null,
  );
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedImagePreviewUrl, setSelectedImagePreviewUrl] = useState<
    string | null
  >(null);
  const [selectedImageSource, setSelectedImageSource] = useState<
    "upload" | "camera" | null
  >(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [handoffPageContext, setHandoffPageContext] =
    useState<ShenuteHandoffPageContext | null>(null);
  const [isAnswerStylePanelOpen, setIsAnswerStylePanelOpen] = useState(false);
  const [mobileUtilitySheet, setMobileUtilitySheet] =
    useState<MobileUtilitySheet>(null);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [copyFallbackText, setCopyFallbackText] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentMenuDetailsRef = useRef<HTMLDetailsElement | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
  const copyFallbackTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const shenuteSessionIdRef = useRef(crypto.randomUUID());

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
  const [thinkingElapsedSeconds, setThinkingElapsedSeconds] = useState(0);
  const isLoading = status !== "ready";
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
  const providerOptions = useMemo(
    () => getShenuteProviderOptions(copy),
    [copy],
  );
  const selectedProviderOption =
    providerOptions.find((option) => option.value === inferenceProvider) ??
    providerOptions[0]!;
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
    if (!isLoading) {
      setThinkingElapsedSeconds(0);
      return;
    }

    const startedAt = Date.now();
    setThinkingElapsedSeconds(0);
    const timer = window.setInterval(() => {
      setThinkingElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - startedAt) / 1000)),
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isLoading]);

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

  useEffect(() => {
    const textarea = messageInputRef.current;
    if (!textarea) {
      return;
    }

    if (inputValue.length === 0) {
      textarea.style.height = `${MESSAGE_INPUT_MIN_HEIGHT}px`;
      return;
    }

    textarea.style.height = "auto";
    const maxInputHeight = isMobileViewport
      ? MESSAGE_INPUT_MOBILE_MAX_HEIGHT
      : MESSAGE_INPUT_MAX_HEIGHT;
    textarea.style.height = `${Math.min(
      Math.max(textarea.scrollHeight, MESSAGE_INPUT_MIN_HEIGHT),
      maxInputHeight,
    )}px`;
  }, [inputValue, isMobileViewport]);

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

  function clearSelectedImage() {
    setSelectedImage(null);
    setSelectedImageSource(null);
    setOcrError(null);
    setCameraError(null);

    setSelectedImagePreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }

      return null;
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
    setCameraError(null);
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

  function setImageAttachment(file: File, source: "upload" | "camera") {
    setSelectedImagePreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }

      return URL.createObjectURL(file);
    });

    setSelectedImage(file);
    setSelectedImageSource(source);
    setOcrError(null);
  }

  function stopCamera() {
    const stream = cameraStreamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
      cameraStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraOpen(false);
  }

  async function openCamera() {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setCameraError(copy.cameraNotSupported);
      return;
    }

    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      cameraStreamRef.current = stream;
      setCameraOpen(true);
    } catch (cameraOpenError) {
      setCameraError(
        cameraOpenError instanceof Error
          ? cameraOpenError.message
          : copy.cameraNotSupported,
      );
    }
  }

  async function captureFromCamera() {
    const videoElement = videoRef.current;
    const canvasElement = captureCanvasRef.current;

    if (!videoElement || !canvasElement) {
      setCameraError(copy.cameraNotReady);
      return;
    }

    const width = videoElement.videoWidth || 1280;
    const height = videoElement.videoHeight || 720;

    if (width <= 0 || height <= 0) {
      setCameraError(copy.cameraStillLoading);
      return;
    }

    canvasElement.width = width;
    canvasElement.height = height;
    const context = canvasElement.getContext("2d");
    if (!context) {
      setCameraError(copy.cameraFrameFailed);
      return;
    }

    context.drawImage(videoElement, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvasElement.toBlob(resolve, "image/jpeg", 0.92);
    });

    if (!blob) {
      setCameraError(copy.cameraImageFailed);
      return;
    }

    const timestamp = new Date().toISOString().replace(/[.:]/g, "-");
    const capturedFile = new File([blob], `camera-${timestamp}.jpg`, {
      type: "image/jpeg",
    });

    setImageAttachment(capturedFile, "camera");
    stopCamera();
  }

  useEffect(() => {
    const stream = cameraStreamRef.current;
    if (!cameraOpen || !stream || !videoRef.current) {
      return;
    }

    videoRef.current.srcObject = stream;
    void videoRef.current.play().catch(() => {
      // Ignore autoplay rejections; user can still capture after manual interaction.
    });
  }, [cameraOpen]);

  useEffect(() => {
    return () => {
      stopCamera();
      setSelectedImagePreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }

        return null;
      });
    };
  }, []);

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

      <SurfacePanel
        rounded="lg"
        shadow="panel"
        className="relative overflow-hidden"
      >
        {isShenuteAccessBlocked ? (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-10 bg-surface/10 backdrop-brightness-95 dark:bg-paper/10"
            />
            <div className="absolute inset-0 z-20 flex items-center justify-center p-6 md:p-10">
              <AuthGateNotice
                actionClassName="px-6"
                align="center"
                className="w-full max-w-lg shadow-panel"
                size="comfortable"
                title={copy.title}
              >
                {copy.accessRequired}
              </AuthGateNotice>
            </div>
          </>
        ) : null}

        <div
          className={cx(
            "flex h-[calc(100dvh-9rem)] min-h-[24rem] flex-col transition-all duration-300 sm:h-[calc(100dvh-10rem)] md:h-[calc(100dvh-20rem)] md:min-h-[26rem] lg:h-[calc(100dvh-21rem)] lg:min-h-[24rem]",
            isShenuteAccessBlocked &&
              "pointer-events-none select-none blur-[6px] opacity-70",
          )}
        >
          <div
            className={cx(
              "transition-all duration-200",
              isUtilityChromeCollapsed && "hidden sm:block",
            )}
          >
            <div className="flex items-center justify-between gap-2 border-b border-line/80 bg-surface/65 px-3 py-1.5 text-xs text-muted backdrop-blur-md sm:px-4 sm:py-2 sm:text-sm md:px-5">
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
                    <details
                      data-shenute-utility-details
                      className="group relative hidden shrink-0 sm:block"
                      onToggle={handleUtilityDetailsToggle}
                    >
                      <summary
                        aria-label={`${copy.conversationHistory}: ${sessionCountLabel}`}
                        title={copy.conversationHistory}
                        className={buttonClassName({
                          size: "sm",
                          variant: "secondary",
                          className: cx(
                            SHENUTE_UTILITY_SUMMARY_CLASS,
                            "relative",
                          ),
                        })}
                      >
                        <Clock3 className={SHENUTE_ICON_CLASS.action} />
                        <span className={SHENUTE_UTILITY_BADGE_CLASS}>
                          {sessions.length}
                        </span>
                      </summary>
                      <div className="absolute right-0 top-full z-50 mt-2 hidden w-[min(28rem,calc(100vw-2rem))] rounded-lg border border-line bg-surface p-3 shadow-panel group-open:block">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <ShenuteSurfaceHeading>
                            {copy.conversationHistory}
                          </ShenuteSurfaceHeading>
                          <span className="shrink-0 rounded-full bg-elevated px-2 py-0.5 text-xs font-semibold text-muted">
                            {sessionCountLabel}
                          </span>
                        </div>
                        {sessionStatus ? (
                          <p className="mb-2 truncate text-xs text-muted">
                            {sessionStatus}
                          </p>
                        ) : null}
                        <div className="max-h-[min(24rem,calc(100dvh-14rem))] overflow-y-auto pr-1">
                          <ShenuteSavedSessionsPanel
                            activeSessionId={activeSessionId}
                            copy={copy}
                            hasUnsavedConversationChanges={
                              hasUnsavedConversationChanges
                            }
                            language={language}
                            onLoadSession={loadShenuteSession}
                            sessionLoadingId={sessionLoadingId}
                            sessions={sessions}
                            showMobileHeader={false}
                          />
                        </div>
                      </div>
                    </details>
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
                <button
                  type="button"
                  aria-controls="shenute-answer-style-panel"
                  aria-expanded={isAnswerStylePanelOpen}
                  aria-haspopup="dialog"
                  aria-label={copy.answerStyleControls}
                  title={copy.answerStyleControls}
                  onClick={() => {
                    closeOpenUtilityDetails();
                    setIsUtilityChromeCollapsed(false);
                    setMobileUtilitySheet(null);
                    setIsAnswerStylePanelOpen((current) => !current);
                  }}
                  className={buttonClassName({
                    size: "sm",
                    variant: "secondary",
                    className: cx(
                      SHENUTE_UTILITY_BUTTON_CLASS,
                      isAnswerStylePanelOpen &&
                        "border-coptic/45 bg-coptic-soft/70 text-coptic",
                    ),
                  })}
                >
                  <SlidersHorizontal className={SHENUTE_ICON_CLASS.action} />
                </button>
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
              "min-h-10 items-center gap-2 border-b border-line bg-surface/80 px-3 py-1.5 text-left text-xs text-muted shadow-sm transition hover:bg-elevated sm:hidden",
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
              className={cx(SHENUTE_ICON_CLASS.panel, "shrink-0")}
            />
          </button>
          {typedMessages.length === 0 ? (
            <ShenuteWelcomePanel
              copy={copy}
              isDisabled={isLoading || isShenuteAccessBlocked}
              onSelectPrompt={handleStarterPrompt}
              starterPrompts={starterPrompts}
            />
          ) : (
            <div
              ref={transcriptScrollRef}
              aria-live="polite"
              onScroll={updateTranscriptScrollState}
              className="min-h-0 flex-1 overscroll-contain scroll-pb-20 space-y-4 overflow-y-auto border-b border-line bg-elevated/55 p-3 sm:space-y-5 sm:p-4 md:p-6"
            >
              {typedMessages.map((m, index) => {
                const assistantMessage = m as ChatMessageLike;
                const promptMessage =
                  m.role === "assistant"
                    ? findPreviousUserMessage(typedMessages, index)
                    : null;
                const feedbackState = feedbackStateByMessage[m.id];
                const messageActionState = messageActionStateByMessage[m.id];
                const selectedReaction = selectedReactionByMessage[m.id];
                const adminDraft = adminFeedbackDraftByMessage[m.id] ?? "";
                const isFeedbackPending = feedbackState?.status === "pending";
                const isLatestAssistantMessage =
                  m.role === "assistant" && index === typedMessages.length - 1;
                const handleResponseCopy = (element?: HTMLElement | null) => {
                  closeContainingDetails(element ?? null);
                  void handleCopyMessage(assistantMessage);
                };
                const handleResponseSpeak = (element?: HTMLElement | null) => {
                  closeContainingDetails(element ?? null);
                  if (isSpeaking) {
                    stopSpeech();
                    return;
                  }

                  const text = getMessageText(m);
                  if (text) {
                    void speakMixed(text);
                  }
                };
                const handleResponseRegenerate = (
                  element?: HTMLElement | null,
                ) => {
                  closeContainingDetails(element ?? null);
                  handleRegenerateMessage(assistantMessage);
                };
                const handleResponseContinue = (
                  element?: HTMLElement | null,
                ) => {
                  closeContainingDetails(element ?? null);
                  handleContinueConversation();
                };
                const handleResponseReaction = (
                  signal: ShenuteReactionSignal,
                  element?: HTMLElement | null,
                ) => {
                  closeContainingDetails(element ?? null);
                  void handleReaction(signal, assistantMessage, promptMessage);
                };
                const renderResponseActionGroups = ({
                  actionClassName,
                  closeOnSelect = false,
                  groupClassName = "space-y-2",
                  layoutClassName = "space-y-3",
                  sectionClassName = "space-y-2",
                }: {
                  actionClassName: string;
                  closeOnSelect?: boolean;
                  groupClassName?: string;
                  layoutClassName?: string;
                  sectionClassName?: string;
                }) => {
                  const maybeClose = (element: HTMLElement) =>
                    closeOnSelect ? element : null;

                  return (
                    <div className={layoutClassName}>
                      <section className={sectionClassName}>
                        <ShenuteActionGroupLabel>
                          {copy.responseUseActions}
                        </ShenuteActionGroupLabel>
                        <div className={groupClassName}>
                          <ShenuteActionButton
                            actionClassName={actionClassName}
                            fullWidth={closeOnSelect}
                            onClick={(event) =>
                              handleResponseCopy(
                                maybeClose(event.currentTarget),
                              )
                            }
                            icon={
                              <Copy className={SHENUTE_ICON_CLASS.action} />
                            }
                          >
                            {copy.copyResponse}
                          </ShenuteActionButton>
                          <ShenuteActionButton
                            actionClassName={actionClassName}
                            fullWidth={closeOnSelect}
                            onClick={(event) =>
                              handleResponseSpeak(
                                maybeClose(event.currentTarget),
                              )
                            }
                            disabled={isPremiumLoading}
                            className={cx(
                              isSpeaking && "border-coptic/55 text-coptic",
                            )}
                            icon={
                              isSpeaking ? (
                                <Square
                                  className={cx(
                                    SHENUTE_ICON_CLASS.action,
                                    "fill-current",
                                  )}
                                />
                              ) : (
                                <Volume2
                                  className={SHENUTE_ICON_CLASS.action}
                                />
                              )
                            }
                          >
                            {isSpeaking ? copy.stop : copy.play}
                          </ShenuteActionButton>
                        </div>
                      </section>
                      {isLatestAssistantMessage ? (
                        <section className={sectionClassName}>
                          <ShenuteActionGroupLabel>
                            {copy.responseReviseActions}
                          </ShenuteActionGroupLabel>
                          <div className={groupClassName}>
                            <ShenuteActionButton
                              actionClassName={actionClassName}
                              fullWidth={closeOnSelect}
                              onClick={(event) =>
                                handleResponseRegenerate(
                                  maybeClose(event.currentTarget),
                                )
                              }
                              disabled={isLoading}
                              icon={
                                <RotateCcw
                                  className={SHENUTE_ICON_CLASS.action}
                                />
                              }
                            >
                              {copy.regenerateResponse}
                            </ShenuteActionButton>
                            <ShenuteActionButton
                              actionClassName={actionClassName}
                              fullWidth={closeOnSelect}
                              onClick={(event) =>
                                handleResponseContinue(
                                  maybeClose(event.currentTarget),
                                )
                              }
                              disabled={isLoading || isShenuteAccessBlocked}
                              icon={
                                <CornerDownRight
                                  className={SHENUTE_ICON_CLASS.action}
                                />
                              }
                            >
                              {copy.continueResponse}
                            </ShenuteActionButton>
                          </div>
                        </section>
                      ) : null}
                      <section className={sectionClassName}>
                        <ShenuteActionGroupLabel>
                          {copy.responseFeedbackActions}
                        </ShenuteActionGroupLabel>
                        <div className={groupClassName}>
                          <ShenuteActionButton
                            actionClassName={actionClassName}
                            fullWidth={closeOnSelect}
                            onClick={(event) =>
                              handleResponseReaction(
                                "like",
                                maybeClose(event.currentTarget),
                              )
                            }
                            disabled={!isAuthenticated || isFeedbackPending}
                            aria-pressed={selectedReaction === "like"}
                            className={getReactionButtonClassName(
                              selectedReaction === "like",
                              "positive",
                            )}
                            icon={
                              <ThumbsUp className={SHENUTE_ICON_CLASS.action} />
                            }
                          >
                            {copy.like}
                          </ShenuteActionButton>
                          <ShenuteActionButton
                            actionClassName={actionClassName}
                            fullWidth={closeOnSelect}
                            onClick={(event) =>
                              handleResponseReaction(
                                "dislike",
                                maybeClose(event.currentTarget),
                              )
                            }
                            disabled={!isAuthenticated || isFeedbackPending}
                            aria-pressed={selectedReaction === "dislike"}
                            className={getReactionButtonClassName(
                              selectedReaction === "dislike",
                              "negative",
                            )}
                            icon={
                              <ThumbsDown
                                className={SHENUTE_ICON_CLASS.action}
                              />
                            }
                          >
                            {copy.dislike}
                          </ShenuteActionButton>
                        </div>
                      </section>
                    </div>
                  );
                };

                return (
                  <div
                    key={m.id}
                    className={cx(
                      "group flex w-full gap-2 sm:gap-3",
                      m.role === "user" ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      className={cx(
                        "mt-6 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm sm:flex",
                        getMessageAvatarClassName(m.role),
                        m.role === "user" && "order-2",
                      )}
                    >
                      {m.role === "user" ? (
                        <UserRound className={SHENUTE_ICON_CLASS.panel} />
                      ) : (
                        <span className="font-coptic text-base leading-none">
                          Ϣ
                        </span>
                      )}
                    </div>
                    <div
                      className={cx(
                        "min-w-0",
                        m.role === "user"
                          ? "flex max-w-[88%] flex-col items-end sm:max-w-[70%]"
                          : "flex max-w-full flex-1 flex-col items-start sm:max-w-[52rem]",
                      )}
                    >
                      <div
                        className={cx(
                          "mb-1 flex flex-wrap items-center gap-2 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted",
                          m.role === "user" && "justify-end text-right",
                        )}
                      >
                        <span>
                          {m.role === "user"
                            ? copy.userLabel
                            : copy.assistantLabel}
                        </span>
                        {isLatestAssistantMessage ? (
                          <span className="rounded-full bg-coptic-soft px-2 py-0.5 text-[0.65rem] tracking-normal text-coptic">
                            {getProviderLabel(inferenceProvider, copy)}
                          </span>
                        ) : null}
                      </div>
                      <div
                        className={cx(
                          "max-w-full rounded-lg px-4 py-3",
                          m.role === "assistant" && "w-full sm:px-5 sm:py-4",
                          getMessageBubbleClassName(m.role),
                        )}
                      >
                        {(() => {
                          const text = getMessageText(m);
                          if (!text) {
                            return null;
                          }

                          return (
                            <div
                              className={cx(
                                "font-coptic text-[1.05rem] leading-7 md:text-lg md:leading-8",
                                m.role === "user"
                                  ? "text-paper dark:text-ink"
                                  : "text-ink",
                              )}
                            >
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  a: ({ ...props }) => (
                                    <a
                                      {...props}
                                      target="_blank"
                                      rel="noreferrer"
                                      className={cx(
                                        "break-words underline underline-offset-4",
                                        m.role === "user"
                                          ? "decoration-paper/60 hover:decoration-paper dark:decoration-ink/60 dark:hover:decoration-ink"
                                          : "decoration-line hover:decoration-coptic",
                                      )}
                                    />
                                  ),
                                  blockquote: ({ ...props }) => (
                                    <blockquote
                                      {...props}
                                      className={cx(
                                        "my-3 border-l-2 pl-3",
                                        m.role === "user"
                                          ? "border-paper/45 text-paper/85 dark:border-ink/45 dark:text-ink/85"
                                          : "border-line text-muted",
                                      )}
                                    />
                                  ),
                                  code: ({ className, children, ...props }) => (
                                    <code
                                      className={cx(
                                        "break-words rounded px-1 py-0.5 text-[0.95em]",
                                        m.role === "user"
                                          ? "bg-paper/15 text-paper dark:bg-ink/10 dark:text-ink"
                                          : "bg-elevated text-ink",
                                        className,
                                      )}
                                      {...props}
                                    >
                                      {children}
                                    </code>
                                  ),
                                  li: ({ ...props }) => (
                                    <li {...props} className="pl-1" />
                                  ),
                                  ol: ({ ...props }) => (
                                    <ol
                                      {...props}
                                      className="my-3 list-decimal space-y-1 pl-6"
                                    />
                                  ),
                                  p: ({ ...props }) => (
                                    <p
                                      {...props}
                                      className="mb-3 break-words last:mb-0"
                                    />
                                  ),
                                  pre: ({ ...props }) => (
                                    <pre
                                      {...props}
                                      className="my-3 max-w-full overflow-x-auto rounded-lg border border-line bg-elevated p-3 text-sm leading-6"
                                    />
                                  ),
                                  table: ({ ...props }) => (
                                    <div className="my-3 max-w-full overflow-x-auto rounded-lg border border-line">
                                      <table
                                        {...props}
                                        className="w-full min-w-max border-collapse text-left text-sm"
                                      />
                                    </div>
                                  ),
                                  td: ({ ...props }) => (
                                    <td
                                      {...props}
                                      className="border-t border-line px-3 py-2 align-top"
                                    />
                                  ),
                                  th: ({ ...props }) => (
                                    <th
                                      {...props}
                                      className="bg-elevated px-3 py-2 align-top font-semibold text-ink"
                                    />
                                  ),
                                  ul: ({ ...props }) => (
                                    <ul
                                      {...props}
                                      className="my-3 list-disc space-y-1 pl-6"
                                    />
                                  ),
                                }}
                              >
                                {text}
                              </ReactMarkdown>
                            </div>
                          );
                        })()}
                        {m.role === "assistant" ? (
                          <div className="mt-3 space-y-2 border-t border-line pt-3 text-xs">
                            <details
                              data-shenute-response-actions
                              className="group relative sm:hidden"
                              onToggle={handleResponseDetailsToggle}
                            >
                              <summary
                                aria-label={copy.responseActions}
                                title={copy.responseActions}
                                className={buttonClassName({
                                  size: "sm",
                                  variant: "secondary",
                                  className: cx(
                                    SHENUTE_MENU_ACTION_BUTTON_CLASS,
                                    "cursor-pointer list-none [&::-webkit-details-marker]:hidden",
                                  ),
                                })}
                              >
                                <MoreHorizontal
                                  className={SHENUTE_ICON_CLASS.action}
                                />
                                {copy.responseActions}
                              </summary>
                              <button
                                type="button"
                                aria-hidden="true"
                                tabIndex={-1}
                                className={cx(
                                  SHENUTE_DIALOG_BACKDROP_CLASS,
                                  "z-[60] hidden group-open:block",
                                )}
                                onClick={(event) =>
                                  closeContainingDetails(event.currentTarget)
                                }
                              />
                              <div className="fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[70] hidden max-h-[min(32rem,calc(100dvh-2rem))] overflow-y-auto rounded-lg border border-line bg-surface p-3 shadow-panel group-open:block">
                                <ShenuteSurfaceHeader
                                  closeLabel={copy.closeMenu}
                                  className="mb-2"
                                  onClose={(event) =>
                                    closeContainingDetails(event.currentTarget)
                                  }
                                >
                                  {copy.responseActions}
                                </ShenuteSurfaceHeader>
                                {renderResponseActionGroups({
                                  actionClassName:
                                    SHENUTE_SHEET_ACTION_BUTTON_CLASS,
                                  closeOnSelect: true,
                                  sectionClassName:
                                    "space-y-2 border-t border-line pt-3 first:border-t-0 first:pt-0",
                                })}
                              </div>
                            </details>
                            {renderResponseActionGroups({
                              actionClassName:
                                SHENUTE_INLINE_ACTION_BUTTON_CLASS,
                              groupClassName: "flex flex-wrap gap-2",
                              layoutClassName:
                                "hidden max-w-full flex-wrap items-start gap-x-5 gap-y-3 sm:flex",
                              sectionClassName:
                                "space-y-1.5 border-l border-line/80 pl-4 first:border-l-0 first:pl-0",
                            })}
                            {messageActionState ? (
                              <p
                                className={getFeedbackStatusClass(
                                  messageActionState.status,
                                )}
                              >
                                {messageActionState.message}
                              </p>
                            ) : null}

                            {canSubmitAdminFeedback ? (
                              <details className="rounded-lg border border-line bg-elevated/70 p-3">
                                <summary className="cursor-pointer font-semibold text-ink">
                                  {copy.adminNoteSummary}
                                </summary>
                                <div className="mt-2 space-y-2">
                                  <textarea
                                    value={adminDraft}
                                    onChange={(event) => {
                                      const value = event.target.value;
                                      setAdminFeedbackDraftByMessage(
                                        (current) => ({
                                          ...current,
                                          [m.id]: value,
                                        }),
                                      );
                                    }}
                                    placeholder={copy.adminNotePlaceholder}
                                    rows={3}
                                    disabled={isFeedbackPending}
                                    className="w-full rounded-lg border border-line bg-surface/85 px-3 py-2 text-xs text-ink shadow-sm focus:border-accent/55 focus:outline-none focus:ring-2 focus:ring-accent/25"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void handleAdminFeedbackSubmit(
                                        assistantMessage,
                                        promptMessage,
                                      );
                                    }}
                                    disabled={isFeedbackPending}
                                    className={buttonClassName({
                                      size: "sm",
                                      variant: "secondary",
                                    })}
                                  >
                                    {copy.submitAdminNote}
                                  </button>
                                </div>
                              </details>
                            ) : null}

                            {feedbackState ? (
                              <p
                                className={getFeedbackStatusClass(
                                  feedbackState.status,
                                )}
                              >
                                {feedbackState.message}
                              </p>
                            ) : null}

                            {!isAuthenticated && isReady ? (
                              <AuthGateInlinePrompt
                                className="text-xs"
                                message={copy.feedbackSignInInline}
                              />
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}

              {isLoading ? (
                <ShenuteThinkingIndicator
                  copy={copy}
                  selectedProviderLabel={selectedProviderOption.label}
                  thinkingElapsedLabel={thinkingElapsedLabel}
                  thinkingElapsedSeconds={thinkingElapsedSeconds}
                  thinkingStatusMessage={thinkingStatusMessage}
                />
              ) : null}
              <div ref={messagesEndRef} aria-hidden="true" />
            </div>
          )}

          <form
            onSubmit={handleFormSubmit}
            aria-busy={isComposerBusy}
            className="sticky bottom-0 z-20 border-t border-line bg-surface/90 p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-18px_30px_rgba(30,29,29,0.08)] backdrop-blur-xl dark:shadow-[0_-18px_30px_rgba(0,0,0,0.35)] sm:p-3 sm:pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:p-4 md:pb-4"
          >
            {shenuteAccessError || error || ocrError || cameraError ? (
              <div className="mb-3 space-y-3">
                {shenuteAccessError ? (
                  <AuthGateNotice align="left" size="compact">
                    {shenuteAccessError}
                  </AuthGateNotice>
                ) : null}
                {error ? (
                  <StatusNotice tone="error" align="left">
                    {getShenuteErrorMessage(error, copy, language)}
                  </StatusNotice>
                ) : null}
                {ocrError ? (
                  <StatusNotice tone="error" align="left">
                    {ocrError}
                  </StatusNotice>
                ) : null}
                {cameraError ? (
                  <StatusNotice tone="info" align="left">
                    {cameraError}
                  </StatusNotice>
                ) : null}
              </div>
            ) : null}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  setImageAttachment(file, "upload");
                }
              }}
            />

            {cameraOpen ? (
              <SurfacePanel
                rounded="lg"
                variant="subtle"
                shadow="soft"
                className="fixed inset-x-3 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-40 max-h-[min(30rem,calc(100dvh-8rem))] overflow-y-auto p-3 sm:static sm:mb-3 sm:max-h-none sm:p-4"
              >
                <ShenuteSurfaceHeader
                  closeLabel={copy.cameraClose}
                  className="mb-2"
                  onClose={stopCamera}
                >
                  {copy.cameraPreview}
                </ShenuteSurfaceHeader>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="mb-3 aspect-[4/3] max-h-[45dvh] w-full rounded-lg border border-line bg-ink object-contain sm:max-h-none"
                />
                <canvas ref={captureCanvasRef} className="hidden" />
                <div className="mt-3 grid gap-2 sm:flex sm:justify-end">
                  <ShenuteActionButton
                    actionClassName="h-10 justify-center gap-2 sm:h-9"
                    buttonVariant="primary"
                    fullWidth={false}
                    onClick={captureFromCamera}
                    icon={<Camera className={SHENUTE_ICON_CLASS.action} />}
                  >
                    {copy.cameraCapture}
                  </ShenuteActionButton>
                  <ShenuteActionButton
                    actionClassName="h-10 justify-center gap-2 sm:h-9"
                    fullWidth={false}
                    onClick={stopCamera}
                    icon={<XCircle className={SHENUTE_ICON_CLASS.action} />}
                  >
                    {copy.cameraClose}
                  </ShenuteActionButton>
                </div>
              </SurfacePanel>
            ) : null}

            <SurfacePanel
              rounded="lg"
              variant="subtle"
              shadow="soft"
              className={cx(
                "p-1.5 transition focus-within:ring-2 focus-within:ring-coptic/25 sm:p-2",
                isLoading && "ring-1 ring-coptic/25",
                ocrPending && "ring-1 ring-accent/30",
                isShenuteAccessBlocked && "opacity-80",
              )}
            >
              {selectedImagePreviewUrl ? (
                <div className="mb-1.5 flex items-center gap-2 rounded-lg border border-line bg-surface/85 p-1.5 shadow-sm sm:mb-2 sm:gap-3 sm:p-2">
                  <Image
                    unoptimized
                    src={selectedImagePreviewUrl}
                    alt={copy.selectedImageAlt}
                    width={72}
                    height={72}
                    className="h-12 w-12 shrink-0 rounded-lg border border-line bg-elevated object-contain sm:h-14 sm:w-14"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-ink">
                        {copy.attachmentReady}
                      </span>
                      <Badge tone="accent" size="xs">
                        {selectedImageSource === "camera"
                          ? copy.cameraSource
                          : copy.uploadSource}
                      </Badge>
                      {ocrPending ? (
                        <Badge tone="neutral" size="xs">
                          {copy.runningOcr}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-muted">
                      {selectedImage?.name ?? copy.imageAttached}
                    </p>
                    {selectedImageSizeLabel ? (
                      <p className="text-xs text-muted">
                        {selectedImageSizeLabel}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    aria-label={copy.remove}
                    title={copy.remove}
                    onClick={clearSelectedImage}
                    className={buttonClassName({
                      size: "sm",
                      variant: "secondary",
                      className:
                        "h-8 w-8 shrink-0 border-danger/25 px-0 text-danger hover:bg-danger/5 dark:hover:bg-danger/10",
                    })}
                  >
                    <XCircle className={SHENUTE_ICON_CLASS.action} />
                  </button>
                </div>
              ) : null}
              <div className="flex items-end gap-2">
                <details
                  ref={attachmentMenuDetailsRef}
                  className="group relative shrink-0"
                  onToggle={handleComposerDetailsToggle}
                >
                  <summary
                    aria-disabled={isAttachmentMenuDisabled}
                    aria-label={`${copy.addImage} / ${copy.useCamera}`}
                    title={`${copy.addImage} / ${copy.useCamera}`}
                    className={cx(
                      buttonClassName({
                        size: "sm",
                        variant: "secondary",
                        className:
                          "h-11 w-11 cursor-pointer list-none rounded-lg px-0 sm:h-12 sm:w-12 [&::-webkit-details-marker]:hidden",
                      }),
                      isAttachmentMenuDisabled &&
                        "pointer-events-none opacity-55",
                    )}
                  >
                    <ImagePlus className={SHENUTE_ICON_CLASS.panel} />
                  </summary>
                  <div className="fixed inset-x-3 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[70] hidden w-auto rounded-lg border border-line bg-surface p-3 shadow-panel group-open:block sm:absolute sm:inset-x-auto sm:bottom-full sm:left-0 sm:mb-2 sm:w-52 sm:p-2">
                    <ShenuteSurfaceHeader
                      closeLabel={copy.closeMenu}
                      className="mb-2 sm:hidden"
                      onClose={(event) =>
                        closeContainingDetails(event.currentTarget)
                      }
                    >
                      {copy.addImage}
                    </ShenuteSurfaceHeader>
                    <ShenuteActionButton
                      onClick={(event) => {
                        closeContainingDetails(event.currentTarget);
                        fileInputRef.current?.click();
                      }}
                      disabled={isAttachmentMenuDisabled}
                      icon={<ImagePlus className={SHENUTE_ICON_CLASS.action} />}
                    >
                      {copy.addImage}
                    </ShenuteActionButton>
                    <ShenuteActionButton
                      onClick={(event) => {
                        closeContainingDetails(event.currentTarget);
                        void openCamera();
                      }}
                      disabled={isAttachmentMenuDisabled || cameraOpen}
                      className="mt-2"
                      icon={<Camera className={SHENUTE_ICON_CLASS.action} />}
                    >
                      {copy.useCamera}
                    </ShenuteActionButton>
                  </div>
                </details>
                <textarea
                  ref={messageInputRef}
                  id="shenute-message-input"
                  name="shenute_message"
                  rows={1}
                  enterKeyHint="send"
                  className="max-h-32 min-h-11 min-w-0 flex-1 resize-none overflow-y-auto rounded-lg border-0 bg-transparent px-2.5 py-2.5 font-coptic text-base leading-6 text-ink outline-none ring-0 placeholder:text-muted/65 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:text-muted/75 sm:max-h-40 sm:min-h-12 sm:px-4 sm:py-3 sm:text-lg md:text-xl"
                  aria-label={copy.placeholder}
                  value={inputValue}
                  onChange={(event) => {
                    setInputValue(event.target.value);
                    if (shenuteAccessError) {
                      setShenuteAccessError(null);
                    }
                  }}
                  onFocus={handleMessageInputFocus}
                  onKeyDown={handlePromptKeyDown}
                  placeholder={composerPlaceholder}
                  disabled={isComposerDisabled}
                />
                {isLoading ? (
                  <button
                    type="button"
                    aria-label={copy.cancelResponse}
                    title={copy.cancelResponse}
                    onClick={handleStopResponseFromComposer}
                    className={buttonClassName({
                      size: "sm",
                      variant: "secondary",
                      className:
                        "h-11 w-11 shrink-0 rounded-lg border-coptic/45 bg-coptic-soft px-0 text-coptic hover:bg-coptic-soft sm:h-12 sm:w-12",
                    })}
                  >
                    <Square
                      className={cx(SHENUTE_ICON_CLASS.primary, "fill-current")}
                    />
                  </button>
                ) : (
                  <button
                    type="submit"
                    aria-label={composerSubmitLabel}
                    title={composerSubmitLabel}
                    disabled={!canSubmitPrompt}
                    className={buttonClassName({
                      size: "sm",
                      variant: "primary",
                      className:
                        "h-11 w-11 shrink-0 rounded-lg px-0 sm:h-12 sm:w-12",
                    })}
                  >
                    {ocrPending ? (
                      <LoaderCircle
                        className={cx(
                          SHENUTE_ICON_CLASS.primary,
                          "animate-spin",
                        )}
                      />
                    ) : (
                      <SendHorizontal className={SHENUTE_ICON_CLASS.primary} />
                    )}
                  </button>
                )}
              </div>
              {composerStateLabel ? (
                <div
                  aria-live="polite"
                  className="mt-1.5 flex min-w-0 items-center gap-2 rounded-lg bg-surface/65 px-2.5 py-1.5 text-xs text-muted sm:mt-2 sm:px-3"
                >
                  <LoaderCircle
                    aria-hidden="true"
                    className={cx(
                      SHENUTE_ICON_CLASS.meta,
                      "shrink-0 animate-spin text-accent-strong dark:text-accent",
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate font-semibold text-ink">
                    {composerStateLabel}
                  </span>
                  {composerStateMeta ? (
                    <span className="min-w-0 shrink truncate text-muted">
                      {composerStateMeta}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </SurfacePanel>
          </form>
        </div>
      </SurfacePanel>

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
