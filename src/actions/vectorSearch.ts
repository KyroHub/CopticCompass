"use server";

import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { generateHFEmbedding } from "@/lib/hf";
import { generateOpenRouterEmbeddings } from "@/lib/openrouter";
import { embedMany } from "ai";
import { getGeminiEmbeddingModel } from "@/lib/gemini";

const GEMINI_EMBEDDING_OUTPUT_DIMENSION = Number(
  process.env.GEMINI_EMBEDDING_OUTPUT_DIMENSION ?? "3072",
);

function normalizeEmbeddingDimensions(
  embedding: number[],
  targetDimensions = 768,
) {
  if (embedding.length === targetDimensions) {
    return embedding;
  }

  if (embedding.length > targetDimensions) {
    return embedding.slice(0, targetDimensions);
  }

  return [
    ...embedding,
    ...new Array(targetDimensions - embedding.length).fill(0),
  ];
}

export async function searchCopticDocuments(
  query: string,
  matchCount: number = 5,
  metadataFilter: Record<string, unknown> = {},
  provider: "hf" | "gemini" | "openrouter" = "hf",
) {
  let rawEmbedding: number[];

  if (provider === "openrouter") {
    const embeds = await generateOpenRouterEmbeddings([query]);
    if (!embeds || embeds.length === 0)
      throw new Error("OpenRouter embedding failed");
    rawEmbedding = embeds[0];
  } else if (provider === "gemini") {
    const { embeddings } = await embedMany({
      model: getGeminiEmbeddingModel(),
      values: [query],
      providerOptions: {
        google: {
          outputDimensionality: GEMINI_EMBEDDING_OUTPUT_DIMENSION,
          taskType: "RETRIEVAL_DOCUMENT",
        },
      },
    });
    if (!embeddings || embeddings.length === 0)
      throw new Error("Gemini embedding failed");
    rawEmbedding = embeddings[0];
  } else {
    rawEmbedding = await generateHFEmbedding(query);
  }

  const queryEmbedding = normalizeEmbeddingDimensions(rawEmbedding, 768);

  const supabase = createServiceRoleClient();

  const { data, error } = await (supabase.rpc as any)(
    "match_coptic_documents",
    {
      query_embedding: `[${queryEmbedding.join(",")}]`,
      query_text: query,
      match_count: matchCount,
      filter_metadata: metadataFilter,
    },
  );

  if (error) {
    throw new Error(`Vector search failed: ${error.message}`);
  }

  return (data as any[]) || [];
}

export async function getAllGrammarRules() {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("coptic_documents")
    .select("content, metadata")
    .eq("metadata->>type", "grammar");

  if (error) {
    console.error("Failed to fetch grammar chunks:", error.message);
    return [];
  }

  return (data as any[]) || [];
}

export async function searchVocabularyByKeywords(keywords: string[]) {
  if (!keywords || keywords.length === 0) return [];
  const supabase = createServiceRoleClient();

  // Create an ILIKE query for each keyword
  const orFilters = keywords
    .map((kw) => {
      const cleanKw = kw.replace(/[^a-zA-ZäöüßÄÖÜ0-9]/g, "");
      return `content.ilike.%${cleanKw}%`;
    })
    .join(",");

  const { data, error } = await supabase
    .from("coptic_documents")
    .select("content, metadata")
    .or(orFilters)
    .in("metadata->>type", ["vocabulary", "vocabulary_xml"])
    .limit(30);

  if (error) {
    console.error(
      "Failed to search vocabulary chunks by keyword:",
      error.message,
    );
    return [];
  }

  return (data as any[]) || [];
}
