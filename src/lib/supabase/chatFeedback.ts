import "server-only";

import type { AppSupabaseClient } from "@/lib/supabase/queryTypes";
import type { TablesInsert } from "@/types/supabase";

type ChatFeedbackEventInsert = TablesInsert<"chat_feedback_events">;

/**
 * Stores one Shenute feedback event for audit, moderation, and later RAG
 * learning ingestion.
 */
export async function insertChatFeedbackEvent(
  supabase: AppSupabaseClient,
  row: ChatFeedbackEventInsert,
) {
  const { error } = await supabase.from("chat_feedback_events").insert(row);

  return { error };
}
