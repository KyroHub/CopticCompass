import type { FilterMenuOption } from "@/components/FilterMenu";
import {
  getDialectLabelKey,
  getPartOfSpeechLabel,
} from "@/features/dictionary/config";
import type {
  AppFlashcardCandidate,
  AppFlashcardDeckId,
  AppFlashcardDeckOption,
  AppFlashcardDeckSummary,
} from "@/features/practice/lib/deckRegistry";
import type { DictionaryFlashcardDeckScope } from "@/features/practice/lib/dictionaryDecks";
import type { DictionaryFlashcardCandidate } from "@/features/practice/lib/dictionaryFlashcards";
import type { GrammarFlashcardCandidate } from "@/features/practice/lib/grammarFlashcards";
import type { FlashcardReviewRating } from "@/features/practice/types";
import type { TranslationKey } from "@/lib/i18n";
import { getPracticePath } from "@/lib/locale";

type Translate = (key: TranslationKey) => string;

type DeckPickerGroupId = "mixed" | "dictionary" | "grammar" | "private";

type DeckPickerGroupDefinition = {
  descriptionKey: TranslationKey;
  id: DeckPickerGroupId;
  titleKey: TranslationKey;
};

type DeckPickerGroup = DeckPickerGroupDefinition & {
  options: AppFlashcardDeckOption[];
};

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

export function formatNextDue(value: string | null, language: "en" | "nl") {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleDateString(
    language === "nl" ? "nl-BE" : "en-US",
  );
}

export function getRatingCounts(
  reviews: readonly { rating: FlashcardReviewRating }[],
) {
  return reviews.reduce(
    (counts, review) => ({
      ...counts,
      [review.rating]: counts[review.rating] + 1,
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

export function isDictionaryFlashcardCandidate(
  candidate: AppFlashcardCandidate,
): candidate is DictionaryFlashcardCandidate {
  return candidate.sourceType === "dictionary";
}

function isGrammarFlashcardCandidate(
  candidate: AppFlashcardCandidate,
): candidate is GrammarFlashcardCandidate {
  return candidate.sourceType === "grammar";
}

export function isDictionaryDeckScope(
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

export function getDeckKindLabelKey(
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

export function getDeckPickerGroups(
  deckOptions: readonly AppFlashcardDeckOption[],
): DeckPickerGroup[] {
  return DECK_PICKER_GROUP_DEFINITIONS.map((group) => ({
    ...group,
    options: deckOptions.filter(
      (option) => getDeckPickerGroupId(option) === group.id,
    ),
  })).filter((group) => group.options.length > 0);
}

export function getFlashcardHintText(
  candidate: AppFlashcardCandidate,
  t: Translate,
) {
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

export function getAnswerContextMeanings(candidate: AppFlashcardCandidate) {
  if (candidate.back.meanings.length > 0) {
    return candidate.back.meanings;
  }

  return candidate.front.kind === "meaning" ? [candidate.front.text] : [];
}

export function getCandidatePrimaryLink(candidate: AppFlashcardCandidate) {
  return candidate.links?.[0] ?? null;
}

export function getCandidateFrontSpeechText(candidate: AppFlashcardCandidate) {
  return isDictionaryFlashcardCandidate(candidate)
    ? candidate.metadata.speechText
    : null;
}

export function getCandidateAnswerSpeechText(candidate: AppFlashcardCandidate) {
  return isDictionaryFlashcardCandidate(candidate)
    ? candidate.metadata.answerSpeechText
    : null;
}

export function getPracticeDeckPath(options: {
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

export function getDeckScopeText({
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

export function getSelectedFilterLabel(
  options: readonly FilterMenuOption[],
  value: string,
) {
  return options.find((option) => option.value === value)?.label ?? value;
}
