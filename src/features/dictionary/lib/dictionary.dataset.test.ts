import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  DICTIONARY_DIALECT_CODES,
  DICTIONARY_SENSE_CODES,
} from "@/features/dictionary/config";
import {
  formatDictionaryValidationIssues,
  validateDictionaryEntries,
} from "@/features/dictionary/lib/dictionaryValidation";
import { getGenderedHeadingParts } from "@/features/dictionary/lib/entryDisplay";
import { getEntryNounGender } from "@/features/dictionary/lib/entryGrammar";
import type {
  DictionaryInflectedFormDetails,
  DialectForms,
  LexicalEntry,
} from "@/features/dictionary/types";

function readDictionaryPayload(): unknown {
  const filePath = path.join(process.cwd(), "public/data/dictionary.json");

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readDictionary() {
  return readDictionaryPayload() as LexicalEntry[];
}

function splitTopLevelCommaSeparatedValues(value: string) {
  const parts: string[] = [];
  let currentPart = "";
  let bracketDepth = 0;
  let parenthesisDepth = 0;

  for (const character of value) {
    if (character === "(") {
      parenthesisDepth += 1;
    } else if (character === ")" && parenthesisDepth > 0) {
      parenthesisDepth -= 1;
    } else if (character === "[") {
      bracketDepth += 1;
    } else if (character === "]" && bracketDepth > 0) {
      bracketDepth -= 1;
    }

    if (character === "," && bracketDepth === 0 && parenthesisDepth === 0) {
      parts.push(currentPart.trim());
      currentPart = "";
    } else {
      currentPart += character;
    }
  }

  parts.push(currentPart.trim());

  return parts.filter(Boolean);
}

function hasHeadwordOrAbsoluteStructuralNotation(value: string) {
  const standaloneGenderMarker = /\(([ⲡⲧ](?:\s*,\s*[ⲡⲧ])*)\)(?=\s|$|→|=|,)/u;
  const standalonePluralMarker = /(^|\s)\(ⲛ\)(?=\s|$|→|=|,)/u;

  return (
    /[,→]/u.test(value) ||
    standaloneGenderMarker.test(value) ||
    standalonePluralMarker.test(value)
  );
}

function collectConstructParticiples(forms: DialectForms | undefined) {
  return [
    ...(forms?.participles ?? []),
    ...(forms?.variants?.constructParticiples ?? []),
  ];
}

function isNonEmptyStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => typeof item === "string" && item.trim().length > 0)
  );
}

type FlattenedInflection = {
  dialect: string;
  form: string;
  gender?: string;
  kind: string;
  notes?: string[];
  number?: string;
  role: string;
  uncertain?: boolean;
};

function getInflectionFormText(form: string | DictionaryInflectedFormDetails) {
  return typeof form === "string" ? form : form.form;
}

function toFlattenedInflection(
  kind: string,
  dialect: string,
  role: string,
  form: string | DictionaryInflectedFormDetails,
): FlattenedInflection {
  return {
    dialect,
    form: getInflectionFormText(form),
    ...(typeof form !== "string" && form.gender ? { gender: form.gender } : {}),
    kind,
    role,
    ...(typeof form !== "string" && form.notes ? { notes: form.notes } : {}),
    ...(typeof form !== "string" && form.number ? { number: form.number } : {}),
    ...(typeof form !== "string" && form.uncertain !== undefined
      ? { uncertain: form.uncertain }
      : {}),
  };
}

function flattenInflections(
  entry: Pick<LexicalEntry, "inflections">,
): FlattenedInflection[] {
  return Object.entries(entry.inflections ?? {}).flatMap(([kind, dialects]) =>
    Object.entries(dialects ?? {}).flatMap(([dialect, roles]) =>
      Object.entries(roles ?? {}).flatMap(([role, forms]) => {
        if (
          role === "variants" &&
          forms &&
          typeof forms === "object" &&
          !Array.isArray(forms)
        ) {
          return Object.entries(forms).flatMap(([variantRole, variantForms]) =>
            (variantForms ?? []).map((form) =>
              toFlattenedInflection(kind, dialect, variantRole, form),
            ),
          );
        }

        return Array.isArray(forms)
          ? forms.map((form) =>
              toFlattenedInflection(kind, dialect, role, form),
            )
          : [];
      }),
    ),
  );
}

function collectLexicalFormPlusRows(entry: LexicalEntry) {
  const rows: Array<{ id: number; path: string; value: string }> = [];

  function visit(value: unknown, pathParts: string[]) {
    if (typeof value === "string") {
      if (value.includes("+")) {
        rows.push({
          id: entry.id,
          path: pathParts.join("."),
          value,
        });
      }

      return;
    }

    if (Array.isArray(value)) {
      for (const [index, item] of value.entries()) {
        visit(item, [...pathParts, String(index)]);
      }

      return;
    }

    if (value && typeof value === "object") {
      for (const [key, item] of Object.entries(value)) {
        visit(item, [...pathParts, key]);
      }
    }
  }

  visit(entry.headword, ["headword"]);
  visit(entry.dialects, ["dialects"]);
  visit(entry.inflections, ["inflections"]);

  return rows;
}

const pluralPrefixedHeadwordPattern = /^plural:/iu;
const allowedEtymologies = new Set(["Egy", "Gr", "Lat", "Sem", "Unknown"]);
const numberMeaningPatterns = [
  /\b(?:plural|singular|meervoud|enkelvoud):/iu,
  /\b(?:as|mostly|used as|or)\s+PL\b/iu,
  /\b\d+d\s+is\s+PL\b/iu,
  /\bPL\s*\(/u,
  /\bSG\s+PL\b/u,
  /\bplural\s+IMP\s+verb\b/iu,
  /\b(?:meestal|als)\s+meervoud\b/iu,
] as const;
const placeholderMeaningPatterns = [/^(?:which|welke):$/iu] as const;
const bareQuestionNotePattern = /^\?$/u;
const bareGenderMarkerNotePattern = /^[mf]$/iu;
const ellipsisMeaningPattern = /^\.{2,}$/u;
const causativeMeaningPattern = /\bCAUS\s+(?:of|van)\??/iu;
const bareCausativeLabelPattern = /^\(?CAUS\)?(?:\s|$)/u;
const copticEquivalentSourceLabelPattern = "(?:Fb|Sl|Sa|Sf|AS|FS|[ABFLOMS])+";
const copticEquivalenceMeaningPatterns = [
  new RegExp(
    `\\b(?:mostly|always|almost always|often|meestal|altijd|bijna altijd|vaak)\\s*=\\s*${copticEquivalentSourceLabelPattern}\\s+[\\u03e2-\\u03ef\\u2c80-\\u2cff]`,
    "iu",
  ),
  new RegExp(
    `\\b(?:rare except|zeldzaam behalve).*?=\\s*${copticEquivalentSourceLabelPattern}\\s+[\\u03e2-\\u03ef\\u2c80-\\u2cff]`,
    "iu",
  ),
  new RegExp(
    `\\b(?:only with|alleen met).*?[\\u03e2-\\u03ef\\u2c80-\\u2cff]\\s+${copticEquivalentSourceLabelPattern}\\s*=\\s*[\\u03e2-\\u03ef\\u2c80-\\u2cff]`,
    "iu",
  ),
] as const;
const grammarEquivalenceMeaningPatterns = [
  /\boften\s*=\s*ADJ\b/iu,
  /\bvaak\s*=\s*ADJ\b/iu,
  /\bmostly\s*=\s*verbal\b/iu,
  /\bmeestal\s*=\s*verbale\b/iu,
  /\bthere\s*=\s*demonstr\b/iu,
  /\bdaar\s+is\s*=\s*aanwijzend\b/iu,
  /\bvery seldom\s*=\s*ⲉϩⲛⲁ=/iu,
  /\bzeer zeldzaam\s*=\s*ⲉϩⲛⲁ=/iu,
  /\boften\s*=\s*δυσ-/iu,
  /\bvaak\s*=\s*δυσ-/iu,
  /\boften\s*=\s*Greek future\b/iu,
  /\bvaak\s*=\s*Grieks futurum\b/iu,
  /\boften\s*=\s*Greek α-/iu,
  /\bvaak\s*=\s*Grieks α-/iu,
] as const;
const usageGrammarMeaningPatterns = [
  /\b(?:with|without|before|followed by|precedes|preceding|as|in)\b.*\b(?:PRON|NOM|NEG|PFX|SFX|SBJ|OBJ|VBAL)\b/iu,
  /\b(?:met|zonder|v[oó]?[oó]r|gevolgd door|gaat vooraf aan|als|in)\b.*\b(?:PRON|NOM|NEG|PFX|SFX|SBJ|OBJ|VBAL)\b/iu,
  /\b(?:prefix|particle)\s+NEG\b/iu,
  /\b(?:voorvoegsel|deeltje)\s+NEG\b/iu,
] as const;
const compressedGrammarMeaningPatterns = [
  /^(?:as N|als N)(?:\b|\s|,)/u,
  /^(?:as ADJ|als ADJ)(?:\b|\s|,)/u,
  /^(?:as ADV|als bijwoord|als ADV)(?:\b|\s|,)/u,
  /^(?:after N|after ADJ|before N|vóór N|voor N|na N|na ADJ)(?:\b|\s|\()/iu,
  /^&\s*(?:STA|TR|INTR|REFL|ADV|N|ADJ)\b/u,
  /^(?:with vbs|met werkwoorden)\b/iu,
] as const;
const governedVerbMeaningGovernmentPattern =
  /(?:^|\b)c\s+(?:ACC|double\s+ACC|dubbele\s+ACC|dat(?:ive)?|[\u03e2-\u03ef\u2c80-\u2cff]+[=-]?)|\b(?:with|met)\s+(?:dat(?:ive|ief)?|[\u03e2-\u03ef\u2c80-\u2cff]+[=-]?)|\(\+\s*(?:dat(?:ive)?|[\u03e2-\u03ef\u2c80-\u2cff]+[=-]?)\)/iu;
const sourceCommentaryMeaningPatterns = [
  /\(same\?\)/u,
  /\(hetzelfde\?\)/u,
  /\bv\.\s/u,
] as const;
const copticTextPattern = "[\\u03e2-\\u03ef\\u2c80-\\u2cff]";
const sourceComparisonMeaningPatterns = [
  /\bopp(?:\b|\s+to\b)/iu,
  new RegExp(`\\bcf\\s+${copticTextPattern}`, "iu"),
  new RegExp(`\\bzie\\s+${copticTextPattern}`, "iu"),
] as const;
const dialectSourceLabelPattern = "(?:Fb|Sl|Sa|Sf|[ABFLOMS])+";
const inlineDialectQualifierPatterns = [
  new RegExp(
    `\\((?:mostly|rarely|oftenest|meestal|zelden|vaak)\\s+${dialectSourceLabelPattern}\\)`,
    "u",
  ),
  new RegExp(
    `(?:^|\\s)(?:mostly|rarely|oftenest|meestal|zelden|vaak)\\s+${dialectSourceLabelPattern}(?:\\b|\\))`,
    "u",
  ),
  new RegExp(
    `\\(${dialectSourceLabelPattern}\\s+(?:once|één keer|een keer|eenmaal)\\)`,
    "u",
  ),
  new RegExp(
    `(?:^|\\s)${dialectSourceLabelPattern}\\s*\\((?:once|rare|rarely|zeldzaam|ooit)\\)`,
    "u",
  ),
  new RegExp(`\\((?:not|niet)\\s+${dialectSourceLabelPattern}\\)`, "u"),
  new RegExp(
    `(?:^|\\s)${dialectSourceLabelPattern}\\s+(?:not\\s+biblical|niet\\s+bijbel)`,
    "u",
  ),
] as const;
const dialectSourceLabelCodes = [...DICTIONARY_DIALECT_CODES].sort(
  (left, right) => right.length - left.length,
);
const grammarLabelSet = new Set<string>(DICTIONARY_SENSE_CODES);

function parseDialectSourceLabel(value: string) {
  if (!value || grammarLabelSet.has(value)) {
    return undefined;
  }

  const dialects: string[] = [];
  let index = 0;

  while (index < value.length) {
    const dialect = dialectSourceLabelCodes.find((code) =>
      value.startsWith(code, index),
    );

    if (!dialect) {
      return undefined;
    }

    dialects.push(dialect);
    index += dialect.length;
  }

  return dialects.length > 0 ? dialects : undefined;
}

function getTrailingDialectSourceLabel(value: string) {
  const trailingToken = value.trim().split(/\s+/).at(-1);

  return trailingToken && parseDialectSourceLabel(trailingToken)
    ? trailingToken
    : undefined;
}

function collectMeaningTexts(entry: LexicalEntry) {
  return [
    ...entry.senses.flatMap((group) => [
      ...(group.meanings?.en ?? []),
      ...(group.meanings?.nl ?? []),
    ]),
    ...(entry.dialectMeanings ?? []).flatMap((meaning) => [
      ...(meaning.meanings?.en ?? []),
      ...(meaning.meanings?.nl ?? []),
    ]),
    ...(entry.genderedMeanings ?? []).flatMap((meaning) => [
      ...Object.values(meaning.meanings?.en ?? {}),
      ...Object.values(meaning.meanings?.nl ?? {}),
    ]),
  ];
}

function collectSenseMeaningTexts(entry: LexicalEntry) {
  return entry.senses.flatMap((sense) => [
    ...(sense.meanings?.en ?? []),
    ...(sense.meanings?.nl ?? []),
  ]);
}

function collectSenseProseTexts(entry: LexicalEntry) {
  return entry.senses.flatMap((sense) => [
    ...(sense.meanings?.en ?? []),
    ...(sense.meanings?.nl ?? []),
    ...(sense.notes?.en ?? []),
    ...(sense.notes?.nl ?? []),
  ]);
}

function hasNumberMarkedMeaningProse(entry: LexicalEntry) {
  return collectMeaningTexts(entry).some((meaning) =>
    numberMeaningPatterns.some((pattern) => pattern.test(meaning)),
  );
}

function hasPlaceholderMeaning(value: string) {
  return placeholderMeaningPatterns.some((pattern) =>
    pattern.test(value.trim()),
  );
}

function collectNoteStubRows(entry: LexicalEntry) {
  return [
    ...entry.senses.flatMap((sense, senseIndex) =>
      (
        [
          ["senses.notes.en", sense.notes?.en],
          ["senses.notes.nl", sense.notes?.nl],
        ] as const
      ).flatMap(([field, values]) =>
        (values ?? []).map((note) => ({
          field,
          id: entry.id,
          note,
          senseIndex,
        })),
      ),
    ),
    ...(entry.dialectMeanings ?? []).flatMap((dialectMeaning, meaningIndex) =>
      (
        [
          ["dialectMeanings.notes.en", dialectMeaning.notes?.en],
          ["dialectMeanings.notes.nl", dialectMeaning.notes?.nl],
        ] as const
      ).flatMap(([field, values]) =>
        (values ?? []).map((note) => ({
          field,
          id: entry.id,
          meaningIndex,
          note,
        })),
      ),
    ),
  ];
}

function findSense(
  entry: LexicalEntry | undefined,
  predicate: (sense: NonNullable<LexicalEntry["senses"]>[number]) => boolean,
) {
  return entry?.senses.find(predicate);
}

describe("dictionary dataset guardrails", () => {
  it("matches the dictionary schema", () => {
    const result = validateDictionaryEntries(readDictionaryPayload());

    expect(formatDictionaryValidationIssues(result.issues, 200)).toEqual([]);
  });

  it("keeps dialect and inflected-form keys within the configured dictionary sigla", () => {
    const dictionary = readDictionary();
    const allowedDialectCodes = new Set<string>(DICTIONARY_DIALECT_CODES);
    const unexpectedDialectKeys: Array<{ dialect: string; id: number }> = [];
    const unexpectedInflectedFormDialectKeys: Array<{
      dialect: string;
      id: number;
    }> = [];

    for (const entry of dictionary) {
      for (const dialect of Object.keys(entry.dialects)) {
        if (!allowedDialectCodes.has(dialect)) {
          unexpectedDialectKeys.push({ dialect, id: entry.id });
        }
      }

      for (const inflectedForm of flattenInflections(entry)) {
        if (
          inflectedForm.dialect &&
          !allowedDialectCodes.has(inflectedForm.dialect)
        ) {
          unexpectedInflectedFormDialectKeys.push({
            dialect: inflectedForm.dialect,
            id: entry.id,
          });
        }
      }
    }

    expect(unexpectedDialectKeys).toEqual([]);
    expect(unexpectedInflectedFormDialectKeys).toEqual([]);
  });

  it("keeps relation graph edges canonical", () => {
    const dictionary = readDictionary();
    const entryIds = new Set(dictionary.map((entry) => entry.id));
    const relationTypeCounts = new Map<string, number>();
    const relationGraphIssues: Array<{
      id: number;
      reason: string;
      targetId: number;
      type: string;
    }> = [];

    for (const entry of dictionary) {
      const seenRelationEdges = new Set<string>();

      for (const relation of entry.relations ?? []) {
        relationTypeCounts.set(
          relation.type,
          (relationTypeCounts.get(relation.type) ?? 0) + 1,
        );

        const edgeKey = `${relation.type}:${relation.targetId}`;

        if (seenRelationEdges.has(edgeKey)) {
          relationGraphIssues.push({
            id: entry.id,
            reason: "duplicate edge",
            targetId: relation.targetId,
            type: relation.type,
          });
        }

        seenRelationEdges.add(edgeKey);

        if (entry.id === relation.targetId) {
          relationGraphIssues.push({
            id: entry.id,
            reason: "self edge",
            targetId: relation.targetId,
            type: relation.type,
          });
        }

        if (!entryIds.has(relation.targetId)) {
          relationGraphIssues.push({
            id: entry.id,
            reason: "missing target",
            targetId: relation.targetId,
            type: relation.type,
          });
        }
      }
    }

    expect(relationGraphIssues).toEqual([]);
    expect(relationTypeCounts.get("CAUS_OF") ?? 0).toBeGreaterThanOrEqual(43);
    expect(relationTypeCounts.get("COMPOUND_WITH") ?? 0).toBeGreaterThanOrEqual(
      267,
    );
    expect(relationTypeCounts.get("SEE_ALSO") ?? 0).toBeGreaterThanOrEqual(14);
  });

  it("keeps causative cross-references structured as relations", () => {
    const dictionary = readDictionary();
    const entryIds = new Set(dictionary.map((entry) => entry.id));
    const invalidRelationTargets = dictionary.flatMap((entry) =>
      (entry.relations ?? [])
        .filter((relation) => !entryIds.has(relation.targetId))
        .map((relation) => ({
          id: entry.id,
          targetId: relation.targetId,
          type: relation.type,
        })),
    );
    const remainingCausativeMeaningProse = dictionary.flatMap((entry) =>
      collectMeaningTexts(entry)
        .filter((meaning) => causativeMeaningPattern.test(meaning))
        .map((meaning) => ({ id: entry.id, meaning })),
    );

    expect(invalidRelationTargets).toEqual([]);
    expect(remainingCausativeMeaningProse).toEqual([]);
  });

  it("keeps Coptic equivalence cross-references structured as relations", () => {
    const dictionary = readDictionary();
    const remainingCopticEquivalenceProse = dictionary.flatMap((entry) =>
      collectMeaningTexts(entry)
        .filter((meaning) =>
          copticEquivalenceMeaningPatterns.some((pattern) =>
            pattern.test(meaning),
          ),
        )
        .map((meaning) => ({ id: entry.id, meaning })),
    );

    expect(remainingCopticEquivalenceProse).toEqual([]);
  });

  it("keeps grammar and Greek equivalence prose out of meanings", () => {
    const dictionary = readDictionary();
    const remainingGrammarEquivalenceProse = dictionary.flatMap((entry) =>
      collectSenseMeaningTexts(entry)
        .filter((meaning) =>
          grammarEquivalenceMeaningPatterns.some((pattern) =>
            pattern.test(meaning),
          ),
        )
        .map((meaning) => ({ id: entry.id, meaning })),
    );

    expect(remainingGrammarEquivalenceProse).toEqual([]);
  });

  it("keeps usage grammar prose out of meanings", () => {
    const dictionary = readDictionary();
    const remainingUsageGrammarProse = dictionary.flatMap((entry) =>
      collectSenseMeaningTexts(entry)
        .filter((meaning) =>
          usageGrammarMeaningPatterns.some((pattern) => pattern.test(meaning)),
        )
        .map((meaning) => ({ id: entry.id, meaning })),
    );

    expect(remainingUsageGrammarProse).toEqual([]);
  });

  it("keeps compressed grammar lead-ins out of meanings", () => {
    const dictionary = readDictionary();
    const remainingCompressedGrammarProse = dictionary.flatMap((entry) =>
      collectSenseMeaningTexts(entry)
        .filter((meaning) =>
          compressedGrammarMeaningPatterns.some((pattern) =>
            pattern.test(meaning),
          ),
        )
        .map((meaning) => ({ id: entry.id, meaning })),
    );

    expect(remainingCompressedGrammarProse).toEqual([]);
  });

  it("keeps governed verb shorthand out of meanings", () => {
    const dictionary = readDictionary();
    const remainingGovernedVerbShorthand = dictionary.flatMap((entry) =>
      entry.senses.flatMap((sense, senseIndex) =>
        sense.grammar.pos === "V" && sense.grammar.prepGovernment
          ? [...(sense.meanings?.en ?? []), ...(sense.meanings?.nl ?? [])]
              .filter((meaning) =>
                governedVerbMeaningGovernmentPattern.test(meaning),
              )
              .map((meaning) => ({ id: entry.id, meaning, senseIndex }))
          : [],
      ),
    );
    const governedVerbSensesWithoutValency = dictionary.flatMap((entry) =>
      entry.senses.flatMap((sense, senseIndex) =>
        sense.grammar.pos === "V" &&
        sense.grammar.prepGovernment &&
        sense.grammar.valency === undefined
          ? [{ id: entry.id, senseIndex }]
          : [],
      ),
    );

    expect(remainingGovernedVerbShorthand).toEqual([]);
    expect(governedVerbSensesWithoutValency).toEqual([]);
  });

  it("keeps source uncertainty and bibliographic references out of meanings", () => {
    const dictionary = readDictionary();
    const remainingSourceCommentaryProse = dictionary.flatMap((entry) =>
      collectMeaningTexts(entry)
        .filter((meaning) =>
          sourceCommentaryMeaningPatterns.some((pattern) =>
            pattern.test(meaning),
          ),
        )
        .map((meaning) => ({ id: entry.id, meaning })),
    );

    expect(remainingSourceCommentaryProse).toEqual([]);
  });

  it("keeps source comparison prose out of meanings", () => {
    const dictionary = readDictionary();
    const remainingSourceComparisonProse = dictionary.flatMap((entry) =>
      collectMeaningTexts(entry)
        .filter((meaning) =>
          sourceComparisonMeaningPatterns.some((pattern) =>
            pattern.test(meaning),
          ),
        )
        .map((meaning) => ({ id: entry.id, meaning })),
    );

    expect(remainingSourceComparisonProse).toEqual([]);
  });

  it("keeps bare causative labels in grammar derivation metadata", () => {
    const dictionary = readDictionary();
    const lingeringBareCausativeLabels = dictionary.flatMap((entry) =>
      entry.senses.flatMap((sense, senseIndex) =>
        [
          ...(sense.meanings?.en ?? []),
          ...(sense.meanings?.nl ?? []),
          ...(sense.notes?.en ?? []),
          ...(sense.notes?.nl ?? []),
        ]
          .filter((value) => bareCausativeLabelPattern.test(value))
          .map((value) => ({ id: entry.id, senseIndex, value })),
      ),
    );

    expect(lingeringBareCausativeLabels).toEqual([]);
  });

  it("keeps dialect-restricted meaning sigla out of plain meanings", () => {
    const dictionary = readDictionary();
    const lingeringTrailingDialectMeanings = dictionary.flatMap((entry) =>
      collectMeaningTexts(entry)
        .map((meaning) => ({
          label: getTrailingDialectSourceLabel(meaning),
          meaning,
        }))
        .filter(
          (result): result is { label: string; meaning: string } =>
            result.label !== undefined,
        )
        .map(({ label, meaning }) => ({ id: entry.id, label, meaning })),
    );

    expect(lingeringTrailingDialectMeanings).toEqual([]);
  });

  it("keeps inline dialect qualifiers out of sense prose", () => {
    const dictionary = readDictionary();
    const lingeringInlineDialectQualifierProse = dictionary.flatMap((entry) =>
      collectSenseProseTexts(entry)
        .filter((value) =>
          inlineDialectQualifierPatterns.some((pattern) => pattern.test(value)),
        )
        .map((value) => ({ id: entry.id, value })),
    );

    expect(lingeringInlineDialectQualifierProse).toEqual([]);
  });

  it("keeps source-form inventories out of meaning prose", () => {
    const dictionary = readDictionary();
    const lingeringSourceFormInventoryProse = dictionary.flatMap((entry) =>
      collectMeaningTexts(entry)
        .filter((meaning) =>
          /ⲕⲟⲩ- S =|ϩⲉⲛⲕⲟⲟⲩⲉ S =|construct .*SAF|construeer .*SAF/u.test(
            meaning,
          ),
        )
        .map((meaning) => ({ id: entry.id, meaning })),
    );

    expect(lingeringSourceFormInventoryProse).toEqual([]);
  });

  it("omits plural-prefixed headword artifacts from the dataset", () => {
    const dictionary = readDictionary();
    const pluralPrefixedHeadwordEntries = dictionary
      .filter((entry) => pluralPrefixedHeadwordPattern.test(entry.headword))
      .map((entry) => ({
        headword: entry.headword,
        id: entry.id,
      }));

    expect(pluralPrefixedHeadwordEntries).toEqual([]);
  });

  it("requires explicit etymology values on every entry", () => {
    const dictionary = readDictionary();
    const invalidEtymologyEntries = dictionary.flatMap((entry) =>
      typeof entry.etym !== "string" || !allowedEtymologies.has(entry.etym)
        ? [{ etym: entry.etym, id: entry.id }]
        : [],
    );

    expect(invalidEtymologyEntries).toEqual([]);
    expect(dictionary.filter((entry) => entry.etym === "Unknown")).toEqual([
      expect.objectContaining({ headword: "ϫⲗⲉ", id: 7166 }),
      expect.objectContaining({
        headword: "ϯϫⲣⲉ ⲛϩⲏⲧ",
        id: 7348,
      }),
    ]);
  });

  it("keeps Greek context structured and non-empty", () => {
    const dictionary = readDictionary();
    const invalidGreekEntries = dictionary.flatMap((entry) => {
      if (entry.greekContext === undefined) {
        return [];
      }

      const fields = Object.keys(entry.greekContext);

      if (fields.length === 0) {
        return [{ field: "greekContext", id: entry.id }];
      }

      return Object.entries(entry.greekContext).flatMap(([field, values]) =>
        ["equivalents", "sources"].includes(field) &&
        isNonEmptyStringArray(values)
          ? []
          : [{ field, id: entry.id }],
      );
    });

    expect(invalidGreekEntries).toEqual([]);
  });

  it("keeps Greek loan noun gender backlog bounded", () => {
    const dictionary = readDictionary();
    const genderlessGreekNounSenses = dictionary.flatMap((entry) =>
      entry.etym === "Gr"
        ? entry.senses
            .map((sense, senseIndex) => ({ entry, sense, senseIndex }))
            .filter(
              ({ sense }) =>
                sense.grammar.pos === "N" && sense.grammar.gender === undefined,
            )
            .map(({ entry, senseIndex }) => ({ id: entry.id, senseIndex }))
        : [],
    );

    expect(genderlessGreekNounSenses.length).toBeLessThanOrEqual(14);
  });

  it("keeps Greek loan verb valency backlog bounded", () => {
    const dictionary = readDictionary();
    const untaggedGreekVerbSenses = dictionary.flatMap((entry) =>
      entry.etym === "Gr"
        ? entry.senses
            .map((sense, senseIndex) => ({ entry, sense, senseIndex }))
            .filter(
              ({ sense }) =>
                sense.grammar.pos === "V" &&
                sense.grammar.valency === undefined,
            )
            .map(({ entry, senseIndex }) => ({ id: entry.id, senseIndex }))
        : [],
    );

    expect(untaggedGreekVerbSenses.length).toBeLessThanOrEqual(22);
  });

  it("keeps clausal complement government coverage bounded", () => {
    const dictionary = readDictionary();
    const sensesWithComplementizerGovernment = dictionary.flatMap((entry) =>
      entry.senses
        .map((sense, senseIndex) => ({ entry, sense, senseIndex }))
        .filter(({ sense }) => sense.grammar.complementizerGovernment)
        .map(({ entry, senseIndex }) => ({ id: entry.id, senseIndex })),
    );

    expect(sensesWithComplementizerGovernment.length).toBeGreaterThanOrEqual(
      37,
    );
  });

  it("keeps construction government coverage present", () => {
    const dictionary = readDictionary();
    const sensesWithConstructionGovernment = dictionary.flatMap((entry) =>
      entry.senses
        .map((sense, senseIndex) => ({ entry, sense, senseIndex }))
        .filter(({ sense }) => sense.grammar.constructionGovernment)
        .map(({ entry, senseIndex }) => ({ id: entry.id, senseIndex })),
    );

    expect(sensesWithConstructionGovernment.length).toBeGreaterThanOrEqual(1);
  });

  it("keeps Egyptian stative verb senses annotated as intransitive", () => {
    const dictionary = readDictionary();
    const untaggedEgyptianStativeVerbSenses = dictionary.flatMap((entry) =>
      entry.etym === "Egy"
        ? entry.senses
            .map((sense, senseIndex) => ({ entry, sense, senseIndex }))
            .filter(
              ({ sense }) =>
                sense.grammar.pos === "V" &&
                sense.grammar.form === "STA" &&
                sense.grammar.valency === undefined,
            )
            .map(({ entry, senseIndex }) => ({ id: entry.id, senseIndex }))
        : [],
    );
    const untaggedEgyptianVerbSenses = dictionary.flatMap((entry) =>
      entry.etym === "Egy"
        ? entry.senses
            .map((sense, senseIndex) => ({ entry, sense, senseIndex }))
            .filter(
              ({ sense }) =>
                sense.grammar.pos === "V" &&
                sense.grammar.form !== "PC" &&
                !(sense.grammar.tags ?? []).includes("REL") &&
                sense.grammar.valency === undefined,
            )
            .map(({ entry, senseIndex }) => ({ id: entry.id, senseIndex }))
        : [],
    );

    expect(untaggedEgyptianStativeVerbSenses).toEqual([]);
    expect(untaggedEgyptianVerbSenses.length).toBeLessThanOrEqual(17);
  });

  it("keeps Egyptian reflexive and impersonal verb senses annotated", () => {
    const dictionary = readDictionary();
    const untaggedEgyptianReflexiveVerbSenses = dictionary.flatMap((entry) =>
      entry.etym === "Egy"
        ? entry.senses
            .map((sense, senseIndex) => ({ entry, sense, senseIndex }))
            .filter(
              ({ sense }) =>
                sense.grammar.pos === "V" &&
                sense.grammar.voice === "REFL" &&
                sense.grammar.valency === undefined,
            )
            .map(({ entry, senseIndex }) => ({ id: entry.id, senseIndex }))
        : [],
    );
    const untaggedEgyptianImpersonalVerbSenses = dictionary.flatMap((entry) =>
      entry.etym === "Egy"
        ? entry.senses
            .map((sense, senseIndex) => ({ entry, sense, senseIndex }))
            .filter(
              ({ sense }) =>
                sense.grammar.pos === "V" &&
                sense.grammar.valency === undefined &&
                (sense.grammar.tags ?? []).some((tag) =>
                  tag.startsWith("IMPERS"),
                ),
            )
            .map(({ entry, senseIndex }) => ({ id: entry.id, senseIndex }))
        : [],
    );

    expect(untaggedEgyptianReflexiveVerbSenses).toEqual([]);
    expect(untaggedEgyptianImpersonalVerbSenses).toEqual([]);
  });

  it("keeps Egyptian finite verb valency backlog bounded", () => {
    const dictionary = readDictionary();
    const untaggedEgyptianVerbSenses = dictionary.flatMap((entry) =>
      entry.etym === "Egy"
        ? entry.senses
            .map((sense, senseIndex) => ({ entry, sense, senseIndex }))
            .filter(
              ({ sense }) =>
                sense.grammar.pos === "V" &&
                sense.grammar.form !== "PC" &&
                !(sense.grammar.tags ?? []).includes("REL") &&
                sense.grammar.valency === undefined,
            )
            .map(({ entry, senseIndex }) => ({ id: entry.id, senseIndex }))
        : [],
    );

    expect(untaggedEgyptianVerbSenses.length).toBeLessThanOrEqual(17);
  });

  it("keeps untagged finite verb backlog bounded by etymology", () => {
    const dictionary = readDictionary();
    const untaggedVerbSensesByEtym = dictionary.reduce((counts, entry) => {
      const count = entry.senses.filter(
        (sense) =>
          sense.grammar.pos === "V" &&
          sense.grammar.form !== "PC" &&
          !(sense.grammar.tags ?? []).includes("REL") &&
          sense.grammar.valency === undefined,
      ).length;

      if (count > 0) {
        counts.set(entry.etym, (counts.get(entry.etym) ?? 0) + count);
      }

      return counts;
    }, new Map<string, number>());

    expect(untaggedVerbSensesByEtym.get("Egy") ?? 0).toBeLessThanOrEqual(17);
    expect(untaggedVerbSensesByEtym.get("Unknown") ?? 0).toBe(0);
  });

  it("keeps Egyptian participle forms outside finite valency review", () => {
    const dictionary = readDictionary();
    const finiteUntaggedEgyptianVerbSenses = dictionary.flatMap((entry) =>
      entry.etym === "Egy"
        ? entry.senses
            .map((sense, senseIndex) => ({ entry, sense, senseIndex }))
            .filter(
              ({ sense }) =>
                sense.grammar.pos === "V" &&
                sense.grammar.form !== "PC" &&
                !(sense.grammar.tags ?? []).includes("REL") &&
                sense.grammar.valency === undefined,
            )
            .map(({ entry, senseIndex }) => ({ id: entry.id, senseIndex }))
        : [],
    );

    expect(finiteUntaggedEgyptianVerbSenses.length).toBeLessThanOrEqual(17);
  });

  it("keeps structured senses annotated with structured grammar", () => {
    const dictionary = readDictionary();
    const entriesById = new Map(dictionary.map((entry) => [entry.id, entry]));

    expect(
      findSense(entriesById.get(2), (sense) => sense.grammar.valency === "INTR")
        ?.grammar,
    ).toEqual({ pos: "V", valency: "INTR" });
    expect(
      findSense(entriesById.get(25), (sense) => sense.grammar.pos === "N")
        ?.grammar,
    ).toEqual({ gender: "M", pos: "N" });
    expect(
      findSense(entriesById.get(100), (sense) => sense.grammar.number === "PL")
        ?.grammar,
    ).toEqual({ gender: "M", number: "PL", pos: "N" });
    expect(
      findSense(
        entriesById.get(2639),
        (sense) => sense.grammar.polarity === "NEG",
      )?.grammar,
    ).toEqual({ polarity: "NEG", pos: "N" });
  });

  it("keeps all plural forms structured as inflected forms", () => {
    const dictionary = readDictionary();
    const structuredPluralFormCount = dictionary.reduce(
      (count, entry) =>
        count +
        flattenInflections(entry).filter((form) => form.kind === "plural")
          .length,
      0,
    );

    expect(structuredPluralFormCount).toBe(601);
  });

  it("keeps number-marked meaning prose in structured sense groups", () => {
    const dictionary = readDictionary();
    const numberMarkedEntries = dictionary
      .filter(hasNumberMarkedMeaningProse)
      .map((entry) => ({
        headword: entry.headword,
        id: entry.id,
      }));

    expect(numberMarkedEntries).toEqual([]);
  });

  it("keeps primary spellings free of variant lists and state metadata", () => {
    const dictionary = readDictionary();
    const structurallyNoisyFields: Array<{
      field: string;
      id: number;
      value: string;
    }> = [];
    const primaryFormFields = [
      "absolute",
      "nominal",
      "pronominal",
      "stative",
    ] as const;

    for (const entry of dictionary) {
      if (
        splitTopLevelCommaSeparatedValues(entry.headword).length > 1 ||
        hasHeadwordOrAbsoluteStructuralNotation(entry.headword)
      ) {
        structurallyNoisyFields.push({
          field: "headword",
          id: entry.id,
          value: entry.headword,
        });
      }

      for (const [dialect, forms] of Object.entries(entry.dialects)) {
        for (const field of primaryFormFields) {
          const value = forms[field] ?? "";

          if (
            splitTopLevelCommaSeparatedValues(value).length > 1 ||
            (field === "absolute" &&
              hasHeadwordOrAbsoluteStructuralNotation(value))
          ) {
            structurallyNoisyFields.push({
              field: `${dialect}.${field}`,
              id: entry.id,
              value,
            });
          }
        }

        for (const value of forms.variants?.absolute ?? []) {
          if (hasHeadwordOrAbsoluteStructuralNotation(value)) {
            structurallyNoisyFields.push({
              field: `${dialect}.variants.absolute`,
              id: entry.id,
              value,
            });
          }
        }
      }
    }

    expect(structurallyNoisyFields).toEqual([]);
  });

  it("keeps imperative forms structured on parent entries", () => {
    const dictionary = readDictionary();
    const entriesWithLegacyImperativeFields = dictionary
      .filter((entry) =>
        Object.values(entry.dialects).some((forms) =>
          Object.prototype.hasOwnProperty.call(forms, "imperatives"),
        ),
      )
      .map((entry) => entry.id);
    const imperativeFormCount = dictionary.reduce(
      (count, entry) =>
        count +
        flattenInflections(entry).filter((form) => form.kind === "imperative")
          .length,
      0,
    );
    const parentEntry = dictionary.find((entry) => entry.id === 2);
    const comeEntry = dictionary.find((entry) => entry.id === 5);

    expect(entriesWithLegacyImperativeFields).toEqual([]);
    expect(imperativeFormCount).toBe(94);
    expect(parentEntry?.dialects.B).toMatchObject({
      absolute: "ϯ",
      variants: {
        pronominal: ["ⲧⲏⲓⲧ="],
      },
    });
    expect(parentEntry ? flattenInflections(parentEntry) : []).toEqual(
      expect.arrayContaining([
        {
          dialect: "B",
          form: "ⲙⲟⲓ",
          kind: "imperative",
          role: "absolute",
        },
        {
          dialect: "B",
          form: "ⲙⲁ-",
          kind: "imperative",
          role: "nominal",
        },
        {
          dialect: "B",
          form: "ⲙⲏⲓ=",
          kind: "imperative",
          role: "pronominal",
        },
        {
          dialect: "B",
          form: "ⲙⲏⲓⲧ=",
          kind: "imperative",
          role: "pronominal",
        },
      ]),
    );
    expect(parentEntry?.inflections?.imperative?.B).toMatchObject({
      absolute: ["ⲙⲟⲓ"],
      nominal: ["ⲙⲁ-"],
      pronominal: ["ⲙⲏⲓ="],
      variants: {
        pronominal: ["ⲙⲏⲓⲧ=", "ⲙⲟⲓⲧ="],
      },
    });
    expect(comeEntry ? flattenInflections(comeEntry) : []).toEqual(
      expect.arrayContaining([
        {
          dialect: "B",
          form: "ⲁⲙⲟⲩ",
          gender: "M",
          kind: "imperative",
          number: "SG",
          role: "absolute",
        },
        {
          dialect: "B",
          form: "ⲁⲙⲏ",
          gender: "F",
          kind: "imperative",
          number: "SG",
          role: "absolute",
        },
        {
          dialect: "B",
          form: "ⲁⲙⲱⲓⲛⲓ",
          kind: "imperative",
          number: "PL",
          role: "absolute",
        },
        {
          dialect: "S",
          form: "ⲁⲙⲏⲉⲓⲧⲛ̄",
          kind: "imperative",
          number: "PL",
          role: "absolute",
        },
      ]),
    );
  });

  it("keeps structured gendered forms displayable as gendered headings", () => {
    const dictionary = readDictionary();
    const entriesById = new Map(dictionary.map((entry) => [entry.id, entry]));
    const masculineEntriesWithFeminineForms = dictionary
      .filter(
        (entry) =>
          getEntryNounGender(entry) === "M" &&
          flattenInflections(entry).some((form) => form.kind === "feminine"),
      )
      .map((entry) => entry.id)
      .sort((left, right) => left - right);

    expect(masculineEntriesWithFeminineForms).toEqual([18, 20, 550]);
    expect(
      getGenderedHeadingParts(entriesById.get(18)!, "B").map(
        (part) => `${part.spelling} ${part.marker}`,
      ),
    ).toEqual(["ⲟⲩⲣⲟ m", "ⲟⲩⲣⲱ f", "ⲟⲩⲣⲱⲟⲩ pl"]);
    expect(
      getGenderedHeadingParts(entriesById.get(20)!, "B").map(
        (part) => `${part.spelling} ${part.marker}`,
      ),
    ).toEqual(["ϣⲏⲣⲓ ϣⲟⲩ- m", "ϣⲉⲣⲓ f"]);
    expect(entriesById.get(20)?.genderedMeanings).toEqual([
      {
        meanings: {
          en: {
            f: "daughter",
            m: "son, child",
          },
          nl: {
            f: "dochter",
            m: "zoon, kind",
          },
        },
      },
    ]);
    expect(entriesById.get(18)?.genderedMeanings).toEqual([
      {
        meanings: {
          en: {
            f: "queen",
            m: "king",
            pl: "royals",
          },
          nl: {
            f: "koningin",
            m: "koning",
            pl: "koninklijken",
          },
        },
      },
    ]);
    expect(entriesById.get(17)?.genderedMeanings).toEqual([
      {
        meanings: {
          en: {
            f: "lady",
            m: "lord",
            pl: "nobles",
          },
          nl: {
            f: "dame",
            m: "heer",
            pl: "edelen",
          },
        },
      },
    ]);
    expect(entriesById.get(18)?.senses.map((group) => group.grammar)).toEqual([
      { gender: "M", pos: "N" },
      { pos: "ADJ" },
    ]);
    expect(
      findSense(entriesById.get(18), (group) => group.grammar.pos === "ADJ")
        ?.meanings?.en,
    ).toEqual(["royal"]);
    expect(entriesById.get(17)?.senses.map((group) => group.grammar)).toEqual([
      { gender: "BOTH", pos: "N" },
      { pos: "ADJ" },
    ]);
    expect(
      findSense(entriesById.get(17), (group) => group.grammar.pos === "ADJ")
        ?.meanings?.en,
    ).toEqual(["noble"]);
    expect(entriesById.get(550)?.senses).toEqual([
      { grammar: { gender: "M", pos: "N" } },
    ]);
    expect(
      getGenderedHeadingParts(entriesById.get(550)!, "B").map(
        (part) => `${part.spelling} ${part.marker}`,
      ),
    ).toEqual(["ⲃⲱⲕ m", "ⲃⲱⲕⲓ f", "ⲉⲃⲓⲁⲓⲕ pl"]);
    expect(entriesById.get(5345)).toMatchObject({
      headword: "ⲡⲏⲣⲁ",
      senses: [
        {
          grammar: { gender: "F", pos: "N" },
        },
      ],
    });
  });

  it("keeps Oxyrhynchite coverage under dialect M", () => {
    const dictionary = readDictionary();
    const oxyrhynchiteEntries = dictionary.filter((entry) => entry.dialects.M);

    expect(oxyrhynchiteEntries.length).toBeGreaterThanOrEqual(483);
    expect(
      dictionary.find((entry) => entry.id === 493)?.dialects.M,
    ).toMatchObject({
      absolute: "ⲁⲛⲁⲕ",
      nominal: "ⲁⲛⲕ-",
    });
    const oxyrhynchiteFenceEntry = dictionary.find(
      (entry) => entry.id === 7166,
    );

    expect(oxyrhynchiteFenceEntry).toMatchObject({
      dialects: {
        M: {
          absolute: "ϫⲗⲉ",
        },
      },
    });
    expect(
      findSense(oxyrhynchiteFenceEntry, (group) =>
        Boolean(group.meanings?.en?.includes("fence")),
      ),
    ).toMatchObject({
      meanings: { en: ["fence"], nl: ["omheining"] },
      grammar: { pos: "N" },
    });
  });

  it("stores construct participles as tilde-marked forms outside nominal state", () => {
    const dictionary = readDictionary();
    const invalidConstructParticiples: Array<{
      dialect: string;
      form: string;
      id: number;
    }> = [];
    const secondaryCanonicalConstructParticiples: Array<{
      dialect: string;
      forms: string[];
      id: number;
    }> = [];
    const nominalConstructParticiples: Array<{
      dialect: string;
      form: string;
      id: number;
    }> = [];

    for (const entry of dictionary) {
      for (const [dialect, forms] of Object.entries(entry.dialects)) {
        if (/^PC\b/u.test(forms.nominal ?? "")) {
          nominalConstructParticiples.push({
            dialect,
            form: forms.nominal ?? "",
            id: entry.id,
          });
        }

        if ((forms.participles?.length ?? 0) > 1) {
          secondaryCanonicalConstructParticiples.push({
            dialect,
            forms: forms.participles ?? [],
            id: entry.id,
          });
        }

        for (const form of collectConstructParticiples(forms)) {
          if (!form.endsWith("~") || /\s/.test(form)) {
            invalidConstructParticiples.push({
              dialect,
              form,
              id: entry.id,
            });
          }
        }
      }
    }

    expect(nominalConstructParticiples).toEqual([]);
    expect(secondaryCanonicalConstructParticiples).toEqual([]);
    expect(invalidConstructParticiples).toEqual([]);
    expect(
      dictionary.find((entry) => entry.id === 130)?.dialects.B,
    ).toMatchObject({
      nominal: "ϭⲓ-",
      participles: ["ϭⲁⲓ~"],
      pronominal: "ϭⲓⲧ=",
      stative: "ϭⲏⲟⲩ†",
      variants: {
        constructParticiples: ["ϭⲁⲩ~"],
      },
    });
  });

  it("keeps construct participle compound links in relations", () => {
    const dictionary = readDictionary();
    const entryIds = new Set(dictionary.map((entry) => entry.id));
    const malformedCompounds: Array<{
      headword: string;
      id: number;
      reason: string;
    }> = [];

    const compoundEntries = dictionary.filter(
      (entry) =>
        entry.relations?.some(
          (relation) => relation.type === "COMPOUND_WITH",
        ) === true,
    );

    for (const entry of compoundEntries) {
      const compoundRelations =
        entry.relations?.filter(
          (relation) => relation.type === "COMPOUND_WITH",
        ) ?? [];

      if (
        compoundRelations.some((relation) => !entryIds.has(relation.targetId))
      ) {
        malformedCompounds.push({
          headword: entry.headword,
          id: entry.id,
          reason: "missing target",
        });
      }

      if (!entry.senses.some((sense) => sense.grammar.pos === "N")) {
        malformedCompounds.push({
          headword: entry.headword,
          id: entry.id,
          reason: "missing noun sense",
        });
      }
    }

    expect(malformedCompounds).toEqual([]);
    expect(compoundEntries.length).toBeGreaterThanOrEqual(267);
  });

  it("keeps sense gloss arrays populated when present", () => {
    const dictionary = readDictionary();

    const malformedSenses = dictionary.flatMap((entry) =>
      entry.senses.flatMap((sense, senseIndex) =>
        (
          [
            ["meanings.en", sense.meanings?.en],
            ["meanings.nl", sense.meanings?.nl],
          ] as const
        ).flatMap(([field, values]) =>
          values === undefined || isNonEmptyStringArray(values)
            ? []
            : [{ field, id: entry.id, senseIndex }],
        ),
      ),
    );

    expect(malformedSenses).toEqual([]);
  });

  it("omits placeholder meaning stubs", () => {
    const dictionary = readDictionary();
    const placeholderMeanings = dictionary.flatMap((entry) =>
      collectMeaningTexts(entry)
        .filter(hasPlaceholderMeaning)
        .map((meaning) => ({ id: entry.id, meaning })),
    );

    expect(placeholderMeanings).toEqual([]);
  });

  it("omits bare uncertainty, grammar, dialect, and ellipsis stubs", () => {
    const dictionary = readDictionary();
    const lingeringNoteStubs = dictionary.flatMap((entry) =>
      collectNoteStubRows(entry).filter(({ note }) => {
        const normalizedNote = note.trim();

        return (
          bareQuestionNotePattern.test(normalizedNote) ||
          bareGenderMarkerNotePattern.test(normalizedNote) ||
          grammarLabelSet.has(normalizedNote) ||
          parseDialectSourceLabel(normalizedNote) !== undefined
        );
      }),
    );
    const lingeringEllipsisMeanings = dictionary.flatMap((entry) =>
      collectMeaningTexts(entry)
        .filter((meaning) => ellipsisMeaningPattern.test(meaning.trim()))
        .map((meaning) => ({ id: entry.id, meaning })),
    );

    expect(lingeringNoteStubs).toEqual([]);
    expect(lingeringEllipsisMeanings).toEqual([]);
  });

  it("uses dagger rather than plus for stative markers in lexical forms", () => {
    const dictionary = readDictionary();
    const entriesById = new Map(dictionary.map((entry) => [entry.id, entry]));
    const lexicalFormPlusRows = dictionary.flatMap(collectLexicalFormPlusRows);

    expect(lexicalFormPlusRows).toEqual([]);
    expect(entriesById.get(857)?.headword).toBe("ⲕⲏⲩ†");
    expect(entriesById.get(3086)?.headword).toBe("ⲧⲁϥⲉ†");
    expect(entriesById.get(3089)?.headword).toBe("ⲑⲉⲙ†");
  });

  it("stores representative bound-only prepositions without fake absolute forms", () => {
    const dictionary = readDictionary();
    const boundOnlyEntries = [
      {
        id: 361,
        dialect: "B",
        nominal: "ⳳⲉⲛ-",
        pronominal: "ⲛ̀ⳳⲏⲧ=",
      },
      {
        id: 892,
        dialect: "B",
        nominal: "ⲛⲉⲙ-",
        pronominal: "ⲛⲉⲙⲁ=",
      },
      {
        id: 1713,
        dialect: "B",
        nominal: "ⲟⲩⲧⲉ-",
        pronominal: "ⲟⲩⲧⲱ=",
      },
    ] as const;

    for (const expected of boundOnlyEntries) {
      const entry = dictionary.find(
        (candidate) => candidate.id === expected.id,
      );
      const forms = entry?.dialects[expected.dialect];

      expect(forms).toMatchObject({
        nominal: expected.nominal,
        pronominal: expected.pronominal,
      });
      expect(forms).not.toHaveProperty("absolute");
    }
  });
});
