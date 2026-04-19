import { getGrammarDictionaryData } from "./dictionary-data.ts";
import { normalizeCopticSearchText } from "../../lib/copticSearch.ts";

import type {
  GrammarBlock,
  GrammarConceptDocument,
  GrammarDatasetSnapshot,
  GrammarExerciseDocument,
  GrammarExampleSegment,
  GrammarExampleDocument,
  GrammarFootnoteDocument,
  GrammarInline,
  GrammarLessonDocument,
  Localized,
} from "./schema.ts";
import type { LexicalEntry } from "../../features/dictionary/types.ts";

let bohairicDictionaryLookupCache: Map<string, string> | null = null;

const BOHAIRIC_PREFIX_STRIPPING_CANDIDATES = [
  "Ø-",
  "Ϩⲁⲛ",
  "Ⲡⲁⲓ",
  "Ⲧⲁⲓ",
  "Ⲛⲁⲓ",
  "Ⲡⲓ",
  "Ⲡ̀",
  "Ⲧ̀",
  "Ⲡⲁ",
  "Ⲧⲁ",
  "Ⲛⲁ",
  "Ⲟⲩ",
  "Ϯ",
  "Ⲛⲓ",
] as const;

function normalizeBohairicLookupCandidate(value: string): string | null {
  const normalizedValue = normalizeCopticSearchText(value).replace(/\s+/g, " ");

  if (!normalizedValue || /\s/.test(normalizedValue)) {
    return null;
  }

  return normalizedValue;
}

function collectBohairicForms(entry: LexicalEntry): string[] {
  const bohairicForms = entry.dialects.B;

  if (!bohairicForms) {
    return [];
  }

  return [
    bohairicForms.absolute,
    ...(bohairicForms.absoluteVariants ?? []),
    bohairicForms.nominal,
    bohairicForms.pronominal,
    bohairicForms.stative,
  ]
    .flatMap((form) => form?.split(",") ?? [])
    .map((form) => form.trim())
    .filter((form) => form.length > 0);
}

function getBohairicDictionaryLookup() {
  if (bohairicDictionaryLookupCache) {
    return bohairicDictionaryLookupCache;
  }

  const formsToEntryIds = new Map<string, Set<string>>();

  for (const entry of getGrammarDictionaryData()) {
    for (const form of collectBohairicForms(entry)) {
      const normalizedForm = normalizeBohairicLookupCandidate(form);

      if (!normalizedForm) {
        continue;
      }

      const existingEntryIds =
        formsToEntryIds.get(normalizedForm) ?? new Set<string>();
      existingEntryIds.add(entry.id);
      formsToEntryIds.set(normalizedForm, existingEntryIds);
    }
  }

  bohairicDictionaryLookupCache = new Map(
    [...formsToEntryIds.entries()]
      .filter(([, entryIds]) => entryIds.size === 1)
      .map(([form, entryIds]) => [form, [...entryIds][0] as string]),
  );

  return bohairicDictionaryLookupCache;
}

export function getBohairicDictionaryEntryIdForWord(
  word: string,
): string | null {
  const normalizedWord = normalizeBohairicLookupCandidate(word);

  if (!normalizedWord) {
    return null;
  }

  const lookup = getBohairicDictionaryLookup();
  const exactMatch = lookup.get(normalizedWord);

  if (exactMatch) {
    return exactMatch;
  }

  const fallbackMatches = new Set<string>();

  for (const prefix of BOHAIRIC_PREFIX_STRIPPING_CANDIDATES) {
    const normalizedPrefix = normalizeBohairicLookupCandidate(prefix);

    if (!normalizedPrefix || !normalizedWord.startsWith(normalizedPrefix)) {
      continue;
    }

    const strippedCandidate = normalizedWord.slice(normalizedPrefix.length);

    if (strippedCandidate.length < 2) {
      continue;
    }

    const fallbackMatch = lookup.get(strippedCandidate);

    if (fallbackMatch) {
      fallbackMatches.add(fallbackMatch);
    }
  }

  return fallbackMatches.size === 1 ? ([...fallbackMatches][0] ?? null) : null;
}

function flattenInlineNodeText(node: GrammarInline): string {
  switch (node.type) {
    case "text":
      return node.text;
    case "coptic":
      return node.text;
    case "copticSpan":
      return node.children.map(flattenInlineNodeText).join("");
    case "strong":
    case "em":
    case "smallCaps":
    case "underline":
    case "superscript":
      return node.children.map(flattenInlineNodeText).join("");
    case "lineBreak":
      return " ";
    case "termRef":
      return node.fallback ?? "";
    case "conceptRef":
      return node.fallback ?? "";
    case "footnoteRef":
      return "";
    case "link":
      return node.children.map(flattenInlineNodeText).join("");
    default: {
      const exhaustiveCheck: never = node;
      return exhaustiveCheck;
    }
  }
}

function enrichInlineNode(node: GrammarInline): GrammarInline {
  switch (node.type) {
    case "coptic": {
      if (node.dictionaryEntryId) {
        return node;
      }

      const dictionaryEntryId = getBohairicDictionaryEntryIdForWord(node.text);

      return dictionaryEntryId ? { ...node, dictionaryEntryId } : node;
    }
    case "copticSpan": {
      if (node.dictionaryEntryId) {
        return node;
      }

      const dictionaryEntryId = getBohairicDictionaryEntryIdForWord(
        node.children.map(flattenInlineNodeText).join(""),
      );

      if (dictionaryEntryId) {
        return {
          ...node,
          dictionaryEntryId,
        };
      }

      return {
        ...node,
        children: node.children.map(enrichInlineNode),
      };
    }
    case "strong":
    case "em":
    case "smallCaps":
    case "underline":
    case "superscript":
      return {
        ...node,
        children: node.children.map(enrichInlineNode),
      };
    case "link":
      return node;
    case "text":
    case "lineBreak":
    case "termRef":
    case "conceptRef":
    case "footnoteRef":
      return node;
    default: {
      const exhaustiveCheck: never = node;
      return exhaustiveCheck;
    }
  }
}

function enrichBlocks(blocks: readonly GrammarBlock[]): GrammarBlock[] {
  return blocks.map((block) => {
    switch (block.type) {
      case "paragraph":
        return {
          ...block,
          content: block.content.map(enrichInlineNode),
        };
      case "heading":
        return {
          ...block,
          content: block.content.map(enrichInlineNode),
        };
      case "list":
        return {
          ...block,
          items: block.items.map((item) => ({
            ...item,
            blocks: enrichBlocks(item.blocks),
          })),
        };
      case "table":
        return {
          ...block,
          columns: block.columns.map((column) => ({
            ...column,
            inlineLabel: column.inlineLabel
              ? {
                  en: column.inlineLabel.en.map(enrichInlineNode),
                  nl: column.inlineLabel.nl.map(enrichInlineNode),
                }
              : undefined,
          })),
          headerRows: block.headerRows?.map((headerRow) => ({
            ...headerRow,
            cells: headerRow.cells.map((cell) => ({
              ...cell,
              inlineLabel: cell.inlineLabel
                ? {
                    en: cell.inlineLabel.en.map(enrichInlineNode),
                    nl: cell.inlineLabel.nl.map(enrichInlineNode),
                  }
                : undefined,
            })),
          })),
          rows: block.rows.map((row) => ({
            ...row,
            cells: Object.fromEntries(
              Object.entries(row.cells).map(([columnId, cellBlocks]) => [
                columnId,
                enrichBlocks(cellBlocks),
              ]),
            ),
          })),
        };
      case "callout":
        return {
          ...block,
          blocks: enrichBlocks(block.blocks),
        };
      case "exampleGroup":
      case "exerciseGroup":
        return block;
      default: {
        const exhaustiveCheck: never = block;
        return exhaustiveCheck;
      }
    }
  });
}

function enrichLocalizedBlocks(
  blocks: Localized<GrammarBlock[]>,
): Localized<GrammarBlock[]> {
  return {
    en: enrichBlocks(blocks.en),
    nl: enrichBlocks(blocks.nl),
  };
}

function enrichLessonDocument(
  lesson: GrammarLessonDocument,
): GrammarLessonDocument {
  return {
    ...lesson,
    sections: lesson.sections.map((section) => ({
      ...section,
      blocks: enrichLocalizedBlocks(section.blocks),
    })),
  };
}

function enrichConceptDocument(
  concept: GrammarConceptDocument,
): GrammarConceptDocument {
  return {
    ...concept,
    definition: enrichLocalizedBlocks(concept.definition),
  };
}

function enrichExerciseDocument(
  exercise: GrammarExerciseDocument,
): GrammarExerciseDocument {
  return {
    ...exercise,
    prompt: enrichLocalizedBlocks(exercise.prompt),
  };
}

function enrichExampleDocument(
  example: GrammarExampleDocument,
): GrammarExampleDocument {
  const copticSegments = buildExampleCopticSegments(example);
  const tokenDictionaryRefs = copticSegments.flatMap((segment) =>
    segment.dictionaryEntryId ? [segment.dictionaryEntryId] : [],
  );
  const dictionaryEntryId =
    example.dictionaryRefs.length === 0
      ? getBohairicDictionaryEntryIdForWord(example.coptic)
      : null;
  let dictionaryRefs: string[] = [];

  if (example.dictionaryRefs.length > 0) {
    dictionaryRefs = [...example.dictionaryRefs];
  } else if (tokenDictionaryRefs.length > 0) {
    dictionaryRefs = [...new Set(tokenDictionaryRefs)];
  } else if (dictionaryEntryId) {
    dictionaryRefs = [dictionaryEntryId];
  }

  return {
    ...example,
    copticSegments,
    dictionaryRefs,
    notes: example.notes ? enrichLocalizedBlocks(example.notes) : undefined,
  };
}

function tokenizeExampleCoptic(coptic: string) {
  return coptic
    .split(/(\s+|[.,;:!?])/g)
    .filter((segment) => segment.length > 0);
}

function buildExampleCopticSegments(
  example: GrammarExampleDocument,
): GrammarExampleSegment[] {
  const tokenOverrides = example.dictionaryTokenOverrides ?? {};

  return tokenizeExampleCoptic(example.coptic).map((segment) => ({
    text: segment,
    ...(tokenOverrides[segment]
      ? { dictionaryEntryId: tokenOverrides[segment] }
      : (() => {
          const dictionaryEntryId =
            getBohairicDictionaryEntryIdForWord(segment);
          return dictionaryEntryId ? { dictionaryEntryId } : {};
        })()),
  }));
}

function enrichFootnoteDocument(
  footnote: GrammarFootnoteDocument,
): GrammarFootnoteDocument {
  return {
    ...footnote,
    content: enrichLocalizedBlocks(footnote.content),
  };
}

export function enrichGrammarDatasetSnapshotWithDictionaryLinks(
  snapshot: GrammarDatasetSnapshot,
): GrammarDatasetSnapshot {
  return {
    ...snapshot,
    lessons: snapshot.lessons.map(enrichLessonDocument),
    concepts: snapshot.concepts.map(enrichConceptDocument),
    examples: snapshot.examples.map(enrichExampleDocument),
    exercises: snapshot.exercises.map(enrichExerciseDocument),
    footnotes: snapshot.footnotes.map(enrichFootnoteDocument),
  };
}
