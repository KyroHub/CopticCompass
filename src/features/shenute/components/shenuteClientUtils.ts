import {
  SHENUTE_HANDOFF_STORAGE_KEY,
  type ShenuteHandoffPayload,
} from "@/features/shenute/handoff";
import {
  getMessageText,
  isTextMessagePart,
  toShenuteProvider,
  type ChatMessageLike,
  type ShenuteProvider,
} from "@/features/shenute/shared";
import { getPublicErrorMessage, isAppErrorCode } from "@/lib/errors";

import {
  SHENUTE_RESPONSE_DETAILS_SELECTOR,
  SHENUTE_UTILITY_DETAILS_SELECTOR,
} from "./ShenuteClientPrimitives";

type ShenuteClientLanguage = "en" | "nl";

export type SavedChatSession = {
  id: string;
  title: string;
  updated_at: string | null;
};

type FeedbackResponsePayload = {
  code?: unknown;
  ragIngested?: boolean;
  ragWarning?: boolean;
  success?: boolean;
};

type ShenuteErrorCopy = {
  accessRequired: string;
  feedbackSaveFailed: string;
  providerGemini: string;
  providerGeminiNmt: string;
  providerHf: string;
  providerOpenRouter: string;
  providerThoth: string;
  rateLimit: string;
  requestFailed: string;
};

type SavedChatMessage = {
  id: string;
  role: ChatMessageLike["role"];
  content: string;
  parts?: Array<{ text: string; type: "text" }>;
};

export function formatFileSize(bytes: number, language: ShenuteClientLanguage) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 KB";
  }

  const isMegabyte = bytes >= 1024 * 1024;
  const value = isMegabyte ? bytes / (1024 * 1024) : bytes / 1024;
  const formattedValue = new Intl.NumberFormat(
    language === "nl" ? "nl-NL" : "en-US",
    {
      maximumFractionDigits: value >= 10 ? 0 : 1,
    },
  ).format(value);

  return `${formattedValue} ${isMegabyte ? "MB" : "KB"}`;
}

export function formatSessionTimestamp(
  updatedAt: string | null,
  language: ShenuteClientLanguage,
  fallback: string,
) {
  if (!updatedAt) {
    return fallback;
  }

  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat(language === "nl" ? "nl-NL" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function normalizeChatMessages<T extends ChatMessageLike>(
  messages: readonly T[],
) {
  const messageIndexesById = new Map<string, number>();
  const normalizedMessages: T[] = [];

  messages.forEach((message, index) => {
    const id = message.id.trim();
    const normalizedMessage =
      id.length > 0 ? message : ({ ...message, id: `message-${index}` } as T);
    const normalizedId = normalizedMessage.id;
    const existingIndex = messageIndexesById.get(normalizedId);

    if (typeof existingIndex === "number") {
      normalizedMessages[existingIndex] = normalizedMessage;
      return;
    }

    messageIndexesById.set(normalizedId, normalizedMessages.length);
    normalizedMessages.push(normalizedMessage);
  });

  return normalizedMessages;
}

function serializeChatMessage(message: ChatMessageLike): SavedChatMessage {
  return {
    id: message.id,
    role: message.role,
    content: getMessageText(message),
    parts: Array.isArray(message.parts)
      ? message.parts
          .filter(isTextMessagePart)
          .map((part) => ({ text: part.text, type: "text" }))
      : undefined,
  };
}

export function getChatMessagesSignature(messages: readonly ChatMessageLike[]) {
  return JSON.stringify(messages.map(serializeChatMessage));
}

export function readShenuteHandoffPayload(): ShenuteHandoffPayload | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawPayload = window.sessionStorage.getItem(SHENUTE_HANDOFF_STORAGE_KEY);
  if (!rawPayload) {
    return null;
  }

  window.sessionStorage.removeItem(SHENUTE_HANDOFF_STORAGE_KEY);

  try {
    const payload = JSON.parse(rawPayload) as Partial<ShenuteHandoffPayload>;
    if (!Array.isArray(payload.messages) || !payload.pageContext) {
      return null;
    }

    return {
      createdAt:
        typeof payload.createdAt === "string"
          ? payload.createdAt
          : new Date().toISOString(),
      inferenceProvider: toShenuteProvider(payload.inferenceProvider),
      messages: payload.messages,
      pageContext: payload.pageContext,
      source: "floating",
    };
  } catch {
    return null;
  }
}

export async function saveChatHistoryOnline(
  messages: ChatMessageLike[],
  sessionId: string,
): Promise<{
  success: boolean;
  sessionId?: string;
  sessions?: Array<SavedChatSession>;
}> {
  if (typeof window === "undefined") {
    return { success: false };
  }

  try {
    const response = await fetch("/api/shenute/history", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId,
        messages: messages.map(serializeChatMessage),
      }),
    });

    if (!response.ok) {
      return { success: false };
    }

    const data = (await response.json()) as {
      success: boolean;
      sessionId?: string;
      sessions?: Array<SavedChatSession>;
    };

    return data;
  } catch {
    return { success: false };
  }
}

function getErrorStatusCode(error: unknown): number | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const candidate = error as { cause?: unknown; status?: unknown };
  if (typeof candidate.status === "number") {
    return candidate.status;
  }

  if (candidate.cause && typeof candidate.cause === "object") {
    const cause = candidate.cause as { status?: unknown };
    if (typeof cause.status === "number") {
      return cause.status;
    }
  }

  return undefined;
}

function getStructuredErrorCode(error: unknown) {
  if (!error || typeof error !== "object") {
    return null;
  }

  const candidate = error as { code?: unknown; message?: unknown };
  if (isAppErrorCode(candidate.code)) {
    return candidate.code;
  }

  if (typeof candidate.message !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(candidate.message) as { code?: unknown };
    return isAppErrorCode(parsed.code) ? parsed.code : null;
  } catch {
    return null;
  }
}

export function getShenuteErrorMessage(
  error: unknown,
  copy: Pick<
    ShenuteErrorCopy,
    "accessRequired" | "rateLimit" | "requestFailed"
  >,
  language: ShenuteClientLanguage,
) {
  const status = getErrorStatusCode(error);
  const structuredCode = getStructuredErrorCode(error);
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalizedMessage = message.toLowerCase();

  if (
    structuredCode === "rate_limited" ||
    status === 429 ||
    normalizedMessage.includes("429") ||
    normalizedMessage.includes("rate limit")
  ) {
    return copy.rateLimit;
  }

  if (
    structuredCode === "auth_required" ||
    status === 401 ||
    normalizedMessage.includes("401") ||
    normalizedMessage.includes("unauthorized") ||
    normalizedMessage.includes("sign in")
  ) {
    return copy.accessRequired;
  }

  if (structuredCode === "validation_failed") {
    return getPublicErrorMessage("validation_failed", language, "shenute");
  }

  return copy.requestFailed;
}

export function getFeedbackErrorMessage(
  payload: FeedbackResponsePayload,
  copy: Pick<ShenuteErrorCopy, "feedbackSaveFailed">,
  language: ShenuteClientLanguage,
) {
  return isAppErrorCode(payload.code)
    ? getPublicErrorMessage(payload.code, language, "feedback")
    : copy.feedbackSaveFailed;
}

export async function readFeedbackResponsePayload(response: Response) {
  try {
    return (await response.json()) as FeedbackResponsePayload;
  } catch {
    return { success: false } satisfies FeedbackResponsePayload;
  }
}

export function getFeedbackStatusClass(
  status: "error" | "pending" | "success",
) {
  if (status === "error") {
    return "text-danger";
  }

  if (status === "pending") {
    return "text-muted";
  }

  return "text-coptic";
}

export function getMessageAvatarClassName(role: ChatMessageLike["role"]) {
  if (role === "user") {
    return "bg-accent-strong text-paper ring-2 ring-accent/20 dark:bg-accent-soft dark:text-ink dark:ring-accent/30";
  }

  return "bg-coptic-soft text-coptic ring-2 ring-coptic/20";
}

export function getMessageBubbleClassName(role: ChatMessageLike["role"]) {
  if (role === "user") {
    return "rounded-br-md bg-accent-strong text-paper shadow-sm dark:bg-accent-soft dark:text-ink";
  }

  return "rounded-bl-md border border-line bg-surface/95 text-ink shadow-soft ring-1 ring-line/60";
}

export function getReactionButtonClassName(
  active: boolean,
  tone: "negative" | "positive",
) {
  if (active && tone === "positive") {
    return "border-coptic/60 bg-coptic-soft text-coptic";
  }

  if (active && tone === "negative") {
    return "border-danger/35 bg-danger/5 text-danger dark:bg-danger/10";
  }

  return "border-line text-muted hover:bg-elevated hover:text-ink";
}

export function getProviderLabel(
  provider: ShenuteProvider,
  copy: Pick<
    ShenuteErrorCopy,
    | "providerGemini"
    | "providerGeminiNmt"
    | "providerHf"
    | "providerOpenRouter"
    | "providerThoth"
  >,
) {
  if (provider === "gemini") {
    return copy.providerGemini;
  }

  if (provider === "gemini_nmt") {
    return copy.providerGeminiNmt;
  }

  if (provider === "hf") {
    return copy.providerHf;
  }

  if (provider === "openrouter") {
    return copy.providerOpenRouter;
  }

  return copy.providerThoth;
}

export function closeContainingDetails(element: HTMLElement | null) {
  const details = element?.closest("details") as HTMLDetailsElement | null;
  if (details) {
    details.open = false;
  }
}

export function closeOpenUtilityDetails(except?: HTMLDetailsElement | null) {
  if (typeof document === "undefined") {
    return;
  }

  document
    .querySelectorAll<HTMLDetailsElement>(SHENUTE_UTILITY_DETAILS_SELECTOR)
    .forEach((details) => {
      if (details !== except) {
        details.open = false;
      }
    });
}

export function closeOpenResponseDetails(except?: HTMLDetailsElement | null) {
  if (typeof document === "undefined") {
    return;
  }

  document
    .querySelectorAll<HTMLDetailsElement>(SHENUTE_RESPONSE_DETAILS_SELECTOR)
    .forEach((details) => {
      if (details !== except) {
        details.open = false;
      }
    });
}
