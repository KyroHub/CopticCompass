"use client";

import {
  BookOpen,
  CheckCircle2,
  Eye,
  GraduationCap,
  LayoutDashboard,
  Lightbulb,
  LogIn,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";

import { AppPageIntro } from "@/components/AppPageIntro";
import { buttonClassName } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { useLanguage } from "@/components/LanguageProvider";
import { PageShell, pageShellAccents } from "@/components/PageShell";
import { StatusNotice } from "@/components/StatusNotice";
import { useSpeech } from "@/features/dictionary/hooks/useSpeech";
import { CompletionPanel } from "@/features/practice/components/CompletionPanel";
import { DeckPickerDialog } from "@/features/practice/components/DeckPickerDialog";
import { FlashcardFace } from "@/features/practice/components/FlashcardFace";
import {
  ANONYMOUS_PROGRESS_CTA_REVIEW_THRESHOLD,
  RATING_OPTIONS,
  STUDY_MODE_OPTIONS,
} from "@/features/practice/components/practicePageOptions";
import {
  MobileReviewProgress,
  PracticeProgressPanel,
} from "@/features/practice/components/PracticeProgressPanel";
import { StudySetupPanel } from "@/features/practice/components/StudySetupPanel";
import { usePracticeDeckFilters } from "@/features/practice/hooks/usePracticeDeckFilters";
import { usePracticeKeyboardShortcuts } from "@/features/practice/hooks/usePracticeKeyboardShortcuts";
import { usePracticeReviewSubmission } from "@/features/practice/hooks/usePracticeReviewSubmission";
import { usePracticeSession } from "@/features/practice/hooks/usePracticeSession";
import type { FlashcardDeckStats } from "@/features/practice/lib/core";
import {
  DEFAULT_DICTIONARY_FLASHCARD_DECK_FILTERS,
  type DictionaryFlashcardDeckFilters,
} from "@/features/practice/lib/deckFilters";
import type {
  AppFlashcardDeckId,
  AppFlashcardDeckOption,
  AppFlashcardDeckSummary,
} from "@/features/practice/lib/deckRegistry";
import {
  formatNextDue,
  getCandidateAnswerSpeechText,
  getCandidateFrontSpeechText,
} from "@/features/practice/lib/practicePageHelpers";
import type { AppFlashcardDeckItem } from "@/features/practice/lib/practiceSessionTypes";
import type {
  FlashcardStudyMode,
  FlashcardStudyModeCounts,
} from "@/features/practice/lib/studyFlow";
import { cx } from "@/lib/classes";
import type { TranslationKey } from "@/lib/i18n";
import {
  getDashboardPath,
  getDictionaryPath,
  getGrammarPath,
  getLocalizedHomePath,
} from "@/lib/locale";

type PracticePageClientProps = {
  activeDeck: AppFlashcardDeckSummary;
  activeDeckId: AppFlashcardDeckId;
  deckOptions: AppFlashcardDeckOption[];
  initialStudyMode: FlashcardStudyMode | null;
  isPersistenceEnabled: boolean;
  items: AppFlashcardDeckItem[];
  nextDueAt: string | null;
  privateDeckLoginPath: string;
  stats: FlashcardDeckStats;
  storageError: string | null;
};

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
  const [isDeckPickerOpen, setIsDeckPickerOpen] = useState(false);
  const {
    deckFilters,
    filteredItems,
    filterOptions,
    getItemsForFilters,
    hasActiveDeckFilters,
    resolvedInitialStudyMode,
    setDeckFilters,
    studyModeCounts,
  } = usePracticeDeckFilters({
    initialStudyMode,
    items,
  });
  const {
    activeMode,
    advanceSessionReview,
    checkTypedAnswer,
    currentItem,
    currentPosition,
    hasAnyModeCards,
    isHintVisible,
    isRevealed,
    resetSessionForFilteredItems,
    reviews,
    setIsHintVisible,
    setIsRevealed,
    shouldShake,
    startStudyMode,
    totalCards,
    typedAnswer,
    typedAnswerStatus,
    updateTypedAnswer,
    visibleStudyModeCounts,
    weakReviewCount,
    weakReviewItems,
  } = usePracticeSession({
    filteredItems,
    initialStudyMode: resolvedInitialStudyMode,
    studyModeCounts,
  });
  const { errorMessage, isPending, reviewCurrentCard } =
    usePracticeReviewSubmission({
      currentItem,
      isPersistenceEnabled,
      language,
      onReviewSaved: advanceSessionReview,
      reviewFailedMessage: t("practice.saved.reviewFailed"),
    });
  const nextDueDate = formatNextDue(nextDueAt, language);
  const isSavedDeck = activeDeck.kind === "saved";
  const shouldShowAnonymousProgressCta =
    !isPersistenceEnabled &&
    reviews.length >= ANONYMOUS_PROGRESS_CTA_REVIEW_THRESHOLD;

  const applyDeckFilters = useCallback(
    (nextFilters: DictionaryFlashcardDeckFilters) => {
      const nextItems = getItemsForFilters(nextFilters);

      setDeckFilters(nextFilters);
      resetSessionForFilteredItems(nextItems);
    },
    [getItemsForFilters, resetSessionForFilteredItems, setDeckFilters],
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

  const revealCurrentCard = useCallback(() => {
    setIsRevealed(true);
  }, [setIsRevealed]);

  const toggleHint = useCallback(() => {
    setIsHintVisible((currentValue) => !currentValue);
  }, [setIsHintVisible]);

  usePracticeKeyboardShortcuts({
    currentItem,
    isDeckPickerOpen,
    isRevealed,
    onCheckTypedAnswer: checkTypedAnswer,
    onPlayCurrentAudio: playCurrentAudio,
    onReveal: revealCurrentCard,
    onReview: reviewCurrentCard,
    onToggleHint: toggleHint,
  });

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
                      onClick={toggleHint}
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
                      onClick={revealCurrentCard}
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
          <PracticeProgressPanel
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
