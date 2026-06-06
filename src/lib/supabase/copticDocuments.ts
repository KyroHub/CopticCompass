import "server-only";

import type { AppSupabaseClient } from "@/lib/supabase/queryTypes";
import type { Json, Tables, TablesInsert } from "@/types/supabase";

export type CopticDocumentInsertRow = TablesInsert<"coptic_documents"> & {
  content: string;
  embedding: string;
  metadata: Json;
};

type CopticDocumentMetadataRow = Pick<Tables<"coptic_documents">, "metadata">;

export type CopticDocumentMatch = {
  content: string;
  metadata: Record<string, unknown> | null;
  [key: string]: unknown;
};

type MatchDocumentsRpcArgs = {
  filter_metadata: Record<string, unknown>;
  match_count: number;
  query_embedding: string;
  query_text: string;
};

type MatchDocumentsRpcResult = {
  data: CopticDocumentMatch[] | null;
  error: { message: string } | null;
};

/**
 * Lists Coptic document metadata rows for a source title, used before replacing
 * an existing RAG source.
 */
export async function listCopticDocumentMetadataBySourceName(
  supabase: AppSupabaseClient,
  sourceName: string,
  limit = 1,
) {
  const { data, error } = await supabase
    .from("coptic_documents")
    .select("metadata")
    .eq("metadata->>sourceName", sourceName)
    .limit(limit);

  return {
    data: (data ?? null) as CopticDocumentMetadataRow[] | null,
    error,
  };
}

/**
 * Deletes all RAG document chunks for one source title.
 */
export async function deleteCopticDocumentsBySourceName(
  supabase: AppSupabaseClient,
  sourceName: string,
) {
  const { error } = await supabase
    .from("coptic_documents")
    .delete()
    .eq("metadata->>sourceName", sourceName);

  return { error };
}

/**
 * Inserts RAG document rows into the shared coptic_documents vector table.
 */
export async function insertCopticDocumentRows(
  supabase: AppSupabaseClient,
  rows: readonly CopticDocumentInsertRow[],
) {
  const { error } = await supabase.from("coptic_documents").insert([...rows]);

  return { error };
}

/**
 * Runs the vector-search RPC with a bound Supabase client context.
 */
export async function matchCopticDocuments(
  supabase: AppSupabaseClient,
  args: MatchDocumentsRpcArgs,
) {
  const matchDocuments = supabase.rpc.bind(supabase) as unknown as (
    fn: "match_coptic_documents",
    args: MatchDocumentsRpcArgs,
  ) => Promise<MatchDocumentsRpcResult>;

  return matchDocuments("match_coptic_documents", args);
}

/**
 * Searches vocabulary chunks by sanitized content filters.
 */
export async function searchCopticVocabularyDocumentsByContentFilters(
  supabase: AppSupabaseClient,
  orFilters: string,
) {
  const { data, error } = await supabase
    .from("coptic_documents")
    .select("content, metadata")
    .or(orFilters)
    .in("metadata->>type", ["vocabulary", "vocabulary_xml"])
    .limit(30);

  return {
    data: (data ?? null) as CopticDocumentMatch[] | null,
    error,
  };
}

/**
 * Counts vector-table rows without loading document data.
 */
export async function countCopticDocuments(supabase: AppSupabaseClient) {
  const { count, error } = await supabase
    .from("coptic_documents")
    .select("id", { count: "exact", head: true });

  return { count, error };
}
