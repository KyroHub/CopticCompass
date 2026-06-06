import { useCallback, type RefObject } from "react";

import type { ShenuteHandoffPageContext } from "@/features/shenute/handoff";
import type {
  ChatMessageLike,
  ShenuteProvider,
} from "@/features/shenute/shared";

type ShenutePageSendMessage = (
  message: { text: string },
  options: {
    body: {
      inferenceProvider: ShenuteProvider;
      pageContext?: ShenuteHandoffPageContext;
    };
  },
) => unknown;

type ShenutePageRegenerateMessage = (options: {
  body: {
    inferenceProvider: ShenuteProvider;
    pageContext?: ShenuteHandoffPageContext;
  };
  messageId: string;
}) => unknown;

type MessageInputElement = Pick<HTMLTextAreaElement, "focus">;

type ShenutePageSetTimeout = (callback: () => void, delay: number) => number;

type TranscriptChromeControls = {
  scrollTranscriptToBottom: (behavior: ScrollBehavior) => void;
  setIsTranscriptAtBottom: (isAtBottom: boolean) => void;
  setIsUtilityChromeCollapsed: (isCollapsed: boolean) => void;
};

function getShenutePageMessageBody({
  handoffPageContext,
  inferenceProvider,
}: {
  handoffPageContext: ShenuteHandoffPageContext | null;
  inferenceProvider: ShenuteProvider;
}) {
  return {
    inferenceProvider,
    pageContext: handoffPageContext ?? undefined,
  };
}

function scheduleShenutePageTranscriptScroll({
  requestAnimationFrame = window.requestAnimationFrame,
  scrollTranscriptToBottom,
}: {
  requestAnimationFrame?: typeof window.requestAnimationFrame;
  scrollTranscriptToBottom: (behavior: ScrollBehavior) => void;
}) {
  requestAnimationFrame(() => {
    scrollTranscriptToBottom("smooth");
  });
}

export function regenerateShenutePageMessage({
  handoffPageContext,
  inferenceProvider,
  isLoading,
  message,
  regenerate,
  requestAnimationFrame,
  scrollTranscriptToBottom,
  setIsTranscriptAtBottom,
  setIsUtilityChromeCollapsed,
}: {
  handoffPageContext: ShenuteHandoffPageContext | null;
  inferenceProvider: ShenuteProvider;
  isLoading: boolean;
  message: ChatMessageLike;
  regenerate: ShenutePageRegenerateMessage;
  requestAnimationFrame?: typeof window.requestAnimationFrame;
} & TranscriptChromeControls) {
  if (isLoading || message.role !== "assistant") {
    return false;
  }

  setIsTranscriptAtBottom(true);
  setIsUtilityChromeCollapsed(false);
  regenerate({
    messageId: message.id,
    body: getShenutePageMessageBody({
      handoffPageContext,
      inferenceProvider,
    }),
  });
  scheduleShenutePageTranscriptScroll({
    requestAnimationFrame,
    scrollTranscriptToBottom,
  });

  return true;
}

export function continueShenutePageConversation({
  continuePrompt,
  handoffPageContext,
  inferenceProvider,
  isLoading,
  isShenuteAccessBlocked,
  requestAnimationFrame,
  scrollTranscriptToBottom,
  sendMessage,
  setIsTranscriptAtBottom,
  setIsUtilityChromeCollapsed,
}: {
  continuePrompt: string;
  handoffPageContext: ShenuteHandoffPageContext | null;
  inferenceProvider: ShenuteProvider;
  isLoading: boolean;
  isShenuteAccessBlocked: boolean;
  requestAnimationFrame?: typeof window.requestAnimationFrame;
  sendMessage: ShenutePageSendMessage;
} & TranscriptChromeControls) {
  if (isLoading || isShenuteAccessBlocked) {
    return false;
  }

  setIsTranscriptAtBottom(true);
  setIsUtilityChromeCollapsed(false);
  sendMessage(
    { text: continuePrompt },
    {
      body: getShenutePageMessageBody({
        handoffPageContext,
        inferenceProvider,
      }),
    },
  );
  scheduleShenutePageTranscriptScroll({
    requestAnimationFrame,
    scrollTranscriptToBottom,
  });

  return true;
}

export function selectShenutePageStarterPrompt({
  messageInput,
  prompt,
  requestAnimationFrame = window.requestAnimationFrame,
  setInputValue,
  setIsUtilityChromeCollapsed,
  setShenuteAccessError,
  shenuteAccessError,
}: {
  messageInput: MessageInputElement | null;
  prompt: string;
  requestAnimationFrame?: typeof window.requestAnimationFrame;
  setInputValue: (value: string) => void;
  setIsUtilityChromeCollapsed: (isCollapsed: boolean) => void;
  setShenuteAccessError: (value: string | null) => void;
  shenuteAccessError: string | null;
}) {
  setIsUtilityChromeCollapsed(false);
  setInputValue(prompt);
  if (shenuteAccessError) {
    setShenuteAccessError(null);
  }
  requestAnimationFrame(() => {
    messageInput?.focus();
  });
}

export function scrollShenutePageToLatestMessage({
  messageInput,
  scrollTranscriptToBottom,
  setIsUtilityChromeCollapsed,
}: {
  messageInput: MessageInputElement | null;
  scrollTranscriptToBottom: (behavior: ScrollBehavior) => void;
  setIsUtilityChromeCollapsed: (isCollapsed: boolean) => void;
}) {
  setIsUtilityChromeCollapsed(false);
  scrollTranscriptToBottom("smooth");
  messageInput?.focus({ preventScroll: true });
}

export function focusShenutePageMessageInput({
  scrollTranscriptToBottom,
  setIsUtilityChromeCollapsed,
  setTimeout = window.setTimeout,
  typedMessagesLength,
}: {
  scrollTranscriptToBottom: (behavior: ScrollBehavior) => void;
  setIsUtilityChromeCollapsed: (isCollapsed: boolean) => void;
  setTimeout?: ShenutePageSetTimeout;
  typedMessagesLength: number;
}) {
  setIsUtilityChromeCollapsed(false);
  if (typedMessagesLength === 0) {
    return false;
  }

  setTimeout(() => {
    scrollTranscriptToBottom("smooth");
  }, 160);
  return true;
}

export function useShenutePageConversationActions({
  continuePrompt,
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
  typedMessagesLength,
}: {
  continuePrompt: string;
  handoffPageContext: ShenuteHandoffPageContext | null;
  inferenceProvider: ShenuteProvider;
  isLoading: boolean;
  isShenuteAccessBlocked: boolean;
  messageInputRef: RefObject<HTMLTextAreaElement | null>;
  regenerate: ShenutePageRegenerateMessage;
  scrollTranscriptToBottom: (behavior: ScrollBehavior) => void;
  sendMessage: ShenutePageSendMessage;
  setInputValue: (value: string) => void;
  setIsTranscriptAtBottom: (isAtBottom: boolean) => void;
  setIsUtilityChromeCollapsed: (isCollapsed: boolean) => void;
  setShenuteAccessError: (value: string | null) => void;
  shenuteAccessError: string | null;
  typedMessagesLength: number;
}) {
  const handleRegenerateMessage = useCallback(
    (message: ChatMessageLike) => {
      regenerateShenutePageMessage({
        handoffPageContext,
        inferenceProvider,
        isLoading,
        message,
        regenerate,
        scrollTranscriptToBottom,
        setIsTranscriptAtBottom,
        setIsUtilityChromeCollapsed,
      });
    },
    [
      handoffPageContext,
      inferenceProvider,
      isLoading,
      regenerate,
      scrollTranscriptToBottom,
      setIsTranscriptAtBottom,
      setIsUtilityChromeCollapsed,
    ],
  );
  const handleContinueConversation = useCallback(() => {
    continueShenutePageConversation({
      continuePrompt,
      handoffPageContext,
      inferenceProvider,
      isLoading,
      isShenuteAccessBlocked,
      scrollTranscriptToBottom,
      sendMessage,
      setIsTranscriptAtBottom,
      setIsUtilityChromeCollapsed,
    });
  }, [
    continuePrompt,
    handoffPageContext,
    inferenceProvider,
    isLoading,
    isShenuteAccessBlocked,
    scrollTranscriptToBottom,
    sendMessage,
    setIsTranscriptAtBottom,
    setIsUtilityChromeCollapsed,
  ]);
  const handleStarterPrompt = useCallback(
    (prompt: string) => {
      selectShenutePageStarterPrompt({
        messageInput: messageInputRef.current,
        prompt,
        setInputValue,
        setIsUtilityChromeCollapsed,
        setShenuteAccessError,
        shenuteAccessError,
      });
    },
    [
      messageInputRef,
      setInputValue,
      setIsUtilityChromeCollapsed,
      setShenuteAccessError,
      shenuteAccessError,
    ],
  );
  const scrollToLatestMessage = useCallback(() => {
    scrollShenutePageToLatestMessage({
      messageInput: messageInputRef.current,
      scrollTranscriptToBottom,
      setIsUtilityChromeCollapsed,
    });
  }, [messageInputRef, scrollTranscriptToBottom, setIsUtilityChromeCollapsed]);
  const handleMessageInputFocus = useCallback(() => {
    focusShenutePageMessageInput({
      scrollTranscriptToBottom,
      setIsUtilityChromeCollapsed,
      typedMessagesLength,
    });
  }, [
    scrollTranscriptToBottom,
    setIsUtilityChromeCollapsed,
    typedMessagesLength,
  ]);

  return {
    handleContinueConversation,
    handleMessageInputFocus,
    handleRegenerateMessage,
    handleStarterPrompt,
    scrollToLatestMessage,
  };
}
