"use client";

import CopticText, {
  type GrammarAbbreviationTooltips,
} from "@/components/CopticText";
import type { TranslationKey } from "@/lib/i18n";

type DictionaryEntryTranslator = (key: TranslationKey) => string;

type DictionaryEntryNotesProps = {
  grammarAbbreviationTooltips: GrammarAbbreviationTooltips;
  isDetailView: boolean;
  notes: string[];
  query: string;
  t: DictionaryEntryTranslator;
};

export function DictionaryEntryNotes({
  grammarAbbreviationTooltips,
  isDetailView,
  notes,
  query,
  t,
}: DictionaryEntryNotesProps) {
  if (notes.length === 0) {
    return null;
  }

  return (
    <div
      className="mt-5 flex flex-col gap-3"
      data-testid="dictionary-entry-notes-section"
    >
      <span className="text-xs font-semibold uppercase tracking-widest text-muted">
        {t("entry.notes")}
      </span>
      <ul
        className={`ml-5 list-disc space-y-1.5 text-ink marker:text-coptic ${
          isDetailView ? "text-base md:text-lg" : "text-base"
        }`}
      >
        {notes.map((note, idx) => (
          <li key={idx} className="leading-relaxed pl-1">
            <CopticText
              text={note}
              query={query}
              grammarAbbreviationTooltips={grammarAbbreviationTooltips}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
