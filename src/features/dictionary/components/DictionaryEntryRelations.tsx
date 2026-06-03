"use client";

import Link from "next/link";

import { antinoou } from "@/lib/fonts";
import type { TranslationKey } from "@/lib/i18n";

import HighlightText, {
  type FormSymbolTooltips,
  type GrammarAbbreviationTooltips,
} from "./HighlightText";

type DictionaryEntryTranslator = (key: TranslationKey) => string;

type DictionaryEntryRelationRow = {
  href: string;
  key: string;
  label: string;
  notes: string[];
  targetLabel: string;
};

type DictionaryEntryRelationsProps = {
  formSymbolTooltips: FormSymbolTooltips;
  grammarAbbreviationTooltips: GrammarAbbreviationTooltips;
  isDetailView: boolean;
  query: string;
  relationRows: DictionaryEntryRelationRow[];
  t: DictionaryEntryTranslator;
};

export function DictionaryEntryRelations({
  formSymbolTooltips,
  grammarAbbreviationTooltips,
  isDetailView,
  query,
  relationRows,
  t,
}: DictionaryEntryRelationsProps) {
  if (!isDetailView || relationRows.length === 0) {
    return null;
  }

  return (
    <div
      className="mt-5 flex flex-col gap-3"
      data-testid="dictionary-entry-relations-section"
    >
      <span className="text-xs font-semibold uppercase tracking-widest text-muted">
        {t("entry.relatedEntries")}
      </span>
      <ul className="flex flex-col gap-2.5">
        {relationRows.map((relation) => (
          <li
            key={relation.key}
            className="flex min-w-0 flex-col items-start gap-1.5"
          >
            <Link
              href={relation.href}
              prefetch={false}
              className="inline-flex max-w-full flex-wrap items-baseline gap-x-2 gap-y-1 rounded-lg border border-line bg-elevated/65 px-3 py-2 text-sm text-ink transition hover:-translate-y-px hover:border-coptic/35 hover:bg-coptic-soft/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coptic/30 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                {relation.label}
              </span>
              <span
                className={`${antinoou.className} min-w-0 break-words text-base leading-snug text-coptic [overflow-wrap:anywhere]`}
              >
                <HighlightText
                  text={relation.targetLabel}
                  query={query}
                  symbolTooltips={formSymbolTooltips}
                />
              </span>
            </Link>
            {relation.notes.length > 0 && (
              <ul className="ml-5 list-disc space-y-1 text-sm text-muted marker:text-coptic">
                {relation.notes.map((note, noteIndex) => (
                  <li key={noteIndex}>
                    <HighlightText
                      text={note}
                      query={query}
                      grammarAbbreviationTooltips={grammarAbbreviationTooltips}
                    />
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
