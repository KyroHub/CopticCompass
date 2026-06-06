import type { ShenuteHandoffPageContext } from "@/features/shenute/handoff";
import {
  getMessageText,
  isTextMessagePart,
  type ChatMessageLike,
  type ShenuteFeedbackSignal,
  type ShenuteProvider,
} from "@/features/shenute/shared";

type ClientFetch = typeof fetch;

export type SavedChatSession = {
  id: string;
  title: string;
  updated_at: string | null;
};

export type ShenuteHistoryResponsePayload = {
  messages?: Array<ChatMessageLike>;
  sessionId?: string;
  sessions?: Array<SavedChatSession>;
  success: boolean;
};

export type FeedbackResponsePayload = {
  code?: unknown;
  ragIngested?: boolean;
  ragWarning?: boolean;
  success?: boolean;
};

export type SubmitShenuteFeedbackOptions = {
  assistantMessageId: string;
  assistantResponse: string;
  feedbackText?: string;
  inferenceProvider: ShenuteProvider;
  pageContext?: ShenuteHandoffPageContext;
  prompt: string;
  shenuteSessionId: string;
  signal: ShenuteFeedbackSignal;
  userMessageId?: string;
};

type SavedChatMessage = {
  content: string;
  id: string;
  parts?: Array<{ text: string; type: "text" }>;
  role: ChatMessageLike["role"];
};

type ShenuteHistoryRequestResult = {
  ok: boolean;
  payload: ShenuteHistoryResponsePayload | null;
};

export function serializeShenuteChatMessageForHistory(
  message: ChatMessageLike,
): SavedChatMessage {
  return {
    content: getMessageText(message),
    id: message.id,
    parts: Array.isArray(message.parts)
      ? message.parts
          .filter(isTextMessagePart)
          .map((part) => ({ text: part.text, type: "text" }))
      : undefined,
    role: message.role,
  };
}

function getShenuteHistorySessionUrl(sessionId: string) {
  return `/api/shenute/history?sessionId=${encodeURIComponent(sessionId)}`;
}

async function readJsonPayload<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function readHistoryResponsePayload(
  response: Response,
): Promise<ShenuteHistoryResponsePayload | null> {
  return readJsonPayload<ShenuteHistoryResponsePayload>(response);
}

export async function loadShenuteHistoryOnline(
  fetcher: ClientFetch = globalThis.fetch,
): Promise<ShenuteHistoryRequestResult> {
  const response = await fetcher("/api/shenute/history");

  return {
    ok: response.ok,
    payload: await readHistoryResponsePayload(response),
  };
}

export async function loadShenuteSessionOnline(
  sessionId: string,
  fetcher: ClientFetch = globalThis.fetch,
): Promise<ShenuteHistoryRequestResult> {
  const response = await fetcher(getShenuteHistorySessionUrl(sessionId));

  return {
    ok: response.ok,
    payload: await readHistoryResponsePayload(response),
  };
}

export async function deleteShenuteSessionOnline(
  sessionId: string,
  fetcher: ClientFetch = globalThis.fetch,
) {
  const response = await fetcher(getShenuteHistorySessionUrl(sessionId), {
    method: "DELETE",
  });

  return response.ok;
}

export async function saveChatHistoryOnline(
  messages: ChatMessageLike[],
  sessionId: string,
  fetcher: ClientFetch = globalThis.fetch,
): Promise<ShenuteHistoryResponsePayload> {
  if (typeof window === "undefined") {
    return { success: false };
  }

  try {
    const response = await fetcher("/api/shenute/history", {
      body: JSON.stringify({
        messages: messages.map(serializeShenuteChatMessageForHistory),
        sessionId,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      return { success: false };
    }

    const data = await readHistoryResponsePayload(response);

    return data ?? { success: false };
  } catch {
    return { success: false };
  }
}

async function readFeedbackResponsePayload(response: Response) {
  return (
    (await readJsonPayload<FeedbackResponsePayload>(response)) ??
    ({ success: false } satisfies FeedbackResponsePayload)
  );
}

export async function submitShenuteFeedbackOnline(
  options: SubmitShenuteFeedbackOptions,
  fetcher: ClientFetch = globalThis.fetch,
) {
  const response = await fetcher("/api/shenute/feedback", {
    body: JSON.stringify({
      assistantMessageId: options.assistantMessageId,
      assistantResponse: options.assistantResponse,
      feedbackText: options.feedbackText,
      inferenceProvider: options.inferenceProvider,
      pageContext: options.pageContext,
      prompt: options.prompt,
      shenuteSessionId: options.shenuteSessionId,
      signal: options.signal,
      userMessageId: options.userMessageId,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return {
    ok: response.ok,
    payload: await readFeedbackResponsePayload(response),
  };
}
