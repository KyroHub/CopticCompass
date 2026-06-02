"use client";

import { useCallback, useState, useTransition } from "react";

import {
  ensurePracticeItemForSource,
  submitPracticeReview,
} from "@/actions/practice";
import { isDictionaryFlashcardCandidate } from "@/features/practice/lib/practicePageHelpers";
import type { AppFlashcardDeckItem } from "@/features/practice/lib/practiceSessionTypes";
import type { FlashcardReviewRating } from "@/features/practice/types";
import type { Language } from "@/types/i18n";

type SavedPracticeReview = {
  cardId: string;
  dueAt: string | null;
  rating: FlashcardReviewRating;
};

type UsePracticeReviewSubmissionOptions = {
  currentItem: AppFlashcardDeckItem | null | undefined;
  isPersistenceEnabled: boolean;
  language: Language;
  onReviewSaved: (review: SavedPracticeReview) => void;
  reviewFailedMessage: string;
};

export function usePracticeReviewSubmission({
  currentItem,
  isPersistenceEnabled,
  language,
  onReviewSaved,
  reviewFailedMessage,
}: UsePracticeReviewSubmissionOptions) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const reviewCurrentCard = useCallback(
    (rating: FlashcardReviewRating) => {
      if (!currentItem || isPending) {
        return;
      }

      setErrorMessage(null);

      if (!isPersistenceEnabled) {
        onReviewSaved({
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
            setErrorMessage(ensureResult?.error ?? reviewFailedMessage);
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
          setErrorMessage(reviewResult?.error ?? reviewFailedMessage);
          return;
        }

        onReviewSaved({
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
      onReviewSaved,
      reviewFailedMessage,
    ],
  );

  return {
    errorMessage,
    isPending,
    reviewCurrentCard,
  };
}
