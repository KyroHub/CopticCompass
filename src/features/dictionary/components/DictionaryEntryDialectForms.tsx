"use client";

import type { DictionaryDialectCode } from "@/features/dictionary/config";
import {
  formatDialectForms,
  getDialectPluralForms,
  getGenderedDialectFormParts,
} from "@/features/dictionary/lib/entryDisplay";
import type { DictionaryClientEntry } from "@/features/dictionary/types";
import { antinoou } from "@/lib/fonts";
import type { TranslationKey } from "@/lib/i18n";

import DialectSiglum from "./DialectSiglum";
import { getGenderedHeadingMarkerLabel } from "./dictionaryEntryHelpers";
import HighlightText, { type FormSymbolTooltips } from "./HighlightText";
import { LinguisticGloss, LinguisticGlossGroup } from "./LinguisticGloss";

type DictionaryEntryTranslator = (key: TranslationKey) => string;
type DialectEntryTuple = [
  DictionaryDialectCode,
  NonNullable<DictionaryClientEntry["dialects"][DictionaryDialectCode]>,
];
type LinguisticMarker = {
  code: string;
  label: string;
};

type DictionaryEntryDialectFormsProps = {
  entry: DictionaryClientEntry;
  formSymbolTooltips: FormSymbolTooltips;
  mainGenderMarkers: LinguisticMarker[];
  onDialectViewChange: (dialect: DictionaryDialectCode) => void;
  partOfSpeechCode: string;
  partOfSpeechLabel: string;
  query: string;
  remainingDialects: DialectEntryTuple[];
  showInlinePos: boolean;
  t: DictionaryEntryTranslator;
};

export function DictionaryEntryDialectForms({
  entry,
  formSymbolTooltips,
  mainGenderMarkers,
  onDialectViewChange,
  partOfSpeechCode,
  partOfSpeechLabel,
  query,
  remainingDialects,
  showInlinePos,
  t,
}: DictionaryEntryDialectFormsProps) {
  if (remainingDialects.length === 0) {
    return null;
  }

  return (
    <div className="mt-7 border-t border-line pt-5">
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
        {t("entry.dialectForms")}
      </h4>
      <div className="flex flex-wrap gap-3">
        {remainingDialects.map(([dialect, forms]) => {
          const spelling = formatDialectForms(forms, entry.headword);
          const dialectPlurals = getDialectPluralForms(entry, dialect);
          const visibleDialectPlurals = dialectPlurals.filter(
            (pluralForm) => pluralForm.trim() !== spelling.trim(),
          );
          const genderedDialectParts = getGenderedDialectFormParts(
            entry,
            dialect,
          );
          const hasGenderedDialectParts = genderedDialectParts.length > 0;
          const dialectAriaSpelling = hasGenderedDialectParts
            ? genderedDialectParts
                .map((part) => `${part.spelling} ${part.marker}`)
                .join(" ")
            : spelling;

          return (
            <button
              key={dialect}
              type="button"
              onClick={() => onDialectViewChange(dialect)}
              aria-label={`${t("entry.dialectForms")}: ${dialect} ${dialectAriaSpelling}`}
              className="flex min-w-0 max-w-full basis-full cursor-pointer select-none items-start gap-3 rounded-lg border border-line bg-elevated/65 px-3 py-2.5 text-left transition-all duration-200 hover:-translate-y-px hover:border-coptic/35 hover:bg-coptic-soft/45 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coptic/30 focus-visible:ring-offset-2 focus-visible:ring-offset-paper sm:basis-auto"
            >
              <span className="inline-flex min-h-7 shrink-0 items-center rounded-md bg-surface px-2.5 py-2 text-[10px] font-bold text-muted">
                <DialectSiglum focusableTooltip={false} siglum={dialect} />
              </span>
              <span className="min-w-0 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                {hasGenderedDialectParts ? (
                  <>
                    {genderedDialectParts.map((part) => (
                      <span
                        key={`${dialect}-${part.entryId ?? entry.id}-${part.marker}-${part.spelling}`}
                        className="inline-flex min-w-0 items-baseline gap-x-1.5"
                      >
                        <span
                          className={`${antinoou.className} block break-words text-lg leading-snug text-ink [overflow-wrap:anywhere]`}
                        >
                          <HighlightText
                            text={part.spelling}
                            query={query}
                            symbolTooltips={formSymbolTooltips}
                          />
                        </span>
                        <LinguisticGloss
                          code={part.marker}
                          label={getGenderedHeadingMarkerLabel(part.marker, t)}
                          size="compact"
                          focusable={false}
                        />
                      </span>
                    ))}
                  </>
                ) : (
                  <span
                    className={`${antinoou.className} block break-words text-lg leading-snug text-ink [overflow-wrap:anywhere]`}
                  >
                    <HighlightText
                      text={spelling}
                      query={query}
                      symbolTooltips={formSymbolTooltips}
                    />
                  </span>
                )}
                {showInlinePos && !hasGenderedDialectParts && (
                  <LinguisticGloss
                    code={partOfSpeechCode}
                    label={partOfSpeechLabel}
                    size="compact"
                    focusable={false}
                  />
                )}
                {mainGenderMarkers.length > 0 && !hasGenderedDialectParts && (
                  <LinguisticGlossGroup
                    markers={mainGenderMarkers}
                    size="compact"
                    focusable={false}
                  />
                )}
                {dialectPlurals.length > 0 && !hasGenderedDialectParts && (
                  <>
                    {visibleDialectPlurals[0] && (
                      <span
                        className={`${antinoou.className} block break-words text-lg leading-snug text-ink [overflow-wrap:anywhere]`}
                      >
                        <HighlightText
                          text={visibleDialectPlurals[0]}
                          query={query}
                          symbolTooltips={formSymbolTooltips}
                        />
                      </span>
                    )}
                    <LinguisticGloss
                      code="pl"
                      label={t("entry.abbreviation.pl")}
                      size="compact"
                      focusable={false}
                    />
                  </>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
