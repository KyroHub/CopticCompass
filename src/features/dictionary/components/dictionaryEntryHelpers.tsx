import type {
  ImperativeDisplayForm,
  GenderedHeadingMarker,
} from "@/features/dictionary/lib/entryDisplay";
import type {
  DictionaryRelationType,
  LexicalGender,
} from "@/features/dictionary/types";
import { antinoou } from "@/lib/fonts";
import type { TranslationKey } from "@/lib/i18n";

import type { FormSymbolTooltips } from "./HighlightText";

type DictionaryEntryTranslator = (key: TranslationKey) => string;

export function getFormSymbolTooltips(
  t: DictionaryEntryTranslator,
): FormSymbolTooltips {
  return {
    "-": t("entry.symbol.nominal"),
    "=": t("entry.symbol.pronominal"),
    "†": t("entry.symbol.stative"),
    "~": t("entry.symbol.constructParticiple"),
  };
}

export function getMainGenderMarkers(
  gender: LexicalGender | undefined,
  t: DictionaryEntryTranslator,
) {
  if (!gender) {
    return [];
  }

  const markers =
    gender === "BOTH"
      ? [
          { code: "m", label: t("entry.gender.masculine") },
          { code: "f", label: t("entry.gender.feminine") },
        ]
      : [
          gender === "M"
            ? { code: "m", label: t("entry.gender.masculine") }
            : { code: "f", label: t("entry.gender.feminine") },
        ];

  return markers;
}

export function getGenderedHeadingMarkerLabel(
  marker: GenderedHeadingMarker,
  t: DictionaryEntryTranslator,
) {
  switch (marker) {
    case "m":
      return t("entry.gender.masculine");
    case "f":
      return t("entry.gender.feminine");
    case "pl":
      return t("entry.abbreviation.pl");
  }
}

export function getImperativeFormMorphologyMarkers(
  form: ImperativeDisplayForm,
  t: DictionaryEntryTranslator,
) {
  const markers: { code: string; label: string }[] = [];

  if (form.gender === "BOTH") {
    markers.push(
      { code: "m", label: t("entry.gender.masculine") },
      { code: "f", label: t("entry.gender.feminine") },
    );
  } else if (form.gender === "M") {
    markers.push({ code: "m", label: t("entry.gender.masculine") });
  } else if (form.gender === "F") {
    markers.push({ code: "f", label: t("entry.gender.feminine") });
  }

  if (form.number === "SG") {
    markers.push({ code: "sg", label: t("entry.abbreviation.sg") });
  } else if (form.number === "PL") {
    markers.push({ code: "pl", label: t("entry.abbreviation.pl") });
  }

  return markers;
}

export function getRelationTypeLabel(
  type: DictionaryRelationType,
  t: DictionaryEntryTranslator,
) {
  switch (type) {
    case "CAUS_OF":
      return t("entry.relation.causativeOf");
    case "COMPOUND_WITH":
      return t("entry.relation.compoundWith");
    case "DERIVED_FROM":
      return t("entry.relation.derivedFrom");
    case "SEE_ALSO":
      return t("entry.relation.seeAlso");
  }
}

export function getUniqueDisplayNotes(noteGroups: readonly string[][]) {
  const seenNotes = new Set<string>();
  const notes: string[] = [];

  for (const note of noteGroups.flat()) {
    const normalizedNote = note.trim();
    const noteKey = normalizedNote.toLocaleLowerCase();

    if (!normalizedNote || seenNotes.has(noteKey)) {
      continue;
    }

    seenNotes.add(noteKey);
    notes.push(normalizedNote);
  }

  return notes;
}

function getGovernmentBadgeToneClassName(
  tone: "complementizer" | "construction" | "prep",
) {
  if (tone === "complementizer") {
    return "border-accent/20 bg-accent-soft/80 text-accent-strong dark:border-accent/30 dark:text-accent";
  }

  if (tone === "construction") {
    return "border-line bg-elevated text-ink dark:border-line";
  }

  return "border-coptic/15 bg-coptic/5 text-coptic dark:border-coptic/25 dark:bg-coptic/10";
}

export function GovernmentBadges({
  forms,
  label,
  tone = "prep",
}: {
  forms: readonly string[] | undefined;
  label: string;
  tone?: "complementizer" | "construction" | "prep";
}) {
  if (!forms || forms.length === 0) {
    return null;
  }

  const badgeToneClassName = getGovernmentBadgeToneClassName(tone);

  return (
    <span className="inline-flex min-w-0 flex-wrap items-baseline gap-1 text-xs text-muted">
      <span className="font-semibold">({label}</span>
      {forms.map((form, index) => (
        <span key={`${form}-${index}`} className="inline-flex">
          <span
            className={`${antinoou.className} rounded-md border px-1.5 py-0.5 text-sm leading-none ${badgeToneClassName}`}
          >
            {form}
          </span>
          {index < forms.length - 1 && (
            <span className="ml-1 text-muted/70">,</span>
          )}
        </span>
      ))}
      <span className="font-semibold">)</span>
    </span>
  );
}
