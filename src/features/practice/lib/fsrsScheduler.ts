import {
  createEmptyCard,
  fsrs,
  Rating,
  State,
  type Card,
  type CardInput,
  type Grade,
  type ReviewLog,
} from "ts-fsrs";

import {
  FLASHCARD_REVIEW_RATINGS,
  type FlashcardReviewRating,
} from "@/features/practice/types";

type SerializedFsrsCard = {
  difficulty: number;
  due: string;
  elapsed_days: number;
  lapses: number;
  last_review?: string;
  learning_steps: number;
  reps: number;
  scheduled_days: number;
  stability: number;
  state: State;
};

type SerializedFsrsReviewLog = {
  difficulty: number;
  due: string;
  elapsed_days: number;
  last_elapsed_days: number;
  learning_steps: number;
  rating: Rating;
  review: string;
  scheduled_days: number;
  stability: number;
  state: State;
};

type InitialFlashcardSchedulerState = {
  card: SerializedFsrsCard;
  dueAt: string;
};

type FlashcardSchedulerReviewResult = {
  card: SerializedFsrsCard;
  dueAt: string;
  log: SerializedFsrsReviewLog;
  reviewedAt: string;
};

const FSRS_RATING_BY_REVIEW_RATING: Record<FlashcardReviewRating, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidIsoDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isFsrsState(value: unknown): value is State {
  return (
    value === State.New ||
    value === State.Learning ||
    value === State.Review ||
    value === State.Relearning
  );
}

function toIsoString(value: Date | number | string | null | undefined) {
  if (value === null || typeof value === "undefined") {
    return undefined;
  }

  return new Date(value).toISOString();
}

/**
 * Converts the FSRS card object into a plain JSON shape that Supabase can store
 * and later pass back through the scheduler without Date instances.
 */
function serializeFsrsCard(card: Card): SerializedFsrsCard {
  const lastReview = toIsoString(card.last_review);

  return {
    difficulty: card.difficulty,
    due: card.due.toISOString(),
    elapsed_days: card.elapsed_days,
    lapses: card.lapses,
    ...(lastReview ? { last_review: lastReview } : {}),
    learning_steps: card.learning_steps,
    reps: card.reps,
    scheduled_days: card.scheduled_days,
    stability: card.stability,
    state: card.state,
  };
}

function serializeFsrsReviewLog(log: ReviewLog): SerializedFsrsReviewLog {
  return {
    difficulty: log.difficulty,
    due: log.due.toISOString(),
    elapsed_days: log.elapsed_days,
    last_elapsed_days: log.last_elapsed_days,
    learning_steps: log.learning_steps,
    rating: log.rating,
    review: log.review.toISOString(),
    scheduled_days: log.scheduled_days,
    stability: log.stability,
    state: log.state,
  };
}

/**
 * Rehydrates a persisted scheduler card into the Date-bearing input shape that
 * `ts-fsrs` expects for the next review calculation.
 */
function toFsrsCardInput(card: SerializedFsrsCard): CardInput {
  return {
    difficulty: card.difficulty,
    due: new Date(card.due),
    elapsed_days: card.elapsed_days,
    lapses: card.lapses,
    last_review: card.last_review ? new Date(card.last_review) : null,
    learning_steps: card.learning_steps,
    reps: card.reps,
    scheduled_days: card.scheduled_days,
    stability: card.stability,
    state: card.state,
  };
}

export function isFlashcardReviewRating(
  value: string,
): value is FlashcardReviewRating {
  return FLASHCARD_REVIEW_RATINGS.includes(value as FlashcardReviewRating);
}

/**
 * Validates persisted scheduler state before review. Corrupt or legacy rows
 * return `null` so callers can fail with a clear practice-storage error.
 */
export function parseSerializedFsrsCard(
  value: unknown,
): SerializedFsrsCard | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    !isFiniteNumber(value.difficulty) ||
    !isValidIsoDate(value.due) ||
    !isFiniteNumber(value.elapsed_days) ||
    !isFiniteNumber(value.lapses) ||
    !isFiniteNumber(value.learning_steps) ||
    !isFiniteNumber(value.reps) ||
    !isFiniteNumber(value.scheduled_days) ||
    !isFiniteNumber(value.stability) ||
    !isFsrsState(value.state)
  ) {
    return null;
  }

  if (
    typeof value.last_review !== "undefined" &&
    !isValidIsoDate(value.last_review)
  ) {
    return null;
  }

  return {
    difficulty: value.difficulty,
    due: value.due,
    elapsed_days: value.elapsed_days,
    lapses: value.lapses,
    ...(value.last_review ? { last_review: value.last_review } : {}),
    learning_steps: value.learning_steps,
    reps: value.reps,
    scheduled_days: value.scheduled_days,
    stability: value.stability,
    state: value.state,
  };
}

/**
 * Creates the first scheduler card for a new practice item and exposes the
 * initial due timestamp alongside the serialized card.
 */
export function createInitialFlashcardSchedulerState(
  now = new Date(),
): InitialFlashcardSchedulerState {
  const card = serializeFsrsCard(createEmptyCard(now));

  return {
    card,
    dueAt: card.due,
  };
}

/**
 * Applies one user review to serialized FSRS state and returns both the next
 * persisted card and a serializable review log for analytics/replay.
 */
export function reviewFlashcardSchedulerState(
  serializedCard: unknown,
  rating: FlashcardReviewRating,
  now = new Date(),
): FlashcardSchedulerReviewResult {
  const card = parseSerializedFsrsCard(serializedCard);

  if (!card) {
    throw new Error("Invalid flashcard scheduler state.");
  }

  const result = fsrs().next(
    toFsrsCardInput(card),
    now,
    FSRS_RATING_BY_REVIEW_RATING[rating],
  );
  const nextCard = serializeFsrsCard(result.card);
  const log = serializeFsrsReviewLog(result.log);

  return {
    card: nextCard,
    dueAt: nextCard.due,
    log,
    reviewedAt: log.review,
  };
}
