import { describe, expect, it, vi } from "vitest";

import type { ShenuteHandoffPageContext } from "@/features/shenute/handoff";
import type { ChatMessageLike } from "@/features/shenute/shared";

import {
  continueShenutePageConversation,
  focusShenutePageMessageInput,
  regenerateShenutePageMessage,
  scrollShenutePageToLatestMessage,
  selectShenutePageStarterPrompt,
} from "./useShenutePageConversationActions";

const handoffPageContext: ShenuteHandoffPageContext = {
  excerpt: "Current page excerpt",
  path: "/en/grammar",
  title: "Grammar | Coptic Compass",
  url: "https://www.copticcompass.com/en/grammar",
};

function buildTranscriptControls() {
  return {
    scrollTranscriptToBottom: vi.fn(),
    setIsTranscriptAtBottom: vi.fn(),
    setIsUtilityChromeCollapsed: vi.fn(),
  };
}

describe("Shenute page conversation action helpers", () => {
  it("regenerates assistant messages with provider and handoff context", () => {
    const frameCallbacks: FrameRequestCallback[] = [];
    const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      frameCallbacks.push(callback);
      return 1;
    });
    const regenerate = vi.fn();
    const controls = buildTranscriptControls();
    const message: ChatMessageLike = {
      content: "Previous answer",
      id: "assistant-message",
      role: "assistant",
    };

    expect(
      regenerateShenutePageMessage({
        handoffPageContext,
        inferenceProvider: "gemini_nmt",
        isLoading: false,
        message,
        regenerate,
        requestAnimationFrame,
        ...controls,
      }),
    ).toBe(true);

    expect(controls.setIsTranscriptAtBottom).toHaveBeenCalledWith(true);
    expect(controls.setIsUtilityChromeCollapsed).toHaveBeenCalledWith(false);
    expect(regenerate).toHaveBeenCalledWith({
      body: {
        inferenceProvider: "gemini_nmt",
        pageContext: handoffPageContext,
      },
      messageId: "assistant-message",
    });
    expect(controls.scrollTranscriptToBottom).not.toHaveBeenCalled();

    frameCallbacks[0]?.(0);
    expect(controls.scrollTranscriptToBottom).toHaveBeenCalledWith("smooth");
  });

  it("does not regenerate while loading or for non-assistant messages", () => {
    const regenerate = vi.fn();
    const controls = buildTranscriptControls();
    const userMessage: ChatMessageLike = {
      content: "Question",
      id: "user-message",
      role: "user",
    };

    expect(
      regenerateShenutePageMessage({
        handoffPageContext,
        inferenceProvider: "thoth",
        isLoading: false,
        message: userMessage,
        regenerate,
        requestAnimationFrame: vi.fn(),
        ...controls,
      }),
    ).toBe(false);
    expect(
      regenerateShenutePageMessage({
        handoffPageContext,
        inferenceProvider: "thoth",
        isLoading: true,
        message: { ...userMessage, role: "assistant" },
        regenerate,
        requestAnimationFrame: vi.fn(),
        ...controls,
      }),
    ).toBe(false);
    expect(regenerate).not.toHaveBeenCalled();
    expect(controls.setIsTranscriptAtBottom).not.toHaveBeenCalled();
  });

  it("continues the conversation with the configured prompt", () => {
    const frameCallbacks: FrameRequestCallback[] = [];
    const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      frameCallbacks.push(callback);
      return 1;
    });
    const sendMessage = vi.fn();
    const controls = buildTranscriptControls();

    expect(
      continueShenutePageConversation({
        continuePrompt: "Continue from where you left off.",
        handoffPageContext,
        inferenceProvider: "openrouter",
        isLoading: false,
        isShenuteAccessBlocked: false,
        requestAnimationFrame,
        sendMessage,
        ...controls,
      }),
    ).toBe(true);

    expect(sendMessage).toHaveBeenCalledWith(
      { text: "Continue from where you left off." },
      {
        body: {
          inferenceProvider: "openrouter",
          pageContext: handoffPageContext,
        },
      },
    );
    expect(controls.setIsTranscriptAtBottom).toHaveBeenCalledWith(true);
    expect(controls.setIsUtilityChromeCollapsed).toHaveBeenCalledWith(false);

    frameCallbacks[0]?.(0);
    expect(controls.scrollTranscriptToBottom).toHaveBeenCalledWith("smooth");
  });

  it("does not continue while blocked or loading", () => {
    const sendMessage = vi.fn();
    const controls = buildTranscriptControls();

    expect(
      continueShenutePageConversation({
        continuePrompt: "Continue.",
        handoffPageContext: null,
        inferenceProvider: "thoth",
        isLoading: false,
        isShenuteAccessBlocked: true,
        requestAnimationFrame: vi.fn(),
        sendMessage,
        ...controls,
      }),
    ).toBe(false);
    expect(
      continueShenutePageConversation({
        continuePrompt: "Continue.",
        handoffPageContext: null,
        inferenceProvider: "thoth",
        isLoading: true,
        isShenuteAccessBlocked: false,
        requestAnimationFrame: vi.fn(),
        sendMessage,
        ...controls,
      }),
    ).toBe(false);
    expect(sendMessage).not.toHaveBeenCalled();
    expect(controls.setIsTranscriptAtBottom).not.toHaveBeenCalled();
  });

  it("selects a starter prompt, clears stale access errors, and focuses the composer", () => {
    const frameCallbacks: FrameRequestCallback[] = [];
    const focus = vi.fn();
    const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      frameCallbacks.push(callback);
      return 1;
    });
    const setInputValue = vi.fn();
    const setIsUtilityChromeCollapsed = vi.fn();
    const setShenuteAccessError = vi.fn();

    selectShenutePageStarterPrompt({
      messageInput: { focus },
      prompt: "Explain the Bohairic alphabet.",
      requestAnimationFrame,
      setInputValue,
      setIsUtilityChromeCollapsed,
      setShenuteAccessError,
      shenuteAccessError: "Please sign in.",
    });

    expect(setIsUtilityChromeCollapsed).toHaveBeenCalledWith(false);
    expect(setInputValue).toHaveBeenCalledWith(
      "Explain the Bohairic alphabet.",
    );
    expect(setShenuteAccessError).toHaveBeenCalledWith(null);
    expect(focus).not.toHaveBeenCalled();

    frameCallbacks[0]?.(0);
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it("keeps clear-access silent when selecting a starter prompt without an error", () => {
    const setShenuteAccessError = vi.fn();

    selectShenutePageStarterPrompt({
      messageInput: null,
      prompt: "Summarize the current page.",
      requestAnimationFrame: vi.fn((callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      }),
      setInputValue: vi.fn(),
      setIsUtilityChromeCollapsed: vi.fn(),
      setShenuteAccessError,
      shenuteAccessError: null,
    });

    expect(setShenuteAccessError).not.toHaveBeenCalled();
  });

  it("scrolls to the latest message and refocuses without moving the viewport", () => {
    const focus = vi.fn();
    const scrollTranscriptToBottom = vi.fn();
    const setIsUtilityChromeCollapsed = vi.fn();

    scrollShenutePageToLatestMessage({
      messageInput: { focus },
      scrollTranscriptToBottom,
      setIsUtilityChromeCollapsed,
    });

    expect(setIsUtilityChromeCollapsed).toHaveBeenCalledWith(false);
    expect(scrollTranscriptToBottom).toHaveBeenCalledWith("smooth");
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("schedules transcript scroll after focusing a populated conversation", () => {
    const timeoutCallbacks: Array<() => void> = [];
    const scrollTranscriptToBottom = vi.fn();
    const setIsUtilityChromeCollapsed = vi.fn();
    const setTimeout = vi.fn((callback: () => void, delay: number) => {
      timeoutCallbacks.push(callback);
      expect(delay).toBe(160);
      return 1;
    });

    expect(
      focusShenutePageMessageInput({
        scrollTranscriptToBottom,
        setIsUtilityChromeCollapsed,
        setTimeout,
        typedMessagesLength: 3,
      }),
    ).toBe(true);

    expect(setIsUtilityChromeCollapsed).toHaveBeenCalledWith(false);
    expect(scrollTranscriptToBottom).not.toHaveBeenCalled();

    timeoutCallbacks[0]?.();
    expect(scrollTranscriptToBottom).toHaveBeenCalledWith("smooth");
  });

  it("does not schedule a transcript scroll for an empty conversation", () => {
    const setTimeout = vi.fn();
    const setIsUtilityChromeCollapsed = vi.fn();

    expect(
      focusShenutePageMessageInput({
        scrollTranscriptToBottom: vi.fn(),
        setIsUtilityChromeCollapsed,
        setTimeout,
        typedMessagesLength: 0,
      }),
    ).toBe(false);

    expect(setIsUtilityChromeCollapsed).toHaveBeenCalledWith(false);
    expect(setTimeout).not.toHaveBeenCalled();
  });
});
