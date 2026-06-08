"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { Badge } from "@/components/Badge";
import { buttonClassName } from "@/components/Button";
import {
  FilterBar,
  FilterMenu,
  type FilterMenuOption,
} from "@/components/FilterMenu";
import { useLanguage } from "@/components/LanguageProvider";
import { SegmentedControl } from "@/components/SegmentedControl";
import { SurfacePanel } from "@/components/SurfacePanel";
import { STUDY_MODE_OPTIONS } from "@/features/practice/components/practicePageOptions";
import {
  FLASHCARD_DECK_FILTER_ALL,
  hasActiveDictionaryFlashcardDeckFilters,
  type DictionaryFlashcardDeckFilters,
  type DictionaryFlashcardDeckFilterOptions,
} from "@/features/practice/lib/deckFilters";
import type { AppFlashcardDeckSummary } from "@/features/practice/lib/deckRegistry";
import {
  getDeckKindLabelKey,
  getDeckScopeText,
  getSelectedFilterLabel,
  isDictionaryDeckScope,
} from "@/features/practice/lib/practicePageHelpers";
import type {
  FlashcardStudyMode,
  FlashcardStudyModeCounts,
} from "@/features/practice/lib/studyFlow";
import { cx } from "@/lib/classes";

export function StudySetupPanel({
  activeDeck,
  activeMode,
  counts,
  filteredCount,
  filters,
  filterOptions,
  isPending,
  onFilterChange,
  onOpenDeckPicker,
  onModeChange,
  onResetFilters,
  shouldShowStudyModes,
  totalCount,
}: {
  activeDeck: AppFlashcardDeckSummary;
  activeMode: FlashcardStudyMode;
  counts: FlashcardStudyModeCounts;
  filteredCount: number;
  filters: DictionaryFlashcardDeckFilters;
  filterOptions: DictionaryFlashcardDeckFilterOptions;
  isPending: boolean;
  onFilterChange: (filters: DictionaryFlashcardDeckFilters) => void;
  onOpenDeckPicker: () => void;
  onModeChange: (mode: FlashcardStudyMode) => void;
  onResetFilters: () => void;
  shouldShowStudyModes: boolean;
  totalCount: number;
}) {
  const { t } = useLanguage();
  const setupControlsId = useId();
  const [isSetupExpanded, setIsSetupExpanded] = useState(false);

  useEffect(() => {
    if (window.innerWidth >= 768) {
      setTimeout(() => {
        setIsSetupExpanded(true);
      }, 0);
    }
  }, []);

  const hasActiveFilters = hasActiveDictionaryFlashcardDeckFilters(filters);
  const deckKindLabel = t(getDeckKindLabelKey(activeDeck.kind));
  const showCardTypeFilter =
    totalCount > 0 && filterOptions.cardTypes.length > 1;
  const showSourceFilter = totalCount > 0 && filterOptions.sources.length > 1;
  const dictionaryScope = isDictionaryDeckScope(activeDeck.scope)
    ? activeDeck.scope
    : null;
  const showDialectFilter =
    !dictionaryScope?.dialect && filterOptions.dialects.length > 1;
  const showGrammarFilter =
    !dictionaryScope?.partOfSpeech && filterOptions.grammars.length > 1;
  const hasRefinementControls = showDialectFilter || showGrammarFilter;
  const shouldShowFilterControls =
    showSourceFilter || showCardTypeFilter || hasRefinementControls;
  const activeFilterCount = [
    filters.source !== FLASHCARD_DECK_FILTER_ALL,
    filters.cardType !== FLASHCARD_DECK_FILTER_ALL,
    filters.dialect !== FLASHCARD_DECK_FILTER_ALL,
    filters.grammar !== FLASHCARD_DECK_FILTER_ALL,
  ].filter(Boolean).length;

  const studyModeChoiceOptions = STUDY_MODE_OPTIONS.map((option) => ({
    count: counts[option.mode] > 0 ? counts[option.mode] : undefined,
    disabled: isPending || counts[option.mode] === 0,
    icon: option.icon,
    label: t(option.translationKey),
    shortLabel: t(option.shortTranslationKey),
    value: option.mode,
  }));

  const cardTypeChoiceOptions = [
    {
      label: t("practice.filters.allCardTypes"),
      value: FLASHCARD_DECK_FILTER_ALL,
    },
    ...filterOptions.cardTypes.map((option) => ({
      label: t(option.labelKey),
      value: option.value,
    })),
  ] satisfies FilterMenuOption[];

  const sourceChoiceOptions = [
    {
      label: t("practice.filters.allSources"),
      value: FLASHCARD_DECK_FILTER_ALL,
    },
    ...filterOptions.sources.map((option) => ({
      label: t(option.labelKey),
      value: option.value,
    })),
  ] satisfies FilterMenuOption[];
  const dialectChoiceOptions = [
    {
      label: t("practice.filters.allDialects"),
      value: FLASHCARD_DECK_FILTER_ALL,
    },
    ...filterOptions.dialects.map((option) => ({
      label: option.value,
      value: option.value,
    })),
  ] satisfies FilterMenuOption[];
  const grammarChoiceOptions = [
    {
      label: t("practice.filters.allGrammar"),
      value: FLASHCARD_DECK_FILTER_ALL,
    },
    ...filterOptions.grammars.map((option) => {
      const grammarLabel = option.code
        ? `${t(option.labelKey)} (${option.code})`
        : t(option.labelKey);

      return {
        label: grammarLabel,
        value: option.value,
      };
    }),
  ] satisfies FilterMenuOption[];

  function updateFilter<Key extends keyof DictionaryFlashcardDeckFilters>(
    key: Key,
    value: DictionaryFlashcardDeckFilters[Key],
  ) {
    onFilterChange({
      ...filters,
      [key]: value,
    });
  }

  function resetFilters() {
    onResetFilters();
  }

  return (
    <SurfacePanel
      as="section"
      shadow="soft"
      className="mb-4 p-3 md:mb-6 md:p-4"
    >
      <button
        type="button"
        aria-controls={setupControlsId}
        aria-expanded={isSetupExpanded}
        onClick={() => setIsSetupExpanded((isOpen) => !isOpen)}
        className="flex w-full items-start justify-between gap-3 rounded-md px-1 py-1 text-left transition-colors hover:bg-elevated/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
      >
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold uppercase tracking-widest text-muted">
              {t("practice.filters.title")}
            </span>
            <Badge
              tone={activeDeck.kind === "saved" ? "accent" : "coptic"}
              size="xs"
            >
              {deckKindLabel}
            </Badge>
          </span>
          <span className="mt-1 block truncate text-sm font-semibold text-ink">
            {t(activeDeck.titleKey)}
          </span>
          <span className="mt-1 block text-sm font-medium text-muted">
            {hasActiveFilters ? (
              <>
                {filteredCount} {t("practice.filters.of")} {totalCount}{" "}
                {t("practice.filters.selected")}
              </>
            ) : (
              <>
                {totalCount} {t("practice.filters.cards")}
              </>
            )}
          </span>

          {/* Active configuration summary shown when collapsed */}
          {!isSetupExpanded && (
            <span className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-semibold">
              {(() => {
                const modeOption = STUDY_MODE_OPTIONS.find(
                  (o) => o.mode === activeMode,
                );
                return modeOption ? (
                  <span className="rounded bg-coptic/10 px-1.5 py-0.5 text-coptic">
                    {t(modeOption.translationKey)}
                  </span>
                ) : null;
              })()}

              <span className="rounded bg-elevated px-1.5 py-0.5 text-muted border border-line">
                {filters.cardType === FLASHCARD_DECK_FILTER_ALL
                  ? t("practice.filters.allCardTypes")
                  : (() => {
                      const match = filterOptions.cardTypes.find(
                        (o) => o.value === filters.cardType,
                      );
                      return match ? t(match.labelKey) : "";
                    })()}
              </span>

              {filters.source !== FLASHCARD_DECK_FILTER_ALL &&
                (() => {
                  const match = filterOptions.sources.find(
                    (o) => o.value === filters.source,
                  );
                  return match ? (
                    <span className="rounded bg-elevated px-1.5 py-0.5 text-muted">
                      {t(match.labelKey)}
                    </span>
                  ) : null;
                })()}

              {filters.dialect !== FLASHCARD_DECK_FILTER_ALL && (
                <span className="rounded bg-accent-soft px-1.5 py-0.5 text-accent-strong dark:text-accent">
                  {t("practice.filters.dialect")}: {filters.dialect}
                </span>
              )}

              {filters.grammar !== FLASHCARD_DECK_FILTER_ALL && (
                <span className="rounded bg-coptic-soft px-1.5 py-0.5 text-coptic">
                  {t("practice.filters.grammar")}:{" "}
                  {filterOptions.grammars.find(
                    (o) => o.value === filters.grammar,
                  )?.code || filters.grammar}
                </span>
              )}
            </span>
          )}
        </span>
        <ChevronDown
          className={cx(
            "h-4 w-4 shrink-0 text-muted transition-transform mt-1",
            isSetupExpanded && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      <div
        id={setupControlsId}
        className={cx(
          isSetupExpanded ? "block mt-4 pt-4 border-t border-line" : "hidden",
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">
              {t("practice.filters.source")}
            </p>
            <p className="mt-1 truncate text-base font-semibold text-ink">
              {t(activeDeck.titleKey)}
            </p>
            <p className="mt-1 text-sm font-medium text-muted">
              {getDeckScopeText({ deck: activeDeck, t })}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onOpenDeckPicker}
              className={buttonClassName({
                className: "w-full sm:w-auto",
                size: "sm",
                variant: "secondary",
              })}
            >
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
              {t("practice.deckSelector.changeDeck")}
            </button>
          </div>
        </div>

        {shouldShowStudyModes ? (
          <div className="mt-4 border-t border-line pt-4">
            <SegmentedControl
              label={t("practice.study.modeLabel")}
              value={activeMode}
              options={studyModeChoiceOptions}
              onChange={(mode) => onModeChange(mode as FlashcardStudyMode)}
            />
          </div>
        ) : null}

        {shouldShowFilterControls ? (
          <div className="mt-4 border-t border-line pt-4">
            <FilterBar
              activeCount={activeFilterCount}
              clearLabel={t("practice.filters.reset")}
              defaultOpen="desktop"
              label={t("practice.filters.controls")}
              onClear={resetFilters}
            >
              {showSourceFilter ? (
                <FilterMenu
                  active={filters.source !== FLASHCARD_DECK_FILTER_ALL}
                  closeLabel={t("practice.filters.hide")}
                  label={t("practice.filters.sourceType")}
                  value={filters.source}
                  valueLabel={getSelectedFilterLabel(
                    sourceChoiceOptions,
                    filters.source,
                  )}
                  options={sourceChoiceOptions}
                  onChange={(source) =>
                    updateFilter(
                      "source",
                      source as DictionaryFlashcardDeckFilters["source"],
                    )
                  }
                />
              ) : null}

              {showCardTypeFilter ? (
                <FilterMenu
                  active={filters.cardType !== FLASHCARD_DECK_FILTER_ALL}
                  closeLabel={t("practice.filters.hide")}
                  label={t("practice.filters.cardType")}
                  value={filters.cardType}
                  valueLabel={getSelectedFilterLabel(
                    cardTypeChoiceOptions,
                    filters.cardType,
                  )}
                  options={cardTypeChoiceOptions}
                  onChange={(cardType) =>
                    updateFilter(
                      "cardType",
                      cardType as DictionaryFlashcardDeckFilters["cardType"],
                    )
                  }
                />
              ) : null}

              {showDialectFilter ? (
                <FilterMenu
                  active={filters.dialect !== FLASHCARD_DECK_FILTER_ALL}
                  closeLabel={t("practice.filters.hide")}
                  label={t("practice.filters.dialect")}
                  value={filters.dialect}
                  valueLabel={getSelectedFilterLabel(
                    dialectChoiceOptions,
                    filters.dialect,
                  )}
                  options={dialectChoiceOptions}
                  onChange={(dialect) => updateFilter("dialect", dialect)}
                />
              ) : null}

              {showGrammarFilter ? (
                <FilterMenu
                  active={filters.grammar !== FLASHCARD_DECK_FILTER_ALL}
                  closeLabel={t("practice.filters.hide")}
                  label={t("practice.filters.grammar")}
                  value={filters.grammar}
                  valueLabel={getSelectedFilterLabel(
                    grammarChoiceOptions,
                    filters.grammar,
                  )}
                  options={grammarChoiceOptions}
                  onChange={(grammar) => updateFilter("grammar", grammar)}
                />
              ) : null}
            </FilterBar>
          </div>
        ) : null}
      </div>
    </SurfacePanel>
  );
}
