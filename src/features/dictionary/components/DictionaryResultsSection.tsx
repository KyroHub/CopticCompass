"use client";

import { useCallback, useEffect, useRef } from "react";

import { Badge } from "@/components/Badge";
import { buttonClassName } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { useLanguage } from "@/components/LanguageProvider";
import { StatusNotice } from "@/components/StatusNotice";
import {
  getPartOfSpeechFilterLabel,
  type DialectFilter,
  type DictionaryPartOfSpeechFilter,
} from "@/features/dictionary/config";
import type { DictionaryClientEntry } from "@/features/dictionary/types";

import DialectSiglum from "./DialectSiglum";
import DictionaryEntryCard from "./DictionaryEntry";

type DictionaryResultsSectionProps = {
  dictionaryLength: number;
  errorActionLabel?: string;
  errorMessage?: string | null;
  filteredResults: DictionaryClientEntry[];
  hasMoreResults?: boolean;
  loading: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  onRetry?: () => void;
  query: string;
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
  hasMoreResults = false,
  loading,
  loadingMore = false,
  onLoadMore,
  onRetry,
  query,
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
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Badge tone="surface" size="md" className="font-medium">
            {query.trim().length === 0 &&
            selectedPartOfSpeech === "ALL" &&
            selectedDialect === "ALL"
              ? `${t("dict.showing")} ${filteredResults.length} ${t("dict.outOf")} ${dictionaryLength} ${t("dict.entries")}`
              : `${t("dict.found")} ${totalMatches} ${t("dict.results")}`}
          </Badge>

          {(selectedPartOfSpeech !== "ALL" || selectedDialect !== "ALL") && (
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              {selectedPartOfSpeech !== "ALL" && (
                <Badge tone="neutral" size="xs">
                  {t("dict.pos")}{" "}
                  {getPartOfSpeechFilterLabel(selectedPartOfSpeech, t)}
                </Badge>
              )}
              {selectedDialect !== "ALL" && (
                <Badge tone="accent" size="sm" className="min-h-8">
                  {t("dict.dialect")}{" "}
                  <span className="ml-1">
                    <DialectSiglum siglum={selectedDialect} />
                  </span>
                </Badge>
              )}
            </div>
          )}
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
          className="border-line bg-surface/88 shadow-soft"
          titleClassName="font-medium text-ink"
          descriptionClassName="mt-2 text-muted"
        />
      )}

      <div className="grid gap-6">
        {filteredResults.map((entry) => (
          <DictionaryEntryCard
            key={entry.id}
            entry={entry}
            query={query}
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
