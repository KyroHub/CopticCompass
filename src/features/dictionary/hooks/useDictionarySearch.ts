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
  DEFAULT_PART_OF_SPEECH_FILTER,
  isDialectFilter,
  type DialectFilter,
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
  limit: number;
  offset: number;
  query: string;
  selectedDialect: DialectFilter;
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
    limit,
    offset,
    query,
    selectedDialect,
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

  if (exactMatch) {
    params.set("exact", "true");
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
  const [exactMatch, setExactMatch] = useState<boolean>(false);
  const [preferenceUserId, setPreferenceUserId] = useState<string | null>(null);
  const [totalMatches, setTotalMatches] = useState(0);
  const [initialSearchStateReady, setInitialSearchStateReady] = useState(false);
  const [fetchError, setFetchError] =
    useState<DictionarySearchFetchError>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const deferredQuery = useDeferredValue(query);
  const activeSearchKeyRef = useRef("");
  const hasDeepLinkedQueryRef = useRef(false);

  useEffect(() => {
    /**
     * Deep-linked searches hydrate from `?q=` so shared dictionary URLs open
     * with the intended query and the broadest dialect filter already applied.
     */
    const initialQuery =
      typeof window === "undefined"
        ? ""
        : (new URLSearchParams(window.location.search).get("q")?.trim() ?? "");
    hasDeepLinkedQueryRef.current = initialQuery.length > 0;

    if (initialQuery.length > 0) {
      queueMicrotask(() => {
        setQuery(initialQuery);
        setSelectedDialectState("ALL");
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

      if (!nextUserId || hasDeepLinkedQueryRef.current) {
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
  const resultsKey = `${deferredQuery}\u0000${selectedPartOfSpeech}\u0000${selectedDialect}\u0000${exactMatch}`;

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
            limit: DEFAULT_DICTIONARY_SEARCH_PAGE_SIZE,
            offset: 0,
            query: deferredQuery,
            selectedDialect,
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
    initialSearchStateReady,
    resultsKey,
    retryNonce,
    searchPath,
    selectedDialect,
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
            limit: DEFAULT_DICTIONARY_SEARCH_PAGE_SIZE,
            offset: filteredResults.length,
            query: deferredQuery,
            selectedDialect,
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
    hasMoreResults,
    initialSearchStateReady,
    loading,
    loadingMore,
    resultsKey,
    searchPath,
    selectedDialect,
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
    hasMoreResults,
    isKeyboardOpen,
    loadMoreResults,
    loading,
    loadingMore,
    query,
    resultsKey,
    retrySearch,
    searchInputRef,
    selectedDialect,
    selectedPartOfSpeech,
    setExactMatch,
    setKeyboardOpen,
    setQuery,
    setSelectedDialect,
    setSelectedPartOfSpeech,
    totalMatches,
    visibleQuery: deferredQuery,
  };
}
