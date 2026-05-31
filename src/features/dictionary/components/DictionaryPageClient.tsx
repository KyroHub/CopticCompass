"use client";

import { BarChart3, Layers3 } from "lucide-react";
import Link from "next/link";

import { AppPageIntro } from "@/components/AppPageIntro";
import { buttonClassName } from "@/components/Button";
import { useLanguage } from "@/components/LanguageProvider";
import { PageShell, pageShellAccents } from "@/components/PageShell";
import { useDictionarySearch } from "@/features/dictionary/hooks/useDictionarySearch";
import { DEFAULT_DICTIONARY_PRACTICE_DECK_ID } from "@/features/practice/lib/practiceDeckDefaults";
import {
  getAnalyticsPath,
  getPracticePath,
  getLocalizedHomePath,
} from "@/lib/locale";

import { DictionaryFilters } from "./DictionaryFilters";
import { DictionaryResultsSection } from "./DictionaryResultsSection";
import { DictionarySearchBar } from "./DictionarySearchBar";

type DictionaryPageBodyProps = {
  searchPath: string;
};

function DictionaryPageBody({ searchPath }: DictionaryPageBodyProps) {
  const { language, t } = useLanguage();
  const {
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
    setKeyboardOpen,
    setQuery,
    setSelectedDialect,
    setSelectedPartOfSpeech,
    setExactMatch,
    visibleQuery,
    totalMatches,
  } = useDictionarySearch({ searchPath });
  let resultsErrorMessage: string | null = null;
  if (fetchError === "initial") {
    resultsErrorMessage = t("dict.searchUnavailable");
  } else if (fetchError === "more") {
    resultsErrorMessage = t("dict.loadMoreUnavailable");
  }

  return (
    <PageShell
      className="app-page-shell"
      contentClassName="app-page-content"
      width="standard"
      accents={[
        pageShellAccents.heroGoldBand,
        pageShellAccents.topRightCopticWashInset,
      ]}
    >
      <AppPageIntro
        spacing="compact"
        actions={
          <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
            <Link
              href={getPracticePath(
                language,
                DEFAULT_DICTIONARY_PRACTICE_DECK_ID,
              )}
              className={buttonClassName({
                className: "w-full min-w-0 px-3 sm:w-auto sm:px-4",
                variant: "primary",
              })}
            >
              <Layers3 className="h-4 w-4" />
              {t("nav.practice")}
            </Link>
            <Link
              href={getAnalyticsPath(language)}
              className={buttonClassName({
                className: "w-full min-w-0 px-3 sm:w-auto sm:px-4",
                variant: "secondary",
              })}
            >
              <BarChart3 className="h-4 w-4" />
              {t("nav.analyticsShort")}
            </Link>
          </div>
        }
        breadcrumbs={[
          { label: t("nav.home"), href: getLocalizedHomePath(language) },
          { label: t("nav.dictionary") },
        ]}
        title={t("dict.title")}
      />

      <div className="app-sticky-panel relative isolate mb-8 flex flex-col gap-3 md:mb-12 md:gap-4">
        <DictionarySearchBar
          isKeyboardOpen={isKeyboardOpen}
          onAppend={handleKeyboardAppend}
          onBackspace={handleKeyboardBackspace}
          onCloseKeyboard={() => setKeyboardOpen(false)}
          onQueryChange={setQuery}
          onSelectionChange={handleSelectionChange}
          onToggleKeyboard={() => setKeyboardOpen(!isKeyboardOpen)}
          query={query}
          searchInputRef={searchInputRef}
        />

        <DictionaryFilters
          exactMatch={exactMatch}
          onClearFilters={() => {
            setSelectedDialect("ALL");
            setSelectedPartOfSpeech("ALL");
            setExactMatch(false);
          }}
          selectedDialect={selectedDialect}
          selectedPartOfSpeech={selectedPartOfSpeech}
          setExactMatch={setExactMatch}
          setSelectedDialect={setSelectedDialect}
          setSelectedPartOfSpeech={setSelectedPartOfSpeech}
        />
      </div>

      <DictionaryResultsSection
        key={resultsKey}
        dictionaryLength={dictionaryLength}
        errorActionLabel={t("dict.retrySearch")}
        errorMessage={resultsErrorMessage}
        filteredResults={filteredResults}
        hasMoreResults={hasMoreResults}
        loading={loading}
        loadingMore={loadingMore}
        onLoadMore={loadMoreResults}
        onRetry={fetchError === "more" ? loadMoreResults : retrySearch}
        query={visibleQuery}
        selectedDialect={selectedDialect}
        selectedPartOfSpeech={selectedPartOfSpeech}
        totalMatches={totalMatches}
      />
    </PageShell>
  );
}

export default function DictionaryPageClient() {
  const searchPath = "/api/v1/dictionary/search";

  return <DictionaryPageBody key={searchPath} searchPath={searchPath} />;
}
