"use client";

import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Eye,
  GraduationCap,
  LayoutDashboard,
  Lightbulb,
  LogIn,
  RotateCcw,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";

import {
  ensurePracticeItemForSource,
  submitPracticeReview,
} from "@/actions/practice";
import { AppPageIntro } from "@/components/AppPageIntro";
import { Badge } from "@/components/Badge";
import { buttonClassName } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import {
  FilterBar,
  FilterMenu,
  type FilterMenuOption,
} from "@/components/FilterMenu";
import { useLanguage } from "@/components/LanguageProvider";
import { PageShell, pageShellAccents } from "@/components/PageShell";
import { SegmentedControl } from "@/components/SegmentedControl";
import { StatusNotice } from "@/components/StatusNotice";
import DialectSiglum from "@/features/dictionary/components/DialectSiglum";
import { SpeakButton } from "@/features/dictionary/components/SpeakButton";
import {
  getDialectLabelKey,
  getPartOfSpeechLabel,
} from "@/features/dictionary/config";
import { useSpeech } from "@/features/dictionary/hooks/useSpeech";
import type {
  FlashcardDeckItem,
  FlashcardDeckStats,
  FlashcardSide,
} from "@/features/practice/lib/core";
import {
  DEFAULT_DICTIONARY_FLASHCARD_DECK_FILTERS,
  FLASHCARD_DECK_FILTER_ALL,
  filterDictionaryFlashcardDeckItems,
  getDictionaryFlashcardDeckFilterOptions,
  hasActiveDictionaryFlashcardDeckFilters,
  type DictionaryFlashcardDeckFilters,
  type DictionaryFlashcardDeckFilterOptions,
} from "@/features/practice/lib/deckFilters";
import type {
  AppFlashcardCandidate,
  AppFlashcardDeckId,
  AppFlashcardDeckOption,
  AppFlashcardDeckSummary,
} from "@/features/practice/lib/deckRegistry";
import type { DictionaryFlashcardDeckScope } from "@/features/practice/lib/dictionaryDecks";
import type { DictionaryFlashcardCandidate } from "@/features/practice/lib/dictionaryFlashcards";
import type { GrammarFlashcardCandidate } from "@/features/practice/lib/grammarFlashcards";
import {
  getFlashcardStudyModeCounts,
  getFlashcardStudyModeItems,
  getInitialFlashcardStudyMode,
  isWeakFlashcardRating,
  type FlashcardStudyMode,
  type FlashcardStudyModeCounts,
} from "@/features/practice/lib/studyFlow";
import {
  compareTypedFlashcardAnswer,
  type TypedFlashcardAnswerResult,
} from "@/features/practice/lib/typedAnswer";
import type { FlashcardReviewRating } from "@/features/practice/types";
import { cx } from "@/lib/classes";
import { antinoou } from "@/lib/fonts";
import type { TranslationKey } from "@/lib/i18n";
import {
  getDashboardPath,
  getDictionaryPath,
  getPracticePath,
  getGrammarPath,
  getLocalizedHomePath,
} from "@/lib/locale";

type PracticePageClientProps = {
  activeDeck: AppFlashcardDeckSummary;
  activeDeckId: AppFlashcardDeckId;
  deckOptions: AppFlashcardDeckOption[];
  initialStudyMode: FlashcardStudyMode | null;
  isPersistenceEnabled: boolean;
  items: FlashcardDeckItem<AppFlashcardCandidate>[];
  nextDueAt: string | null;
  privateDeckLoginPath: string;
  stats: FlashcardDeckStats;
  storageError: string | null;
};

type ReviewOutcome = {
  cardId: string;
  candidateId: string;
  dueAt: string | null;
  rating: FlashcardReviewRating;
};

type Translate = (key: TranslationKey) => string;
type AppFlashcardDeckItem = FlashcardDeckItem<AppFlashcardCandidate>;
type AppFlashcardSide = FlashcardSide;

type RatingOption = {
  icon: typeof XCircle;
  rating: FlashcardReviewRating;
  toneClassName: string;
  translationKey: TranslationKey;
};

const RATING_OPTIONS: readonly RatingOption[] = [
  {
    icon: XCircle,
    rating: "again",
    toneClassName:
      "border-danger/20 bg-danger/5 text-danger hover:bg-danger/10 dark:bg-danger/10",
    translationKey: "practice.saved.again",
  },
  {
    icon: AlertTriangle,
    rating: "hard",
    toneClassName:
      "border-warning/25 bg-warning/5 text-warning hover:bg-warning/10 dark:bg-warning/10",
    translationKey: "practice.saved.hard",
  },
  {
    icon: CheckCircle2,
    rating: "good",
    toneClassName:
      "border-coptic/20 bg-coptic/5 text-coptic hover:bg-coptic/10 dark:border-coptic/30 dark:bg-coptic/10",
    translationKey: "practice.saved.good",
  },
  {
    icon: Sparkles,
    rating: "easy",
    toneClassName:
      "border-accent/25 bg-accent-soft/80 text-accent-strong hover:bg-accent-soft dark:text-accent",
    translationKey: "practice.saved.easy",
  },
] as const;

const ANONYMOUS_PROGRESS_CTA_REVIEW_THRESHOLD = 3;

type StudyModeOption = {
  icon: typeof BookOpen;
  mode: FlashcardStudyMode;
  shortTranslationKey: TranslationKey;
  translationKey: TranslationKey;
};

type DeckPickerGroupId = "mixed" | "dictionary" | "grammar" | "private";

type DeckPickerGroupDefinition = {
  descriptionKey: TranslationKey;
  id: DeckPickerGroupId;
  titleKey: TranslationKey;
};

type DeckPickerGroup = DeckPickerGroupDefinition & {
  options: AppFlashcardDeckOption[];
};

const STUDY_MODE_OPTIONS: readonly StudyModeOption[] = [
  {
    icon: Clock3,
    mode: "review",
    shortTranslationKey: "practice.study.reviewDueShort",
    translationKey: "practice.study.reviewDue",
  },
  {
    icon: BookOpen,
    mode: "learn",
    shortTranslationKey: "practice.study.learnNewShort",
    translationKey: "practice.study.learnNew",
  },
  {
    icon: AlertTriangle,
    mode: "weak",
    shortTranslationKey: "practice.study.practiceWeakShort",
    translationKey: "practice.study.practiceWeak",
  },
] as const;

const DECK_PICKER_GROUP_DEFINITIONS = [
  {
    descriptionKey: "practice.deckSelector.group.mixedDescription",
    id: "mixed",
    titleKey: "practice.deckSelector.group.mixed",
  },
  {
    descriptionKey: "practice.deckSelector.group.dictionaryDescription",
    id: "dictionary",
    titleKey: "practice.deckSelector.group.dictionary",
  },
  {
    descriptionKey: "practice.deckSelector.group.grammarDescription",
    id: "grammar",
    titleKey: "practice.deckSelector.group.grammar",
  },
  {
    descriptionKey: "practice.deckSelector.group.privateDescription",
    id: "private",
    titleKey: "practice.deckSelector.group.private",
  },
] as const satisfies readonly DeckPickerGroupDefinition[];

function formatNextDue(value: string | null, language: "en" | "nl") {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleDateString(
    language === "nl" ? "nl-BE" : "en-US",
  );
}

function getRatingCounts(reviews: readonly ReviewOutcome[]) {
  return RATING_OPTIONS.reduce(
    (counts, option) => ({
      ...counts,
      [option.rating]: reviews.filter(
        (review) => review.rating === option.rating,
      ).length,
    }),
    {
      again: 0,
      easy: 0,
      good: 0,
      hard: 0,
    } satisfies Record<FlashcardReviewRating, number>,
  );
}

function getCompactCharacterCount(value: string) {
  return Array.from(value.replace(/\s+/g, "")).length;
}

function isDictionaryFlashcardCandidate(
  candidate: AppFlashcardCandidate,
): candidate is DictionaryFlashcardCandidate {
  return candidate.sourceType === "dictionary";
}

function isGrammarFlashcardCandidate(
  candidate: AppFlashcardCandidate,
): candidate is GrammarFlashcardCandidate {
  return candidate.sourceType === "grammar";
}

function isDictionaryDeckScope(
  scope: AppFlashcardDeckSummary["scope"],
): scope is DictionaryFlashcardDeckScope {
  return Boolean(scope && ("dialect" in scope || "partOfSpeech" in scope));
}

function isGrammarDeckScope(scope: AppFlashcardDeckSummary["scope"]) {
  return Boolean(
    scope &&
    "sourceType" in scope &&
    (scope as { sourceType?: unknown }).sourceType === "grammar",
  );
}

function getDeckKindLabelKey(
  kind: AppFlashcardDeckSummary["kind"],
): TranslationKey {
  if (kind === "saved") {
    return "practice.deckSelector.privateShort";
  }

  if (kind === "mixed") {
    return "practice.deckSelector.mixedShort";
  }

  return "practice.deckSelector.generatedShort";
}

function getDeckPickerGroupId(
  option: AppFlashcardDeckOption,
): DeckPickerGroupId {
  if (option.kind === "saved") {
    return "private";
  }

  if (option.kind === "mixed") {
    return "mixed";
  }

  if (isGrammarDeckScope(option.scope)) {
    return "grammar";
  }

  return "dictionary";
}

function getDeckPickerGroups(
  deckOptions: readonly AppFlashcardDeckOption[],
): DeckPickerGroup[] {
  return DECK_PICKER_GROUP_DEFINITIONS.map((group) => ({
    ...group,
    options: deckOptions.filter(
      (option) => getDeckPickerGroupId(option) === group.id,
    ),
  })).filter((group) => group.options.length > 0);
}

function getFlashcardHintText(candidate: AppFlashcardCandidate, t: Translate) {
  if (candidate.back.kind === "coptic") {
    const firstCharacter = Array.from(candidate.back.text.trim())[0];
    const characterCount = getCompactCharacterCount(candidate.back.text);
    const startsWithHint = firstCharacter
      ? `${t("practice.saved.hintStartsWith")} ${firstCharacter}`
      : t("practice.saved.hintCopticForm");

    return `${startsWithHint} · ${characterCount} ${t(
      "practice.saved.hintCharacters",
    )}`;
  }

  if (candidate.back.kind === "grammar") {
    const firstMeaning = candidate.back.meanings[0];

    return firstMeaning
      ? `${t("practice.saved.hintMeaningFamily")} ${firstMeaning}`
      : t("practice.saved.hintGrammar");
  }

  if (isDictionaryFlashcardCandidate(candidate)) {
    const partOfSpeech =
      candidate.metadata.partOfSpeechCode ||
      t(candidate.metadata.partOfSpeechLabelKey);

    return `${t("practice.saved.hintPartOfSpeech")} ${partOfSpeech}`;
  }

  if (isGrammarFlashcardCandidate(candidate) && candidate.metadata.hintText) {
    return candidate.metadata.hintText;
  }

  if (isGrammarFlashcardCandidate(candidate)) {
    return candidate.metadata.focusText;
  }

  return t("practice.saved.hintGrammar");
}

function getAnswerContextMeanings(candidate: AppFlashcardCandidate) {
  if (candidate.back.meanings.length > 0) {
    return candidate.back.meanings;
  }

  return candidate.front.kind === "meaning" ? [candidate.front.text] : [];
}

function getCandidatePrimaryLink(candidate: AppFlashcardCandidate) {
  return candidate.links?.[0] ?? null;
}

function getCandidateFrontSpeechText(candidate: AppFlashcardCandidate) {
  return isDictionaryFlashcardCandidate(candidate)
    ? candidate.metadata.speechText
    : null;
}

function getCandidateAnswerSpeechText(candidate: AppFlashcardCandidate) {
  return isDictionaryFlashcardCandidate(candidate)
    ? candidate.metadata.answerSpeechText
    : null;
}

function getPracticeDeckPath(options: {
  deckId: AppFlashcardDeckId;
  isPersistenceEnabled: boolean;
  language: "en" | "nl";
  privateDeckLoginPath: string;
}) {
  if (!options.isPersistenceEnabled && options.deckId === "saved-entries") {
    return options.privateDeckLoginPath;
  }

  const { deckId, language } = options;
  const basePath = getPracticePath(language);

  if (deckId === "saved-entries") {
    return basePath;
  }

  return `${basePath}?deck=${deckId}`;
}

function getDeckScopeText({
  deck,
  t,
}: {
  deck: AppFlashcardDeckSummary;
  t: Translate;
}) {
  const scopeParts: string[] = [];
  const dictionaryScope = isDictionaryDeckScope(deck.scope) ? deck.scope : null;

  if (dictionaryScope?.dialect) {
    const dialectLabelKey = getDialectLabelKey(dictionaryScope.dialect);

    scopeParts.push(
      dialectLabelKey ? t(dialectLabelKey) : dictionaryScope.dialect,
    );
  }

  if (dictionaryScope?.partOfSpeech) {
    scopeParts.push(getPartOfSpeechLabel(dictionaryScope.partOfSpeech, t));
  }

  if (scopeParts.length > 0) {
    return scopeParts.join(" · ");
  }

  if (deck.scopeLabelKey) {
    return t(deck.scopeLabelKey);
  }

  return t(getDeckKindLabelKey(deck.kind));
}

function getSelectedFilterLabel(
  options: readonly FilterMenuOption[],
  value: string,
) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function StudySetupPanel({
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
    <section className="mb-4 rounded-lg border border-line bg-surface/88 p-3 shadow-sm backdrop-blur-sm md:mb-6 md:p-4">
      <button
        type="button"
        aria-controls={setupControlsId}
        aria-expanded={isSetupExpanded}
        onClick={() => setIsSetupExpanded((isOpen) => !isOpen)}
        className="flex w-full items-start justify-between gap-3 rounded-md px-1 py-1 text-left transition-colors hover:bg-elevated/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
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
    </section>
  );
}

function DeckPickerDialog({
  activeDeckId,
  deckOptions,
  isOpen,
  isPersistenceEnabled,
  language,
  onClose,
  privateDeckLoginPath,
}: {
  activeDeckId: AppFlashcardDeckId;
  deckOptions: readonly AppFlashcardDeckOption[];
  isOpen: boolean;
  isPersistenceEnabled: boolean;
  language: "en" | "nl";
  onClose: () => void;
  privateDeckLoginPath: string;
}) {
  const { t } = useLanguage();
  const titleId = useId();
  const deckGroups = useMemo(
    () => getDeckPickerGroups(deckOptions),
    [deckOptions],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end bg-ink/35 p-2 backdrop-blur-sm sm:items-center sm:justify-center sm:p-3"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[min(44rem,calc(100dvh-1rem))] w-full max-w-3xl overflow-hidden rounded-t-lg border border-line bg-surface shadow-soft sm:rounded-lg"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3 sm:items-center">
          <div>
            <h2
              id={titleId}
              className="text-sm font-semibold uppercase tracking-widest text-muted"
            >
              {t("practice.deckSelector.title")}
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted sm:text-sm">
              {t("practice.deckSelector.description")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("practice.deckSelector.close")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-elevated text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[calc(100dvh-8.5rem)] space-y-5 overflow-y-auto p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:max-h-[34rem] sm:p-4">
          {deckGroups.map((group) => {
            const groupTitleId = `${titleId}-${group.id}`;

            return (
              <section
                key={group.id}
                aria-labelledby={groupTitleId}
                className="space-y-2"
              >
                <div className="px-1">
                  <h3
                    id={groupTitleId}
                    className="text-xs font-semibold uppercase tracking-widest text-muted"
                  >
                    {t(group.titleKey)}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    {t(group.descriptionKey)}
                  </p>
                </div>

                <div className="space-y-2">
                  {group.options.map((option) => {
                    const isActive = option.id === activeDeckId;
                    const isLockedPrivateDeck =
                      !isPersistenceEnabled && option.kind === "saved";
                    const deckPath = getPracticeDeckPath({
                      deckId: option.id,
                      isPersistenceEnabled,
                      language,
                      privateDeckLoginPath,
                    });
                    const rowClassName = cx(
                      "grid w-full gap-3 rounded-lg border px-4 py-3 text-left transition-colors sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center",
                      isActive
                        ? "border-coptic/30 bg-coptic/5 text-coptic"
                        : "border-line bg-elevated/55 text-ink hover:border-coptic/25 hover:bg-elevated",
                    );
                    const rowContent = (
                      <>
                        <span className="min-w-0">
                          <span className="flex min-w-0 flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-semibold">
                              {t(option.titleKey)}
                            </span>
                            {isActive ? (
                              <Badge tone="coptic" size="xs">
                                {t("practice.deckSelector.current")}
                              </Badge>
                            ) : null}
                          </span>
                          <span className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
                            {t(option.descriptionKey)}
                          </span>
                          <span className="mt-2 block truncate text-xs font-semibold text-muted">
                            {getDeckScopeText({ deck: option, t })}
                          </span>
                        </span>
                        <span className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                          <Badge
                            tone={
                              option.kind === "saved" ? "accent" : "surface"
                            }
                            size="xs"
                          >
                            {t(getDeckKindLabelKey(option.kind))}
                          </Badge>
                          {isLockedPrivateDeck ? (
                            <Badge tone="accent" size="xs">
                              {t("practice.deckSelector.signInRequired")}
                            </Badge>
                          ) : (
                            <Badge tone="surface" size="xs">
                              {option.sourceCount}{" "}
                              {t("practice.deckSelector.cards")}
                            </Badge>
                          )}
                        </span>
                      </>
                    );

                    if (isActive) {
                      return (
                        <div key={option.id} className={rowClassName}>
                          {rowContent}
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={option.id}
                        href={deckPath}
                        prefetch={false}
                        onClick={onClose}
                        className={rowClassName}
                      >
                        {rowContent}
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </section>
    </div>,
    document.body,
  );
}

function ProgressPanel({
  currentPosition,
  reviews,
  totalCards,
}: {
  currentPosition: number;
  reviews: readonly ReviewOutcome[];
  totalCards: number;
}) {
  const { t } = useLanguage();
  const reviewedCount = reviews.length;
  const progressPercent =
    totalCards === 0 ? 0 : Math.round((reviewedCount / totalCards) * 100);
  const ratingCounts = useMemo(() => getRatingCounts(reviews), [reviews]);

  return (
    <aside className="space-y-4 rounded-lg border border-line bg-surface/88 p-5 shadow-sm backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">
          {t("practice.saved.progress")}
        </h2>
      </div>

      <div
        className="h-2 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-label={t("practice.saved.progress")}
        aria-valuemin={0}
        aria-valuemax={totalCards}
        aria-valuenow={reviewedCount}
      >
        <div
          className="h-full rounded-full bg-coptic transition-[width] duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-line bg-elevated/70 px-3 py-3">
          <p className="text-[0.68rem] font-semibold uppercase tracking-widest text-muted">
            {t("practice.saved.cardCount")}
          </p>
          <p className="mt-2 text-xl font-semibold text-ink">
            {currentPosition}/{totalCards}
          </p>
        </div>
        <div className="rounded-lg border border-line bg-elevated/70 px-3 py-3">
          <p className="text-[0.68rem] font-semibold uppercase tracking-widest text-muted">
            {t("practice.saved.reviewed")}
          </p>
          <p className="mt-2 text-xl font-semibold text-ink">
            {reviewedCount}/{totalCards}
          </p>
        </div>
      </div>

      {reviewedCount > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {RATING_OPTIONS.map((option) => {
            const Icon = option.icon;

            return (
              <div
                key={option.rating}
                className={cx(
                  "flex min-h-12 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm font-semibold",
                  option.toneClassName,
                )}
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{t(option.translationKey)}</span>
                </span>
                <span>{ratingCounts[option.rating]}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </aside>
  );
}

function MobileReviewProgress({
  currentPosition,
  reviews,
  totalCards,
}: {
  currentPosition: number;
  reviews: readonly ReviewOutcome[];
  totalCards: number;
}) {
  const { t } = useLanguage();
  const reviewedCount = reviews.length;
  const progressPercent =
    totalCards === 0 ? 0 : Math.round((reviewedCount / totalCards) * 100);

  return (
    <div className="mb-3 px-1 md:hidden">
      <div className="flex items-center justify-between gap-3 text-xs font-semibold text-muted">
        <span>
          {t("practice.saved.cardCount")} {currentPosition}/{totalCards}
        </span>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-label={t("practice.saved.progress")}
        aria-valuemin={0}
        aria-valuemax={totalCards}
        aria-valuenow={reviewedCount}
      >
        <div
          className="h-full rounded-full bg-coptic transition-[width] duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}

function FlashcardSideValue({
  side,
  speechText,
}: {
  side: AppFlashcardSide;
  speechText: string | null;
}) {
  const isCoptic = side.kind === "coptic";

  return (
    <div className="flex min-w-0 flex-wrap items-center justify-center gap-3">
      <p
        className={
          isCoptic
            ? `${antinoou.className} max-w-full break-words text-4xl leading-tight text-coptic [overflow-wrap:anywhere] sm:text-5xl md:text-6xl`
            : "line-clamp-3 max-w-3xl text-base font-semibold leading-6 text-ink md:line-clamp-none md:text-3xl md:leading-10"
        }
      >
        {side.text}
      </p>
      {speechText ? (
        <SpeakButton
          copticText={speechText}
          className="h-10 w-10 border border-line bg-elevated"
        />
      ) : null}
    </div>
  );
}

function AnswerContextPanel({
  candidate,
}: {
  candidate: AppFlashcardCandidate;
}) {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const contentId = useId();
  const meanings = getAnswerContextMeanings(candidate);
  const primaryLink = getCandidatePrimaryLink(candidate);
  const summaryTitle = isDictionaryFlashcardCandidate(candidate)
    ? candidate.metadata.copticText
    : candidate.metadata.lessonTitle;
  const summaryDetail = isDictionaryFlashcardCandidate(candidate)
    ? candidate.metadata.grammarText
    : candidate.metadata.focusText;

  return (
    <section className="mt-3 rounded-lg border border-line bg-elevated/60 text-left md:mt-4">
      <div className="flex flex-col gap-2 p-2 sm:flex-row sm:items-center">
        <button
          type="button"
          aria-controls={contentId}
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((currentValue) => !currentValue)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
        >
          <ChevronDown
            className={cx(
              "h-4 w-4 shrink-0 text-muted transition-transform",
              isExpanded && "rotate-180",
            )}
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold uppercase tracking-widest text-muted">
              {t("practice.saved.answerContext")}
            </span>
            <span className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 text-sm font-semibold text-ink">
              <span
                className={`${antinoou.className} max-w-full truncate text-base leading-5 text-coptic sm:max-w-40`}
              >
                {summaryTitle}
              </span>
              <span className="text-muted" aria-hidden="true">
                ·
              </span>
              <span className="min-w-0 max-w-full truncate">
                {summaryDetail}
              </span>
            </span>
          </span>
        </button>
        {primaryLink ? (
          <Link
            href={primaryLink.href}
            target="_blank"
            rel="noopener noreferrer"
            className="self-start rounded-md px-3 py-2 text-xs font-semibold text-coptic transition-colors hover:bg-surface hover:text-coptic-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 sm:self-center"
          >
            {t(primaryLink.labelKey)}
          </Link>
        ) : null}
      </div>

      {isExpanded ? (
        <dl
          id={contentId}
          className="grid gap-2 border-t border-line px-4 py-3 text-xs sm:grid-cols-2 lg:grid-cols-4 md:text-sm"
        >
          {isDictionaryFlashcardCandidate(candidate) ? (
            <>
              <div>
                <dt className="font-semibold text-muted">
                  {t("practice.saved.contextHeadword")}
                </dt>
                <dd
                  className={`${antinoou.className} mt-1 truncate text-base leading-6 text-coptic md:text-lg`}
                >
                  {candidate.metadata.copticText}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-muted">
                  {t("practice.saved.contextDialect")}
                </dt>
                <dd className="mt-1 font-semibold text-ink">
                  {candidate.displayDialect ? (
                    <DialectSiglum siglum={candidate.displayDialect} />
                  ) : (
                    candidate.selectedDialect
                  )}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-muted">
                  {t("practice.saved.contextGrammar")}
                </dt>
                <dd className="mt-1 truncate font-semibold text-ink">
                  {candidate.metadata.grammarText}
                </dd>
              </div>
            </>
          ) : (
            <>
              <div>
                <dt className="font-semibold text-muted">
                  {t("practice.saved.contextSource")}
                </dt>
                <dd className="mt-1 truncate font-semibold text-ink">
                  {candidate.metadata.lessonTitle}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-muted">
                  {t("practice.saved.contextFocus")}
                </dt>
                <dd className="mt-1 truncate font-semibold text-ink">
                  {candidate.metadata.focusText}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-muted">
                  {t("practice.saved.contextGrammar")}
                </dt>
                <dd className="mt-1 truncate font-semibold text-ink">
                  {t(candidate.metadata.templateLabelKey)}
                </dd>
              </div>
            </>
          )}
          <div>
            <dt className="font-semibold text-muted">
              {t("practice.saved.contextMeaning")}
            </dt>
            <dd className="mt-1 line-clamp-2 font-semibold text-ink">
              {meanings.length > 0
                ? meanings.join("; ")
                : t("practice.saved.contextMeaningUnavailable")}
            </dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}

function FlashcardHintPanel({ hintText }: { hintText: string }) {
  const { t } = useLanguage();

  return (
    <div className="rounded-md border border-accent/20 bg-accent-soft/60 px-3 py-3 text-left">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent-strong">
        <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
        {t("practice.saved.hintTitle")}
      </p>
      <p className="mt-2 text-sm font-semibold leading-6 text-ink">
        {hintText}
      </p>
    </div>
  );
}

function TypedAnswerPractice({
  onChange,
  onCheck,
  status,
  value,
  shouldShake,
}: {
  onChange: (value: string) => void;
  onCheck: () => void;
  status: TypedFlashcardAnswerResult | null;
  value: string;
  shouldShake?: boolean;
}) {
  const { t } = useLanguage();
  let feedbackContent = null;

  if (status) {
    const Icon = status === "correct" ? CheckCircle2 : AlertTriangle;
    let feedbackKey: TranslationKey = "practice.saved.typeAnswerIncorrect";
    let feedbackClassName = "text-danger";

    if (status === "correct") {
      feedbackKey = "practice.saved.typeAnswerCorrect";
      feedbackClassName = "text-coptic";
    } else if (status === "empty") {
      feedbackKey = "practice.saved.typeAnswerEmpty";
      feedbackClassName = "text-warning";
    }

    feedbackContent = (
      <p
        className={cx(
          "mt-2 flex items-center justify-center gap-2 text-sm font-semibold sm:justify-start",
          feedbackClassName,
        )}
        aria-live="polite"
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
        {t(feedbackKey)}
      </p>
    );
  }

  return (
    <div className="text-left">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onCheck();
            }
          }}
          aria-label={t("practice.saved.typeAnswerLabel")}
          placeholder={t("practice.saved.typeAnswerPlaceholder")}
          className={cx(
            antinoou.className,
            "h-11 min-w-0 flex-1 rounded-md border border-line bg-surface px-3 text-lg font-semibold text-coptic shadow-inner outline-none transition-colors placeholder:text-sm placeholder:font-sans placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/20",
            shouldShake && "animate-shake",
          )}
        />
        <button
          type="button"
          onClick={onCheck}
          className={buttonClassName({
            className: "h-11 shrink-0 px-4",
            size: "sm",
            variant: "secondary",
          })}
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {t("practice.saved.checkTypedAnswer")}
        </button>
      </div>
      {feedbackContent}
    </div>
  );
}

function FlashcardFace({
  isHintVisible,
  isRevealed,
  item,
  onTypedAnswerChange,
  onTypedAnswerCheck,
  typedAnswer,
  typedAnswerStatus,
  shouldShake,
}: {
  isHintVisible: boolean;
  isRevealed: boolean;
  item: AppFlashcardDeckItem;
  onTypedAnswerChange: (value: string) => void;
  onTypedAnswerCheck: () => void;
  typedAnswer: string;
  typedAnswerStatus: TypedFlashcardAnswerResult | null;
  shouldShake?: boolean;
}) {
  const { t } = useLanguage();
  const { candidate } = item;
  const hintText = getFlashcardHintText(candidate, t);
  const isTypingCard = candidate.back.kind === "coptic";
  const primaryLink = getCandidatePrimaryLink(candidate);
  const backFaceScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (backFaceScrollRef.current) {
      backFaceScrollRef.current.scrollTop = 0;
    }
  }, [item.candidate.id]);

  return (
    <div className="card-perspective w-full h-[24rem] sm:h-[26rem] md:h-[30rem]">
      <div className={cx("card-inner", isRevealed && "is-flipped")}>
        {/* CARD FRONT FACE */}
        <div
          className="card-face card-front rounded-lg border border-line bg-elevated/45 p-4 shadow-soft md:p-6"
          aria-hidden={isRevealed}
        >
          {primaryLink ? (
            <div className="flex justify-end w-full">
              <Link
                href={primaryLink.href}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClassName({
                  className: "h-9 px-3 text-xs max-sm:hidden",
                  size: "sm",
                  variant: "secondary",
                })}
                tabIndex={isRevealed ? -1 : 0}
              >
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                {t(primaryLink.labelKey)}
              </Link>
            </div>
          ) : null}

          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-3 text-center md:gap-6 md:py-10">
            <div className="w-full space-y-2 md:space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                {t(candidate.front.labelKey)}
              </p>
              <FlashcardSideValue
                side={candidate.front}
                speechText={getCandidateFrontSpeechText(candidate)}
              />
            </div>

            <div className="w-full rounded-lg border border-line bg-elevated/70 px-4 py-3 md:px-6 md:py-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                {t(candidate.back.labelKey)}
              </p>
              {isTypingCard ? (
                <div className="mt-3 space-y-3 text-left">
                  {isHintVisible ? (
                    <FlashcardHintPanel hintText={hintText} />
                  ) : null}
                  <TypedAnswerPractice
                    value={typedAnswer}
                    status={typedAnswerStatus}
                    onChange={onTypedAnswerChange}
                    onCheck={onTypedAnswerCheck}
                    shouldShake={shouldShake}
                  />
                </div>
              ) : (
                <div className="mt-3">
                  {isHintVisible ? (
                    <FlashcardHintPanel hintText={hintText} />
                  ) : null}
                  <p className="text-base font-medium text-muted">
                    {t("practice.saved.hiddenAnswer")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CARD BACK FACE */}
        <div
          className="card-face card-back rounded-lg border border-line border-l-4 border-l-coptic/40 bg-surface p-4 shadow-soft md:p-6"
          aria-hidden={!isRevealed}
        >
          {primaryLink ? (
            <div className="flex justify-end w-full">
              <Link
                href={primaryLink.href}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClassName({
                  className: "h-9 px-3 text-xs max-sm:hidden",
                  size: "sm",
                  variant: "secondary",
                })}
                tabIndex={isRevealed ? 0 : -1}
              >
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                {t(primaryLink.labelKey)}
              </Link>
            </div>
          ) : null}

          <div
            ref={backFaceScrollRef}
            className="flex flex-1 flex-col items-center justify-start gap-2 py-3 text-center md:gap-4 md:py-8 overflow-y-auto w-full"
          >
            <div className="w-full my-auto flex flex-col items-center gap-2 md:gap-4">
              <div className="w-full space-y-1 md:space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                  {t(candidate.front.labelKey)}
                </p>
                <FlashcardSideValue
                  side={candidate.front}
                  speechText={getCandidateFrontSpeechText(candidate)}
                />
              </div>

              <div className="w-full rounded-lg border border-coptic/20 bg-coptic/5 px-4 py-3 md:px-6 md:py-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted">
                  {t(candidate.back.labelKey)}
                </p>
                <div className="mt-2">
                  <FlashcardSideValue
                    side={candidate.back}
                    speechText={getCandidateAnswerSpeechText(candidate)}
                  />
                </div>
              </div>

              <div className="w-full text-left">
                <AnswerContextPanel key={candidate.id} candidate={candidate} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StudyModeEmptyPanel({
  activeMode,
  counts,
  onModeChange,
}: {
  activeMode: FlashcardStudyMode;
  counts: FlashcardStudyModeCounts;
  onModeChange: (mode: FlashcardStudyMode) => void;
}) {
  const { t } = useLanguage();
  const fallbackMode = STUDY_MODE_OPTIONS.find(
    (option) => option.mode !== activeMode && counts[option.mode] > 0,
  )?.mode;
  let titleKey: TranslationKey = "practice.study.noWeakTitle";
  let descriptionKey: TranslationKey = "practice.study.noWeakDescription";

  if (activeMode === "review") {
    titleKey = "practice.study.noReviewTitle";
    descriptionKey = "practice.study.noReviewDescription";
  } else if (activeMode === "learn") {
    titleKey = "practice.study.noLearnTitle";
    descriptionKey = "practice.study.noLearnDescription";
  }

  return (
    <EmptyState
      title={t(titleKey)}
      description={t(descriptionKey)}
      className="border-line bg-surface/88 shadow-soft"
    >
      {fallbackMode ? (
        <button
          type="button"
          onClick={() => onModeChange(fallbackMode)}
          className={buttonClassName({ variant: "primary" })}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {t(
            STUDY_MODE_OPTIONS.find((option) => option.mode === fallbackMode)
              ?.translationKey ?? "practice.study.reviewDue",
          )}
        </button>
      ) : null}
    </EmptyState>
  );
}

function CompletionPanel({
  onPracticeWeak,
  reviews,
  weakReviewCount,
}: {
  onPracticeWeak: () => void;
  reviews: readonly ReviewOutcome[];
  weakReviewCount: number;
}) {
  const { language, t } = useLanguage();
  const solidReviewCount = reviews.length - weakReviewCount;

  return (
    <div className="rounded-lg border border-line bg-surface/92 p-6 shadow-soft backdrop-blur-sm md:p-8">
      <Badge tone="coptic" size="sm">
        {t("practice.saved.completeTitle")}
      </Badge>
      <h2 className="mt-5 max-w-2xl text-3xl font-semibold tracking-tight text-ink">
        {t("practice.saved.completeDescription")}
      </h2>
      <p className="mt-4 text-sm leading-6 text-muted">
        {t("practice.saved.reviewed")}: {reviews.length}
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {[
          [t("practice.saved.solidAnswers"), solidReviewCount],
          [t("practice.saved.needsPractice"), weakReviewCount],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-line bg-elevated/70 px-4 py-3"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">
              {label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {weakReviewCount > 0 ? (
          <button
            type="button"
            onClick={onPracticeWeak}
            className={buttonClassName({ variant: "primary" })}
          >
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            {t("practice.saved.practiceWeak")}
          </button>
        ) : null}
        <Link
          href={getDashboardPath(language)}
          className={buttonClassName({
            variant: weakReviewCount > 0 ? "secondary" : "primary",
          })}
        >
          <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
          {t("practice.saved.openDashboard")}
        </Link>
        <Link
          href={getDictionaryPath(language)}
          className={buttonClassName({ variant: "secondary" })}
        >
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          {t("practice.saved.openDictionary")}
        </Link>
      </div>
    </div>
  );
}

function AnonymousProgressCta({ loginPath }: { loginPath: string }) {
  const { t } = useLanguage();

  return (
    <div className="mb-4 rounded-lg border border-coptic/15 bg-coptic/5 px-3 py-3 md:mb-5 md:px-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-coptic/20 bg-surface text-coptic">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">
              {t("practice.saved.keepProgressTitle")}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted md:text-sm">
              {t("practice.saved.keepProgressDescription")}
            </p>
          </div>
        </div>
        <Link
          href={loginPath}
          prefetch={false}
          className={buttonClassName({
            className: "w-full shrink-0 sm:w-auto",
            size: "sm",
            variant: "primary",
          })}
        >
          <LogIn className="h-4 w-4" aria-hidden="true" />
          {t("nav.login")}
        </Link>
      </div>
    </div>
  );
}

export function PracticePageClient({
  activeDeck,
  activeDeckId,
  deckOptions,
  initialStudyMode,
  isPersistenceEnabled,
  items,
  nextDueAt,
  privateDeckLoginPath,
  stats,
  storageError,
}: PracticePageClientProps) {
  const { language, t } = useLanguage();
  const { speakAuto } = useSpeech();
  const [deckFilters, setDeckFilters] =
    useState<DictionaryFlashcardDeckFilters>(
      DEFAULT_DICTIONARY_FLASHCARD_DECK_FILTERS,
    );
  const filteredItems = useMemo(
    () =>
      filterDictionaryFlashcardDeckItems({
        filters: deckFilters,
        items,
      }),
    [deckFilters, items],
  );
  const filterOptions = useMemo(
    () => getDictionaryFlashcardDeckFilterOptions(items),
    [items],
  );
  const studyModeCounts = useMemo(
    () => getFlashcardStudyModeCounts(filteredItems),
    [filteredItems],
  );
  const resolvedInitialStudyMode = getInitialFlashcardStudyMode({
    counts: studyModeCounts,
    requestedMode: initialStudyMode,
  });
  const [activeMode, setActiveMode] = useState<FlashcardStudyMode>(
    resolvedInitialStudyMode,
  );
  const [sessionItems, setSessionItems] = useState<AppFlashcardDeckItem[]>(() =>
    getFlashcardStudyModeItems({
      items: filteredItems,
      mode: resolvedInitialStudyMode,
    }),
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHintVisible, setIsHintVisible] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [typedAnswerStatus, setTypedAnswerStatus] =
    useState<TypedFlashcardAnswerResult | null>(null);
  const [shouldShake, setShouldShake] = useState(false);
  const [reviews, setReviews] = useState<ReviewOutcome[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDeckPickerOpen, setIsDeckPickerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const totalCards = sessionItems.length;
  const isComplete = totalCards > 0 && currentIndex >= totalCards;
  const currentItem = isComplete ? null : sessionItems[currentIndex];
  const currentPosition = isComplete
    ? totalCards
    : Math.min(currentIndex + 1, totalCards);
  const hasAnyModeCards = STUDY_MODE_OPTIONS.some(
    (option) => studyModeCounts[option.mode] > 0,
  );
  const weakReviewCount = reviews.filter((review) =>
    isWeakFlashcardRating(review.rating),
  ).length;
  const weakReviewItems = useMemo(() => {
    const weakCandidateIds = new Set(
      reviews
        .filter((review) => isWeakFlashcardRating(review.rating))
        .map((review) => review.candidateId),
    );

    return sessionItems.filter((item) =>
      weakCandidateIds.has(item.candidate.id),
    );
  }, [reviews, sessionItems]);
  const visibleStudyModeCounts = {
    ...studyModeCounts,
    weak: Math.max(
      studyModeCounts.weak,
      activeMode === "weak" ? totalCards : weakReviewItems.length,
    ),
  } satisfies FlashcardStudyModeCounts;
  const nextDueDate = formatNextDue(nextDueAt, language);
  const isSavedDeck = activeDeck.kind === "saved";
  const shouldShowAnonymousProgressCta =
    !isPersistenceEnabled &&
    reviews.length >= ANONYMOUS_PROGRESS_CTA_REVIEW_THRESHOLD;
  const hasActiveDeckFilters =
    hasActiveDictionaryFlashcardDeckFilters(deckFilters);

  function resetStudySessionState() {
    setCurrentIndex(0);
    setIsHintVisible(false);
    setIsRevealed(false);
    setTypedAnswer("");
    setTypedAnswerStatus(null);
    setShouldShake(false);
    setReviews([]);
    setErrorMessage(null);
  }

  function applyDeckFilters(nextFilters: DictionaryFlashcardDeckFilters) {
    const nextItems = filterDictionaryFlashcardDeckItems({
      filters: nextFilters,
      items,
    });
    const nextCounts = getFlashcardStudyModeCounts(nextItems);
    const nextMode = getInitialFlashcardStudyMode({
      counts: nextCounts,
      requestedMode: activeMode,
    });

    setDeckFilters(nextFilters);
    setActiveMode(nextMode);
    setSessionItems(
      getFlashcardStudyModeItems({
        items: nextItems,
        mode: nextMode,
      }),
    );
    resetStudySessionState();
  }

  function startStudyMode(
    mode: FlashcardStudyMode,
    forcedItems?: readonly AppFlashcardDeckItem[],
  ) {
    setActiveMode(mode);
    setSessionItems(
      forcedItems
        ? [...forcedItems]
        : getFlashcardStudyModeItems({
            items: filteredItems,
            mode,
          }),
    );
    resetStudySessionState();
  }

  const advanceSessionReview = useCallback(
    (options: {
      cardId: string;
      dueAt: string | null;
      rating: FlashcardReviewRating;
    }) => {
      if (!currentItem) {
        return;
      }

      setReviews((currentReviews) => [
        ...currentReviews,
        {
          cardId: options.cardId,
          candidateId: currentItem.candidate.id,
          dueAt: options.dueAt,
          rating: options.rating,
        },
      ]);
      setCurrentIndex((index) => index + 1);
      setIsHintVisible(false);
      setIsRevealed(false);
      setTypedAnswer("");
      setTypedAnswerStatus(null);
      setShouldShake(false);
    },
    [currentItem],
  );

  function updateTypedAnswer(value: string) {
    setTypedAnswer(value);
    setTypedAnswerStatus(null);
  }

  const checkTypedAnswer = useCallback(() => {
    if (!currentItem || currentItem.candidate.back.kind !== "coptic") {
      return;
    }

    const status = compareTypedFlashcardAnswer({
      expected: currentItem.candidate.back.text,
      input: typedAnswer,
    });
    setTypedAnswerStatus(status);

    if (status === "correct") {
      setIsRevealed(true);
    } else if (status === "incorrect") {
      setShouldShake(true);
      setTimeout(() => setShouldShake(false), 500);
    }
  }, [currentItem, typedAnswer]);

  const reviewCurrentCard = useCallback(
    (rating: FlashcardReviewRating) => {
      if (!currentItem || isPending) {
        return;
      }

      setErrorMessage(null);

      if (!isPersistenceEnabled) {
        advanceSessionReview({
          cardId: currentItem.candidate.id,
          dueAt: null,
          rating,
        });
        return;
      }

      startTransition(async () => {
        let practiceItemId = currentItem.flashcardId;

        if (!practiceItemId) {
          const ensureFormData = new FormData();
          ensureFormData.set("language", language);
          ensureFormData.set("sourceType", currentItem.candidate.sourceType);
          ensureFormData.set("sourceId", currentItem.candidate.sourceId);
          ensureFormData.set("variantKey", currentItem.candidate.variantKey);
          ensureFormData.set("template", currentItem.candidate.template);

          if (isDictionaryFlashcardCandidate(currentItem.candidate)) {
            ensureFormData.set(
              "entryId",
              String(currentItem.candidate.entryId),
            );
            ensureFormData.set(
              "selectedDialect",
              currentItem.candidate.selectedDialect,
            );
          }

          const ensureResult = await ensurePracticeItemForSource(
            null,
            ensureFormData,
          );

          if (!ensureResult?.success || !ensureResult.practiceItemId) {
            setErrorMessage(
              ensureResult?.error ?? t("practice.saved.reviewFailed"),
            );
            return;
          }

          practiceItemId = ensureResult.practiceItemId;
        }

        const reviewFormData = new FormData();
        reviewFormData.set("language", language);
        reviewFormData.set("practiceItemId", practiceItemId);
        reviewFormData.set("rating", rating);

        const reviewResult = await submitPracticeReview(null, reviewFormData);

        if (!reviewResult?.success) {
          setErrorMessage(
            reviewResult?.error ?? t("practice.saved.reviewFailed"),
          );
          return;
        }

        advanceSessionReview({
          cardId: practiceItemId,
          dueAt: reviewResult.dueAt ?? null,
          rating,
        });
      });
    },
    [
      currentItem,
      isPending,
      isPersistenceEnabled,
      language,
      advanceSessionReview,
      t,
    ],
  );

  const playCurrentAudio = useCallback(() => {
    if (!currentItem) {
      return;
    }

    const textToSpeak = isRevealed
      ? getCandidateAnswerSpeechText(currentItem.candidate) ||
        getCandidateFrontSpeechText(currentItem.candidate)
      : getCandidateFrontSpeechText(currentItem.candidate) ||
        getCandidateAnswerSpeechText(currentItem.candidate);

    if (textToSpeak) {
      speakAuto(textToSpeak);
    }
  }, [currentItem, isRevealed, speakAuto]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const activeEl = document.activeElement;
      const isTyping =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.getAttribute("contenteditable") === "true");

      if (isTyping) {
        return;
      }

      if (isDeckPickerOpen) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === " " || event.key === "Enter") {
        event.preventDefault();
        if (!currentItem) {
          return;
        }

        if (!isRevealed) {
          const isTypingCard = currentItem.candidate.back.kind === "coptic";
          if (isTypingCard) {
            checkTypedAnswer();
          } else {
            setIsRevealed(true);
          }
        } else {
          reviewCurrentCard("good");
        }
      } else if (key === "1") {
        if (isRevealed) {
          event.preventDefault();
          reviewCurrentCard("again");
        }
      } else if (key === "2") {
        if (isRevealed) {
          event.preventDefault();
          reviewCurrentCard("hard");
        }
      } else if (key === "3") {
        if (isRevealed) {
          event.preventDefault();
          reviewCurrentCard("good");
        }
      } else if (key === "4") {
        if (isRevealed) {
          event.preventDefault();
          reviewCurrentCard("easy");
        }
      } else if (key === "r" || key === "v") {
        event.preventDefault();
        playCurrentAudio();
      } else if (key === "h") {
        event.preventDefault();
        setIsHintVisible((prev) => !prev);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    currentItem,
    isRevealed,
    isDeckPickerOpen,
    playCurrentAudio,
    reviewCurrentCard,
    checkTypedAnswer,
  ]);

  const caughtUpDescription = nextDueDate
    ? `${t("practice.saved.nextDue")}: ${nextDueDate}`
    : t("practice.saved.caughtUpDescription");
  let deckContent;

  if (storageError) {
    deckContent = (
      <EmptyState
        title={t("practice.saved.storageTitle")}
        description={t("practice.saved.storageDescription")}
        className="border-line bg-surface/88 shadow-soft"
      >
        <Link
          href={getDashboardPath(language)}
          className={buttonClassName({ variant: "secondary" })}
        >
          <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
          {t("practice.saved.openDashboard")}
        </Link>
      </EmptyState>
    );
  } else if (stats.totalSourceEntries === 0) {
    deckContent = (
      <EmptyState
        title={
          isSavedDeck
            ? t("practice.saved.emptyTitle")
            : t("practice.saved.generatedEmptyTitle")
        }
        description={
          isSavedDeck
            ? t("practice.saved.emptyDescription")
            : t("practice.saved.generatedEmptyDescription")
        }
        className="border-line bg-surface/88 shadow-soft"
      >
        <Link
          href={getDictionaryPath(language)}
          className={buttonClassName({ variant: "primary" })}
        >
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          {t("practice.saved.openDictionary")}
        </Link>
      </EmptyState>
    );
  } else if (hasActiveDeckFilters && filteredItems.length === 0) {
    deckContent = (
      <EmptyState
        title={t("practice.filters.emptyTitle")}
        description={t("practice.filters.emptyDescription")}
        className="border-line bg-surface/88 shadow-soft"
      >
        <button
          type="button"
          onClick={() =>
            applyDeckFilters(DEFAULT_DICTIONARY_FLASHCARD_DECK_FILTERS)
          }
          className={buttonClassName({ variant: "primary" })}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {t("practice.filters.reset")}
        </button>
      </EmptyState>
    );
  } else if (!hasAnyModeCards) {
    deckContent = (
      <EmptyState
        title={t("practice.saved.caughtUpTitle")}
        description={caughtUpDescription}
        className="border-line bg-surface/88 shadow-soft"
      >
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href={getDashboardPath(language)}
            className={buttonClassName({ variant: "primary" })}
          >
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            {t("practice.saved.openDashboard")}
          </Link>
          <Link
            href={getDictionaryPath(language)}
            className={buttonClassName({ variant: "secondary" })}
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            {t("practice.saved.openDictionary")}
          </Link>
        </div>
      </EmptyState>
    );
  } else if (totalCards === 0) {
    deckContent = (
      <StudyModeEmptyPanel
        activeMode={activeMode}
        counts={studyModeCounts}
        onModeChange={startStudyMode}
      />
    );
  } else {
    deckContent = (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6">
        <div className="min-w-0 rounded-lg border border-line bg-surface/92 p-4 shadow-soft backdrop-blur-sm md:p-7">
          {currentItem ? (
            <>
              <MobileReviewProgress
                currentPosition={currentPosition}
                reviews={reviews}
                totalCards={totalCards}
              />

              {shouldShowAnonymousProgressCta ? (
                <AnonymousProgressCta loginPath={privateDeckLoginPath} />
              ) : null}

              <FlashcardFace
                item={currentItem}
                isHintVisible={isHintVisible}
                isRevealed={isRevealed}
                typedAnswer={typedAnswer}
                typedAnswerStatus={typedAnswerStatus}
                onTypedAnswerChange={updateTypedAnswer}
                onTypedAnswerCheck={checkTypedAnswer}
                shouldShake={shouldShake}
              />

              {errorMessage ? (
                <StatusNotice
                  align="left"
                  className="mt-5"
                  tone="error"
                  title={t("practice.saved.reviewFailed")}
                >
                  {errorMessage}
                </StatusNotice>
              ) : null}

              <div className="mt-2 border-t border-line pt-2 md:mt-6 md:pt-6">
                {!isRevealed ? (
                  <div className="grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-2 sm:flex sm:flex-wrap">
                    <button
                      type="button"
                      onClick={() =>
                        setIsHintVisible((currentValue) => !currentValue)
                      }
                      className={buttonClassName({
                        className: "w-full sm:w-auto",
                        variant: "secondary",
                      })}
                    >
                      <Lightbulb className="h-4 w-4" aria-hidden="true" />
                      <span>
                        {isHintVisible
                          ? t("practice.saved.hideHint")
                          : t("practice.saved.hint")}
                      </span>
                      <kbd className="hidden md:inline-block ml-1.5 px-1.5 py-0.5 text-[10px] font-sans font-semibold text-muted bg-elevated rounded border border-line shadow-sm">
                        H
                      </kbd>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRevealed(true)}
                      className={buttonClassName({
                        className: "w-full sm:w-auto",
                        variant: "primary",
                      })}
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" />
                      <span>{t("practice.saved.reveal")}</span>
                      <kbd className="hidden md:inline-block ml-1.5 px-1.5 py-0.5 text-[10px] font-sans font-semibold text-paper/85 bg-paper/20 rounded border border-paper/10 shadow-sm">
                        Space
                      </kbd>
                    </button>
                  </div>
                ) : (
                  <div className="w-full">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
                      {t("practice.saved.ratingLabel")}
                    </p>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
                      {RATING_OPTIONS.map((option, index) => {
                        const Icon = option.icon;
                        const buttonLabel = isPending
                          ? t("practice.saved.saving")
                          : t(option.translationKey);

                        return (
                          <button
                            key={option.rating}
                            type="button"
                            disabled={isPending}
                            onClick={() => reviewCurrentCard(option.rating)}
                            className={cx(
                              "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 active:translate-y-0 disabled:pointer-events-none disabled:opacity-55",
                              option.toneClassName,
                            )}
                          >
                            <Icon
                              className="h-4 w-4 shrink-0"
                              aria-hidden="true"
                            />
                            <span>{buttonLabel}</span>
                            <kbd className="hidden md:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-sans font-semibold opacity-75 rounded border border-current bg-surface/10">
                              {index + 1}
                            </kbd>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <CompletionPanel
              onPracticeWeak={() => startStudyMode("weak", weakReviewItems)}
              reviews={reviews}
              weakReviewCount={weakReviewCount}
            />
          )}
        </div>

        <div className="hidden lg:block">
          <ProgressPanel
            currentPosition={currentPosition}
            reviews={reviews}
            totalCards={totalCards}
          />
        </div>
      </div>
    );
  }

  return (
    <PageShell
      className="app-page-shell"
      contentClassName="app-page-content"
      width="standard"
      accents={[
        pageShellAccents.heroCopticBand,
        pageShellAccents.topRightGoldWashInset,
        pageShellAccents.bottomLeftCopticWashSoft,
      ]}
    >
      <AppPageIntro
        spacing="compact"
        breadcrumbs={[
          { label: t("nav.home"), href: getLocalizedHomePath(language) },
          { label: t("nav.practice") },
        ]}
        title={t(activeDeck.titleKey)}
        actionsClassName="max-md:hidden"
        actions={
          <>
            {!isPersistenceEnabled ? (
              <Link
                href={privateDeckLoginPath}
                prefetch={false}
                className={buttonClassName({ variant: "primary" })}
              >
                {t("practice.saved.signInToSave")}
              </Link>
            ) : null}
            <Link
              href={getDictionaryPath(language)}
              prefetch={false}
              className={buttonClassName({ variant: "secondary" })}
            >
              <BookOpen className="h-4 w-4" />
              {t("nav.dictionarySearchShort")}
            </Link>
            <Link
              href={getGrammarPath(language)}
              prefetch={false}
              className={buttonClassName({ variant: "secondary" })}
            >
              <GraduationCap className="h-4 w-4" />
              {t("nav.grammar")}
            </Link>
          </>
        }
      />

      <StudySetupPanel
        activeDeck={activeDeck}
        activeMode={activeMode}
        counts={visibleStudyModeCounts}
        filteredCount={filteredItems.length}
        filters={deckFilters}
        filterOptions={filterOptions}
        isPending={isPending}
        onFilterChange={applyDeckFilters}
        onOpenDeckPicker={() => setIsDeckPickerOpen(true)}
        onModeChange={startStudyMode}
        onResetFilters={() =>
          applyDeckFilters(DEFAULT_DICTIONARY_FLASHCARD_DECK_FILTERS)
        }
        shouldShowStudyModes={
          !storageError && stats.totalSourceEntries > 0 && hasAnyModeCards
        }
        totalCount={items.length}
      />

      <DeckPickerDialog
        activeDeckId={activeDeckId}
        deckOptions={deckOptions}
        isOpen={isDeckPickerOpen}
        isPersistenceEnabled={isPersistenceEnabled}
        language={language}
        onClose={() => setIsDeckPickerOpen(false)}
        privateDeckLoginPath={privateDeckLoginPath}
      />

      {deckContent}
    </PageShell>
  );
}
