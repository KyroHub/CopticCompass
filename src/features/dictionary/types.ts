import type {
  DictionaryComplementizerGovernment,
  DictionaryConstructionGovernment,
  DictionaryDialectCode,
  DictionaryPrepGovernment,
  DictionarySenseCode,
  PartOfSpeech,
} from "@/features/dictionary/config";

/**
 * Shared dictionary domain types used by the build pipeline, search helpers,
 * and entry UI.
 */
export type LexicalGender = "" | "BOTH" | "F" | "M";
export type DictionaryEtymology = "Egy" | "Gr" | "Lat" | "Sem" | "Unknown";
export type DictionaryGenderedMeaningMarker = "f" | "m" | "pl";
export type DictionaryRelationType =
  | "CAUS_OF"
  | "COMPOUND_WITH"
  | "DERIVED_FROM"
  | "SEE_ALSO";
type DictionaryInflectedFormKind =
  | "dual"
  | "feminine"
  | "imperative"
  | "masculine"
  | "plural";
type DictionaryInflectedFormRole = "absolute" | "nominal" | "pronominal";
type DictionaryInflectedFormValue = string | DictionaryInflectedFormDetails;
type DictionarySenseGrammarAffix = "PFX" | "SFX";
type DictionarySenseGrammarCaseRole = "DAT" | "OBJ";
type DictionarySenseGrammarDerivation = "CAUS";
type DictionarySenseGrammarForm = "ABS" | "PC" | "STA" | "VBAL";
export type DictionarySenseGrammarGender = Exclude<LexicalGender, "">;
type DictionarySenseGrammarMood = "IMP";
export type DictionarySenseGrammarNumber = "PL" | "SG";
export type DictionarySenseGrammarPartOfSpeech = PartOfSpeech | "PRON";
type DictionarySenseGrammarPolarity = "NEG";
export type DictionarySenseGrammarValency = "INTR" | "TR";
type DictionarySenseGrammarVoice = "REFL";

/**
 * A structured inflected or counterpart form that may not deserve a full
 * lexical entry.
 */
export interface DictionaryInflectedFormDetails {
  form: string;
  entryId?: number;
  gender?: DictionarySenseGrammarGender;
  notes?: string[];
  number?: DictionarySenseGrammarNumber;
  uncertain?: boolean;
}

type DictionaryInflectedFormRoleMap = Partial<
  Record<
    DictionaryInflectedFormRole | "default",
    DictionaryInflectedFormValue[]
  >
> & {
  variants?: Partial<
    Record<
      DictionaryInflectedFormRole | "default",
      DictionaryInflectedFormValue[]
    >
  >;
};

export type DictionaryInflections = Partial<
  Record<
    DictionaryInflectedFormKind,
    Partial<Record<DictionaryDialectCode, DictionaryInflectedFormRoleMap>>
  >
>;

export interface DialectFormVariants {
  absolute?: string[];
  constructParticiples?: string[];
  nominal?: string[];
  pronominal?: string[];
  stative?: string[];
}

export interface DialectForms {
  absolute?: string;
  nominal?: string;
  pronominal?: string;
  stative?: string;
  participles?: string[];
  variants?: DialectFormVariants;
}

export type DictionaryDialectFormsMap = Partial<
  Record<DictionaryDialectCode, DialectForms>
>;

type DictionaryPrepGovernmentMap = Partial<
  Record<DictionaryDialectCode, DictionaryPrepGovernment[]>
>;

export interface DictionarySenseGrammar {
  affix?: DictionarySenseGrammarAffix;
  caseRole?: DictionarySenseGrammarCaseRole;
  complementizerGovernment?: DictionaryComplementizerGovernment[];
  constructionGovernment?: DictionaryConstructionGovernment[];
  derivation?: DictionarySenseGrammarDerivation;
  form?: DictionarySenseGrammarForm;
  gender?: DictionarySenseGrammarGender;
  mood?: DictionarySenseGrammarMood;
  number?: DictionarySenseGrammarNumber;
  polarity?: DictionarySenseGrammarPolarity;
  pos: DictionarySenseGrammarPartOfSpeech;
  prepGovernment?: DictionaryPrepGovernmentMap;
  tags?: DictionarySenseCode[];
  valency?: DictionarySenseGrammarValency;
  voice?: DictionarySenseGrammarVoice;
}

export interface DictionarySense {
  dialects?: DictionaryDialectCode[];
  meanings?: {
    en?: string[];
    nl?: string[];
  };
  notes?: {
    en?: string[];
    nl?: string[];
  };
  grammar: DictionarySenseGrammar;
}

export type DictionarySenses = DictionarySense[];

export type DictionaryGenderedMeaningValues = Partial<
  Record<DictionaryGenderedMeaningMarker, string>
>;

export interface DictionaryGenderedMeaning {
  meanings?: {
    en?: DictionaryGenderedMeaningValues;
    nl?: DictionaryGenderedMeaningValues;
  };
}

export interface DictionaryDialectMeaning {
  sourceLabel: string;
  dialects: DictionaryDialectCode[];
  meanings?: {
    en?: string[];
    nl?: string[];
  };
  notes?: {
    en?: string[];
    nl?: string[];
  };
}

export interface DictionaryRelation {
  type: DictionaryRelationType;
  targetId: number;
  notes?: {
    en?: string[];
    nl?: string[];
  };
}

export type DictionaryRelationReference = DictionaryRelation & {
  targetEntry?: DictionaryEntryReference;
};

export interface DictionaryGreekContext {
  sources?: string[];
  equivalents?: string[];
}

export type DictionarySearchMatchKind =
  | "dialect-form"
  | "greek"
  | "headword"
  | "inflection"
  | "meaning";

export interface DictionarySearchMatch {
  exact: boolean;
  kind: DictionarySearchMatchKind;
}

/**
 * Represents one normalized dictionary entry as consumed by the app and the
 * generated public JSON snapshot.
 */
export interface LexicalEntry {
  id: number;
  headword: string;
  dialects: DictionaryDialectFormsMap;
  senses: DictionarySenses;
  genderedMeanings?: DictionaryGenderedMeaning[];
  dialectMeanings?: DictionaryDialectMeaning[];
  greekContext?: DictionaryGreekContext;
  etym: DictionaryEtymology;
  inflections?: DictionaryInflections;
  relations?: DictionaryRelation[];
}

export type DictionaryEntryReference = Pick<
  LexicalEntry,
  "dialects" | "headword" | "id"
>;

/**
 * Represents the reduced dictionary shape needed by search-result cards and
 * analytics drilldowns.
 */
export type DictionaryClientEntry = Pick<
  LexicalEntry,
  | "dialects"
  | "dialectMeanings"
  | "etym"
  | "genderedMeanings"
  | "greekContext"
  | "headword"
  | "id"
  | "inflections"
  | "senses"
> & {
  relations?: DictionaryRelationReference[];
  searchMatch?: DictionarySearchMatch;
};
