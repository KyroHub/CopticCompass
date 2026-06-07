"use client";

import { Badge } from "@/components/Badge";
import {
  type DictionaryComplementizerGovernment,
  type DictionaryConstructionGovernment,
  type DictionaryDialectCode,
  type DictionaryPrepGovernment,
} from "@/features/dictionary/config";
import type { GenderedHeadingMarker } from "@/features/dictionary/lib/entryDisplay";
import type {
  getLocalizedDisplayDialectMeanings,
  getLocalizedGenderedMeanings,
  getLocalizedSenseGroups,
} from "@/features/dictionary/lib/entryText";
import { cx } from "@/lib/classes";
import type { TranslationKey } from "@/lib/i18n";

import DialectSiglum from "./DialectSiglum";
import {
  GovernmentBadges,
  getGenderedHeadingMarkerLabel,
} from "./dictionaryEntryHelpers";
import HighlightText, {
  type GrammarAbbreviationTooltips,
} from "./HighlightText";
import { LinguisticGloss } from "./LinguisticGloss";

type DictionaryEntryTranslator = (key: TranslationKey) => string;
type GenderedMeaningRow = ReturnType<
  typeof getLocalizedGenderedMeanings
>[number];
type LocalizedSenseRow = ReturnType<typeof getLocalizedSenseGroups>[number];
type DialectMeaningRow = ReturnType<
  typeof getLocalizedDisplayDialectMeanings
>[number];

type DictionaryEntryMeaningsProps = {
  compactLayout?: boolean;
  compactPreview?: boolean;
  dialectMeanings: DialectMeaningRow[];
  genderedMeanings: GenderedMeaningRow[];
  grammarAbbreviationTooltips: GrammarAbbreviationTooltips;
  isDetailView: boolean;
  limitPreview?: boolean;
  localizedSenseRows: LocalizedSenseRow[];
  query: string;
  t: DictionaryEntryTranslator;
};

function getMeaningTextClassName(
  isDetailView: boolean,
  compactLayout: boolean,
) {
  return cx(
    "ml-5 list-disc text-ink marker:text-coptic",
    compactLayout ? "space-y-1" : "space-y-1.5",
    isDetailView ? "text-lg md:text-xl" : "text-base",
  );
}

function GenderedMeaningValues({
  grammarAbbreviationTooltips,
  query,
  t,
  values,
}: {
  grammarAbbreviationTooltips: GrammarAbbreviationTooltips;
  query: string;
  t: DictionaryEntryTranslator;
  values: Array<{ marker: GenderedHeadingMarker; meaning: string }>;
}) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1">
      {values.map(({ marker, meaning }, valueIndex) => (
        <span
          key={`${marker}-${valueIndex}`}
          className="inline-flex items-baseline gap-x-1.5"
        >
          <LinguisticGloss
            code={marker}
            label={getGenderedHeadingMarkerLabel(marker, t)}
            size="inline"
          />
          <span>
            <HighlightText
              className="italic"
              text={meaning}
              query={query}
              grammarAbbreviationTooltips={grammarAbbreviationTooltips}
            />
            {valueIndex < values.length - 1 && (
              <span className="text-muted/70">;</span>
            )}
          </span>
        </span>
      ))}
    </span>
  );
}

function GovernmentMarkerRow({
  code,
  complementizerGovernment,
  constructionGovernment,
  dialects,
  grammarAbbreviationTooltips,
  keyPrefix,
  prepGovernment,
}: {
  code: string;
  complementizerGovernment?: DictionaryComplementizerGovernment[];
  constructionGovernment?: DictionaryConstructionGovernment[];
  dialects?: DictionaryDialectCode[];
  grammarAbbreviationTooltips: GrammarAbbreviationTooltips;
  keyPrefix: string;
  prepGovernment?: DictionaryPrepGovernment[];
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-baseline gap-2">
      <LinguisticGloss
        code={code}
        label={grammarAbbreviationTooltips[code.toLocaleLowerCase()] ?? code}
        size="body"
      />
      {dialects && dialects.length > 0 && (
        <span className="inline-flex flex-wrap items-center gap-1">
          {dialects.map((dialect) => (
            <DialectSiglum key={`${keyPrefix}-${dialect}`} siglum={dialect} />
          ))}
        </span>
      )}
      <GovernmentBadges forms={prepGovernment} label="+" />
      <GovernmentBadges
        forms={complementizerGovernment}
        label="cl."
        tone="complementizer"
      />
      <GovernmentBadges
        forms={constructionGovernment}
        label="constr."
        tone="construction"
      />
    </div>
  );
}

export function DictionaryEntryMeanings({
  compactLayout = false,
  compactPreview = false,
  dialectMeanings,
  genderedMeanings,
  grammarAbbreviationTooltips,
  isDetailView,
  limitPreview = compactPreview,
  localizedSenseRows,
  query,
  t,
}: DictionaryEntryMeaningsProps) {
  const usesCompactLayout = compactLayout || compactPreview;
  const visibleGenderedMeanings = limitPreview
    ? genderedMeanings.slice(0, 2)
    : genderedMeanings;
  const visibleLocalizedSenseRows = limitPreview
    ? localizedSenseRows.slice(0, 2).map((group) => ({
        ...group,
        genderedRows: group.genderedRows?.slice(0, 2),
        meanings: group.meanings.slice(0, 2),
      }))
    : localizedSenseRows;
  const visibleDialectMeanings = limitPreview
    ? dialectMeanings.slice(0, 1).map((dialectMeaning) => ({
        ...dialectMeaning,
        meanings: dialectMeaning.meanings.slice(0, 2),
      }))
    : dialectMeanings;

  return (
    <>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">
        {t("entry.translation")}
      </h3>
      {visibleGenderedMeanings.length > 0 && (
        <ul
          className={cx(
            "ml-5 list-disc text-ink marker:text-coptic",
            usesCompactLayout ? "space-y-1" : "space-y-2",
            isDetailView ? "text-lg md:text-xl" : "text-base",
          )}
        >
          {visibleGenderedMeanings.map((row, idx) => (
            <li key={idx} className="leading-relaxed pl-1">
              <GenderedMeaningValues
                grammarAbbreviationTooltips={grammarAbbreviationTooltips}
                query={query}
                t={t}
                values={row.values}
              />
            </li>
          ))}
        </ul>
      )}
      {visibleLocalizedSenseRows.length > 0 && (
        <div className="grid gap-3">
          {visibleLocalizedSenseRows.map((group, groupIndex) => {
            const groupGenderedRows = group.genderedRows ?? [];
            const hasMeaningRows =
              groupGenderedRows.length > 0 || group.meanings.length > 0;
            const rowKey = `${group.code}-${groupIndex}`;

            return (
              <div
                key={rowKey}
                className="grid gap-2 border-l-2 border-coptic/25 pl-3"
              >
                <GovernmentMarkerRow
                  code={group.code}
                  complementizerGovernment={group.complementizerGovernment}
                  constructionGovernment={group.constructionGovernment}
                  dialects={group.dialects}
                  grammarAbbreviationTooltips={grammarAbbreviationTooltips}
                  keyPrefix={rowKey}
                  prepGovernment={group.prepGovernment}
                />
                {hasMeaningRows && (
                  <ul
                    className={getMeaningTextClassName(
                      isDetailView,
                      usesCompactLayout,
                    )}
                  >
                    {groupGenderedRows.map((row, idx) => (
                      <li
                        key={`${group.code}-gendered-${idx}`}
                        className="leading-relaxed pl-1"
                      >
                        <GenderedMeaningValues
                          grammarAbbreviationTooltips={
                            grammarAbbreviationTooltips
                          }
                          query={query}
                          t={t}
                          values={row.values}
                        />
                      </li>
                    ))}
                    {group.meanings.map((meaning, idx) => (
                      <li
                        key={`${group.code}-meaning-${idx}`}
                        className="leading-relaxed pl-1"
                      >
                        <HighlightText
                          className="italic"
                          text={meaning}
                          query={query}
                          grammarAbbreviationTooltips={
                            grammarAbbreviationTooltips
                          }
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
      {visibleDialectMeanings.length > 0 && (
        <div className="grid gap-3">
          {visibleDialectMeanings.map((dialectMeaning) => (
            <div
              key={dialectMeaning.sourceLabel}
              className="grid gap-2 border-l-2 border-coptic/25 pl-3"
            >
              <div className="flex min-w-0 flex-wrap items-baseline gap-2">
                {dialectMeaning.dialects.map((dialect) => (
                  <Badge
                    key={`${dialectMeaning.sourceLabel}-${dialect}`}
                    tone="neutral"
                    size="xxs"
                    className="min-h-6"
                  >
                    <DialectSiglum siglum={dialect} />
                  </Badge>
                ))}
              </div>
              {dialectMeaning.meanings.length > 0 && (
                <ul
                  className={getMeaningTextClassName(
                    isDetailView,
                    usesCompactLayout,
                  )}
                >
                  {dialectMeaning.meanings.map((meaning, idx) => (
                    <li key={idx} className="leading-relaxed pl-1">
                      <HighlightText
                        className="italic"
                        text={meaning}
                        query={query}
                        grammarAbbreviationTooltips={
                          grammarAbbreviationTooltips
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
