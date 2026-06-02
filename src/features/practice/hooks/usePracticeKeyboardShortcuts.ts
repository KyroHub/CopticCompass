"use client";

import { useEffect } from "react";

import type { AppFlashcardDeckItem } from "@/features/practice/lib/practiceSessionTypes";
import type { FlashcardReviewRating } from "@/features/practice/types";

type UsePracticeKeyboardShortcutsOptions = {
  currentItem: AppFlashcardDeckItem | null | undefined;
  isDeckPickerOpen: boolean;
  isRevealed: boolean;
  onCheckTypedAnswer: () => void;
  onPlayCurrentAudio: () => void;
  onReveal: () => void;
  onReview: (rating: FlashcardReviewRating) => void;
  onToggleHint: () => void;
};

export function usePracticeKeyboardShortcuts({
  currentItem,
  isDeckPickerOpen,
  isRevealed,
  onCheckTypedAnswer,
  onPlayCurrentAudio,
  onReveal,
  onReview,
  onToggleHint,
}: UsePracticeKeyboardShortcutsOptions) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const activeEl = document.activeElement;
      const isTyping =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.getAttribute("contenteditable") === "true");

      if (isTyping || isDeckPickerOpen) {
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
            onCheckTypedAnswer();
          } else {
            onReveal();
          }
        } else {
          onReview("good");
        }
      } else if (key === "1") {
        if (isRevealed) {
          event.preventDefault();
          onReview("again");
        }
      } else if (key === "2") {
        if (isRevealed) {
          event.preventDefault();
          onReview("hard");
        }
      } else if (key === "3") {
        if (isRevealed) {
          event.preventDefault();
          onReview("good");
        }
      } else if (key === "4") {
        if (isRevealed) {
          event.preventDefault();
          onReview("easy");
        }
      } else if (key === "r" || key === "v") {
        event.preventDefault();
        onPlayCurrentAudio();
      } else if (key === "h") {
        event.preventDefault();
        onToggleHint();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    currentItem,
    isDeckPickerOpen,
    isRevealed,
    onCheckTypedAnswer,
    onPlayCurrentAudio,
    onReveal,
    onReview,
    onToggleHint,
  ]);
}
