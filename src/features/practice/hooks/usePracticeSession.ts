"use client";

import { useCallback, useMemo, useState } from "react";

import type {
  AppFlashcardDeckItem,
  PracticeReviewOutcome,
} from "@/features/practice/lib/practiceSessionTypes";
import {
  FLASHCARD_STUDY_MODES,
  getFlashcardStudyModeCounts,
  getFlashcardStudyModeItems,
  getInitialFlashcardStudyMode,
  isWeakFlashcardRating,
  type FlashcardStudyMode,
  type FlashcardStudyModeCounts,
} from "@/features/practice/lib/studyFlow";
import type { TypedFlashcardAnswerResult } from "@/features/practice/lib/typedAnswer";
import { compareTypedFlashcardAnswer } from "@/features/practice/lib/typedAnswer";
import type { FlashcardReviewRating } from "@/features/practice/types";

type AdvanceSessionReviewOptions = {
  cardId: string;
  dueAt: string | null;
  rating: FlashcardReviewRating;
};

type UsePracticeSessionOptions = {
  filteredItems: readonly AppFlashcardDeckItem[];
  initialStudyMode: FlashcardStudyMode;
  studyModeCounts: FlashcardStudyModeCounts;
};

export function usePracticeSession({
  filteredItems,
  initialStudyMode,
  studyModeCounts,
}: UsePracticeSessionOptions) {
  const [activeMode, setActiveMode] =
    useState<FlashcardStudyMode>(initialStudyMode);
  const [sessionItems, setSessionItems] = useState<AppFlashcardDeckItem[]>(() =>
    getFlashcardStudyModeItems({
      items: filteredItems,
      mode: initialStudyMode,
    }),
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHintVisible, setIsHintVisible] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [typedAnswerStatus, setTypedAnswerStatus] =
    useState<TypedFlashcardAnswerResult | null>(null);
  const [shouldShake, setShouldShake] = useState(false);
  const [reviews, setReviews] = useState<PracticeReviewOutcome[]>([]);

  const totalCards = sessionItems.length;
  const isComplete = totalCards > 0 && currentIndex >= totalCards;
  const currentItem = isComplete ? null : sessionItems[currentIndex];
  const currentPosition = isComplete
    ? totalCards
    : Math.min(currentIndex + 1, totalCards);

  const resetStudySessionState = useCallback(() => {
    setCurrentIndex(0);
    setIsHintVisible(false);
    setIsRevealed(false);
    setTypedAnswer("");
    setTypedAnswerStatus(null);
    setShouldShake(false);
    setReviews([]);
  }, []);

  const startStudyMode = useCallback(
    (
      mode: FlashcardStudyMode,
      forcedItems?: readonly AppFlashcardDeckItem[],
    ) => {
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
    },
    [filteredItems, resetStudySessionState],
  );

  const resetSessionForFilteredItems = useCallback(
    (nextItems: readonly AppFlashcardDeckItem[]) => {
      const nextCounts = getFlashcardStudyModeCounts(nextItems);
      const nextMode = getInitialFlashcardStudyMode({
        counts: nextCounts,
        requestedMode: activeMode,
      });

      setActiveMode(nextMode);
      setSessionItems(
        getFlashcardStudyModeItems({
          items: nextItems,
          mode: nextMode,
        }),
      );
      resetStudySessionState();
    },
    [activeMode, resetStudySessionState],
  );

  const advanceSessionReview = useCallback(
    (options: AdvanceSessionReviewOptions) => {
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

  const updateTypedAnswer = useCallback((value: string) => {
    setTypedAnswer(value);
    setTypedAnswerStatus(null);
  }, []);

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

  const visibleStudyModeCounts = useMemo(
    () =>
      ({
        ...studyModeCounts,
        weak: Math.max(
          studyModeCounts.weak,
          activeMode === "weak" ? totalCards : weakReviewItems.length,
        ),
      }) satisfies FlashcardStudyModeCounts,
    [activeMode, studyModeCounts, totalCards, weakReviewItems.length],
  );

  const hasAnyModeCards = useMemo(
    () => FLASHCARD_STUDY_MODES.some((mode) => studyModeCounts[mode] > 0),
    [studyModeCounts],
  );

  return {
    activeMode,
    advanceSessionReview,
    checkTypedAnswer,
    currentItem,
    currentPosition,
    hasAnyModeCards,
    isComplete,
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
  };
}
