"use client";

import { useCallback, useMemo, useState } from "react";

import {
  DEFAULT_DICTIONARY_FLASHCARD_DECK_FILTERS,
  filterDictionaryFlashcardDeckItems,
  getDictionaryFlashcardDeckFilterOptions,
  hasActiveDictionaryFlashcardDeckFilters,
  type DictionaryFlashcardDeckFilters,
} from "@/features/practice/lib/deckFilters";
import type { AppFlashcardDeckItem } from "@/features/practice/lib/practiceSessionTypes";
import {
  getFlashcardStudyModeCounts,
  getInitialFlashcardStudyMode,
  type FlashcardStudyMode,
} from "@/features/practice/lib/studyFlow";

type UsePracticeDeckFiltersOptions = {
  initialStudyMode: FlashcardStudyMode | null;
  items: readonly AppFlashcardDeckItem[];
};

export function usePracticeDeckFilters({
  initialStudyMode,
  items,
}: UsePracticeDeckFiltersOptions) {
  const [deckFilters, setDeckFilters] =
    useState<DictionaryFlashcardDeckFilters>(
      DEFAULT_DICTIONARY_FLASHCARD_DECK_FILTERS,
    );

  const getItemsForFilters = useCallback(
    (filters: DictionaryFlashcardDeckFilters) =>
      filterDictionaryFlashcardDeckItems({
        filters,
        items,
      }),
    [items],
  );

  const filteredItems = useMemo(
    () => getItemsForFilters(deckFilters),
    [deckFilters, getItemsForFilters],
  );

  const filterOptions = useMemo(
    () => getDictionaryFlashcardDeckFilterOptions(items),
    [items],
  );

  const studyModeCounts = useMemo(
    () => getFlashcardStudyModeCounts(filteredItems),
    [filteredItems],
  );

  const resolvedInitialStudyMode = useMemo(
    () =>
      getInitialFlashcardStudyMode({
        counts: studyModeCounts,
        requestedMode: initialStudyMode,
      }),
    [initialStudyMode, studyModeCounts],
  );

  const hasActiveDeckFilters =
    hasActiveDictionaryFlashcardDeckFilters(deckFilters);

  const resetDeckFilters = useCallback(() => {
    setDeckFilters(DEFAULT_DICTIONARY_FLASHCARD_DECK_FILTERS);
  }, []);

  return {
    deckFilters,
    filteredItems,
    filterOptions,
    getItemsForFilters,
    hasActiveDeckFilters,
    resetDeckFilters,
    resolvedInitialStudyMode,
    setDeckFilters,
    studyModeCounts,
  };
}
