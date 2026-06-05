"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  DEFAULT_DICTIONARY_DIALECT_FILTER,
  DEFAULT_DICTIONARY_ETYMOLOGY_FILTER,
  DEFAULT_PART_OF_SPEECH_FILTER,
  isDialectFilter,
  isDictionaryEtymologyFilter,
  isDictionaryPartOfSpeechFilter,
  type DialectFilter,
  type DictionaryEtymologyFilter,
  type DictionaryPartOfSpeechFilter,
} from "@/features/dictionary/config";
import {
  DEFAULT_DICTIONARY_SEARCH_PAGE_SIZE,
  type DictionarySearchPage,
} from "@/features/dictionary/search";
import type { DictionaryClientEntry } from "@/features/dictionary/types";
import { createClient } from "@/lib/supabase/client";
import { loadBrowserUser } from "@/lib/supabase/clientAuth";

type UseDictionarySearchOptions = {
  searchPath: string;
};

type DictionarySearchRequestOptions = {
  exactMatch: boolean;
  hasGreek: boolean;
  hasInflections: boolean;
  hasRelatedEntries: boolean;
  limit: number;
  offset: number;
  query: string;
  selectedDialect: DialectFilter;
  selectedEtymology: DictionaryEtymologyFilter;
  selectedPartOfSpeech: DictionaryPartOfSpeechFilter;
};

type DictionarySearchFetchError = "initial" | "more" | null;

/**
 * Builds the public dictionary search URL for the current query, filters, and
 * page boundary without leaking default values into the request string.
 */
function buildDictionarySearchUrl(
  searchPath: string,
  {
    exactMatch,
    hasGreek,
    hasInflections,
    hasRelatedEntries,
    limit,
    offset,
    query,
    selectedDialect,
    selectedEtymology,
    selectedPartOfSpeech,
  }: DictionarySearchRequestOptions,
) {
  const params = new URLSearchParams();
  const trimmedQuery = query.trim();

  if (trimmedQuery.length > 0) {
    params.set("q", trimmedQuery);
  }

  if (selectedDialect !== "ALL") {
    params.set("dialect", selectedDialect);
  }

  if (selectedPartOfSpeech !== "ALL") {
    params.set("partOfSpeech", selectedPartOfSpeech);
  }

  if (selectedEtymology !== "ALL") {
    params.set("etymology", selectedEtymology);
  }

  if (exactMatch) {
    params.set("exact", "true");
  }

  if (hasGreek) {
    params.set("hasGreek", "true");
  }

  if (hasInflections) {
    params.set("hasInflections", "true");
  }

  if (hasRelatedEntries) {
    params.set("hasRelatedEntries", "true");
  }

  params.set("limit", String(limit));

  if (offset > 0) {
    params.set("offset", String(offset));
  }

  return `${searchPath}?${params.toString()}`;
}

/**
 * Loads dictionary search results page by page, applies saved user dialect
 * preferences, and exposes the state used by the interactive dictionary UI.
 */
export function useDictionarySearch({
  searchPath,
}: UseDictionarySearchOptions) {
  const [dictionaryLength, setDictionaryLength] = useState(0);
  const [filteredResults, setFilteredResults] = useState<
    DictionaryClientEntry[]
  >([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const [isKeyboardOpen, setKeyboardOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef({ start: 0, end: 0 });
  const [selectedPartOfSpeech, setSelectedPartOfSpeech] =
    useState<DictionaryPartOfSpeechFilter>(DEFAULT_PART_OF_SPEECH_FILTER);
  const [selectedDialect, setSelectedDialectState] = useState<DialectFilter>(
    DEFAULT_DICTIONARY_DIALECT_FILTER,
  );
  const [selectedEtymology, setSelectedEtymology] =
    useState<DictionaryEtymologyFilter>(DEFAULT_DICTIONARY_ETYMOLOGY_FILTER);
  const [exactMatch, setExactMatch] = useState<boolean>(false);
  const [hasGreek, setHasGreek] = useState(false);
  const [hasInflections, setHasInflections] = useState(false);
  const [hasRelatedEntries, setHasRelatedEntries] = useState(false);
  const [preferenceUserId, setPreferenceUserId] = useState<string | null>(null);
  const [totalMatches, setTotalMatches] = useState(0);
  const [initialSearchStateReady, setInitialSearchStateReady] = useState(false);
  const [fetchError, setFetchError] =
    useState<DictionarySearchFetchError>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const deferredQuery = useDeferredValue(query);
  const activeSearchKeyRef = useRef("");
  const hasDeepLinkedSearchStateRef = useRef(false);

  useEffect(() => {
    /**
     * Deep-linked searches hydrate from URL params so shared dictionary URLs
     * open with the intended query, filters, and match behavior already applied.
     */
    const searchParams =
      typeof window === "undefined"
        ? new URLSearchParams()
        : new URLSearchParams(window.location.search);
    const initialQuery = searchParams.get("q")?.trim() ?? "";
    const initialDialect = searchParams.get("dialect");
    const initialEtymology = searchParams.get("etymology");
    const initialPartOfSpeech = searchParams.get("partOfSpeech");
    const initialExactMatch = searchParams.get("exact") === "true";
    const initialHasGreek = searchParams.get("hasGreek") === "true";
    const initialHasInflections = searchParams.get("hasInflections") === "true";
    const initialHasRelatedEntries =
      searchParams.get("hasRelatedEntries") === "true";
    const validatedInitialDialect =
      initialDialect && isDialectFilter(initialDialect) ? initialDialect : null;
    const validatedInitialEtymology =
      initialEtymology && isDictionaryEtymologyFilter(initialEtymology)
        ? initialEtymology
        : null;
    const validatedInitialPartOfSpeech =
      initialPartOfSpeech && isDictionaryPartOfSpeechFilter(initialPartOfSpeech)
        ? initialPartOfSpeech
        : null;
    const hasInitialSearchState =
      initialQuery.length > 0 ||
      validatedInitialDialect !== null ||
      validatedInitialEtymology !== null ||
      validatedInitialPartOfSpeech !== null ||
      initialExactMatch ||
      initialHasGreek ||
      initialHasInflections ||
      initialHasRelatedEntries;

    hasDeepLinkedSearchStateRef.current = hasInitialSearchState;

    if (hasInitialSearchState) {
      queueMicrotask(() => {
        setQuery(initialQuery);
        if (validatedInitialDialect) {
          setSelectedDialectState(validatedInitialDialect);
        } else if (initialQuery.length > 0) {
          setSelectedDialectState("ALL");
        }
        if (validatedInitialPartOfSpeech) {
          setSelectedPartOfSpeech(validatedInitialPartOfSpeech);
        }
        if (validatedInitialEtymology) {
          setSelectedEtymology(validatedInitialEtymology);
        }
        setExactMatch(initialExactMatch);
        setHasGreek(initialHasGreek);
        setHasInflections(initialHasInflections);
        setHasRelatedEntries(initialHasRelatedEntries);
      });
    }

    queueMicrotask(() => {
      setInitialSearchStateReady(true);
    });
  }, []);

  useEffect(() => {
    const supabaseClient = createClient();
    if (!supabaseClient) {
      return;
    }
    const supabase = supabaseClient;

    let isMounted = true;

    async function applyUserPreference(nextUserId: string | null) {
      if (!isMounted) {
        return;
      }

      queueMicrotask(() => {
        setPreferenceUserId(nextUserId);
      });

      if (!nextUserId || hasDeepLinkedSearchStateRef.current) {
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("preferred_dictionary_dialect")
        .eq("id", nextUserId)
        .maybeSingle();

      if (!isMounted || error) {
        return;
      }

      const preferredDialect = data?.preferred_dictionary_dialect;
      if (preferredDialect && isDialectFilter(preferredDialect)) {
        queueMicrotask(() => {
          setSelectedDialectState(preferredDialect);
        });
      }
    }

    void loadBrowserUser(supabase)
      .then((nextUser) => applyUserPreference(nextUser?.id ?? null))
      .catch(() => applyUserPreference(null));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void applyUserPreference(session?.user?.id ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSelectionChange = useCallback(
    (start: number | null, end: number | null) => {
      const fallback = end ?? start ?? query.length;

      selectionRef.current = {
        start: start ?? fallback,
        end: end ?? fallback,
      };
    },
    [query.length],
  );

  const restoreInputSelection = useCallback((cursorPosition: number) => {
    requestAnimationFrame(() => {
      const input = searchInputRef.current;
      if (!input) {
        return;
      }

      input.focus();
      input.setSelectionRange(cursorPosition, cursorPosition);
      selectionRef.current = { start: cursorPosition, end: cursorPosition };
    });
  }, []);

  /**
   * Force the paginated results list to reset when the effective search state
   * changes so page boundaries do not leak across different filter sets.
   */
  const resultsKey = `${deferredQuery}\u0000${selectedPartOfSpeech}\u0000${selectedDialect}\u0000${selectedEtymology}\u0000${exactMatch}\u0000${hasGreek}\u0000${hasInflections}\u0000${hasRelatedEntries}`;

  useEffect(() => {
    if (!initialSearchStateReady || typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const trimmedQuery = deferredQuery.trim();

    if (trimmedQuery.length > 0) {
      params.set("q", trimmedQuery);
    } else {
      params.delete("q");
    }

    if (
      selectedDialect !== DEFAULT_DICTIONARY_DIALECT_FILTER ||
      trimmedQuery.length > 0
    ) {
      params.set("dialect", selectedDialect);
    } else {
      params.delete("dialect");
    }

    if (selectedPartOfSpeech !== DEFAULT_PART_OF_SPEECH_FILTER) {
      params.set("partOfSpeech", selectedPartOfSpeech);
    } else {
      params.delete("partOfSpeech");
    }

    if (selectedEtymology !== DEFAULT_DICTIONARY_ETYMOLOGY_FILTER) {
      params.set("etymology", selectedEtymology);
    } else {
      params.delete("etymology");
    }

    if (exactMatch) {
      params.set("exact", "true");
    } else {
      params.delete("exact");
    }

    if (hasGreek) {
      params.set("hasGreek", "true");
    } else {
      params.delete("hasGreek");
    }

    if (hasInflections) {
      params.set("hasInflections", "true");
    } else {
      params.delete("hasInflections");
    }

    if (hasRelatedEntries) {
      params.set("hasRelatedEntries", "true");
    } else {
      params.delete("hasRelatedEntries");
    }

    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (nextUrl !== currentUrl) {
      window.history.replaceState(null, "", nextUrl);
    }
  }, [
    deferredQuery,
    exactMatch,
    hasGreek,
    hasInflections,
    hasRelatedEntries,
    initialSearchStateReady,
    selectedDialect,
    selectedEtymology,
    selectedPartOfSpeech,
  ]);

  useEffect(() => {
    if (!initialSearchStateReady) {
      return;
    }

    const controller = new AbortController();
    const requestKey = resultsKey;
    activeSearchKeyRef.current = requestKey;
    queueMicrotask(() => {
      setFetchError(null);
      setLoading(true);
      setLoadingMore(false);
    });

    async function loadFirstPage() {
      try {
        const response = await fetch(
          buildDictionarySearchUrl(searchPath, {
            exactMatch,
            hasGreek,
            hasInflections,
            hasRelatedEntries,
            limit: DEFAULT_DICTIONARY_SEARCH_PAGE_SIZE,
            offset: 0,
            query: deferredQuery,
            selectedDialect,
            selectedEtymology,
            selectedPartOfSpeech,
          }),
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error("Dictionary search is unavailable");
        }

        const page = (await response.json()) as DictionarySearchPage;
        if (
          controller.signal.aborted ||
          activeSearchKeyRef.current !== requestKey
        ) {
          return;
        }

        queueMicrotask(() => {
          setDictionaryLength(page.totalEntries);
          setFetchError(null);
          setFilteredResults(page.entries);
          setHasMoreResults(page.hasMore);
          setTotalMatches(page.totalMatches);
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.warn("Dictionary search results are unavailable.", error);
        if (activeSearchKeyRef.current !== requestKey) {
          return;
        }

        queueMicrotask(() => {
          setDictionaryLength(0);
          setFetchError("initial");
          setFilteredResults([]);
          setHasMoreResults(false);
          setTotalMatches(0);
        });
      } finally {
        if (
          controller.signal.aborted ||
          activeSearchKeyRef.current !== requestKey
        ) {
          return;
        }

        queueMicrotask(() => {
          setLoading(false);
        });
      }
    }

    void loadFirstPage();

    return () => {
      controller.abort();
    };
  }, [
    deferredQuery,
    exactMatch,
    hasGreek,
    hasInflections,
    hasRelatedEntries,
    initialSearchStateReady,
    resultsKey,
    retryNonce,
    searchPath,
    selectedDialect,
    selectedEtymology,
    selectedPartOfSpeech,
  ]);

  const loadMoreResults = useCallback(() => {
    if (!initialSearchStateReady || loading || loadingMore || !hasMoreResults) {
      return;
    }

    const requestKey = resultsKey;
    queueMicrotask(() => {
      setFetchError(null);
      setLoadingMore(true);
    });

    async function loadNextPage() {
      try {
        const response = await fetch(
          buildDictionarySearchUrl(searchPath, {
            exactMatch,
            hasGreek,
            hasInflections,
            hasRelatedEntries,
            limit: DEFAULT_DICTIONARY_SEARCH_PAGE_SIZE,
            offset: filteredResults.length,
            query: deferredQuery,
            selectedDialect,
            selectedEtymology,
            selectedPartOfSpeech,
          }),
        );

        if (!response.ok) {
          throw new Error("Dictionary search page is unavailable");
        }

        const page = (await response.json()) as DictionarySearchPage;
        if (activeSearchKeyRef.current !== requestKey) {
          return;
        }

        queueMicrotask(() => {
          setDictionaryLength(page.totalEntries);
          setFetchError(null);
          setFilteredResults((previousResults) =>
            activeSearchKeyRef.current === requestKey
              ? [...previousResults, ...page.entries]
              : previousResults,
          );
          setHasMoreResults(page.hasMore);
          setTotalMatches(page.totalMatches);
        });
      } catch (error) {
        console.warn("Dictionary results could not be extended.", error);
        if (activeSearchKeyRef.current === requestKey) {
          queueMicrotask(() => {
            setFetchError("more");
          });
        }
      } finally {
        if (activeSearchKeyRef.current === requestKey) {
          queueMicrotask(() => {
            setLoadingMore(false);
          });
        }
      }
    }

    void loadNextPage();
  }, [
    deferredQuery,
    exactMatch,
    filteredResults.length,
    hasGreek,
    hasMoreResults,
    hasInflections,
    hasRelatedEntries,
    initialSearchStateReady,
    loading,
    loadingMore,
    resultsKey,
    searchPath,
    selectedDialect,
    selectedEtymology,
    selectedPartOfSpeech,
  ]);

  const retrySearch = useCallback(() => {
    setFetchError(null);
    setRetryNonce((current) => current + 1);
  }, []);

  const handleKeyboardAppend = useCallback(
    (char: string) => {
      setQuery((previousQuery) => {
        const start = Math.min(
          selectionRef.current.start,
          previousQuery.length,
        );
        const end = Math.min(selectionRef.current.end, previousQuery.length);
        const nextQuery =
          previousQuery.slice(0, start) + char + previousQuery.slice(end);
        const nextCursor = start + char.length;

        selectionRef.current = { start: nextCursor, end: nextCursor };
        restoreInputSelection(nextCursor);

        return nextQuery;
      });
    },
    [restoreInputSelection],
  );

  const handleKeyboardBackspace = useCallback(() => {
    setQuery((previousQuery) => {
      const start = Math.min(selectionRef.current.start, previousQuery.length);
      const end = Math.min(selectionRef.current.end, previousQuery.length);

      if (start !== end) {
        const nextQuery =
          previousQuery.slice(0, start) + previousQuery.slice(end);
        selectionRef.current = { start, end: start };
        restoreInputSelection(start);
        return nextQuery;
      }

      if (start === 0) {
        restoreInputSelection(0);
        return previousQuery;
      }

      const nextCursor = start - 1;
      const nextQuery =
        previousQuery.slice(0, nextCursor) + previousQuery.slice(end);
      selectionRef.current = { start: nextCursor, end: nextCursor };
      restoreInputSelection(nextCursor);
      return nextQuery;
    });
  }, [restoreInputSelection]);

  const setSelectedDialect = useCallback(
    (value: DialectFilter) => {
      queueMicrotask(() => {
        setSelectedDialectState(value);
      });

      if (!preferenceUserId) {
        return;
      }

      const supabase = createClient();
      if (!supabase) {
        return;
      }

      void supabase
        .from("profiles")
        .update({ preferred_dictionary_dialect: value })
        .eq("id", preferenceUserId);
    },
    [preferenceUserId],
  );

  return {
    dictionaryLength,
    exactMatch,
    fetchError,
    filteredResults,
    handleKeyboardAppend,
    handleKeyboardBackspace,
    handleSelectionChange,
    hasGreek,
    hasInflections,
    hasMoreResults,
    hasRelatedEntries,
    isKeyboardOpen,
    loadMoreResults,
    loading,
    loadingMore,
    query,
    resultsKey,
    retrySearch,
    searchInputRef,
    selectedDialect,
    selectedEtymology,
    selectedPartOfSpeech,
    setExactMatch,
    setHasGreek,
    setHasInflections,
    setHasRelatedEntries,
    setKeyboardOpen,
    setQuery,
    setSelectedDialect,
    setSelectedEtymology,
    setSelectedPartOfSpeech,
    totalMatches,
    visibleQuery: deferredQuery,
  };
}
