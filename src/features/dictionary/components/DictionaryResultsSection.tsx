"use client";

import { useCallback, useEffect, useRef } from "react";

import { Badge } from "@/components/Badge";
import { buttonClassName } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { useLanguage } from "@/components/LanguageProvider";
import { StatusNotice } from "@/components/StatusNotice";
import { surfacePanelClassName } from "@/components/SurfacePanel";
import type {
  DialectFilter,
  DictionaryPartOfSpeechFilter,
} from "@/features/dictionary/config";
import type { DictionaryResultMode } from "@/features/dictionary/hooks/useDictionaryResultMode";
import type { DictionaryClientEntry } from "@/features/dictionary/types";

import DictionaryEntryCard from "./DictionaryEntry";

type DictionaryResultsSectionProps = {
  dictionaryLength: number;
  errorActionLabel?: string;
  errorMessage?: string | null;
  filteredResults: DictionaryClientEntry[];
  hasActiveFilters?: boolean;
  hasMoreResults?: boolean;
  loading: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  onRetry?: () => void;
  query: string;
  resultMode?: DictionaryResultMode;
  selectedDialect: DialectFilter;
  selectedPartOfSpeech: DictionaryPartOfSpeechFilter;
  scrollContainerId?: string;
  totalMatches: number;
};

export function DictionaryResultsSection({
  dictionaryLength,
  errorActionLabel,
  errorMessage,
  filteredResults,
  hasActiveFilters = false,
  hasMoreResults = false,
  loading,
  loadingMore = false,
  onLoadMore,
  onRetry,
  query,
  resultMode = "compact",
  selectedDialect,
  selectedPartOfSpeech,
  scrollContainerId,
  totalMatches,
}: DictionaryResultsSectionProps) {
  const { t } = useLanguage();
  const observerTarget = useRef<HTMLDivElement>(null);
  const loadMoreRequestedRef = useRef(false);
  const requestMoreResults = useCallback(() => {
    if (!onLoadMore || loadingMore || loadMoreRequestedRef.current) {
      return;
    }

    loadMoreRequestedRef.current = true;
    onLoadMore();
  }, [loadingMore, onLoadMore]);

  useEffect(() => {
    if (!loadingMore) {
      loadMoreRequestedRef.current = false;
    }
  }, [filteredResults.length, hasMoreResults, loadingMore]);

  useEffect(() => {
    if (!hasMoreResults || !onLoadMore) {
      return;
    }

    const target = observerTarget.current;
    if (!target) {
      return;
    }

    const rootTarget = scrollContainerId
      ? document.getElementById(scrollContainerId)
      : null;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          !entries[0]?.isIntersecting ||
          loadingMore ||
          loadMoreRequestedRef.current
        ) {
          return;
        }

        requestMoreResults();
      },
      { threshold: 0.1, root: rootTarget },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [
    filteredResults.length,
    hasMoreResults,
    loadingMore,
    onLoadMore,
    requestMoreResults,
    scrollContainerId,
  ]);

  return (
    <>
      {!loading && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Badge tone="surface" size="md" className="font-medium">
            {query.trim().length === 0 &&
            selectedPartOfSpeech === "ALL" &&
            selectedDialect === "ALL" &&
            !hasActiveFilters
              ? `${t("dict.showing")} ${filteredResults.length} ${t("dict.outOf")} ${dictionaryLength} ${t("dict.entries")}`
              : `${t("dict.found")} ${totalMatches} ${t("dict.results")}`}
          </Badge>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-line border-t-accent"></div>
        </div>
      )}

      {!loading && errorMessage ? (
        <StatusNotice
          tone="error"
          align="left"
          className="mb-6"
          title={errorMessage}
          actions={
            onRetry && errorActionLabel ? (
              <button
                type="button"
                className={buttonClassName({
                  className: "w-full sm:w-auto",
                  variant: "secondary",
                })}
                onClick={onRetry}
              >
                {errorActionLabel}
              </button>
            ) : null
          }
        />
      ) : null}

      {!loading && !errorMessage && filteredResults.length === 0 && (
        <EmptyState
          title={t("dict.noMatch")}
          description={t("dict.tryFuzzy")}
          className={surfacePanelClassName({ shadow: "soft" })}
          titleClassName="font-medium text-ink"
          descriptionClassName="mt-2 text-muted"
        />
      )}

      <div className="grid gap-4 md:gap-5">
        {filteredResults.map((entry) => (
          <DictionaryEntryCard
            key={entry.id}
            entry={entry}
            query={query}
            resultMode={resultMode}
            selectedDialect={selectedDialect}
          />
        ))}
      </div>

      {hasMoreResults && (
        <div
          ref={observerTarget}
          className="mt-10 flex min-h-20 w-full items-center justify-center"
        >
          <button
            type="button"
            onClick={requestMoreResults}
            disabled={loadingMore || !onLoadMore}
            className={buttonClassName({
              className: "gap-2 px-5 disabled:translate-y-0 disabled:shadow-sm",
              variant: "secondary",
            })}
          >
            {loadingMore ? (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-accent"
                aria-hidden="true"
              />
            ) : null}
            {loadingMore ? t("dict.loadingMore") : t("dict.loadMore")}
          </button>
        </div>
      )}
    </>
  );
}
