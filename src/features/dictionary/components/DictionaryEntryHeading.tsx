"use client";

import Link from "next/link";

import { Badge } from "@/components/Badge";
import CopticText from "@/components/CopticText";
import type { FormSymbolTooltips } from "@/components/CopticText";
import {
  getPartOfSpeechCode,
  getPartOfSpeechLabel,
  type DictionaryDialectCode,
} from "@/features/dictionary/config";
import {
  formatDialectForms,
  getAllPluralForms,
  getDialectPluralForms,
  getGenderedHeadingParts,
  getPreferredEntryPrincipalSpelling,
} from "@/features/dictionary/lib/entryDisplay";
import {
  getEntryNounGender,
  getPrimaryEntryPartOfSpeech,
} from "@/features/dictionary/lib/entryGrammar";
import type {
  DictionaryClientEntry,
  DictionarySearchMatchKind,
} from "@/features/dictionary/types";
import type { TranslationKey } from "@/lib/i18n";
import { getEntryPath } from "@/lib/locale";
import type { Language } from "@/types/i18n";

import DialectSiglum from "./DialectSiglum";
import {
  getGenderedHeadingMarkerLabel,
  getMainGenderMarkers,
} from "./dictionaryEntryHelpers";
import { LinguisticGloss, LinguisticGlossGroup } from "./LinguisticGloss";
import { SpeakButton } from "./SpeakButton";

import type { ReactNode } from "react";

type DictionaryEntryTranslator = (key: TranslationKey) => string;
type EntryDialectSelection = "ALL" | DictionaryDialectCode;
type DictionaryEntryRelation = NonNullable<
  DictionaryClientEntry["relations"]
>[number];

const SEARCH_MATCH_LABEL_KEYS = {
  "dialect-form": "dict.match.dialectForm",
  greek: "dict.match.greek",
  headword: "dict.match.headword",
  inflection: "dict.match.inflection",
  meaning: "dict.match.meaning",
} as const satisfies Record<DictionarySearchMatchKind, TranslationKey>;

type DictionaryEntryHeadingProps = {
  actions?: ReactNode;
  compoundRelations: readonly DictionaryEntryRelation[];
  entry: DictionaryClientEntry;
  formSymbolTooltips: FormSymbolTooltips;
  headingLevel: "h1" | "h2";
  isDetailView: boolean;
  language: Language;
  linkHeadword: boolean;
  primaryDialectKey: DictionaryDialectCode | undefined;
  primaryForms: DictionaryClientEntry["dialects"][DictionaryDialectCode];
  query: string;
  t: DictionaryEntryTranslator;
  viewDialect: EntryDialectSelection;
};

export function DictionaryEntryHeading({
  actions,
  compoundRelations,
  entry,
  formSymbolTooltips,
  headingLevel,
  isDetailView,
  language,
  linkHeadword,
  primaryDialectKey,
  primaryForms,
  query,
  t,
  viewDialect,
}: DictionaryEntryHeadingProps) {
  let headerSpelling = entry.headword;

  if (primaryForms) {
    headerSpelling = formatDialectForms(primaryForms, entry.headword);
  }

  const canSpeakPrimarySpelling = primaryDialectKey === "B";
  const HeadingTag = headingLevel;
  const headingClassName = `font-coptic ${
    isDetailView ? "text-5xl md:text-6xl" : "text-4xl"
  } text-coptic tracking-wide transition-colors ${
    linkHeadword ? "hover:text-accent-strong cursor-pointer" : ""
  }`;
  const mainGenderMarkers = getMainGenderMarkers(getEntryNounGender(entry), t);
  const genderedHeadingParts = getGenderedHeadingParts(entry, viewDialect);
  const hasGenderedHeading = genderedHeadingParts.length > 0;
  const primaryDialectPlurals = primaryDialectKey
    ? getDialectPluralForms(entry, primaryDialectKey, {
        includeUnscoped: true,
      })
    : getAllPluralForms(entry);
  const visiblePrimaryDialectPlurals = primaryDialectPlurals.filter(
    (pluralForm) => pluralForm.trim() !== headerSpelling.trim(),
  );
  const headingPluralForm = visiblePrimaryDialectPlurals[0] ?? "";

  const primaryPartOfSpeech = getPrimaryEntryPartOfSpeech(entry);
  const partOfSpeechLabel = getPartOfSpeechLabel(primaryPartOfSpeech, t);
  const partOfSpeechCode = getPartOfSpeechCode(primaryPartOfSpeech);
  const showInlinePos = partOfSpeechCode !== "" && partOfSpeechCode !== "n";
  const focusableHeadingGlosses = !linkHeadword;
  const compactBadgeClassName = "h-8 min-h-8 min-w-8 justify-center px-3";

  const headingContent = (
    <HeadingTag
      className={`${headingClassName} flex flex-wrap items-baseline gap-x-3 gap-y-1`}
    >
      {hasGenderedHeading ? (
        genderedHeadingParts.map((part) => (
          <span
            key={`${part.entryId ?? entry.id}-${part.marker}-${part.spelling}`}
            className="inline-flex min-w-0 items-baseline gap-x-2"
          >
            <span>
              <CopticText
                text={part.spelling}
                query={query}
                symbolTooltips={formSymbolTooltips}
              />
            </span>
            <LinguisticGloss
              code={part.marker}
              label={getGenderedHeadingMarkerLabel(part.marker, t)}
              size="heading"
              focusable={focusableHeadingGlosses}
            />
          </span>
        ))
      ) : (
        <span className="min-w-0">
          <CopticText
            text={headerSpelling}
            query={query}
            symbolTooltips={formSymbolTooltips}
          />
          {showInlinePos && (
            <>
              {" "}
              <LinguisticGloss
                code={partOfSpeechCode}
                label={partOfSpeechLabel}
                size="heading"
                focusable={focusableHeadingGlosses}
              />
            </>
          )}
        </span>
      )}
      {hasGenderedHeading && showInlinePos && (
        <LinguisticGloss
          code={partOfSpeechCode}
          label={partOfSpeechLabel}
          size="heading"
          focusable={focusableHeadingGlosses}
        />
      )}
      {!hasGenderedHeading && mainGenderMarkers.length > 0 && (
        <LinguisticGlossGroup
          markers={mainGenderMarkers}
          size="heading"
          focusable={focusableHeadingGlosses}
        />
      )}
      {!hasGenderedHeading && primaryDialectPlurals.length > 0 && (
        <>
          {headingPluralForm && (
            <span>
              <CopticText
                text={headingPluralForm}
                query={query}
                symbolTooltips={formSymbolTooltips}
              />
            </span>
          )}
          <LinguisticGloss
            code="pl"
            label={t("entry.abbreviation.pl")}
            size="heading"
            focusable={focusableHeadingGlosses}
          />
        </>
      )}
    </HeadingTag>
  );

  const metadataBadges = (
    <>
      {compoundRelations.map((relation, index) => {
        const compoundTargetLabel = relation.targetEntry
          ? getPreferredEntryPrincipalSpelling(
              relation.targetEntry,
              viewDialect,
            )
          : String(relation.targetId);

        return (
          <Link
            key={`${relation.type}-${relation.targetId}-${index}`}
            href={getEntryPath(relation.targetId, language)}
            prefetch={false}
            className="inline-flex min-h-8 max-w-full items-center gap-2 rounded-lg border border-accent/25 bg-accent-soft/80 px-3 text-xs font-semibold text-accent-strong transition hover:border-accent/45 hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent dark:text-accent"
          >
            <span>{t("entry.compoundOf")}</span>
            <span
              className={`font-coptic min-w-0 truncate text-sm font-normal tracking-wide`}
            >
              <CopticText
                text={compoundTargetLabel}
                query={query}
                symbolTooltips={formSymbolTooltips}
              />
            </span>
          </Link>
        );
      })}
      {primaryDialectKey && (
        <Badge
          tone="neutral"
          size="sm"
          className={`${compactBadgeClassName} gap-1.5`}
        >
          <span>{t("dict.dialect")} </span>
          <DialectSiglum siglum={primaryDialectKey} />
        </Badge>
      )}
      {entry.searchMatch ? (
        <Badge
          tone={entry.searchMatch.exact ? "coptic" : "surface"}
          size="xs"
          className="min-h-8"
        >
          {t(SEARCH_MATCH_LABEL_KEYS[entry.searchMatch.kind])}
        </Badge>
      ) : null}
    </>
  );

  if (isDetailView) {
    return (
      <div className="relative mb-5 flex min-w-0 flex-col gap-4">
        <div className="min-w-0">
          {linkHeadword ? (
            <Link
              href={getEntryPath(entry.id, language)}
              prefetch={false}
              className="inline-block max-w-full break-words [overflow-wrap:anywhere]"
            >
              {headingContent}
            </Link>
          ) : (
            headingContent
          )}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            {canSpeakPrimarySpelling && (
              <SpeakButton
                copticText={headerSpelling}
                className="h-8 w-8 border border-line bg-elevated text-muted hover:border-accent/40"
              />
            )}
            {metadataBadges}
          </div>
          {actions ? (
            <div className="flex w-full min-w-0 flex-col items-start gap-3 sm:w-auto sm:items-end">
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="relative mb-5 flex flex-col items-start justify-between gap-4 sm:flex-row">
      <div className="flex min-w-0 items-start gap-3">
        <div className="min-w-0">
          {linkHeadword ? (
            <Link
              href={getEntryPath(entry.id, language)}
              prefetch={false}
              className="inline-block max-w-full break-words [overflow-wrap:anywhere]"
            >
              {headingContent}
            </Link>
          ) : (
            headingContent
          )}
        </div>
        {canSpeakPrimarySpelling && (
          <SpeakButton
            copticText={headerSpelling}
            className="mt-1 shrink-0 sm:mt-1.5"
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        {metadataBadges}
      </div>
    </div>
  );
}
