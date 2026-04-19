import {
  DEFAULT_DICTIONARY_DIALECT_FILTER,
  type DialectFilter,
  type DictionaryDialectCode,
} from "@/features/dictionary/config";
import type { DictionaryClientEntry } from "@/features/dictionary/types";

type DialectEntryTuple = [
  DictionaryDialectCode,
  NonNullable<DictionaryClientEntry["dialects"][DictionaryDialectCode]>,
];

/**
 * Joins the available dialect forms into the compact display string used across
 * search results and entry headers.
 */
export function formatDialectForms(
  forms: DialectEntryTuple[1],
  headwordFallback: string,
) {
  const parts: string[] = [];
  const hasBoundOrStative = Boolean(
    forms.nominal || forms.pronominal || forms.stative,
  );
  let absoluteWithVariants = "";

  if (forms.absolute) {
    absoluteWithVariants = [
      forms.absolute,
      ...(forms.absoluteVariants ?? []),
    ].join(", ");
  } else if (!hasBoundOrStative) {
    absoluteWithVariants = headwordFallback;
  }

  if (absoluteWithVariants) {
    parts.push(absoluteWithVariants);
  }

  const bound: string[] = [];
  if (forms.nominal) {
    bound.push(forms.nominal);
  }
  if (forms.pronominal) {
    bound.push(forms.pronominal);
  }

  if (bound.length > 0) {
    parts.push(bound.join("/"));
  }
  if (forms.stative) {
    parts.push(forms.stative);
  }

  return parts.join(" ").trim();
}

/**
 * Picks the primary dialect to display for an entry, honoring the selected
 * filter when that dialect is present and otherwise falling back to Sahidic or
 * the first available dialect.
 */
export function getPreferredEntryDialectKey(
  entry: DictionaryClientEntry,
  selectedDialect: DialectFilter = DEFAULT_DICTIONARY_DIALECT_FILTER,
) {
  const dialectKeys = Object.keys(entry.dialects) as DictionaryDialectCode[];
  let primaryDialectKey: DictionaryDialectCode | undefined = "S";

  if (selectedDialect !== "ALL" && entry.dialects[selectedDialect]) {
    primaryDialectKey = selectedDialect;
  } else if (!entry.dialects.S) {
    primaryDialectKey = dialectKeys[0];
  }

  return primaryDialectKey;
}

/**
 * Resolves the human-readable spelling shown for an entry under the active
 * dialect filter.
 */
export function getPreferredEntryDisplaySpelling(
  entry: DictionaryClientEntry,
  selectedDialect: DialectFilter = DEFAULT_DICTIONARY_DIALECT_FILTER,
) {
  const primaryDialectKey = getPreferredEntryDialectKey(entry, selectedDialect);
  const primaryForms = primaryDialectKey
    ? entry.dialects[primaryDialectKey]
    : undefined;

  if (!primaryForms) {
    return entry.headword;
  }

  return formatDialectForms(primaryForms, entry.headword);
}
