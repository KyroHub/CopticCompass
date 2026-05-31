"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";

import { Badge } from "@/components/Badge";
import { useLanguage } from "@/components/LanguageProvider";
import { surfacePanelClassName } from "@/components/SurfacePanel";
import {
  DEFAULT_DICTIONARY_DIALECT_FILTER,
  getPartOfSpeechCode,
  getPartOfSpeechLabel,
  type DialectFilter,
  type DictionaryDialectCode,
} from "@/features/dictionary/config";
import { getGrammarAbbreviationTooltips } from "@/features/dictionary/grammarRegistry";
import {
  formatDialectForms,
  formatImperativeForms,
  getPreferredEntryPrincipalSpelling,
  getAllPluralForms,
  getDialectImperativeVariantForms,
  getDialectPluralForms,
  getDialectPrimaryImperativeForms,
  getDialectPrimaryImperativeDisplayForms,
  getDialectVariantRows,
  getGenderedDialectFormParts,
  getGenderedHeadingParts,
  getPreferredEntryDialectKey,
  hasImperativeDisplayFormMorphology,
} from "@/features/dictionary/lib/entryDisplay";
import {
  getEntryNounGender,
  getPrimaryEntryPartOfSpeech,
} from "@/features/dictionary/lib/entryGrammar";
import {
  getLocalizedDisplayDialectMeanings,
  getLocalizedGenderedMeanings,
  getLocalizedSenseGroups,
} from "@/features/dictionary/lib/entryText";
import type { DictionaryClientEntry } from "@/features/dictionary/types";
import { cx } from "@/lib/classes";
import { antinoou } from "@/lib/fonts";
import { getEntryPath } from "@/lib/locale";

import DialectSiglum from "./DialectSiglum";
import {
  GovernmentBadges,
  getFormSymbolTooltips,
  getGenderedHeadingMarkerLabel,
  getImperativeFormMorphologyMarkers,
  getMainGenderMarkers,
  getRelationTypeLabel,
  getUniqueDisplayNotes,
} from "./dictionaryEntryHelpers";
import HighlightText from "./HighlightText";
import { LinguisticGloss, LinguisticGlossGroup } from "./LinguisticGloss";
import { SpeakButton } from "./SpeakButton";

type DictionaryEntryCardProps = {
  entry: DictionaryClientEntry;
  query?: string;
  selectedDialect?: DialectFilter;
  headingLevel?: "h1" | "h2";
  linkHeadword?: boolean;
  actions?: ReactNode;
};

type DialectEntryTuple = [
  DictionaryDialectCode,
  NonNullable<DictionaryClientEntry["dialects"][DictionaryDialectCode]>,
];
type EntryDialectSelection = "ALL" | DictionaryDialectCode;
type EntryVariantRow = {
  dialect: DictionaryDialectCode;
  forms: string[];
  label?: string;
  state: string;
};

export default function DictionaryEntryCard({
  actions,
  entry,
  query = "",
  selectedDialect = DEFAULT_DICTIONARY_DIALECT_FILTER,
  headingLevel = "h2",
  linkHeadword = true,
}: DictionaryEntryCardProps) {
  const { language, t } = useLanguage();
  const articleRef = useRef<HTMLElement>(null);
  const [viewDialect, setViewDialect] =
    useState<EntryDialectSelection>(selectedDialect);
  const [prevSelectedDialect, setPrevSelectedDialect] =
    useState<DialectFilter>(selectedDialect);

  if (selectedDialect !== prevSelectedDialect) {
    setPrevSelectedDialect(selectedDialect);
    setViewDialect(selectedDialect);
  }

  const isDetailView = headingLevel === "h1";
  const primaryDialectKey = getPreferredEntryDialectKey(entry, viewDialect);

  let headerSpelling = entry.headword;
  const primaryForms = primaryDialectKey
    ? entry.dialects[primaryDialectKey]
    : undefined;

  if (primaryForms) {
    /**
     * Collapse the selected dialect's forms into the compact heading notation
     * used throughout the dictionary UI.
     */
    headerSpelling = formatDialectForms(primaryForms, entry.headword);
  }

  const canSpeakPrimarySpelling = primaryDialectKey === "B";
  const remainingDialects = Object.entries(entry.dialects).filter(
    (dialectEntry): dialectEntry is DialectEntryTuple =>
      dialectEntry[0] !== primaryDialectKey && Boolean(dialectEntry[1]),
  );
  const HeadingTag = headingLevel;
  const headingClassName = `${antinoou.className} ${
    isDetailView ? "text-5xl md:text-6xl" : "text-4xl"
  } text-coptic tracking-wide transition-colors ${
    linkHeadword ? "hover:text-accent-strong cursor-pointer" : ""
  }`;
  const formSymbolTooltips = getFormSymbolTooltips(t);
  const grammarAbbreviationTooltips = getGrammarAbbreviationTooltips(t);
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
              <HighlightText
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
          <HighlightText
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
              <HighlightText
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
  const primaryImperativeForms = primaryDialectKey
    ? getDialectPrimaryImperativeForms(entry, primaryDialectKey)
    : {};
  const primaryImperativeDisplayForms = primaryDialectKey
    ? getDialectPrimaryImperativeDisplayForms(entry, primaryDialectKey)
    : [];
  const hasAnnotatedPrimaryImperativeForms = primaryImperativeDisplayForms.some(
    hasImperativeDisplayFormMorphology,
  );
  const hasPrimaryImperativeForms = hasAnnotatedPrimaryImperativeForms
    ? primaryImperativeDisplayForms.length > 0
    : Object.values(primaryImperativeForms).some(Boolean);
  const imperativeVariantForms = primaryDialectKey
    ? getDialectImperativeVariantForms(entry, primaryDialectKey)
    : [];
  const localizedSenses = getLocalizedSenseGroups(entry, language, {
    dialectForms: primaryForms,
    hasImperativeForms:
      hasPrimaryImperativeForms || imperativeVariantForms.length > 0,
    viewDialect: primaryDialectKey,
  });
  const hasGroupedGenderedMeanings = localizedSenses.some(
    (group) => (group.genderedRows?.length ?? 0) > 0,
  );
  const genderedMeanings = hasGroupedGenderedMeanings
    ? []
    : getLocalizedGenderedMeanings(entry, language);
  const dialectMeanings = getLocalizedDisplayDialectMeanings(entry, language);
  const localizedSenseRows = localizedSenses.filter(
    (group) =>
      (group.genderedRows?.length ?? 0) > 0 ||
      group.meanings.length > 0 ||
      (group.dialects?.length ?? 0) > 0 ||
      (group.complementizerGovernment?.length ?? 0) > 0 ||
      (group.constructionGovernment?.length ?? 0) > 0 ||
      (group.prepGovernment?.length ?? 0) > 0,
  );
  const displayDialectMeanings = dialectMeanings.filter(
    (dialectMeaning) => dialectMeaning.meanings.length > 0,
  );
  const relations = entry.relations ?? [];
  const compoundRelations = relations.filter(
    (relation) => relation.type === "COMPOUND_WITH",
  );
  const relationRows = relations
    .filter((relation) => relation.type !== "COMPOUND_WITH")
    .map((relation, index) => ({
      href: getEntryPath(relation.targetId, language),
      key: `${relation.type}-${relation.targetId}-${index}`,
      label: getRelationTypeLabel(relation.type, t),
      notes: relation.notes?.[language] ?? [],
      targetLabel: relation.targetEntry
        ? getPreferredEntryPrincipalSpelling(relation.targetEntry, viewDialect)
        : String(relation.targetId),
    }));
  const greekSources = entry.greekContext?.sources ?? [];
  const greekEquivalents = entry.greekContext?.equivalents ?? [];
  const translationNotes = getUniqueDisplayNotes([
    localizedSenses.flatMap((group) => group.notes),
    dialectMeanings.flatMap((dialectMeaning) => dialectMeaning.notes),
  ]);
  const variantRows: EntryVariantRow[] = [
    ...(primaryDialectKey && primaryForms
      ? getDialectVariantRows(primaryForms).map((row) => ({
          dialect: primaryDialectKey,
          ...row,
        }))
      : []),
    ...(primaryDialectKey && imperativeVariantForms.length > 0
      ? [
          {
            dialect: primaryDialectKey,
            forms: imperativeVariantForms,
            label: "IMP",
            state: "imperative",
          },
        ]
      : []),
  ];
  const compactBadgeClassName = "h-8 min-h-8 min-w-8 justify-center px-3";

  const handleDialectViewChange = (dialect: DictionaryDialectCode) => {
    setViewDialect(dialect);

    if (isDetailView) {
      articleRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };
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
              className={`${antinoou.className} min-w-0 truncate text-sm font-normal tracking-wide`}
            >
              <HighlightText
                text={compoundTargetLabel}
                query={query}
                symbolTooltips={formSymbolTooltips}
              />
            </span>
          </Link>
        );
      })}
      {primaryDialectKey && (
        <Badge tone="neutral" size="sm" className={compactBadgeClassName}>
          <DialectSiglum siglum={primaryDialectKey} />
        </Badge>
      )}
    </>
  );

  return (
    <article
      ref={articleRef}
      className={surfacePanelClassName({
        rounded: "lg",
        interactive: linkHeadword,
        className: cx(
          "group relative overflow-hidden",
          linkHeadword && "hover:border-accent/40 hover:bg-surface",
          isDetailView ? "p-8 md:p-10" : "p-6 md:p-7",
        ),
      })}
    >
      {isDetailView ? (
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
      ) : (
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
      )}

      <div className="mb-6 h-px w-full bg-line" />

      <div className="mb-6 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">
          {t("entry.translation")}
        </h3>
        {genderedMeanings.length > 0 && (
          <ul
            className={`ml-5 list-disc space-y-2 text-ink marker:text-coptic ${
              isDetailView ? "text-lg md:text-xl" : "text-lg"
            }`}
          >
            {genderedMeanings.map((row, idx) => (
              <li key={idx} className="leading-relaxed pl-1">
                <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  {row.values.map(({ marker, meaning }, valueIndex) => (
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
                          grammarAbbreviationTooltips={
                            grammarAbbreviationTooltips
                          }
                        />
                        {valueIndex < row.values.length - 1 && (
                          <span className="text-muted/70">;</span>
                        )}
                      </span>
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        )}
        {localizedSenseRows.length > 0 && (
          <div className="grid gap-3">
            {localizedSenseRows.map((group, groupIndex) => {
              const groupGenderedRows = group.genderedRows ?? [];
              const hasMeaningRows =
                groupGenderedRows.length > 0 || group.meanings.length > 0;

              return (
                <div
                  key={`${group.code}-${groupIndex}`}
                  className="grid gap-2 border-l-2 border-coptic/25 pl-3"
                >
                  <div className="flex min-w-0 flex-wrap items-baseline gap-2">
                    <LinguisticGloss
                      code={group.code}
                      label={
                        grammarAbbreviationTooltips[
                          group.code.toLocaleLowerCase()
                        ] ?? group.code
                      }
                      size="body"
                    />
                    {group.dialects && group.dialects.length > 0 && (
                      <span className="inline-flex flex-wrap items-center gap-1">
                        {group.dialects.map((dialect) => (
                          <DialectSiglum
                            key={`${group.code}-${groupIndex}-${dialect}`}
                            siglum={dialect}
                          />
                        ))}
                      </span>
                    )}
                    <GovernmentBadges forms={group.prepGovernment} label="+" />
                    <GovernmentBadges
                      forms={group.complementizerGovernment}
                      label="cl."
                      tone="complementizer"
                    />
                    <GovernmentBadges
                      forms={group.constructionGovernment}
                      label="constr."
                      tone="construction"
                    />
                  </div>
                  {hasMeaningRows && (
                    <ul
                      className={`ml-5 list-disc space-y-1.5 text-ink marker:text-coptic ${
                        isDetailView ? "text-lg md:text-xl" : "text-lg"
                      }`}
                    >
                      {groupGenderedRows.map((row, idx) => (
                        <li
                          key={`${group.code}-gendered-${idx}`}
                          className="leading-relaxed pl-1"
                        >
                          <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1">
                            {row.values.map(
                              ({ marker, meaning }, valueIndex) => (
                                <span
                                  key={`${marker}-${valueIndex}`}
                                  className="inline-flex items-baseline gap-x-1.5"
                                >
                                  <LinguisticGloss
                                    code={marker}
                                    label={getGenderedHeadingMarkerLabel(
                                      marker,
                                      t,
                                    )}
                                    size="inline"
                                  />
                                  <span>
                                    <HighlightText
                                      className="italic"
                                      text={meaning}
                                      query={query}
                                      grammarAbbreviationTooltips={
                                        grammarAbbreviationTooltips
                                      }
                                    />
                                    {valueIndex < row.values.length - 1 && (
                                      <span className="text-muted/70">;</span>
                                    )}
                                  </span>
                                </span>
                              ),
                            )}
                          </span>
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
        {displayDialectMeanings.length > 0 && (
          <div className="grid gap-3">
            {displayDialectMeanings.map((dialectMeaning) => (
              <div
                key={dialectMeaning.sourceLabel}
                className="grid gap-2 border-l-2 border-coptic/25 pl-3"
              >
                <div className="flex min-w-0 flex-wrap items-baseline gap-2">
                  {dialectMeaning.dialects.map((dialect) => (
                    <span
                      key={`${dialectMeaning.sourceLabel}-${dialect}`}
                      className="inline-flex min-h-6 items-center rounded-md bg-elevated px-2 text-[10px] font-bold text-muted"
                    >
                      <DialectSiglum siglum={dialect} />
                    </span>
                  ))}
                </div>
                {dialectMeaning.meanings.length > 0 && (
                  <ul
                    className={`ml-5 list-disc space-y-1.5 text-ink marker:text-coptic ${
                      isDetailView ? "text-lg md:text-xl" : "text-lg"
                    }`}
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
        {translationNotes.length > 0 && (
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
              {translationNotes.map((note, idx) => (
                <li key={idx} className="leading-relaxed pl-1">
                  <HighlightText
                    text={note}
                    query={query}
                    grammarAbbreviationTooltips={grammarAbbreviationTooltips}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
        {isDetailView && relationRows.length > 0 && (
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
                            grammarAbbreviationTooltips={
                              grammarAbbreviationTooltips
                            }
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        {hasPrimaryImperativeForms && primaryDialectKey && (
          <div
            className="mt-5 flex flex-col gap-3"
            data-testid="dictionary-entry-imperative-section"
          >
            <span className="text-xs font-semibold uppercase tracking-widest text-muted">
              {t("entry.imperatives")}
            </span>
            <div className="flex flex-wrap gap-2.5">
              <span className="inline-flex max-w-full items-baseline gap-2 rounded-lg border border-line bg-elevated/65 px-3 py-2 text-sm text-ink">
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
                            markers={getImperativeFormMorphologyMarkers(
                              form,
                              t,
                            )}
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
                  className="inline-flex max-w-full items-baseline gap-2 rounded-lg border border-line bg-elevated/65 px-3 py-2 text-sm text-ink"
                >
                  <span className="inline-flex min-h-6 shrink-0 items-center rounded-md bg-surface px-2 text-[10px] font-bold text-muted">
                    <DialectSiglum siglum={dialect} />
                  </span>
                  {label ? (
                    <LinguisticGloss
                      code={label}
                      label={
                        grammarAbbreviationTooltips[
                          label.toLocaleLowerCase()
                        ] ?? label
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
      </div>

      {actions && !isDetailView ? (
        <div className="mt-7 border-t border-line pt-5">{actions}</div>
      ) : null}

      {remainingDialects.length > 0 && (
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
                  onClick={() => handleDialectViewChange(dialect)}
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
                              label={getGenderedHeadingMarkerLabel(
                                part.marker,
                                t,
                              )}
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
                    {mainGenderMarkers.length > 0 &&
                      !hasGenderedDialectParts && (
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
      )}
    </article>
  );
}
