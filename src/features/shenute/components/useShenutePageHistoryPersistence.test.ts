import { describe, expect, it, vi } from "vitest";

import type { SavedChatSession } from "@/features/shenute/lib/client/shenuteClientApi";

import {
  applyShenutePageHistorySaveResult,
  applyShenutePageLoadedSessionPayload,
  applyShenutePageRestoredHistoryPayload,
  resetShenutePageConversationWorkspace,
  restoreShenutePageHandoffPayload,
  scheduleShenuteHistoryActionStatus,
  shouldSaveShenutePageHistory,
} from "./useShenutePageHistoryPersistence";

type StateUpdate<T> = T | ((current: T) => T);

function buildSaveResultState() {
  return {
    setActiveSessionId: vi.fn(),
    setAutosaveStatus: vi.fn(),
    setLastSavedMessageSignature: vi.fn(),
    setSessions: vi.fn(),
    setTemporaryHistoryActionStatus: vi.fn(),
    shenuteSessionIdRef: { current: "old-session" },
  };
}

function buildRestoreState() {
  return {
    scrollTranscriptToBottom: vi.fn(),
    setActiveSessionId: vi.fn(),
    setHandoffPageContext: vi.fn(),
    setIsTranscriptAtBottom: vi.fn(),
    setLastSavedMessageSignature: vi.fn(),
    setMessages: vi.fn(),
    setSessions: vi.fn(),
    shenuteSessionIdRef: { current: "old-session" },
  };
}

describe("Shenute page history persistence helpers", () => {
  it("detects when a conversation should be autosaved", () => {
    const baseOptions = {
      hasRestoredHistory: true,
      hasUnsavedConversationChanges: true,
      isAuthenticated: true,
      isLoading: false,
      isReady: true,
      isSaving: false,
      typedMessagesLength: 2,
    };

    expect(shouldSaveShenutePageHistory(baseOptions)).toBe(true);
    expect(
      shouldSaveShenutePageHistory({
        ...baseOptions,
        typedMessagesLength: 0,
      }),
    ).toBe(false);
    expect(
      shouldSaveShenutePageHistory({
        ...baseOptions,
        isSaving: true,
      }),
    ).toBe(false);
    expect(
      shouldSaveShenutePageHistory({
        ...baseOptions,
        hasUnsavedConversationChanges: false,
      }),
    ).toBe(false);
  });

  it("sets temporary history action status and clears only the matching message", () => {
    const timeoutCallbacks: Array<() => void> = [];
    const setHistoryActionStatus = vi.fn(
      (_value: StateUpdate<string | null>) => undefined,
    );
    const setTimeout = vi.fn((callback: () => void, delay: number) => {
      timeoutCallbacks.push(callback);
      expect(delay).toBe(25);
      return 1;
    });

    expect(
      scheduleShenuteHistoryActionStatus({
        clearDelayMs: 25,
        message: "Saved.",
        setHistoryActionStatus,
        setTimeout,
      }),
    ).toBe(1);

    expect(setHistoryActionStatus).toHaveBeenCalledWith("Saved.");
    expect(setHistoryActionStatus).toHaveBeenCalledTimes(1);

    timeoutCallbacks[0]?.();
    expect(setHistoryActionStatus).toHaveBeenCalledTimes(2);
    const clearUpdater = setHistoryActionStatus.mock.calls[1]?.[0];
    expect(clearUpdater).toEqual(expect.any(Function));
    if (typeof clearUpdater !== "function") {
      throw new Error("Expected a temporary status updater.");
    }
    expect(clearUpdater("Saved.")).toBeNull();
    expect(clearUpdater("Different status.")).toBe("Different status.");
  });

  it("applies successful history saves to session state and signatures", () => {
    const sessions: SavedChatSession[] = [
      {
        id: "session-2",
        title: "Latest question",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ];
    const state = buildSaveResultState();

    expect(
      applyShenutePageHistorySaveResult({
        autosaveStatusMessage: "Saved automatically.",
        failureMessage: "Save failed.",
        result: {
          sessionId: "session-2",
          sessions,
          success: true,
        },
        savedSignature: "new-signature",
        successStatusMessage: "Saved.",
        ...state,
      }),
    ).toBe(true);

    expect(state.shenuteSessionIdRef.current).toBe("session-2");
    expect(state.setLastSavedMessageSignature).toHaveBeenCalledWith(
      "new-signature",
    );
    expect(state.setActiveSessionId).toHaveBeenCalledWith("session-2");
    expect(state.setSessions).toHaveBeenCalledWith(sessions);
    expect(state.setAutosaveStatus).toHaveBeenCalledWith(
      "Saved automatically.",
    );
    expect(state.setTemporaryHistoryActionStatus).toHaveBeenCalledWith(
      "Saved.",
    );
  });

  it("reports failed history saves without mutating saved refs", () => {
    const state = buildSaveResultState();

    expect(
      applyShenutePageHistorySaveResult({
        autosaveStatusMessage: "Saved automatically.",
        failureMessage: "Save failed.",
        result: {
          success: false,
        },
        savedSignature: "new-signature",
        ...state,
      }),
    ).toBe(false);

    expect(state.shenuteSessionIdRef.current).toBe("old-session");
    expect(state.setLastSavedMessageSignature).not.toHaveBeenCalled();
    expect(state.setActiveSessionId).not.toHaveBeenCalled();
    expect(state.setSessions).not.toHaveBeenCalled();
    expect(state.setAutosaveStatus).not.toHaveBeenCalled();
    expect(state.setTemporaryHistoryActionStatus).toHaveBeenCalledWith(
      "Save failed.",
    );
  });

  it("restores a handoff payload into the full-page chat workspace", () => {
    const frameCallbacks: FrameRequestCallback[] = [];
    const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      frameCallbacks.push(callback);
      return 1;
    });
    const setHasRestoredHistory = vi.fn();
    const setInferenceProvider = vi.fn();
    const state = buildRestoreState();
    const pageContext = {
      excerpt: "Current page excerpt",
      path: "/en/grammar",
      title: "Grammar | Coptic Compass",
      url: "https://www.copticcompass.com/en/grammar",
    };

    expect(
      restoreShenutePageHandoffPayload({
        createSessionId: () => "new-session",
        handoffPayload: {
          createdAt: "2026-01-01T00:00:00.000Z",
          inferenceProvider: "gemini_nmt",
          messages: [{ content: "Explain this", id: "user-1", role: "user" }],
          pageContext,
          source: "floating",
        },
        requestAnimationFrame,
        setHasRestoredHistory,
        setInferenceProvider,
        ...state,
      }),
    ).toBe(true);

    expect(setInferenceProvider).toHaveBeenCalledWith("gemini_nmt");
    expect(state.setHandoffPageContext).toHaveBeenCalledWith(pageContext);
    expect(state.setMessages).toHaveBeenCalledWith([
      expect.objectContaining({ id: "user-1", role: "user" }),
    ]);
    expect(state.setLastSavedMessageSignature).toHaveBeenCalledWith("[]");
    expect(state.setActiveSessionId).toHaveBeenCalledWith(null);
    expect(state.shenuteSessionIdRef.current).toBe("new-session");
    expect(state.setIsTranscriptAtBottom).toHaveBeenCalledWith(true);
    expect(setHasRestoredHistory).toHaveBeenCalledWith(true);

    frameCallbacks[0]?.(0);
    expect(state.scrollTranscriptToBottom).toHaveBeenCalledWith("auto");
  });

  it("ignores missing handoff payloads", () => {
    const state = buildRestoreState();

    expect(
      restoreShenutePageHandoffPayload({
        createSessionId: () => "new-session",
        handoffPayload: null,
        setHasRestoredHistory: vi.fn(),
        setInferenceProvider: vi.fn(),
        ...state,
      }),
    ).toBe(false);

    expect(state.setMessages).not.toHaveBeenCalled();
    expect(state.shenuteSessionIdRef.current).toBe("old-session");
  });

  it("applies restored history payloads and scrolls to restored messages", () => {
    const frameCallbacks: FrameRequestCallback[] = [];
    const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      frameCallbacks.push(callback);
      return 1;
    });
    const state = buildRestoreState();
    const sessions: SavedChatSession[] = [
      {
        id: "session-1",
        title: "A saved session",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ];

    expect(
      applyShenutePageRestoredHistoryPayload({
        payload: {
          messages: [{ content: "Saved question", id: "user-1", role: "user" }],
          sessionId: "session-1",
          sessions,
          success: true,
        },
        requestAnimationFrame,
        ...state,
      }),
    ).toBe(true);

    expect(state.setSessions).toHaveBeenCalledWith(sessions);
    expect(state.setActiveSessionId).toHaveBeenCalledWith("session-1");
    expect(state.shenuteSessionIdRef.current).toBe("session-1");
    expect(state.setHandoffPageContext).toHaveBeenCalledWith(null);
    expect(state.setLastSavedMessageSignature).toHaveBeenCalledWith(
      expect.stringContaining("Saved question"),
    );
    expect(state.setMessages).toHaveBeenCalledWith([
      expect.objectContaining({ id: "user-1", role: "user" }),
    ]);
    expect(state.setIsTranscriptAtBottom).toHaveBeenCalledWith(true);

    frameCallbacks[0]?.(0);
    expect(state.scrollTranscriptToBottom).toHaveBeenCalledWith("auto");
  });

  it("applies loaded session payloads with fallback session lists", () => {
    const state = buildRestoreState();
    const fallbackSessions: SavedChatSession[] = [
      {
        id: "session-fallback",
        title: "Fallback session",
        updated_at: null,
      },
    ];

    expect(
      applyShenutePageLoadedSessionPayload({
        fallbackSessions,
        payload: {
          messages: [
            { content: "Loaded question", id: "user-2", role: "user" },
          ],
          sessionId: "session-2",
          success: true,
        },
        requestAnimationFrame: vi.fn((callback: FrameRequestCallback) => {
          callback(0);
          return 1;
        }),
        ...state,
      }),
    ).toEqual({ success: true, sessionId: "session-2" });

    expect(state.setSessions).toHaveBeenCalledWith(fallbackSessions);
    expect(state.setActiveSessionId).toHaveBeenCalledWith("session-2");
    expect(state.shenuteSessionIdRef.current).toBe("session-2");
    expect(state.setMessages).toHaveBeenCalledWith([
      expect.objectContaining({ id: "user-2", role: "user" }),
    ]);
    expect(state.scrollTranscriptToBottom).toHaveBeenCalledWith("auto");
  });

  it("resets the conversation workspace chrome and transient state", () => {
    const resetOptions = {
      clearSelectedImage: vi.fn(),
      resetFeedbackSubmissionState: vi.fn(),
      resetMessageActionStates: vi.fn(),
      setAutosaveStatus: vi.fn(),
      setHandoffPageContext: vi.fn(),
      setInputValue: vi.fn(),
      setIsTranscriptAtBottom: vi.fn(),
      setOcrError: vi.fn(),
      setSessionLoadingId: vi.fn(),
      setSessionStatus: vi.fn(),
      setShenuteAccessError: vi.fn(),
      stopCamera: vi.fn(),
      stopSpeech: vi.fn(),
    };

    resetShenutePageConversationWorkspace(resetOptions);

    expect(resetOptions.stopSpeech).toHaveBeenCalledTimes(1);
    expect(resetOptions.stopCamera).toHaveBeenCalledTimes(1);
    expect(resetOptions.clearSelectedImage).toHaveBeenCalledTimes(1);
    expect(resetOptions.setInputValue).toHaveBeenCalledWith("");
    expect(resetOptions.setOcrError).toHaveBeenCalledWith(null);
    expect(resetOptions.setShenuteAccessError).toHaveBeenCalledWith(null);
    expect(resetOptions.resetFeedbackSubmissionState).toHaveBeenCalledTimes(1);
    expect(resetOptions.resetMessageActionStates).toHaveBeenCalledTimes(1);
    expect(resetOptions.setAutosaveStatus).toHaveBeenCalledWith(null);
    expect(resetOptions.setSessionStatus).toHaveBeenCalledWith(null);
    expect(resetOptions.setSessionLoadingId).toHaveBeenCalledWith(null);
    expect(resetOptions.setHandoffPageContext).toHaveBeenCalledWith(null);
    expect(resetOptions.setIsTranscriptAtBottom).toHaveBeenCalledWith(true);
  });
});
