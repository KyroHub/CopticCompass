import type {
  DialectFilter,
  DictionaryEtymologyFilter,
  DictionaryPartOfSpeechFilter,
} from "@/features/dictionary/config";
import { entryMatchesPartOfSpeechFilter } from "@/features/dictionary/lib/entryGrammar";
import { getLocalizedMeaningValues } from "@/features/dictionary/lib/entryText";
import type {
  DictionaryClientEntry,
  DictionarySearchMatch,
  DictionarySearchMatchKind,
} from "@/features/dictionary/types";
import { normalizeCopticSearchText } from "@/lib/copticSearch";

export const DEFAULT_DICTIONARY_SEARCH_PAGE_SIZE = 50;
export const MAX_DICTIONARY_SEARCH_PAGE_SIZE = 100;
export const MAX_DICTIONARY_SEARCH_QUERY_LENGTH = 120;

interface PreparedLexicalEntry {
  englishSearchText: string;
  dutchSearchText: string;
  greekSearchText: string;
  index: number;
  normalizedHeadword: string;
  normalizedDialectForms: string;
  normalizedInflectedForms: string;
}

type PreparedLexicalEntryMatch = DictionarySearchMatch & {
  score: number;
};

const SEARCH_MATCH_SCORES = {
  headword: 500,
  "dialect-form": 400,
  inflection: 300,
  meaning: 200,
  greek: 100,
} as const satisfies Record<DictionarySearchMatchKind, number>;

function getGreekContextSearchValues(entry: DictionaryClientEntry): string[] {
  return [
    ...(entry.greekContext?.sources ?? []),
    ...(entry.greekContext?.equivalents ?? []),
  ];
}

export interface DictionarySearchPageOptions {
  exactMatch?: boolean;
  hasGreek?: boolean;
  hasInflections?: boolean;
  hasRelatedEntries?: boolean;
  limit?: number;
  offset?: number;
  query?: string;
  selectedDialect?: DialectFilter;
  selectedEtymology?: DictionaryEtymologyFilter;
  selectedPartOfSpeech?: DictionaryPartOfSpeechFilter;
}

export interface DictionarySearchPage {
  entries: DictionaryClientEntry[];
  hasMore: boolean;
  limit: number;
  nextOffset: number | null;
  offset: number;
  totalEntries: number;
  totalMatches: number;
}

type RankedDictionarySearchMatch = {
  entry: DictionaryClientEntry;
  index: number;
  score: number;
};

type SearchPreparedDictionaryPageArgs = DictionarySearchPageOptions & {
  dictionary: readonly DictionaryClientEntry[];
  preparedDictionary: readonly PreparedLexicalEntry[];
};

function getSearchableDialectFormText(
  dialects: DictionaryClientEntry["dialects"],
) {
  return Object.values(dialects)
    .flatMap((forms) => [
      forms.absolute,
      forms.nominal,
      forms.pronominal,
      forms.stative,
      ...(forms.participles ?? []),
      ...(forms.variants?.absolute ?? []),
      ...(forms.variants?.nominal ?? []),
      ...(forms.variants?.pronominal ?? []),
      ...(forms.variants?.stative ?? []),
      ...(forms.variants?.constructParticiples ?? []),
    ])
    .filter(Boolean)
    .join(" ");
}

function getSearchableInflectedFormText(
  entry: Pick<DictionaryClientEntry, "inflections">,
) {
  if (!entry.inflections) {
    return "";
  }

  const texts: string[] = [];
  const addForms = (forms: unknown) => {
    if (!Array.isArray(forms)) {
      return;
    }

    for (const form of forms) {
      texts.push(typeof form === "string" ? form : form.form);
    }
  };

  for (const dialects of Object.values(entry.inflections)) {
    if (!dialects) {
      continue;
    }

    for (const roles of Object.values(dialects)) {
      if (!roles) {
        continue;
      }

      for (const [role, forms] of Object.entries(roles)) {
        if (
          role === "variants" &&
          forms &&
          typeof forms === "object" &&
          !Array.isArray(forms)
        ) {
          for (const variantForms of Object.values(forms)) {
            addForms(variantForms);
          }
        } else {
          addForms(forms);
        }
      }
    }
  }
  return texts.filter(Boolean).join(" ");
}

/**
 * Precomputes the normalized search fields used by interactive dictionary
 * filtering so repeated queries do not rebuild the same derived strings.
 */
export function prepareDictionaryForSearch(
  dictionary: readonly DictionaryClientEntry[],
): PreparedLexicalEntry[] {
  return dictionary.map((entry, index) => {
    const dialectForms = getSearchableDialectFormText(entry.dialects);
    const inflectedFormsText = getSearchableInflectedFormText(entry);

    return {
      englishSearchText: [...getLocalizedMeaningValues(entry, "en")]
        .join(" ")
        .toLowerCase(),
      dutchSearchText: [...getLocalizedMeaningValues(entry, "nl")]
        .join(" ")
        .toLowerCase(),
      greekSearchText: getGreekContextSearchValues(entry)
        .join(" ")
        .toLowerCase(),
      index,
      normalizedHeadword: normalizeCopticSearchText(entry.headword),
      normalizedDialectForms: normalizeCopticSearchText(dialectForms),
      normalizedInflectedForms: normalizeCopticSearchText(inflectedFormsText),
    };
  });
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getRegexMatch(
  kind: DictionarySearchMatchKind,
  text: string,
  regex: RegExp | null,
): PreparedLexicalEntryMatch | null {
  if (!text || !regex?.test(text)) {
    return null;
  }

  return {
    exact: true,
    kind,
    score: SEARCH_MATCH_SCORES[kind] + 50,
  };
}

function getSubstringMatch(options: {
  kind: DictionarySearchMatchKind;
  query: string;
  text: string;
}): PreparedLexicalEntryMatch | null {
  const { kind, query, text } = options;

  if (!text || !query || !text.includes(query)) {
    return null;
  }

  return {
    exact: text.trim() === query,
    kind,
    score: SEARCH_MATCH_SCORES[kind] + (text.trim() === query ? 50 : 0),
  };
}

function firstMatch(
  matches: Array<PreparedLexicalEntryMatch | null>,
): PreparedLexicalEntryMatch | null {
  return matches.find((match) => match !== null) ?? null;
}

/**
 * Applies the dictionary query and filters in a single pass. Query searches
 * keep the full ranked match list; filter-only browsing streams one page.
 */
export function searchPreparedDictionaryPage(
  options: SearchPreparedDictionaryPageArgs,
): DictionarySearchPage {
  const {
    exactMatch = false,
    limit = DEFAULT_DICTIONARY_SEARCH_PAGE_SIZE,
    offset = 0,
    query = "",
    preparedDictionary,
    dictionary,
    selectedDialect = "ALL",
    selectedEtymology = "ALL",
    selectedPartOfSpeech = "ALL",
    hasGreek = false,
    hasInflections = false,
    hasRelatedEntries = false,
  } = options;

  const sanitizedLimit = Math.max(1, Math.trunc(limit));
  const sanitizedOffset = Math.max(0, Math.trunc(offset));
  const trimmedQuery = query.trim();
  const plainQuery = trimmedQuery.toLowerCase();
  const normalizedQuery = normalizeCopticSearchText(trimmedQuery);
  const usesQuery = trimmedQuery.length > 0;
  const matchedEntries: RankedDictionarySearchMatch[] = [];
  const pageEntries: DictionaryClientEntry[] = [];

  let plainRegex: RegExp | null = null;
  let normalizedRegex: RegExp | null = null;

  if (usesQuery && exactMatch) {
    plainRegex = new RegExp(
      `(^|[^\\p{L}\\p{M}\\p{N}_])${escapeRegExp(plainQuery)}([^\\p{L}\\p{M}\\p{N}_]|$)`,
      "ui",
    );
    normalizedRegex = new RegExp(
      `(^|[^\\p{L}\\p{M}\\p{N}_])${escapeRegExp(normalizedQuery)}([^\\p{L}\\p{M}\\p{N}_]|$)`,
      "ui",
    );
  }

  let totalMatches = 0;

  for (const preparedEntry of preparedDictionary) {
    const entry = dictionary[preparedEntry.index];
    if (!entry) {
      continue;
    }

    const queryMatch = usesQuery
      ? getPreparedEntryQueryMatch(
          preparedEntry,
          exactMatch,
          normalizedQuery,
          plainQuery,
          normalizedRegex,
          plainRegex,
        )
      : null;

    if (usesQuery && !queryMatch) {
      continue;
    }

    if (
      !matchesDictionaryEntryFilters(
        entry,
        selectedDialect,
        selectedEtymology,
        selectedPartOfSpeech,
        hasGreek,
        hasInflections,
        hasRelatedEntries,
      )
    ) {
      continue;
    }

    if (usesQuery && queryMatch) {
      matchedEntries.push({
        entry: {
          ...entry,
          searchMatch: { exact: queryMatch.exact, kind: queryMatch.kind },
        },
        index: preparedEntry.index,
        score: queryMatch.score,
      });
    } else if (
      totalMatches >= sanitizedOffset &&
      pageEntries.length < sanitizedLimit
    ) {
      pageEntries.push(entry);
    }

    totalMatches += 1;
  }

  if (usesQuery) {
    matchedEntries.sort(
      (left, right) => right.score - left.score || left.index - right.index,
    );
    pageEntries.push(
      ...matchedEntries
        .slice(sanitizedOffset, sanitizedOffset + sanitizedLimit)
        .map((match) => match.entry),
    );
  }

  const nextOffset =
    sanitizedOffset + pageEntries.length < totalMatches
      ? sanitizedOffset + pageEntries.length
      : null;

  return {
    entries: pageEntries,
    hasMore: nextOffset !== null,
    limit: sanitizedLimit,
    nextOffset,
    offset: sanitizedOffset,
    totalEntries: dictionary.length,
    totalMatches,
  };
}

function matchesDictionaryEntryFilters(
  entry: DictionaryClientEntry,
  selectedDialect: DialectFilter,
  selectedEtymology: DictionaryEtymologyFilter,
  selectedPartOfSpeech: DictionaryPartOfSpeechFilter,
  hasGreek: boolean,
  hasInflections: boolean,
  hasRelatedEntries: boolean,
) {
  if (!entryMatchesPartOfSpeechFilter(entry, selectedPartOfSpeech)) {
    return false;
  }

  if (selectedEtymology !== "ALL" && entry.etym !== selectedEtymology) {
    return false;
  }

  if (
    selectedDialect !== "ALL" &&
    entry.dialects[selectedDialect] === undefined &&
    !(
      entry.inflections &&
      Object.values(entry.inflections).some(
        (dialects) => dialects && dialects[selectedDialect] !== undefined,
      )
    )
  ) {
    return false;
  }

  if (hasGreek && !entryHasGreekContext(entry)) {
    return false;
  }

  if (hasInflections && !entryHasInflectedForms(entry)) {
    return false;
  }

  if (hasRelatedEntries && !entryHasRelatedEntries(entry)) {
    return false;
  }

  return true;
}

function entryHasGreekContext(entry: DictionaryClientEntry) {
  return getGreekContextSearchValues(entry).some(
    (value) => value.trim().length > 0,
  );
}

function entryHasInflectedForms(entry: DictionaryClientEntry) {
  return getSearchableInflectedFormText(entry).trim().length > 0;
}

function entryHasRelatedEntries(entry: DictionaryClientEntry) {
  return (entry.relations?.length ?? 0) > 0;
}

function getPreparedEntryQueryMatch(
  entry: PreparedLexicalEntry,
  exactMatch: boolean,
  normalizedQuery: string,
  plainQuery: string,
  normalizedRegex: RegExp | null,
  plainRegex: RegExp | null,
): PreparedLexicalEntryMatch | null {
  if (exactMatch && normalizedRegex && plainRegex) {
    return firstMatch([
      getRegexMatch("headword", entry.normalizedHeadword, normalizedRegex),
      getRegexMatch(
        "dialect-form",
        entry.normalizedDialectForms,
        normalizedRegex,
      ),
      getRegexMatch(
        "inflection",
        entry.normalizedInflectedForms,
        normalizedRegex,
      ),
      getRegexMatch("meaning", entry.englishSearchText, plainRegex),
      getRegexMatch("meaning", entry.dutchSearchText, plainRegex),
      getRegexMatch("greek", entry.greekSearchText, plainRegex),
    ]);
  }

  return firstMatch([
    getSubstringMatch({
      kind: "headword",
      query: normalizedQuery,
      text: entry.normalizedHeadword,
    }),
    getSubstringMatch({
      kind: "dialect-form",
      query: normalizedQuery,
      text: entry.normalizedDialectForms,
    }),
    getSubstringMatch({
      kind: "inflection",
      query: normalizedQuery,
      text: entry.normalizedInflectedForms,
    }),
    getSubstringMatch({
      kind: "meaning",
      query: plainQuery,
      text: entry.englishSearchText,
    }),
    getSubstringMatch({
      kind: "meaning",
      query: plainQuery,
      text: entry.dutchSearchText,
    }),
    getSubstringMatch({
      kind: "greek",
      query: plainQuery,
      text: entry.greekSearchText,
    }),
  ]);
}

/**
 * Searches the prepared index either by substring or whole-token matching
 * across headwords, dialect forms, and translated gloss text.
 */
export function searchPreparedDictionary(
  query: string,
  preparedDictionary: readonly PreparedLexicalEntry[],
  dictionary: readonly DictionaryClientEntry[],
  exactMatch: boolean = false,
): DictionaryClientEntry[] {
  return searchPreparedDictionaryPage({
    dictionary,
    exactMatch,
    limit: dictionary.length || DEFAULT_DICTIONARY_SEARCH_PAGE_SIZE,
    preparedDictionary,
    query,
  }).entries;
}

/**
 * Convenience wrapper that prepares the dictionary and runs a search in one
 * call for places that do not keep a cached prepared index.
 */
function _searchDictionary(
  query: string,
  dictionary: readonly DictionaryClientEntry[],
  exactMatch: boolean = false,
): DictionaryClientEntry[] {
  return searchPreparedDictionary(
    query,
    prepareDictionaryForSearch(dictionary),
    dictionary,
    exactMatch,
  );
}
