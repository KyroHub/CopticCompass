import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useMemo } from "react";

import type { ChatMessageLike } from "@/features/shenute/shared";

import { normalizeChatMessages } from "./shenuteClientUtils";

const SHENUTE_PAGE_CHAT_API_PATH = "/api/shenute";

export function createShenutePageChatTransport() {
  return new DefaultChatTransport({
    api: SHENUTE_PAGE_CHAT_API_PATH,
  });
}

export function getShenutePageRuntimeMessages(
  messages: readonly ChatMessageLike[],
) {
  return normalizeChatMessages(messages);
}

export function shouldSyncShenutePageRuntimeMessages({
  rawMessagesLength,
  runtimeMessagesLength,
}: {
  rawMessagesLength: number;
  runtimeMessagesLength: number;
}) {
  return runtimeMessagesLength !== rawMessagesLength;
}

export function useShenutePageChatRuntime() {
  const transport = useMemo(() => createShenutePageChatTransport(), []);
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
  const typedMessages = useMemo(
    () => getShenutePageRuntimeMessages(messages as ChatMessageLike[]),
    [messages],
  );
  const setHistoryMessages = useCallback(
    (nextMessages: ChatMessageLike[]) => {
      setMessages(nextMessages as UIMessage[]);
    },
    [setMessages],
  );

  useEffect(() => {
    if (
      !shouldSyncShenutePageRuntimeMessages({
        rawMessagesLength: messages.length,
        runtimeMessagesLength: typedMessages.length,
      })
    ) {
      return;
    }

    setMessages(typedMessages as UIMessage[]);
  }, [messages.length, setMessages, typedMessages]);

  return {
    error,
    regenerate,
    sendMessage,
    setHistoryMessages,
    status,
    stopChatResponse,
    typedMessages,
  };
}
