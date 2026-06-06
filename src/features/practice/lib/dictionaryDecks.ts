import {
  DEFAULT_DICTIONARY_DIALECT_FILTER,
  type DialectFilter,
  type DictionaryDialectCode,
  type PartOfSpeech,
} from "@/features/dictionary/config";
import {
  entryHasNounGrammar,
  entryHasVerbGrammar,
} from "@/features/dictionary/lib/entryGrammar";
import type { LexicalEntry } from "@/features/dictionary/types";
import type {
  FlashcardCandidate,
  FlashcardCandidateSource,
  FlashcardDeckItem,
  FlashcardDeckKind,
  FlashcardDeckReadModel,
  FlashcardDeckStats,
  FlashcardDeckStatus,
  FlashcardDeckSummary,
  FlashcardReviewSnapshot,
} from "@/features/practice/lib/core";
import {
  buildDictionaryFlashcardCandidates,
  DEFAULT_DICTIONARY_FLASHCARD_TEMPLATES,
  type DictionaryFlashcardCandidate,
  type DictionaryFlashcardTemplate,
} from "@/features/practice/lib/dictionaryFlashcards";
import type { FlashcardSourceAdapter } from "@/features/practice/lib/sourceAdapters";
import type { DictionaryFlashcardRow } from "@/features/practice/types";
import type { Language } from "@/types/i18n";

export const DICTIONARY_FLASHCARD_DECK_IDS = [
  "saved-entries",
  "bohairic-nouns",
  "bohairic-verbs",
  "sahidic-nouns",
  "sahidic-verbs",
  "greek-loanwords",
] as const;
export const DEFAULT_DICTIONARY_FLASHCARD_DECK_ID = "saved-entries" as const;
export const PUBLIC_DICTIONARY_FLASHCARD_DECK_ID = "bohairic-nouns" as const;
export const DICTIONARY_FLASHCARD_QUEUE_LIMIT = 20;
const GENERATED_DICTIONARY_FLASHCARD_SOURCE_LIMIT = 80;

export type DictionaryFlashcardDeckId =
  (typeof DICTIONARY_FLASHCARD_DECK_IDS)[number];
type DictionaryFlashcardDeckKind = Extract<
  FlashcardDeckKind,
  "generated" | "saved"
>;

export type DictionaryFlashcardDeckScope = {
  dialect?: DictionaryDialectCode;
  partOfSpeech?: PartOfSpeech;
};

type DictionaryFlashcardDeckSummary = FlashcardDeckSummary<
  DictionaryFlashcardDeckId,
  DictionaryFlashcardDeckScope,
  DictionaryFlashcardDeckKind
>;

type DictionaryFlashcardDeckDefinition = DictionaryFlashcardDeckSummary & {
  predicate?: (entry: LexicalEntry) => boolean;
  selectedDialect?: DialectFilter;
  sourceLimit?: number;
  templates?: readonly DictionaryFlashcardTemplate[];
};

export type DictionaryFlashcardCandidateSource =
  FlashcardCandidateSource<DictionaryFlashcardCandidate>;

export type DictionaryFlashcardDeckItem =
  FlashcardDeckItem<DictionaryFlashcardCandidate>;

export type DictionaryFlashcardReviewSnapshot = FlashcardReviewSnapshot;

export type DictionaryFlashcardsDeckStats = FlashcardDeckStats;

export type DictionaryFlashcardsDeckReadModel =
  FlashcardDeckReadModel<DictionaryFlashcardCandidate>;

type DictionaryFlashcardSourceContext = {
  dictionary: readonly LexicalEntry[];
};

type BuildDictionaryFlashcardsDeckReadModelOptions<
  TCandidate extends FlashcardCandidate = DictionaryFlashcardCandidate,
> = {
  candidateSources: readonly FlashcardCandidateSource<TCandidate>[];
  existingFlashcards: readonly DictionaryFlashcardRow[];
  latestReviewsByFlashcardId?: ReadonlyMap<
    string,
    DictionaryFlashcardReviewSnapshot
  >;
  missingEntries?: number;
  now?: Date;
  queueLimit?: number;
  totalSourceEntries?: number;
};

type BuildGeneratedDictionaryFlashcardSourcesOptions = {
  deckId: DictionaryFlashcardDeckId;
  dictionary: readonly LexicalEntry[];
  language: Language;
};

const DICTIONARY_FLASHCARD_DECK_DEFINITIONS: readonly DictionaryFlashcardDeckDefinition[] =
  [
    {
      descriptionKey: "practice.deck.savedEntries.description",
      id: "saved-entries",
      kind: "saved",
      titleKey: "practice.deck.savedEntries.title",
    },
    {
      descriptionKey: "practice.deck.bohairicNouns.description",
      id: "bohairic-nouns",
      kind: "generated",
      predicate: (entry) =>
        entryHasDialect(entry, "B") && entryHasNounGrammar(entry),
      scope: {
        dialect: "B",
        partOfSpeech: "N",
      },
      selectedDialect: "B",
      sourceLimit: GENERATED_DICTIONARY_FLASHCARD_SOURCE_LIMIT,
      templates: DEFAULT_DICTIONARY_FLASHCARD_TEMPLATES,
      titleKey: "practice.deck.bohairicNouns.title",
    },
    {
      descriptionKey: "practice.deck.bohairicVerbs.description",
      id: "bohairic-verbs",
      kind: "generated",
      predicate: (entry) =>
        entryHasDialect(entry, "B") && entryHasVerbGrammar(entry),
      scope: {
        dialect: "B",
        partOfSpeech: "V",
      },
      selectedDialect: "B",
      sourceLimit: GENERATED_DICTIONARY_FLASHCARD_SOURCE_LIMIT,
      templates: DEFAULT_DICTIONARY_FLASHCARD_TEMPLATES,
      titleKey: "practice.deck.bohairicVerbs.title",
    },
    {
      descriptionKey: "practice.deck.sahidicNouns.description",
      id: "sahidic-nouns",
      kind: "generated",
      predicate: (entry) =>
        entryHasDialect(entry, "S") && entryHasNounGrammar(entry),
      scope: {
        dialect: "S",
        partOfSpeech: "N",
      },
      selectedDialect: "S",
      sourceLimit: GENERATED_DICTIONARY_FLASHCARD_SOURCE_LIMIT,
      templates: DEFAULT_DICTIONARY_FLASHCARD_TEMPLATES,
      titleKey: "practice.deck.sahidicNouns.title",
    },
    {
      descriptionKey: "practice.deck.sahidicVerbs.description",
      id: "sahidic-verbs",
      kind: "generated",
      predicate: (entry) =>
        entryHasDialect(entry, "S") && entryHasVerbGrammar(entry),
      scope: {
        dialect: "S",
        partOfSpeech: "V",
      },
      selectedDialect: "S",
      sourceLimit: GENERATED_DICTIONARY_FLASHCARD_SOURCE_LIMIT,
      templates: DEFAULT_DICTIONARY_FLASHCARD_TEMPLATES,
      titleKey: "practice.deck.sahidicVerbs.title",
    },
    {
      descriptionKey: "practice.deck.greekLoanwords.description",
      id: "greek-loanwords",
      kind: "generated",
      predicate: (entry) => entry.etym === "Gr",
      scopeLabelKey: "practice.deckScope.greekOrigin",
      selectedDialect: DEFAULT_DICTIONARY_DIALECT_FILTER,
      sourceLimit: GENERATED_DICTIONARY_FLASHCARD_SOURCE_LIMIT,
      templates: DEFAULT_DICTIONARY_FLASHCARD_TEMPLATES,
      titleKey: "practice.deck.greekLoanwords.title",
    },
  ];

function entryHasDialect(entry: LexicalEntry, dialect: DictionaryDialectCode) {
  return Boolean(entry.dialects[dialect]);
}

function getQueueLimit(limit: number | undefined) {
  if (typeof limit !== "number" || !Number.isFinite(limit)) {
    return DICTIONARY_FLASHCARD_QUEUE_LIMIT;
  }

  return Math.max(1, Math.trunc(limit));
}

/**
 * Builds the stable identity key that joins generated candidates to persisted
 * flashcard rows across locale, source, template, and variant.
 */
function getFlashcardMatchKey(options: {
  language: Language;
  sourceId: number | string;
  sourceType: string;
  template: string;
  variantKey: string;
}) {
  return [
    options.sourceType,
    String(options.sourceId),
    options.template,
    options.language,
    options.variantKey,
  ].join(":");
}

/**
 * Indexes existing flashcard rows by generated-candidate identity so deck
 * assembly can preserve scheduler state when source candidates are rebuilt.
 */
function getExistingFlashcardByCandidateKey(
  existingFlashcards: readonly DictionaryFlashcardRow[],
) {
  return new Map(
    existingFlashcards.map((flashcard) => [
      getFlashcardMatchKey({
        language: flashcard.locale,
        sourceId: flashcard.source_id,
        sourceType: flashcard.source_type,
        template: flashcard.template,
        variantKey: flashcard.variant_key,
      }),
      flashcard,
    ]),
  );
}

function compareDueAt(
  left: Pick<FlashcardDeckItem, "dueAt">,
  right: Pick<FlashcardDeckItem, "dueAt">,
) {
  return (left.dueAt ?? "").localeCompare(right.dueAt ?? "");
}

function getNextDueAt(items: readonly FlashcardDeckItem[]) {
  return (
    items
      .filter((item) => item.status === "scheduled" && item.dueAt)
      .sort(compareDueAt)[0]?.dueAt ?? null
  );
}

export function isDictionaryFlashcardDeckId(
  value: string | null | undefined,
): value is DictionaryFlashcardDeckId {
  return DICTIONARY_FLASHCARD_DECK_IDS.includes(
    value as DictionaryFlashcardDeckId,
  );
}

function getDictionaryFlashcardDeckDefinitions() {
  return DICTIONARY_FLASHCARD_DECK_DEFINITIONS;
}

export function getDictionaryFlashcardDeckDefinition(
  id: DictionaryFlashcardDeckId,
) {
  return (
    DICTIONARY_FLASHCARD_DECK_DEFINITIONS.find((deck) => deck.id === id) ??
    DICTIONARY_FLASHCARD_DECK_DEFINITIONS[0]
  );
}

export function toDictionaryFlashcardDeckSummary(
  deck: DictionaryFlashcardDeckDefinition,
): DictionaryFlashcardDeckSummary {
  return {
    descriptionKey: deck.descriptionKey,
    id: deck.id,
    kind: deck.kind,
    scope: deck.scope,
    scopeLabelKey: deck.scopeLabelKey,
    titleKey: deck.titleKey,
  };
}

/**
 * Merges generated candidate sources with persisted review state to produce the
 * deck read model used by Practice. Due cards are queued before new cards,
 * while scheduled cards remain visible in stats and next-due metadata.
 */
export function buildDictionaryFlashcardsDeckReadModel<
  TCandidate extends FlashcardCandidate = DictionaryFlashcardCandidate,
>({
  candidateSources,
  existingFlashcards,
  latestReviewsByFlashcardId,
  missingEntries = 0,
  now = new Date(),
  queueLimit,
  totalSourceEntries = candidateSources.length + missingEntries,
}: BuildDictionaryFlashcardsDeckReadModelOptions<TCandidate>): FlashcardDeckReadModel<TCandidate> {
  const existingByCandidateKey =
    getExistingFlashcardByCandidateKey(existingFlashcards);
  const nowTime = now.getTime();

  const items = candidateSources.map(
    ({ candidate, sourceCreatedAt }): FlashcardDeckItem<TCandidate> => {
      const existingFlashcard = existingByCandidateKey.get(
        getFlashcardMatchKey({
          language: candidate.language,
          sourceId: candidate.sourceId,
          sourceType: candidate.sourceType,
          template: candidate.template,
          variantKey: candidate.variantKey,
        }),
      );
      const dueAt = existingFlashcard?.due_at ?? null;
      const dueTime = dueAt ? Date.parse(dueAt) : Number.NaN;
      const latestReview = existingFlashcard
        ? latestReviewsByFlashcardId?.get(existingFlashcard.id)
        : null;
      let status: FlashcardDeckStatus = "new";

      if (existingFlashcard) {
        status =
          Number.isFinite(dueTime) && dueTime <= nowTime ? "due" : "scheduled";
      }

      return {
        candidate,
        dueAt,
        flashcardId: existingFlashcard?.id ?? null,
        lastReviewRating: latestReview?.rating ?? null,
        lastReviewedAt: latestReview?.reviewedAt ?? null,
        recentReviewRatings: latestReview?.recentRatings ?? [],
        sourceCreatedAt: sourceCreatedAt ?? null,
        status,
      };
    },
  );

  const dueItems = items
    .filter((item) => item.status === "due")
    .sort(compareDueAt);
  const newItems = items.filter((item) => item.status === "new");
  const queue = [...dueItems, ...newItems].slice(0, getQueueLimit(queueLimit));
  const stats = {
    availableCards: items.length,
    dueCards: dueItems.length,
    missingEntries,
    newCards: newItems.length,
    queuedCards: queue.length,
    scheduledCards: items.filter((item) => item.status === "scheduled").length,
    totalSourceEntries,
  } satisfies FlashcardDeckStats;

  return {
    items,
    nextDueAt: getNextDueAt(items),
    queue,
    stats,
  };
}

/**
 * Builds generated dictionary flashcard candidates for one deck definition,
 * applying the deck predicate and stopping at the configured source-entry cap.
 */
export function buildGeneratedDictionaryFlashcardSources({
  deckId,
  dictionary,
  language,
}: BuildGeneratedDictionaryFlashcardSourcesOptions): DictionaryFlashcardCandidateSource[] {
  const deck = getDictionaryFlashcardDeckDefinition(deckId);

  if (deck.kind !== "generated" || !deck.predicate) {
    return [];
  }

  const selectedDialect =
    deck.selectedDialect ?? DEFAULT_DICTIONARY_DIALECT_FILTER;
  const templates = deck.templates ?? DEFAULT_DICTIONARY_FLASHCARD_TEMPLATES;
  const sourceLimit =
    typeof deck.sourceLimit === "number" && Number.isFinite(deck.sourceLimit)
      ? Math.max(1, Math.trunc(deck.sourceLimit))
      : GENERATED_DICTIONARY_FLASHCARD_SOURCE_LIMIT;
  const sources: DictionaryFlashcardCandidateSource[] = [];

  for (const entry of dictionary) {
    if (!deck.predicate(entry)) {
      continue;
    }

    const candidates = buildDictionaryFlashcardCandidates({
      entries: [entry],
      language,
      selectedDialect,
      templates,
    }).filter((candidate) => {
      /**
       * Entries with an unresolved part of speech add noise to generated
       * decks and lack useful grammar metadata for learners.
       */
      if (candidate.metadata.partOfSpeech === "UNKNOWN") {
        return false;
      }

      if (
        deck.scope?.dialect &&
        candidate.displayDialect !== deck.scope.dialect
      ) {
        return false;
      }

      if (
        deck.scope?.partOfSpeech &&
        candidate.metadata.partOfSpeech !== deck.scope.partOfSpeech
      ) {
        return false;
      }

      return true;
    });

    for (const candidate of candidates) {
      sources.push({ candidate, sourceCreatedAt: null });

      if (sources.length >= sourceLimit) {
        break;
      }
    }

    if (sources.length >= sourceLimit) {
      break;
    }
  }

  return sources;
}

export const dictionaryFlashcardSourceAdapter = {
  getDeckDefinition: getDictionaryFlashcardDeckDefinition,
  getDeckDefinitions: getDictionaryFlashcardDeckDefinitions,
  isDeckId: isDictionaryFlashcardDeckId,
  listCandidateSources: ({ context, deckId, language }) =>
    buildGeneratedDictionaryFlashcardSources({
      deckId,
      dictionary: context.dictionary,
      language,
    }),
  sourceType: "dictionary",
  toDeckSummary: toDictionaryFlashcardDeckSummary,
} satisfies FlashcardSourceAdapter<
  "dictionary",
  DictionaryFlashcardDeckId,
  DictionaryFlashcardDeckDefinition,
  DictionaryFlashcardCandidate,
  DictionaryFlashcardSourceContext
>;
