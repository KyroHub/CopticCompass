"use server";

import {
  searchCopticDocuments as searchCopticDocumentsQuery,
  searchVocabularyByKeywords as searchVocabularyByKeywordsQuery,
} from "@/features/shenute/lib/server/retrieval";

export async function searchCopticDocuments(
  ...args: Parameters<typeof searchCopticDocumentsQuery>
): ReturnType<typeof searchCopticDocumentsQuery> {
  return searchCopticDocumentsQuery(...args);
}

export async function searchVocabularyByKeywords(
  ...args: Parameters<typeof searchVocabularyByKeywordsQuery>
): ReturnType<typeof searchVocabularyByKeywordsQuery> {
  return searchVocabularyByKeywordsQuery(...args);
}
