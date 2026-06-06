import { isUuid } from "@/lib/validation";

const SHENUTE_HISTORY_MAX_REQUEST_BYTES = 256 * 1024;
const SHENUTE_HISTORY_MAX_MESSAGES = 100;
const SHENUTE_HISTORY_MAX_MESSAGE_CHARS = 24_000;

type ShenuteSavedChatRole = "assistant" | "system" | "user";

type ShenuteSavedChatMessage = {
  id: string;
  role: ShenuteSavedChatRole;
  content: string;
  parts?: Array<{ text: string; type: "text" }>;
};

type ShenuteSavedChatRow = {
  client_message_id?: string | null;
  content: string;
  id: string;
  metadata?: {
    parts?: Array<{ text: string; type: "text" }> | null;
  } | null;
  role: unknown;
};

/**
 * Checks the incoming history payload size from a `content-length` header.
 */
export function isShenuteHistoryPayloadTooLarge(
  contentLengthHeader: string | null,
) {
  const contentLength = Number.parseInt(contentLengthHeader ?? "", 10);

  return (
    Number.isFinite(contentLength) &&
    contentLength > SHENUTE_HISTORY_MAX_REQUEST_BYTES
  );
}

/**
 * Normalizes user-supplied session ids to UUIDs accepted by the history API.
 */
export function toOptionalShenuteHistorySessionId(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return isUuid(normalized) ? normalized : undefined;
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toBoundedMessageContent(value: unknown): string | undefined {
  return toOptionalString(value)?.slice(0, SHENUTE_HISTORY_MAX_MESSAGE_CHARS);
}

function isShenuteSavedChatRole(value: unknown): value is ShenuteSavedChatRole {
  return value === "assistant" || value === "user" || value === "system";
}

/**
 * Parses and bounds client-supplied message snapshots before history sync.
 */
export function parseShenuteHistoryMessages(
  value: unknown,
): ShenuteSavedChatMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(-SHENUTE_HISTORY_MAX_MESSAGES)
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map((item) => {
      const role: ShenuteSavedChatRole = isShenuteSavedChatRole(item.role)
        ? item.role
        : "user";

      return {
        id: toOptionalString(item.id) ?? "",
        role,
        content: toBoundedMessageContent(item.content) ?? "",
        parts: Array.isArray(item.parts)
          ? item.parts
              .filter(
                (part): part is { text: string; type: "text" } =>
                  typeof part === "object" &&
                  part !== null &&
                  part.type === "text" &&
                  typeof part.text === "string",
              )
              .map((part) => ({
                text: part.text.slice(0, SHENUTE_HISTORY_MAX_MESSAGE_CHARS),
                type: "text" as const,
              }))
          : undefined,
      };
    })
    .filter((message) => message.id && message.content);
}

/**
 * Deduplicates saved messages by client id, preserving the latest message for
 * each id and stable first-seen ordering.
 */
export function normalizeShenuteSavedChatMessages(
  messages: readonly ShenuteSavedChatMessage[],
) {
  const messageIndexesById = new Map<string, number>();
  const normalizedMessages: ShenuteSavedChatMessage[] = [];

  for (const message of messages) {
    const normalizedId = message.id.trim();
    if (!normalizedId) {
      continue;
    }

    const normalizedMessage =
      normalizedId === message.id ? message : { ...message, id: normalizedId };
    const existingIndex = messageIndexesById.get(normalizedId);

    if (typeof existingIndex === "number") {
      normalizedMessages[existingIndex] = normalizedMessage;
      continue;
    }

    messageIndexesById.set(normalizedId, normalizedMessages.length);
    normalizedMessages.push(normalizedMessage);
  }

  return normalizedMessages;
}

/**
 * Converts database rows into bounded client history messages.
 */
export function normalizeShenuteSavedChatRows(
  rows: readonly ShenuteSavedChatRow[],
) {
  return normalizeShenuteSavedChatMessages(
    rows.map((message) => ({
      id: message.client_message_id ?? message.id,
      role: isShenuteSavedChatRole(message.role) ? message.role : "user",
      content: message.content,
      parts: Array.isArray(message.metadata?.parts)
        ? message.metadata.parts
        : undefined,
    })),
  );
}
