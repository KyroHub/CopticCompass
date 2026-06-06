import { useCallback, useEffect, useRef, useState } from "react";

import type {
  ChatMessageLike,
  ShenuteProvider,
} from "@/features/shenute/shared";

import {
  formatFloatingShenuteChatHistory,
  type FloatingShenutePageContext,
} from "./floatingShenuteContext";

const SAVE_STATUS_CLEAR_DELAY_MS = 3000;

type DownloadAnchor = Pick<HTMLAnchorElement, "click" | "download" | "href">;

type FloatingShenuteChatHistoryDownloadOptions = {
  createAnchor?: () => DownloadAnchor;
  createObjectUrl?: (blob: Blob) => string;
  messages: ChatMessageLike[];
  pageContext: FloatingShenutePageContext;
  provider: ShenuteProvider;
  revokeObjectUrl?: (url: string) => void;
  savedAt?: Date;
};

export function buildFloatingShenuteChatHistoryFilename(savedAt = new Date()) {
  return `shenute-chat-history-${savedAt
    .toISOString()
    .replace(/[:.]/g, "-")}.txt`;
}

export function downloadFloatingShenuteChatHistory({
  createAnchor = () => document.createElement("a"),
  createObjectUrl = (blob) => URL.createObjectURL(blob),
  messages,
  pageContext,
  provider,
  revokeObjectUrl = (url) => URL.revokeObjectURL(url),
  savedAt = new Date(),
}: FloatingShenuteChatHistoryDownloadOptions) {
  const historyText = formatFloatingShenuteChatHistory(
    messages,
    pageContext,
    provider,
    savedAt,
  );
  const blob = new Blob([historyText], {
    type: "text/plain;charset=utf-8",
  });
  const url = createObjectUrl(blob);
  const anchor = createAnchor();
  const filename = buildFloatingShenuteChatHistoryFilename(savedAt);

  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  revokeObjectUrl(url);

  return {
    blob,
    filename,
    historyText,
    url,
  };
}

export function useFloatingShenuteChatHistoryDownload({
  messages,
  pageContext,
  provider,
  savedHistoryMessage,
}: {
  messages: ChatMessageLike[];
  pageContext: FloatingShenutePageContext;
  provider: ShenuteProvider;
  savedHistoryMessage: string;
}) {
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const timeoutIdsRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
    };
  }, []);

  const handleSaveChatHistory = useCallback(() => {
    downloadFloatingShenuteChatHistory({
      messages,
      pageContext,
      provider,
    });

    setSaveStatus(savedHistoryMessage);
    const timeoutId = window.setTimeout(() => {
      setSaveStatus(null);
      timeoutIdsRef.current = timeoutIdsRef.current.filter(
        (storedTimeoutId) => storedTimeoutId !== timeoutId,
      );
    }, SAVE_STATUS_CLEAR_DELAY_MS);
    timeoutIdsRef.current.push(timeoutId);
  }, [messages, pageContext, provider, savedHistoryMessage]);

  return {
    handleSaveChatHistory,
    saveStatus,
  };
}
