import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import type { ShenuteHandoffPageContext } from "@/features/shenute/handoff";
import {
  deleteShenuteSessionOnline,
  loadShenuteHistoryOnline,
  loadShenuteSessionOnline,
  saveChatHistoryOnline,
  type SavedChatSession,
  type ShenuteHistoryResponsePayload,
} from "@/features/shenute/lib/client/shenuteClientApi";
import type {
  ChatMessageLike,
  ShenuteProvider,
} from "@/features/shenute/shared";

import {
  getChatMessagesSignature,
  normalizeChatMessages,
  readShenuteHandoffPayload,
} from "./shenuteClientUtils";

type MutableValueRef<T> = {
  current: T;
};

type ShenutePageHistorySave = (
  messages: ChatMessageLike[],
  sessionId: string,
) => Promise<ShenuteHistoryResponsePayload>;

type ShenutePageHistoryLoad = () => Promise<{
  ok: boolean;
  payload: ShenuteHistoryResponsePayload | null;
}>;

type ShenutePageHistorySessionLoad = (sessionId: string) => Promise<{
  ok: boolean;
  payload: ShenuteHistoryResponsePayload | null;
}>;

type ShenutePageHistorySessionDelete = (sessionId: string) => Promise<boolean>;

type ShenutePageSetTimeout = (callback: () => void, delay: number) => number;
type ShenutePageClearTimeout = (timeoutId: number) => void;
type ShenutePageRequestAnimationFrame = (
  callback: FrameRequestCallback,
) => number;

type ShenuteHistoryStatusSetter = Dispatch<SetStateAction<string | null>>;
type ShenutePageSetMessages = (messages: ChatMessageLike[]) => void;
type ShenutePageHandoffPayload = ReturnType<typeof readShenuteHandoffPayload>;
type ShenutePageReadHandoffPayload = () => ShenutePageHandoffPayload;

function scheduleShenutePageTimeout(callback: () => void, delay: number) {
  return window.setTimeout(callback, delay);
}

function clearShenutePageTimeout(timeoutId: number) {
  window.clearTimeout(timeoutId);
}

function requestShenutePageAnimationFrame(callback: FrameRequestCallback) {
  return window.requestAnimationFrame(callback);
}

function confirmShenutePageConversationClear(message: string) {
  return window.confirm(message);
}

type ShenutePageHistorySaveState = {
  setActiveSessionId: Dispatch<SetStateAction<string | null>>;
  setAutosaveStatus: Dispatch<SetStateAction<string | null>>;
  setSessions: Dispatch<SetStateAction<SavedChatSession[]>>;
  setLastSavedMessageSignature: Dispatch<SetStateAction<string>>;
  setTemporaryHistoryActionStatus: (message: string) => void;
  shenuteSessionIdRef: MutableValueRef<string>;
};

type ShenutePageHistoryRestoreState = {
  scrollTranscriptToBottom: (behavior: ScrollBehavior) => void;
  setActiveSessionId: Dispatch<SetStateAction<string | null>>;
  setHandoffPageContext: Dispatch<
    SetStateAction<ShenuteHandoffPageContext | null>
  >;
  setIsTranscriptAtBottom: Dispatch<SetStateAction<boolean>>;
  setLastSavedMessageSignature: Dispatch<SetStateAction<string>>;
  setMessages: ShenutePageSetMessages;
  setSessions: Dispatch<SetStateAction<SavedChatSession[]>>;
  shenuteSessionIdRef: MutableValueRef<string>;
};

type ShenutePageHistoryWorkflowCopy = {
  clearConversationConfirm: string;
  clearConversationFailed: string;
  clearingConversation: string;
  conversationCleared: string;
  historyUnavailable: string;
  loadingSession: string;
  newConversationStarted: string;
  saveHistoryFailed: string;
};

export function shouldSaveShenutePageHistory({
  hasRestoredHistory,
  hasUnsavedConversationChanges,
  isAuthenticated,
  isLoading,
  isReady,
  isSaving,
  typedMessagesLength,
}: {
  hasRestoredHistory: boolean;
  hasUnsavedConversationChanges: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  isReady: boolean;
  isSaving: boolean;
  typedMessagesLength: number;
}) {
  return (
    typedMessagesLength > 0 &&
    isReady &&
    isAuthenticated &&
    hasRestoredHistory &&
    !isLoading &&
    hasUnsavedConversationChanges &&
    !isSaving
  );
}

export function scheduleShenuteHistoryActionStatus({
  clearDelayMs = 3000,
  message,
  setHistoryActionStatus,
  setTimeout = scheduleShenutePageTimeout,
}: {
  clearDelayMs?: number;
  message: string;
  setHistoryActionStatus: ShenuteHistoryStatusSetter;
  setTimeout?: ShenutePageSetTimeout;
}) {
  setHistoryActionStatus(message);
  return setTimeout(() => {
    setHistoryActionStatus((current) => (current === message ? null : current));
  }, clearDelayMs);
}

export function applyShenutePageHistorySaveResult({
  autosaveStatusMessage,
  failureMessage,
  result,
  savedSignature,
  setActiveSessionId,
  setAutosaveStatus,
  setLastSavedMessageSignature,
  setSessions,
  setTemporaryHistoryActionStatus,
  shenuteSessionIdRef,
  successStatusMessage,
}: {
  autosaveStatusMessage: string;
  failureMessage: string;
  result: ShenuteHistoryResponsePayload;
  savedSignature: string;
  successStatusMessage?: string;
} & ShenutePageHistorySaveState) {
  if (!result.success) {
    setTemporaryHistoryActionStatus(failureMessage);
    return false;
  }

  if (result.sessionId) {
    shenuteSessionIdRef.current = result.sessionId;
    setActiveSessionId(result.sessionId);
  }
  if (Array.isArray(result.sessions)) {
    setSessions(result.sessions);
  }
  setLastSavedMessageSignature(savedSignature);
  setAutosaveStatus(autosaveStatusMessage);
  if (successStatusMessage) {
    setTemporaryHistoryActionStatus(successStatusMessage);
  }

  return true;
}

function getEmptyShenutePageHistorySignature() {
  return getChatMessagesSignature([]);
}

function scheduleShenutePageHistoryTranscriptScroll({
  requestAnimationFrame = requestShenutePageAnimationFrame,
  scrollTranscriptToBottom,
}: {
  requestAnimationFrame?: ShenutePageRequestAnimationFrame;
  scrollTranscriptToBottom: (behavior: ScrollBehavior) => void;
}) {
  requestAnimationFrame(() => {
    scrollTranscriptToBottom("auto");
  });
}

export function restoreShenutePageHandoffPayload({
  createSessionId,
  handoffPayload,
  requestAnimationFrame,
  scrollTranscriptToBottom,
  setActiveSessionId,
  setHandoffPageContext,
  setInferenceProvider,
  setIsTranscriptAtBottom,
  setLastSavedMessageSignature,
  setMessages,
  setHasRestoredHistory,
  shenuteSessionIdRef,
}: {
  createSessionId: () => string;
  handoffPayload: ShenutePageHandoffPayload;
  requestAnimationFrame?: ShenutePageRequestAnimationFrame;
  setHasRestoredHistory: Dispatch<SetStateAction<boolean>>;
  setInferenceProvider: Dispatch<SetStateAction<ShenuteProvider>>;
} & Omit<ShenutePageHistoryRestoreState, "setSessions">) {
  if (!handoffPayload) {
    return false;
  }

  const handoffMessages = normalizeChatMessages(handoffPayload.messages);
  setInferenceProvider(handoffPayload.inferenceProvider);
  setHandoffPageContext(handoffPayload.pageContext);
  setMessages(handoffMessages);
  setLastSavedMessageSignature(getEmptyShenutePageHistorySignature());
  setActiveSessionId(null);
  shenuteSessionIdRef.current = createSessionId();
  setIsTranscriptAtBottom(true);
  setHasRestoredHistory(true);
  scheduleShenutePageHistoryTranscriptScroll({
    requestAnimationFrame,
    scrollTranscriptToBottom,
  });

  return true;
}

export function applyShenutePageRestoredHistoryPayload({
  payload,
  requestAnimationFrame,
  scrollTranscriptToBottom,
  setActiveSessionId,
  setHandoffPageContext,
  setIsTranscriptAtBottom,
  setLastSavedMessageSignature,
  setMessages,
  setSessions,
  shenuteSessionIdRef,
}: {
  payload: ShenuteHistoryResponsePayload;
  requestAnimationFrame?: ShenutePageRequestAnimationFrame;
} & ShenutePageHistoryRestoreState) {
  if (!payload.success) {
    return false;
  }

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
    setLastSavedMessageSignature(getChatMessagesSignature(restoredMessages));
    setMessages(restoredMessages);
    setIsTranscriptAtBottom(true);
    scheduleShenutePageHistoryTranscriptScroll({
      requestAnimationFrame,
      scrollTranscriptToBottom,
    });
  } else {
    setLastSavedMessageSignature(getEmptyShenutePageHistorySignature());
  }

  return true;
}

export function applyShenutePageLoadedSessionPayload({
  fallbackSessions,
  payload,
  requestAnimationFrame,
  scrollTranscriptToBottom,
  setActiveSessionId,
  setHandoffPageContext,
  setIsTranscriptAtBottom,
  setLastSavedMessageSignature,
  setMessages,
  setSessions,
  shenuteSessionIdRef,
}: {
  fallbackSessions: SavedChatSession[];
  payload: ShenuteHistoryResponsePayload;
  requestAnimationFrame?: ShenutePageRequestAnimationFrame;
} & ShenutePageHistoryRestoreState) {
  if (!payload.success || !payload.sessionId) {
    return { success: false };
  }

  const loadedMessages = Array.isArray(payload.messages)
    ? normalizeChatMessages(payload.messages)
    : [];

  setSessions(
    Array.isArray(payload.sessions) ? payload.sessions : fallbackSessions,
  );
  setLastSavedMessageSignature(getChatMessagesSignature(loadedMessages));
  setMessages(loadedMessages);
  setHandoffPageContext(null);
  setActiveSessionId(payload.sessionId);
  shenuteSessionIdRef.current = payload.sessionId;
  setIsTranscriptAtBottom(true);
  scheduleShenutePageHistoryTranscriptScroll({
    requestAnimationFrame,
    scrollTranscriptToBottom,
  });

  return { success: true, sessionId: payload.sessionId };
}

export function resetShenutePageConversationWorkspace({
  clearSelectedImage,
  resetFeedbackSubmissionState,
  resetMessageActionStates,
  setAutosaveStatus,
  setHandoffPageContext,
  setInputValue,
  setIsTranscriptAtBottom,
  setOcrError,
  setSessionLoadingId,
  setSessionStatus,
  setShenuteAccessError,
  stopCamera,
  stopSpeech,
}: {
  clearSelectedImage: () => void;
  resetFeedbackSubmissionState: () => void;
  resetMessageActionStates: () => void;
  setAutosaveStatus: Dispatch<SetStateAction<string | null>>;
  setHandoffPageContext: Dispatch<
    SetStateAction<ShenuteHandoffPageContext | null>
  >;
  setInputValue: Dispatch<SetStateAction<string>>;
  setIsTranscriptAtBottom: Dispatch<SetStateAction<boolean>>;
  setOcrError: Dispatch<SetStateAction<string | null>>;
  setSessionLoadingId: Dispatch<SetStateAction<string | null>>;
  setSessionStatus: Dispatch<SetStateAction<string | null>>;
  setShenuteAccessError: Dispatch<SetStateAction<string | null>>;
  stopCamera: () => void;
  stopSpeech: () => void;
}) {
  stopSpeech();
  stopCamera();
  clearSelectedImage();
  setInputValue("");
  setOcrError(null);
  setShenuteAccessError(null);
  resetFeedbackSubmissionState();
  resetMessageActionStates();
  setAutosaveStatus(null);
  setSessionStatus(null);
  setSessionLoadingId(null);
  setHandoffPageContext(null);
  setIsTranscriptAtBottom(true);
}

export function useShenuteHistoryActionStatus({
  clearDelayMs = 3000,
  setTimeout = scheduleShenutePageTimeout,
}: {
  clearDelayMs?: number;
  setTimeout?: ShenutePageSetTimeout;
} = {}) {
  const [historyActionStatus, setHistoryActionStatus] = useState<string | null>(
    null,
  );
  const setTemporaryHistoryActionStatus = useCallback(
    (message: string) => {
      scheduleShenuteHistoryActionStatus({
        clearDelayMs,
        message,
        setHistoryActionStatus,
        setTimeout,
      });
    },
    [clearDelayMs, setTimeout],
  );

  return {
    historyActionStatus,
    setTemporaryHistoryActionStatus,
  };
}

export function useShenutePageHistoryPersistence({
  autosaveDelayMs = 1000,
  autosaveStatusMessage,
  clearTimeout = clearShenutePageTimeout,
  currentMessageSignature,
  failureMessage,
  hasRestoredHistory,
  hasUnsavedConversationChanges,
  isAuthenticated,
  isHistorySaving,
  isLoading,
  isReady,
  isSavingRef,
  manualSaveSuccessMessage,
  saveChatHistory = saveChatHistoryOnline,
  setActiveSessionId,
  setAutosaveStatus,
  setIsHistorySaving,
  setLastSavedMessageSignature,
  setSessions,
  setTemporaryHistoryActionStatus,
  setTimeout = scheduleShenutePageTimeout,
  shenuteSessionIdRef,
  typedMessages,
}: {
  autosaveDelayMs?: number;
  autosaveStatusMessage: string;
  clearTimeout?: ShenutePageClearTimeout;
  currentMessageSignature: string;
  failureMessage: string;
  hasRestoredHistory: boolean;
  hasUnsavedConversationChanges: boolean;
  isAuthenticated: boolean;
  isHistorySaving: boolean;
  isLoading: boolean;
  isReady: boolean;
  isSavingRef: MutableValueRef<boolean>;
  manualSaveSuccessMessage: string;
  saveChatHistory?: ShenutePageHistorySave;
  setIsHistorySaving: Dispatch<SetStateAction<boolean>>;
  setTimeout?: ShenutePageSetTimeout;
  typedMessages: ChatMessageLike[];
} & ShenutePageHistorySaveState) {
  const applySaveResult = useCallback(
    (
      result: ShenuteHistoryResponsePayload,
      savedSignature: string,
      successStatusMessage?: string,
    ) =>
      applyShenutePageHistorySaveResult({
        autosaveStatusMessage,
        failureMessage,
        result,
        savedSignature,
        setActiveSessionId,
        setAutosaveStatus,
        setLastSavedMessageSignature,
        setSessions,
        setTemporaryHistoryActionStatus,
        shenuteSessionIdRef,
        successStatusMessage,
      }),
    [
      autosaveStatusMessage,
      failureMessage,
      setActiveSessionId,
      setAutosaveStatus,
      setLastSavedMessageSignature,
      setSessions,
      setTemporaryHistoryActionStatus,
      shenuteSessionIdRef,
    ],
  );

  useEffect(() => {
    if (
      !shouldSaveShenutePageHistory({
        hasRestoredHistory,
        hasUnsavedConversationChanges,
        isAuthenticated,
        isLoading,
        isReady,
        isSaving: isSavingRef.current,
        typedMessagesLength: typedMessages.length,
      })
    ) {
      return;
    }

    const timer = setTimeout(() => {
      if (isSavingRef.current) {
        return;
      }

      const messagesToSave = typedMessages;
      const savedSignature = currentMessageSignature;
      isSavingRef.current = true;
      setIsHistorySaving(true);
      void saveChatHistory(messagesToSave, shenuteSessionIdRef.current).then(
        (result) => {
          isSavingRef.current = false;
          setIsHistorySaving(false);
          applySaveResult(result, savedSignature);
        },
      );
    }, autosaveDelayMs);

    return () => clearTimeout(timer);
  }, [
    applySaveResult,
    autosaveDelayMs,
    clearTimeout,
    currentMessageSignature,
    hasRestoredHistory,
    hasUnsavedConversationChanges,
    isAuthenticated,
    isLoading,
    isReady,
    isSavingRef,
    saveChatHistory,
    setIsHistorySaving,
    setTimeout,
    shenuteSessionIdRef,
    typedMessages,
  ]);

  const handleSaveHistory = useCallback(() => {
    if (isHistorySaving || !hasUnsavedConversationChanges) {
      return false;
    }

    const messagesToSave = typedMessages;
    const savedSignature = currentMessageSignature;
    setIsHistorySaving(true);
    isSavingRef.current = true;

    void saveChatHistory(messagesToSave, shenuteSessionIdRef.current).then(
      (result) => {
        isSavingRef.current = false;
        setIsHistorySaving(false);
        applySaveResult(result, savedSignature, manualSaveSuccessMessage);
      },
    );

    return true;
  }, [
    applySaveResult,
    currentMessageSignature,
    hasUnsavedConversationChanges,
    isHistorySaving,
    isSavingRef,
    manualSaveSuccessMessage,
    saveChatHistory,
    setIsHistorySaving,
    shenuteSessionIdRef,
    typedMessages,
  ]);

  return {
    handleSaveHistory,
  };
}

export function useShenutePageHistoryWorkflow({
  activeSessionId,
  canStartNewConversation,
  clearSelectedImage,
  confirmClearConversation = confirmShenutePageConversationClear,
  copy,
  createSessionId = () => crypto.randomUUID(),
  deleteSession = deleteShenuteSessionOnline,
  hasRestoredHistory,
  hasUnsavedConversationChanges,
  isAuthenticated,
  isHistorySaving,
  isLoading,
  isReady,
  isSavingRef,
  loadHistory = loadShenuteHistoryOnline,
  loadSession = loadShenuteSessionOnline,
  readHandoffPayload = readShenuteHandoffPayload,
  requestAnimationFrame = requestShenutePageAnimationFrame,
  resetFeedbackSubmissionState,
  resetMessageActionStates,
  saveChatHistory = saveChatHistoryOnline,
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
  setMessages,
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
}: {
  activeSessionId: string | null;
  canStartNewConversation: boolean;
  clearSelectedImage: () => void;
  confirmClearConversation?: (message: string) => boolean;
  copy: ShenutePageHistoryWorkflowCopy;
  createSessionId?: () => string;
  deleteSession?: ShenutePageHistorySessionDelete;
  hasRestoredHistory: boolean;
  hasUnsavedConversationChanges: boolean;
  isAuthenticated: boolean;
  isHistorySaving: boolean;
  isLoading: boolean;
  isReady: boolean;
  isSavingRef: MutableValueRef<boolean>;
  loadHistory?: ShenutePageHistoryLoad;
  loadSession?: ShenutePageHistorySessionLoad;
  readHandoffPayload?: ShenutePageReadHandoffPayload;
  requestAnimationFrame?: ShenutePageRequestAnimationFrame;
  resetFeedbackSubmissionState: () => void;
  resetMessageActionStates: () => void;
  saveChatHistory?: ShenutePageHistorySave;
  scrollTranscriptToBottom: (behavior: ScrollBehavior) => void;
  sessions: SavedChatSession[];
  setAutosaveStatus: Dispatch<SetStateAction<string | null>>;
  setHasRestoredHistory: Dispatch<SetStateAction<boolean>>;
  setInferenceProvider: Dispatch<SetStateAction<ShenuteProvider>>;
  setInputValue: Dispatch<SetStateAction<string>>;
  setIsHistorySaving: Dispatch<SetStateAction<boolean>>;
  setIsUtilityChromeCollapsed: Dispatch<SetStateAction<boolean>>;
  setOcrError: Dispatch<SetStateAction<string | null>>;
  setSessionLoadingId: Dispatch<SetStateAction<string | null>>;
  setSessionStatus: Dispatch<SetStateAction<string | null>>;
  setShenuteAccessError: Dispatch<SetStateAction<string | null>>;
  setTemporaryHistoryActionStatus: (message: string) => void;
  stopCamera: () => void;
  stopSpeech: () => void;
  typedMessages: ChatMessageLike[];
} & ShenutePageHistoryRestoreState) {
  const resetConversationWorkspace = useCallback(() => {
    resetShenutePageConversationWorkspace({
      clearSelectedImage,
      resetFeedbackSubmissionState,
      resetMessageActionStates,
      setAutosaveStatus,
      setHandoffPageContext,
      setInputValue,
      setIsTranscriptAtBottom,
      setOcrError,
      setSessionLoadingId,
      setSessionStatus,
      setShenuteAccessError,
      stopCamera,
      stopSpeech,
    });
  }, [
    clearSelectedImage,
    resetFeedbackSubmissionState,
    resetMessageActionStates,
    setAutosaveStatus,
    setHandoffPageContext,
    setInputValue,
    setIsTranscriptAtBottom,
    setOcrError,
    setSessionLoadingId,
    setSessionStatus,
    setShenuteAccessError,
    stopCamera,
    stopSpeech,
  ]);

  useEffect(() => {
    if (hasRestoredHistory || !isReady || !isAuthenticated) {
      return;
    }

    if (
      restoreShenutePageHandoffPayload({
        createSessionId,
        handoffPayload: readHandoffPayload(),
        requestAnimationFrame,
        scrollTranscriptToBottom,
        setActiveSessionId,
        setHandoffPageContext,
        setHasRestoredHistory,
        setInferenceProvider,
        setIsTranscriptAtBottom,
        setLastSavedMessageSignature,
        setMessages,
        shenuteSessionIdRef,
      })
    ) {
      return;
    }

    const restoreHistory = async () => {
      try {
        const { ok, payload } = await loadHistory();
        if (!ok || !payload) {
          setTemporaryHistoryActionStatus(copy.historyUnavailable);
          setHasRestoredHistory(true);
          return;
        }

        applyShenutePageRestoredHistoryPayload({
          payload,
          requestAnimationFrame,
          scrollTranscriptToBottom,
          setActiveSessionId,
          setHandoffPageContext,
          setIsTranscriptAtBottom,
          setLastSavedMessageSignature,
          setMessages,
          setSessions,
          shenuteSessionIdRef,
        });
      } catch {
        setTemporaryHistoryActionStatus(copy.historyUnavailable);
      } finally {
        setHasRestoredHistory(true);
      }
    };

    void restoreHistory();
  }, [
    copy.historyUnavailable,
    createSessionId,
    hasRestoredHistory,
    isAuthenticated,
    isReady,
    loadHistory,
    readHandoffPayload,
    requestAnimationFrame,
    scrollTranscriptToBottom,
    setActiveSessionId,
    setHandoffPageContext,
    setHasRestoredHistory,
    setInferenceProvider,
    setIsTranscriptAtBottom,
    setLastSavedMessageSignature,
    setMessages,
    setSessions,
    setTemporaryHistoryActionStatus,
    shenuteSessionIdRef,
  ]);

  const loadShenuteSession = useCallback(
    async (sessionId: string) => {
      if (!sessionId || sessionId === activeSessionId) {
        return { success: false };
      }

      setIsUtilityChromeCollapsed(false);
      setSessionLoadingId(sessionId);
      setSessionStatus(copy.loadingSession);

      try {
        const { ok, payload } = await loadSession(sessionId);
        if (!ok || !payload) {
          setTemporaryHistoryActionStatus(copy.historyUnavailable);
          return { success: false };
        }

        const result = applyShenutePageLoadedSessionPayload({
          fallbackSessions: sessions,
          payload,
          requestAnimationFrame,
          scrollTranscriptToBottom,
          setActiveSessionId,
          setHandoffPageContext,
          setIsTranscriptAtBottom,
          setLastSavedMessageSignature,
          setMessages,
          setSessions,
          shenuteSessionIdRef,
        });

        if (!result.success) {
          setTemporaryHistoryActionStatus(copy.historyUnavailable);
        }

        return result;
      } catch {
        setTemporaryHistoryActionStatus(copy.historyUnavailable);
        return { success: false };
      } finally {
        setSessionLoadingId(null);
        setSessionStatus(null);
      }
    },
    [
      activeSessionId,
      copy.historyUnavailable,
      copy.loadingSession,
      loadSession,
      requestAnimationFrame,
      scrollTranscriptToBottom,
      sessions,
      setActiveSessionId,
      setHandoffPageContext,
      setIsTranscriptAtBottom,
      setIsUtilityChromeCollapsed,
      setLastSavedMessageSignature,
      setMessages,
      setSessionLoadingId,
      setSessionStatus,
      setSessions,
      setTemporaryHistoryActionStatus,
      shenuteSessionIdRef,
    ],
  );

  const startNewConversation = useCallback(async () => {
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
      const result = await saveChatHistory(
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
    setLastSavedMessageSignature(getEmptyShenutePageHistorySignature());
    setActiveSessionId(null);
    shenuteSessionIdRef.current = createSessionId();
    setTemporaryHistoryActionStatus(copy.newConversationStarted);
  }, [
    canStartNewConversation,
    copy.newConversationStarted,
    copy.saveHistoryFailed,
    createSessionId,
    hasUnsavedConversationChanges,
    isAuthenticated,
    isHistorySaving,
    isLoading,
    isSavingRef,
    resetConversationWorkspace,
    saveChatHistory,
    setActiveSessionId,
    setIsHistorySaving,
    setIsUtilityChromeCollapsed,
    setLastSavedMessageSignature,
    setMessages,
    setSessions,
    setTemporaryHistoryActionStatus,
    shenuteSessionIdRef,
    typedMessages,
  ]);

  const clearCurrentConversation = useCallback(async () => {
    if (isLoading) {
      return;
    }

    if (!activeSessionId && typedMessages.length === 0) {
      await startNewConversation();
      return;
    }

    if (!confirmClearConversation(copy.clearConversationConfirm)) {
      return;
    }

    const sessionIdToClear = activeSessionId;
    setSessionStatus(copy.clearingConversation);

    try {
      if (sessionIdToClear && isAuthenticated) {
        const didDeleteSession = await deleteSession(sessionIdToClear);
        if (!didDeleteSession) {
          throw new Error(copy.clearConversationFailed);
        }
      }

      resetConversationWorkspace();
      setMessages([]);
      setLastSavedMessageSignature(getEmptyShenutePageHistorySignature());
      setActiveSessionId(null);
      if (sessionIdToClear) {
        setSessions((current) =>
          current.filter((session) => session.id !== sessionIdToClear),
        );
      }
      shenuteSessionIdRef.current = createSessionId();
      setTemporaryHistoryActionStatus(copy.conversationCleared);
    } catch {
      setSessionStatus(null);
      setTemporaryHistoryActionStatus(copy.clearConversationFailed);
    }
  }, [
    activeSessionId,
    confirmClearConversation,
    copy.clearConversationConfirm,
    copy.clearConversationFailed,
    copy.clearingConversation,
    copy.conversationCleared,
    createSessionId,
    deleteSession,
    isAuthenticated,
    isLoading,
    resetConversationWorkspace,
    setActiveSessionId,
    setLastSavedMessageSignature,
    setMessages,
    setSessionStatus,
    setSessions,
    setTemporaryHistoryActionStatus,
    shenuteSessionIdRef,
    startNewConversation,
    typedMessages.length,
  ]);

  return {
    clearCurrentConversation,
    loadShenuteSession,
    startNewConversation,
  };
}
