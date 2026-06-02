import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock3,
  Sparkles,
  XCircle,
} from "lucide-react";

import type { FlashcardStudyMode } from "@/features/practice/lib/studyFlow";
import type { FlashcardReviewRating } from "@/features/practice/types";
import type { TranslationKey } from "@/lib/i18n";

type PracticeOptionIcon = typeof BookOpen;

type RatingOption = {
  icon: PracticeOptionIcon;
  rating: FlashcardReviewRating;
  toneClassName: string;
  translationKey: TranslationKey;
};

export const RATING_OPTIONS: readonly RatingOption[] = [
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

export const ANONYMOUS_PROGRESS_CTA_REVIEW_THRESHOLD = 3;

type StudyModeOption = {
  icon: PracticeOptionIcon;
  mode: FlashcardStudyMode;
  shortTranslationKey: TranslationKey;
  translationKey: TranslationKey;
};

export const STUDY_MODE_OPTIONS: readonly StudyModeOption[] = [
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
