import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/supabase/authQueries";
import { hasSupabaseRuntimeEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation";

type SavedChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  parts?: Array<{ text: string; type: "text" }>;
};

type SavedChatRow = {
  client_message_id: string | null;
  content: string;
  id: string;
  metadata: {
    parts?: SavedChatMessage["parts"] | null;
  } | null;
  role: SavedChatMessage["role"];
};

type HistoryRequestPayload = {
  sessionId?: unknown;
  messages?: unknown;
};

const SHENUTE_HISTORY_MAX_REQUEST_BYTES = 256 * 1024;
const SHENUTE_HISTORY_MAX_MESSAGES = 100;
const SHENUTE_HISTORY_MAX_MESSAGE_CHARS = 24_000;

function getPayloadTooLargeResponse(headers: Headers) {
  const contentLength = Number.parseInt(
    headers.get("content-length") ?? "",
    10,
  );

  if (
    !Number.isFinite(contentLength) ||
    contentLength <= SHENUTE_HISTORY_MAX_REQUEST_BYTES
  ) {
    return null;
  }

  return NextResponse.json(
    { success: false, error: "Shenute history payload is too large." },
    { status: 413 },
  );
}

function toOptionalUuidString(value: unknown): string | undefined {
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

function isSavedChatRole(value: unknown): value is SavedChatMessage["role"] {
  return value === "assistant" || value === "user" || value === "system";
}

function parseMessages(value: unknown): SavedChatMessage[] {
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
      const role: SavedChatMessage["role"] = isSavedChatRole(item.role)
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

function normalizeSavedChatMessages(messages: readonly SavedChatMessage[]) {
  const messageIndexesById = new Map<string, number>();
  const normalizedMessages: SavedChatMessage[] = [];

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

export async function handleShenuteHistoryGet(request: Request) {
  try {
    if (!hasSupabaseRuntimeEnv()) {
      return NextResponse.json(
        { success: false, error: "Shenute history is unavailable right now." },
        { status: 503 },
      );
    }

    const url = new URL(request.url);
    const requestedSessionId = toOptionalUuidString(
      url.searchParams.get("sessionId"),
    );

    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Sign in required." },
        { status: 401 },
      );
    }

    const { data: sessions, error: sessionsError } = await supabase
      .from("chat_sessions")
      .select("id, title, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (sessionsError) {
      console.error("Failed to fetch Shenute history sessions:", sessionsError);
      return NextResponse.json(
        { success: false, error: "Could not load history." },
        { status: 500 },
      );
    }

    let sessionId: string | null = null;
    if (
      requestedSessionId &&
      sessions?.some((session) => session.id === requestedSessionId)
    ) {
      sessionId = requestedSessionId;
    } else if (sessions && sessions.length > 0) {
      sessionId = sessions[0].id;
    }

    if (!sessionId) {
      return NextResponse.json({
        success: true,
        sessionId: null,
        sessions: sessions ?? [],
        messages: [],
      });
    }

    const { data: messages, error: messagesError } = await supabase
      .from("chat_messages")
      .select("id, role, content, metadata, client_message_id")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("Failed to fetch Shenute history messages:", messagesError);
      return NextResponse.json(
        { success: false, error: "Could not load history." },
        { status: 500 },
      );
    }

    const sanitizedMessages = normalizeSavedChatMessages(
      (messages ?? [])
        .map((message) => message as SavedChatRow)
        .map((message) => ({
          id: message.client_message_id ?? message.id,
          role: message.role,
          content: message.content,
          parts: Array.isArray(message.metadata?.parts)
            ? message.metadata.parts
            : undefined,
        })),
    );

    return NextResponse.json({
      success: true,
      sessionId,
      sessions: sessions ?? [],
      messages: sanitizedMessages ?? [],
    });
  } catch (error) {
    console.error("Shenute history GET failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Could not load history.",
      },
      { status: 500 },
    );
  }
}

export async function handleShenuteHistoryPost(request: Request) {
  try {
    const payloadTooLargeResponse = getPayloadTooLargeResponse(request.headers);
    if (payloadTooLargeResponse) {
      return payloadTooLargeResponse;
    }

    if (!hasSupabaseRuntimeEnv()) {
      return NextResponse.json(
        { success: false, error: "Shenute history is unavailable right now." },
        { status: 503 },
      );
    }

    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Sign in required." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as HistoryRequestPayload;
    const sessionId =
      toOptionalUuidString(body.sessionId) ?? crypto.randomUUID();
    const messages = normalizeSavedChatMessages(parseMessages(body.messages));

    if (messages.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid messages to save." },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const { error: sessionError } = await supabase.from("chat_sessions").upsert(
      [
        {
          id: sessionId,
          user_id: user.id,
          title: "Shenute AI conversation",
          metadata: { source: "shenute" },
          updated_at: now,
        },
      ],
      { onConflict: "id" },
    );

    if (sessionError) {
      console.error(
        "Failed to create or update Shenute session:",
        sessionError,
      );
      return NextResponse.json(
        { success: false, error: "Could not save history." },
        { status: 500 },
      );
    }

    const { data: existingMessages, error: fetchError } = await supabase
      .from("chat_messages")
      .select("id, client_message_id")
      .eq("session_id", sessionId);

    if (fetchError) {
      console.error("Failed to fetch existing messages for sync:", fetchError);
    }

    const rows = messages.map((message, index) => {
      const existing = existingMessages?.find(
        (m) => m.client_message_id === message.id,
      );

      // Add a 1ms offset to each message to ensure stable ordering by created_at
      const messageDate = new Date(new Date(now).getTime() + index);

      return {
        id: existing?.id ?? crypto.randomUUID(),
        session_id: sessionId,
        client_message_id: message.id,
        role: message.role,
        content: message.content,
        metadata: {
          parts: message.parts ?? null,
        },
        created_at: messageDate.toISOString(),
      };
    });

    const { error: messagesError } = await supabase
      .from("chat_messages")
      .upsert(rows, { onConflict: "session_id, client_message_id" });

    if (messagesError) {
      console.error("Failed to upsert Shenute messages:", messagesError);
      return NextResponse.json(
        { success: false, error: "Could not save history." },
        { status: 500 },
      );
    }

    const { data: refreshedSessions, error: refreshedSessionsError } =
      await supabase
        .from("chat_sessions")
        .select("id, title, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

    if (refreshedSessionsError) {
      console.error(
        "Failed to refresh Shenute history sessions:",
        refreshedSessionsError,
      );
    }

    return NextResponse.json({
      success: true,
      sessionId,
      sessions: refreshedSessions ?? [],
    });
  } catch (error) {
    console.error("Shenute history POST failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Could not save history.",
      },
      { status: 500 },
    );
  }
}

export async function handleShenuteHistoryDelete(request: Request) {
  try {
    if (!hasSupabaseRuntimeEnv()) {
      return NextResponse.json(
        { success: false, error: "Shenute history is unavailable right now." },
        { status: 503 },
      );
    }

    const url = new URL(request.url);
    const sessionId = toOptionalUuidString(url.searchParams.get("sessionId"));

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "A valid session id is required." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Sign in required." },
        { status: 401 },
      );
    }

    const { error } = await supabase
      .from("chat_sessions")
      .delete()
      .eq("id", sessionId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to delete Shenute history session:", error);
      return NextResponse.json(
        { success: false, error: "Could not clear conversation." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, sessionId });
  } catch (error) {
    console.error("Shenute history DELETE failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Could not clear conversation.",
      },
      { status: 500 },
    );
  }
}
