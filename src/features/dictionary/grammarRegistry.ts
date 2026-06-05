import type { TranslationKey } from "@/lib/i18n";

type PartOfSpeechDefinition = {
  displayCode: string;
  labelKey: TranslationKey;
};

export const DICTIONARY_PART_OF_SPEECH_CODES = [
  "V",
  "N",
  "ADJ",
  "ADV",
  "CONJ",
  "INTJ",
  "OTHER",
  "PREP",
  "UNKNOWN",
] as const;

type DictionaryPartOfSpeechCode =
  (typeof DICTIONARY_PART_OF_SPEECH_CODES)[number];

const PART_OF_SPEECH_DEFINITIONS = {
  V: {
    displayCode: "v",
    labelKey: "dict.verb",
  },
  N: {
    displayCode: "n",
    labelKey: "dict.noun",
  },
  ADJ: {
    displayCode: "adj",
    labelKey: "dict.adj",
  },
  ADV: {
    displayCode: "adv",
    labelKey: "dict.adv",
  },
  CONJ: {
    displayCode: "conj",
    labelKey: "dict.conj",
  },
  INTJ: {
    displayCode: "intj",
    labelKey: "dict.inj",
  },
  OTHER: {
    displayCode: "other",
    labelKey: "dict.other",
  },
  PREP: {
    displayCode: "prep",
    labelKey: "dict.prep",
  },
  UNKNOWN: {
    displayCode: "",
    labelKey: "dict.unknown",
  },
} as const satisfies Record<DictionaryPartOfSpeechCode, PartOfSpeechDefinition>;

export const DICTIONARY_PART_OF_SPEECH_FILTER_CODES = [
  "V",
  "N",
  "ADJ",
  "ADV",
  "INTJ",
  "PREP",
] as const satisfies readonly DictionaryPartOfSpeechCode[];

const DICTIONARY_PART_OF_SPEECH_CODE_SET = new Set<string>(
  DICTIONARY_PART_OF_SPEECH_CODES,
);

type GrammarAbbreviationDefinition = {
  aliases?: readonly string[];
  canonicalCode: string;
  inlinePatterns?: readonly string[];
  labelKey: TranslationKey;
};

type GrammarAbbreviationRegistry = readonly GrammarAbbreviationDefinition[];

const GRAMMAR_ABBREVIATION_DEFINITIONS: GrammarAbbreviationRegistry = [
  {
    canonicalCode: "ACC",
    labelKey: "entry.abbreviation.acc",
  },
  {
    canonicalCode: "ADJ",
    labelKey: "entry.abbreviation.adj",
  },
  {
    canonicalCode: "ADV",
    labelKey: "entry.abbreviation.adv",
  },
  {
    canonicalCode: "ART",
    labelKey: "entry.abbreviation.art",
  },
  {
    canonicalCode: "AUX",
    labelKey: "entry.abbreviation.aux",
  },
  {
    aliases: ["c"],
    canonicalCode: "COM",
    inlinePatterns: ["\\bc\\b(?=\\s)"],
    labelKey: "entry.abbreviation.com",
  },
  {
    canonicalCode: "CAUS",
    labelKey: "entry.abbreviation.caus",
  },
  {
    canonicalCode: "CONJ",
    labelKey: "entry.abbreviation.conj",
  },
  {
    canonicalCode: "CSTR",
    labelKey: "entry.abbreviation.cstr",
  },
  {
    canonicalCode: "DAT",
    labelKey: "entry.abbreviation.dat",
  },
  {
    canonicalCode: "DEF",
    labelKey: "entry.abbreviation.def",
  },
  {
    canonicalCode: "ESP",
    labelKey: "entry.abbreviation.esp",
  },
  {
    aliases: ["ethic DAT"],
    canonicalCode: "ETHIC.DAT",
    labelKey: "entry.abbreviation.ethicDat",
  },
  {
    canonicalCode: "GEN",
    labelKey: "entry.abbreviation.gen",
  },
  {
    canonicalCode: "GK",
    labelKey: "entry.abbreviation.gk",
  },
  {
    canonicalCode: "IMPERS",
    labelKey: "entry.abbreviation.impers",
  },
  {
    aliases: ["IMPERS V"],
    canonicalCode: "IMPERS.V",
    labelKey: "entry.abbreviation.impersVerb",
  },
  {
    canonicalCode: "IMP",
    labelKey: "entry.abbreviation.imp",
  },
  {
    canonicalCode: "INDF",
    labelKey: "entry.abbreviation.indf",
  },
  {
    canonicalCode: "INTJ",
    labelKey: "entry.abbreviation.intj",
  },
  {
    canonicalCode: "Q",
    labelKey: "entry.abbreviation.q",
  },
  {
    canonicalCode: "INTR",
    labelKey: "entry.abbreviation.intr",
  },
  {
    canonicalCode: "STA",
    labelKey: "entry.abbreviation.sta",
  },
  {
    canonicalCode: "LIT",
    labelKey: "entry.abbreviation.lit",
  },
  {
    canonicalCode: "NEG",
    labelKey: "entry.abbreviation.neg",
  },
  {
    canonicalCode: "N",
    labelKey: "entry.abbreviation.n",
  },
  {
    canonicalCode: "NOM",
    labelKey: "entry.abbreviation.nom",
  },
  {
    canonicalCode: "OBJ",
    labelKey: "entry.abbreviation.obj",
  },
  {
    canonicalCode: "PC",
    labelKey: "entry.abbreviation.pc",
  },
  {
    canonicalCode: "PL",
    labelKey: "entry.abbreviation.pl",
  },
  {
    canonicalCode: "POSS",
    labelKey: "entry.abbreviation.poss",
  },
  {
    canonicalCode: "PFX",
    labelKey: "entry.abbreviation.pfx",
  },
  {
    canonicalCode: "PREP",
    labelKey: "entry.abbreviation.prep",
  },
  {
    canonicalCode: "PROB",
    labelKey: "entry.abbreviation.prob",
  },
  {
    canonicalCode: "PRON",
    labelKey: "entry.abbreviation.pron",
  },
  {
    canonicalCode: "RARE",
    labelKey: "entry.abbreviation.rare",
  },
  {
    canonicalCode: "REFL",
    labelKey: "entry.abbreviation.refl",
  },
  {
    canonicalCode: "REL",
    labelKey: "entry.abbreviation.rel",
  },
  {
    canonicalCode: "SG",
    labelKey: "entry.abbreviation.sg",
  },
  {
    canonicalCode: "SIM",
    labelKey: "entry.abbreviation.sim",
  },
  {
    canonicalCode: "SBJ",
    labelKey: "entry.abbreviation.sbj",
  },
  {
    canonicalCode: "SFX",
    labelKey: "entry.abbreviation.sfx",
  },
  {
    canonicalCode: "TR",
    labelKey: "entry.abbreviation.tr",
  },
  {
    canonicalCode: "V",
    labelKey: "entry.abbreviation.v",
  },
  {
    canonicalCode: "VBAL",
    labelKey: "entry.abbreviation.vbal",
  },
];

function normalizeAlias(value: string) {
  return value.toUpperCase().replace(/\.$/, "").replace(/\s+/g, " ").trim();
}

export function normalizePartOfSpeechCode(
  value: string,
): DictionaryPartOfSpeechCode {
  const normalizedCode = normalizeAlias(value);

  return DICTIONARY_PART_OF_SPEECH_CODE_SET.has(normalizedCode)
    ? (normalizedCode as DictionaryPartOfSpeechCode)
    : "UNKNOWN";
}

export function getPartOfSpeechDisplayCode(value: string) {
  return PART_OF_SPEECH_DEFINITIONS[normalizePartOfSpeechCode(value)]
    .displayCode;
}

export function getPartOfSpeechLabelKey(value: string): TranslationKey {
  return PART_OF_SPEECH_DEFINITIONS[normalizePartOfSpeechCode(value)].labelKey;
}

export function isVerbPartOfSpeech(value: string) {
  return normalizePartOfSpeechCode(value) === "V";
}

export function getGrammarAbbreviationTooltips(
  translate: (key: TranslationKey) => string,
) {
  return Object.fromEntries(
    GRAMMAR_ABBREVIATION_DEFINITIONS.flatMap((definition) =>
      [...(definition.aliases ?? []), definition.canonicalCode].map((alias) => [
        alias.toLowerCase(),
        translate(definition.labelKey),
      ]),
    ),
  );
}

export const DICTIONARY_GRAMMAR_SUMMARY_LEAD_INS = [
  ...new Set(
    GRAMMAR_ABBREVIATION_DEFINITIONS.flatMap((definition) => [
      ...(definition.aliases ?? []),
      definition.canonicalCode,
    ]).map((code) => code.toLowerCase()),
  ),
];

function escapeAliasPattern(alias: string) {
  return alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
}

export const LEADING_GRAMMAR_LABEL_PATTERNS =
  GRAMMAR_ABBREVIATION_DEFINITIONS.flatMap((definition) =>
    [...(definition.aliases ?? []), definition.canonicalCode].map(
      escapeAliasPattern,
    ),
  );

export const INLINE_GRAMMAR_ABBREVIATION_PATTERNS =
  GRAMMAR_ABBREVIATION_DEFINITIONS.flatMap((definition) =>
    definition.inlinePatterns?.length
      ? [
          ...definition.inlinePatterns,
          `\\b${escapeAliasPattern(definition.canonicalCode)}\\b`,
        ]
      : [...(definition.aliases ?? []), definition.canonicalCode].map(
          (alias) => `\\b${escapeAliasPattern(alias)}\\b`,
        ),
  );
