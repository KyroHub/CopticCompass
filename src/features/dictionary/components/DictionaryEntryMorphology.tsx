"use client";

import type { DictionaryDialectCode } from "@/features/dictionary/config";
import {
  formatImperativeForms,
  type ImperativeDisplayForm,
} from "@/features/dictionary/lib/entryDisplay";
import { antinoou } from "@/lib/fonts";
import type { TranslationKey } from "@/lib/i18n";

import DialectSiglum from "./DialectSiglum";
import { getImperativeFormMorphologyMarkers } from "./dictionaryEntryHelpers";
import HighlightText, {
  type FormSymbolTooltips,
  type GrammarAbbreviationTooltips,
} from "./HighlightText";
import { LinguisticGloss, LinguisticGlossGroup } from "./LinguisticGloss";

type DictionaryEntryTranslator = (key: TranslationKey) => string;
type PrimaryImperativeForms = Parameters<typeof formatImperativeForms>[0];

type EntryVariantRow = {
  dialect: DictionaryDialectCode;
  forms: string[];
  label?: string;
  state: string;
};

type DictionaryEntryMorphologyProps = {
  formSymbolTooltips: FormSymbolTooltips;
  grammarAbbreviationTooltips: GrammarAbbreviationTooltips;
  greekEquivalents: string[];
  greekSources: string[];
  hasAnnotatedPrimaryImperativeForms: boolean;
  hasPrimaryImperativeForms: boolean;
  primaryDialectKey: DictionaryDialectCode | undefined;
  primaryImperativeDisplayForms: ImperativeDisplayForm[];
  primaryImperativeForms: PrimaryImperativeForms;
  query: string;
  t: DictionaryEntryTranslator;
  variantRows: EntryVariantRow[];
};

export function DictionaryEntryMorphology({
  formSymbolTooltips,
  grammarAbbreviationTooltips,
  greekEquivalents,
  greekSources,
  hasAnnotatedPrimaryImperativeForms,
  hasPrimaryImperativeForms,
  primaryDialectKey,
  primaryImperativeDisplayForms,
  primaryImperativeForms,
  query,
  t,
  variantRows,
}: DictionaryEntryMorphologyProps) {
  return (
    <>
      {hasPrimaryImperativeForms && primaryDialectKey && (
        <div
          className="mt-5 flex flex-col gap-3"
          data-testid="dictionary-entry-imperative-section"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-muted">
            {t("entry.imperatives")}
          </span>
          <div className="flex flex-wrap gap-2.5">
            <span className="inline-flex max-w-full items-baseline gap-2 rounded-lg border border-line bg-elevated/70 px-3 py-2 text-sm text-ink">
              <span className="inline-flex min-h-6 shrink-0 items-center rounded-md bg-surface px-2 text-[10px] font-bold text-muted">
                <DialectSiglum siglum={primaryDialectKey} />
              </span>
              {hasAnnotatedPrimaryImperativeForms ? (
                <span className="inline-flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                  {primaryImperativeDisplayForms.map((form, index) => (
                    <span
                      key={`${form.role}-${form.form}-${form.gender ?? ""}-${form.number ?? ""}-${index}`}
                      className="inline-flex min-w-0 items-baseline gap-x-2"
                    >
                      {index > 0 && <span className="text-muted/60">·</span>}
                      <span className="inline-flex min-w-0 items-baseline gap-x-1.5">
                        <span
                          className={`${antinoou.className} min-w-0 break-words text-base leading-snug [overflow-wrap:anywhere]`}
                        >
                          <HighlightText
                            text={form.form}
                            query={query}
                            symbolTooltips={formSymbolTooltips}
                          />
                        </span>
                        <LinguisticGlossGroup
                          markers={getImperativeFormMorphologyMarkers(form, t)}
                          size="inline"
                        />
                      </span>
                    </span>
                  ))}
                </span>
              ) : (
                <span
                  className={`${antinoou.className} min-w-0 break-words text-base leading-snug [overflow-wrap:anywhere]`}
                >
                  <HighlightText
                    text={formatImperativeForms(primaryImperativeForms)}
                    query={query}
                    symbolTooltips={formSymbolTooltips}
                  />
                </span>
              )}
            </span>
          </div>
        </div>
      )}
      {variantRows.length > 0 && (
        <div
          className="mt-5 flex flex-col gap-3"
          data-testid="dictionary-entry-variants-section"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-muted">
            {t("entry.variants")}
          </span>
          <div className="flex flex-wrap gap-2.5">
            {variantRows.map(({ dialect, forms, label, state }, index) => (
              <span
                key={`${dialect}-${state}-${index}`}
                className="inline-flex max-w-full items-baseline gap-2 rounded-lg border border-line bg-elevated/70 px-3 py-2 text-sm text-ink"
              >
                <span className="inline-flex min-h-6 shrink-0 items-center rounded-md bg-surface px-2 text-[10px] font-bold text-muted">
                  <DialectSiglum siglum={dialect} />
                </span>
                {label ? (
                  <LinguisticGloss
                    code={label}
                    label={
                      grammarAbbreviationTooltips[label.toLocaleLowerCase()] ??
                      label
                    }
                    size="body"
                  />
                ) : null}
                <span
                  className={`${antinoou.className} min-w-0 break-words text-base leading-snug [overflow-wrap:anywhere]`}
                >
                  <HighlightText
                    text={forms.join(", ")}
                    query={query}
                    symbolTooltips={formSymbolTooltips}
                  />
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {greekSources.length > 0 && (
        <div className="mt-5 flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted">
            {t("entry.greekSources")}
          </span>
          <div className="flex flex-wrap gap-2">
            {greekSources.map((gr, idx) => (
              <span
                key={idx}
                className="rounded-lg border border-coptic/20 bg-coptic-soft px-3 py-1.5 text-sm font-medium text-coptic"
              >
                <HighlightText text={gr} query={query} />
              </span>
            ))}
          </div>
        </div>
      )}

      {greekEquivalents.length > 0 && (
        <div className="mt-5 flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted">
            {t("entry.greekEquivalents")}
          </span>
          <div className="flex flex-wrap gap-2">
            {greekEquivalents.map((gr, idx) => (
              <span
                key={idx}
                className="rounded-lg border border-coptic/20 bg-coptic-soft px-3 py-1.5 text-sm font-medium text-coptic"
              >
                <HighlightText text={gr} query={query} />
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
