import {
  isDialectFilter,
  isDictionaryEtymologyFilter,
  isDictionaryPartOfSpeechFilter,
} from "@/features/dictionary/config";
import { getDictionarySearchPage } from "@/features/dictionary/lib/dictionary";
import {
  DEFAULT_DICTIONARY_SEARCH_PAGE_SIZE,
  MAX_DICTIONARY_SEARCH_QUERY_LENGTH,
  MAX_DICTIONARY_SEARCH_PAGE_SIZE,
} from "@/features/dictionary/search";
import {
  publicApiJsonResponse,
  publicApiOptionsResponse,
} from "@/lib/api/cors";

import type { NextRequest } from "next/server";

/**
 * Returns one paginated page of dictionary results for the current query and
 * filter state so the dictionary UI does not need the full index up front.
 */
export function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const dialect = searchParams.get("dialect");
  const etymology = searchParams.get("etymology");
  const exact = searchParams.get("exact");
  const hasGreek = searchParams.get("hasGreek");
  const hasInflections = searchParams.get("hasInflections");
  const hasRelatedEntries = searchParams.get("hasRelatedEntries");
  const limit = searchParams.get("limit");
  const offset = searchParams.get("offset");
  const partOfSpeech = searchParams.get("partOfSpeech");
  const query = searchParams.get("q") ?? searchParams.get("query") ?? "";
  const trimmedQuery = query.trim();

  if (trimmedQuery.length > MAX_DICTIONARY_SEARCH_QUERY_LENGTH) {
    return publicApiJsonResponse(
      {
        error: `Search query is too long. Maximum length is ${MAX_DICTIONARY_SEARCH_QUERY_LENGTH} characters.`,
      },
      { status: 400 },
    );
  }

  if (dialect && !isDialectFilter(dialect)) {
    return publicApiJsonResponse(
      { error: `Invalid dialect filter: ${dialect}` },
      { status: 400 },
    );
  }

  if (partOfSpeech && !isDictionaryPartOfSpeechFilter(partOfSpeech)) {
    return publicApiJsonResponse(
      { error: `Invalid part-of-speech filter: ${partOfSpeech}` },
      { status: 400 },
    );
  }

  if (etymology && !isDictionaryEtymologyFilter(etymology)) {
    return publicApiJsonResponse(
      { error: `Invalid etymology filter: ${etymology}` },
      { status: 400 },
    );
  }

  if (exact && exact !== "false" && exact !== "true") {
    return publicApiJsonResponse(
      { error: `Invalid exact-match flag: ${exact}` },
      { status: 400 },
    );
  }

  for (const [name, value] of [
    ["hasGreek", hasGreek],
    ["hasInflections", hasInflections],
    ["hasRelatedEntries", hasRelatedEntries],
  ] as const) {
    if (value && value !== "false" && value !== "true") {
      return publicApiJsonResponse(
        { error: `Invalid ${name} flag: ${value}` },
        { status: 400 },
      );
    }
  }

  const validatedLimit =
    limit === null
      ? DEFAULT_DICTIONARY_SEARCH_PAGE_SIZE
      : Number.parseInt(limit, 10);
  if (!Number.isInteger(validatedLimit) || validatedLimit < 1) {
    return publicApiJsonResponse(
      { error: `Invalid search page size: ${limit}` },
      { status: 400 },
    );
  }

  const validatedOffset = offset === null ? 0 : Number.parseInt(offset, 10);
  if (!Number.isInteger(validatedOffset) || validatedOffset < 0) {
    return publicApiJsonResponse(
      { error: `Invalid search offset: ${offset}` },
      { status: 400 },
    );
  }

  const validatedDialect =
    dialect && isDialectFilter(dialect) ? dialect : "ALL";
  const validatedPartOfSpeech =
    partOfSpeech && isDictionaryPartOfSpeechFilter(partOfSpeech)
      ? partOfSpeech
      : "ALL";
  const validatedEtymology =
    etymology && isDictionaryEtymologyFilter(etymology) ? etymology : "ALL";

  return publicApiJsonResponse(
    getDictionarySearchPage({
      exactMatch: exact === "true",
      hasGreek: hasGreek === "true",
      hasInflections: hasInflections === "true",
      hasRelatedEntries: hasRelatedEntries === "true",
      limit: Math.min(validatedLimit, MAX_DICTIONARY_SEARCH_PAGE_SIZE),
      offset: validatedOffset,
      query: trimmedQuery,
      selectedDialect: validatedDialect,
      selectedEtymology: validatedEtymology,
      selectedPartOfSpeech: validatedPartOfSpeech,
    }),
    {
      headers: {
        "Cache-Control":
          "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}

/**
 * Returns the shared CORS preflight response for paginated dictionary search.
 */
export function OPTIONS() {
  return publicApiOptionsResponse();
}
