import type {
  FlashcardDeckItem,
  FlashcardSide,
} from "@/features/practice/lib/core";
import type { AppFlashcardCandidate } from "@/features/practice/lib/deckRegistry";
import type { FlashcardReviewRating } from "@/features/practice/types";

export type AppFlashcardDeckItem = FlashcardDeckItem<AppFlashcardCandidate>;

export type AppFlashcardSide = FlashcardSide;

export type PracticeReviewOutcome = {
  cardId: string;
  candidateId: string;
  dueAt: string | null;
  rating: FlashcardReviewRating;
};
