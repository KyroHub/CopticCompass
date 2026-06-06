import { NextResponse } from "next/server";

import {
  isShenuteHistoryPayloadTooLarge,
  normalizeShenuteSavedChatMessages,
  normalizeShenuteSavedChatRows,
  parseShenuteHistoryMessages,
  toOptionalShenuteHistorySessionId,
} from "@/lib/shenute/historyPayload";
import { getAuthenticatedUser } from "@/lib/supabase/authQueries";
import {
  deleteChatSessionForUser,
  listChatMessagesForSession,
  listChatMessageSyncRows,
  listChatSessionsForUser,
  upsertChatMessages,
  upsertChatSession,
  type ChatMessageUpsertRow,
} from "@/lib/supabase/chatHistory";
import { hasSupabaseRuntimeEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type HistoryRequestPayload = {
  sessionId?: unknown;
  messages?: unknown;
};

function getPayloadTooLargeResponse(headers: Headers) {
  if (!isShenuteHistoryPayloadTooLarge(headers.get("content-length"))) {
    return null;
  }

  return NextResponse.json(
    { success: false, error: "Shenute history payload is too large." },
    { status: 413 },
  );
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
    const requestedSessionId = toOptionalShenuteHistorySessionId(
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

    const { data: sessions, error: sessionsError } =
      await listChatSessionsForUser(supabase, user.id);

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

    const { data: messages, error: messagesError } =
      await listChatMessagesForSession(supabase, sessionId);

    if (messagesError) {
      console.error("Failed to fetch Shenute history messages:", messagesError);
      return NextResponse.json(
        { success: false, error: "Could not load history." },
        { status: 500 },
      );
    }

    const sanitizedMessages = normalizeShenuteSavedChatRows(messages ?? []);

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
      toOptionalShenuteHistorySessionId(body.sessionId) ?? crypto.randomUUID();
    const messages = normalizeShenuteSavedChatMessages(
      parseShenuteHistoryMessages(body.messages),
    );

    if (messages.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid messages to save." },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const { error: sessionError } = await upsertChatSession(supabase, {
      id: sessionId,
      user_id: user.id,
      title: "Shenute AI conversation",
      metadata: { source: "shenute" },
      updated_at: now,
    });

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

    const { data: existingMessages, error: fetchError } =
      await listChatMessageSyncRows(supabase, sessionId);

    if (fetchError) {
      console.error("Failed to fetch existing messages for sync:", fetchError);
    }

    const rows: ChatMessageUpsertRow[] = messages.map((message, index) => {
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

    const { error: messagesError } = await upsertChatMessages(supabase, rows);

    if (messagesError) {
      console.error("Failed to upsert Shenute messages:", messagesError);
      return NextResponse.json(
        { success: false, error: "Could not save history." },
        { status: 500 },
      );
    }

    const { data: refreshedSessions, error: refreshedSessionsError } =
      await listChatSessionsForUser(supabase, user.id);

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
    const sessionId = toOptionalShenuteHistorySessionId(
      url.searchParams.get("sessionId"),
    );

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

    const { error } = await deleteChatSessionForUser(supabase, {
      sessionId,
      userId: user.id,
    });

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
