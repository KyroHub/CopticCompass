import { describe, expect, it, vi } from "vitest";

import type { ChatMessageLike } from "@/features/shenute/shared";

import { SHENUTE_COPY } from "./shenuteCopy";
import {
  getShenutePageComposerViewModel,
  getShenutePageHandoffContextLabel,
  getShenutePageHistoryViewModel,
  getShenutePageMessageSignature,
  hasShenutePageUnsavedConversationChanges,
  shouldExpandShenutePageUtilityChrome,
  shouldSubmitShenutePromptKeyDown,
  submitShenutePromptKeyDown,
} from "./useShenutePageViewModel";

const copy = SHENUTE_COPY.en;

describe("Shenute page view model helpers", () => {
  it("builds composer state for image-backed OCR submissions", () => {
    const image = {
      name: "folio.png",
      size: 2048,
    } as File;

    expect(
      getShenutePageComposerViewModel({
        copy,
        inputValue: "  ",
        isLoading: false,
        isShenuteAccessBlocked: false,
        language: "en",
        ocrPending: true,
        selectedImage: image,
      }),
    ).toMatchObject({
      canSubmitPrompt: false,
      composerPlaceholder: copy.placeholderImage,
      composerStateLabel: copy.runningOcr,
      composerStateMeta: "folio.png",
      composerSubmitLabel: copy.runningOcr,
      hasConversationDraft: true,
      hasPromptContent: true,
      isAttachmentMenuDisabled: true,
      isComposerBusy: true,
      isComposerDisabled: true,
      selectedImageSizeLabel: "2 KB",
    });
  });

  it("builds composer state for normal text submissions", () => {
    expect(
      getShenutePageComposerViewModel({
        copy,
        inputValue: "  Explain this word  ",
        isLoading: false,
        isShenuteAccessBlocked: false,
        language: "en",
        ocrPending: false,
        selectedImage: null,
      }),
    ).toMatchObject({
      canSubmitPrompt: true,
      composerPlaceholder: copy.placeholderShort,
      composerStateLabel: null,
      composerStateMeta: null,
      composerSubmitLabel: copy.sendMessage,
      hasConversationDraft: true,
      hasPromptContent: true,
      isComposerBusy: false,
      isComposerDisabled: false,
      selectedImageSizeLabel: null,
    });
  });

  it("builds history status, save label, dot state, and new-conversation eligibility", () => {
    expect(
      getShenutePageHistoryViewModel({
        activeSessionId: null,
        autosaveStatus: "Autosaved.",
        copy,
        hasConversationDraft: false,
        hasUnsavedConversationChanges: true,
        historyActionStatus: null,
        isHistorySaving: false,
        isLoading: false,
        sessionsLength: 3,
        typedMessagesLength: 2,
      }),
    ).toEqual({
      canStartNewConversation: true,
      historyStatusDotClassName: "bg-warning",
      historyStatusMessage: copy.unsavedChanges,
      saveButtonLabel: copy.saveHistory,
      sessionCountLabel: `3 ${copy.sessionCount}`,
    });
  });

  it("prioritizes action and loading statuses in the history view model", () => {
    expect(
      getShenutePageHistoryViewModel({
        activeSessionId: "session-1",
        autosaveStatus: "Autosaved.",
        copy,
        hasConversationDraft: false,
        hasUnsavedConversationChanges: false,
        historyActionStatus: "Conversation cleared.",
        isHistorySaving: true,
        isLoading: true,
        sessionsLength: 1,
        typedMessagesLength: 0,
      }),
    ).toMatchObject({
      canStartNewConversation: true,
      historyStatusDotClassName: "bg-coptic animate-pulse",
      historyStatusMessage: "Conversation cleared.",
      saveButtonLabel: copy.savingHistory,
    });
  });

  it("strips the site suffix from handoff context labels", () => {
    expect(
      getShenutePageHandoffContextLabel({
        excerpt: "Current excerpt",
        path: "/en/grammar",
        title: "Grammar | Coptic Compass",
        url: "https://www.copticcompass.com/en/grammar",
      }),
    ).toBe("Grammar");
    expect(
      getShenutePageHandoffContextLabel({
        excerpt: "",
        path: "/en/fallback",
        title: "   | Coptic Compass",
        url: "https://www.copticcompass.com/en/fallback",
      }),
    ).toBe("/en/fallback");
    expect(getShenutePageHandoffContextLabel(null)).toBeNull();
  });

  it("detects unsaved conversation signatures", () => {
    const messages: ChatMessageLike[] = [
      {
        content: "Saved question",
        id: "message-1",
        role: "user",
      },
    ];
    const currentMessageSignature = getShenutePageMessageSignature(messages);

    expect(
      hasShenutePageUnsavedConversationChanges({
        currentMessageSignature,
        lastSavedMessageSignature: "[]",
        typedMessagesLength: messages.length,
      }),
    ).toBe(true);
    expect(
      hasShenutePageUnsavedConversationChanges({
        currentMessageSignature,
        lastSavedMessageSignature: currentMessageSignature,
        typedMessagesLength: messages.length,
      }),
    ).toBe(false);
    expect(
      hasShenutePageUnsavedConversationChanges({
        currentMessageSignature,
        lastSavedMessageSignature: "[]",
        typedMessagesLength: 0,
      }),
    ).toBe(false);
  });

  it("expands utility chrome for blocking or transient states", () => {
    const baseOptions = {
      cameraError: null,
      cameraOpen: false,
      historyActionStatus: null,
      isAnswerStylePanelOpen: false,
      isHistorySaving: false,
      isShenuteAccessBlocked: false,
      ocrError: null,
      ocrPending: false,
      requestError: null,
      sessionStatus: null,
      shenuteAccessError: null,
    };

    expect(shouldExpandShenutePageUtilityChrome(baseOptions)).toBe(false);
    expect(
      shouldExpandShenutePageUtilityChrome({
        ...baseOptions,
        ocrPending: true,
      }),
    ).toBe(true);
    expect(
      shouldExpandShenutePageUtilityChrome({
        ...baseOptions,
        requestError: new Error("Failed"),
      }),
    ).toBe(true);
  });

  it("submits prompt keydown only for non-composing Enter presses", () => {
    expect(
      shouldSubmitShenutePromptKeyDown({
        isComposing: false,
        key: "Enter",
        shiftKey: false,
      }),
    ).toBe(true);
    expect(
      shouldSubmitShenutePromptKeyDown({
        isComposing: false,
        key: "Enter",
        shiftKey: true,
      }),
    ).toBe(false);
    expect(
      shouldSubmitShenutePromptKeyDown({
        isComposing: true,
        key: "Enter",
        shiftKey: false,
      }),
    ).toBe(false);
  });

  it("requests form submission for prompt Enter keydown events", () => {
    const preventDefault = vi.fn();
    const requestSubmit = vi.fn();
    const event = {
      currentTarget: {
        form: {
          requestSubmit,
        },
      },
      key: "Enter",
      nativeEvent: {
        isComposing: false,
      },
      preventDefault,
      shiftKey: false,
    } as unknown as Parameters<typeof submitShenutePromptKeyDown>[0];

    expect(submitShenutePromptKeyDown(event)).toBe(true);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(requestSubmit).toHaveBeenCalledTimes(1);
  });
});
