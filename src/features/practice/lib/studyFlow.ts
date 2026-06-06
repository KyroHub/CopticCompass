import type { FlashcardDeckItem } from "@/features/practice/lib/core";
import { DICTIONARY_FLASHCARD_QUEUE_LIMIT } from "@/features/practice/lib/dictionaryDecks";
import type { FlashcardReviewRating } from "@/features/practice/types";

export const FLASHCARD_STUDY_MODES = ["review", "learn", "weak"] as const;
const WEAK_REVIEW_SCORE_THRESHOLD = 1;

export type FlashcardStudyMode = (typeof FLASHCARD_STUDY_MODES)[number];

export type FlashcardStudyModeCounts = Record<FlashcardStudyMode, number>;

function isFlashcardStudyMode(
  value: string | null | undefined,
): value is FlashcardStudyMode {
  return FLASHCARD_STUDY_MODES.includes(value as FlashcardStudyMode);
}

export function normalizeFlashcardStudyMode(
  value: string | null | undefined,
): FlashcardStudyMode | null {
  return isFlashcardStudyMode(value) ? value : null;
}

export function isWeakFlashcardRating(
  rating: FlashcardReviewRating | null | undefined,
) {
  return rating === "again" || rating === "hard";
}

/**
 * Converts review ratings into a small weakness score. Negative values let
 * recent successful reviews gradually push a card out of the weak-review lane.
 */
function getReviewWeaknessScore(rating: FlashcardReviewRating) {
  if (rating === "again") {
    return 2;
  }

  if (rating === "hard") {
    return 1;
  }

  if (rating === "easy") {
    return -2;
  }

  return -1;
}

/**
 * Scores recent reviews for weak-mode ordering, falling back to the latest
 * stored rating when the compact recent-rating history is unavailable.
 */
export function getFlashcardWeakReviewScore(
  item: Pick<FlashcardDeckItem, "lastReviewRating" | "recentReviewRatings">,
) {
  let ratings: readonly FlashcardReviewRating[] = item.recentReviewRatings;

  if (ratings.length === 0 && item.lastReviewRating) {
    ratings = [item.lastReviewRating];
  }

  return ratings.reduce(
    (score, rating) => score + getReviewWeaknessScore(rating),
    0,
  );
}

/**
 * Marks cards for weak-mode practice when the latest review was weak or the
 * recent review trend still crosses the weakness threshold.
 */
function isWeakFlashcardItem(item: FlashcardDeckItem) {
  const latestRating = item.recentReviewRatings[0] ?? item.lastReviewRating;

  return (
    isWeakFlashcardRating(latestRating) ||
    getFlashcardWeakReviewScore(item) >= WEAK_REVIEW_SCORE_THRESHOLD
  );
}

export function getFlashcardStudyModeCounts(
  items: readonly FlashcardDeckItem[],
): FlashcardStudyModeCounts {
  return {
    learn: items.filter((item) => item.status === "new").length,
    review: items.filter((item) => item.status === "due").length,
    weak: items.filter(isWeakFlashcardItem).length,
  };
}

export function getDefaultFlashcardStudyMode(
  counts: FlashcardStudyModeCounts,
): FlashcardStudyMode {
  if (counts.review > 0) {
    return "review";
  }

  if (counts.learn > 0) {
    return "learn";
  }

  return "weak";
}

export function getInitialFlashcardStudyMode({
  counts,
  requestedMode,
}: {
  counts: FlashcardStudyModeCounts;
  requestedMode: FlashcardStudyMode | null;
}): FlashcardStudyMode {
  if (requestedMode && counts[requestedMode] > 0) {
    return requestedMode;
  }

  return getDefaultFlashcardStudyMode(counts);
}

/**
 * Selects the active study queue for a mode. Weak mode is additionally sorted
 * by weakness score so the roughest cards appear first.
 */
export function getFlashcardStudyModeItems<TItem extends FlashcardDeckItem>({
  items,
  limit = DICTIONARY_FLASHCARD_QUEUE_LIMIT,
  mode,
}: {
  items: readonly TItem[];
  limit?: number;
  mode: FlashcardStudyMode;
}) {
  const filteredItems = items.filter((item) => {
    if (mode === "review") {
      return item.status === "due";
    }

    if (mode === "learn") {
      return item.status === "new";
    }

    return isWeakFlashcardItem(item);
  });

  const sortedItems =
    mode === "weak"
      ? [...filteredItems].sort(
          (left, right) =>
            getFlashcardWeakReviewScore(right) -
            getFlashcardWeakReviewScore(left),
        )
      : filteredItems;

  return sortedItems.slice(0, Math.max(1, Math.trunc(limit)));
}
