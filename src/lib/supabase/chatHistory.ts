import "server-only";

import type { AppSupabaseClient } from "@/lib/supabase/queryTypes";
import type { Json, Tables, TablesInsert } from "@/types/supabase";

type ChatSessionSummary = Pick<
  Tables<"chat_sessions">,
  "id" | "title" | "updated_at"
>;

type ChatMessageHistoryRow = Pick<
  Tables<"chat_messages">,
  "client_message_id" | "content" | "id" | "role"
> & {
  metadata: {
    parts?: Array<{ text: string; type: "text" }> | null;
  } | null;
};

type ChatMessageSyncRow = Pick<
  Tables<"chat_messages">,
  "client_message_id" | "id"
>;

type ChatSessionUpsertRow = Pick<
  TablesInsert<"chat_sessions">,
  "id" | "metadata" | "title" | "updated_at" | "user_id"
>;

export type ChatMessageUpsertRow = Pick<
  TablesInsert<"chat_messages">,
  | "client_message_id"
  | "content"
  | "created_at"
  | "id"
  | "metadata"
  | "role"
  | "session_id"
> & {
  metadata: Json;
};

/**
 * Lists a user's Shenute chat sessions ordered by newest activity first.
 */
export async function listChatSessionsForUser(
  supabase: AppSupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("id, title, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  return {
    data: (data ?? null) as ChatSessionSummary[] | null,
    error,
  };
}

/**
 * Lists the persisted messages for one chat session in chronological order.
 */
export async function listChatMessagesForSession(
  supabase: AppSupabaseClient,
  sessionId: string,
) {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, role, content, metadata, client_message_id")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  return {
    data: (data ?? null) as ChatMessageHistoryRow[] | null,
    error,
  };
}

/**
 * Creates or updates the session shell before message rows are synchronized.
 */
export async function upsertChatSession(
  supabase: AppSupabaseClient,
  row: ChatSessionUpsertRow,
) {
  const { error } = await supabase
    .from("chat_sessions")
    .upsert([row], { onConflict: "id" });

  return { error };
}

/**
 * Lists existing message ids for conflict-aware synchronization by client id.
 */
export async function listChatMessageSyncRows(
  supabase: AppSupabaseClient,
  sessionId: string,
) {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, client_message_id")
    .eq("session_id", sessionId);

  return {
    data: (data ?? null) as ChatMessageSyncRow[] | null,
    error,
  };
}

/**
 * Upserts message rows by the session/client-message uniqueness constraint.
 */
export async function upsertChatMessages(
  supabase: AppSupabaseClient,
  rows: readonly ChatMessageUpsertRow[],
) {
  const { error } = await supabase
    .from("chat_messages")
    .upsert([...rows], { onConflict: "session_id, client_message_id" });

  return { error };
}

/**
 * Deletes a user-owned chat session. Database cascades remove its messages.
 */
export async function deleteChatSessionForUser(
  supabase: AppSupabaseClient,
  options: {
    sessionId: string;
    userId: string;
  },
) {
  const { error } = await supabase
    .from("chat_sessions")
    .delete()
    .eq("id", options.sessionId)
    .eq("user_id", options.userId);

  return { error };
}
