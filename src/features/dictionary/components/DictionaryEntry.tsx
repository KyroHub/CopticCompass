"use client";

import { useRef, useState, type ReactNode } from "react";

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
  getPreferredEntryPrincipalSpelling,
  getDialectImperativeVariantForms,
  getDialectPrimaryImperativeForms,
  getDialectPrimaryImperativeDisplayForms,
  getDialectVariantRows,
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
import { getEntryPath } from "@/lib/locale";

import { DictionaryEntryDialectForms } from "./DictionaryEntryDialectForms";
import { DictionaryEntryHeading } from "./DictionaryEntryHeading";
import {
  getFormSymbolTooltips,
  getMainGenderMarkers,
  getRelationTypeLabel,
  getUniqueDisplayNotes,
} from "./dictionaryEntryHelpers";
import { DictionaryEntryMeanings } from "./DictionaryEntryMeanings";
import { DictionaryEntryMorphology } from "./DictionaryEntryMorphology";
import { DictionaryEntryNotes } from "./DictionaryEntryNotes";
import { DictionaryEntryRelations } from "./DictionaryEntryRelations";

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

  const primaryForms = primaryDialectKey
    ? entry.dialects[primaryDialectKey]
    : undefined;

  const remainingDialects = Object.entries(entry.dialects).filter(
    (dialectEntry): dialectEntry is DialectEntryTuple =>
      dialectEntry[0] !== primaryDialectKey && Boolean(dialectEntry[1]),
  );
  const formSymbolTooltips = getFormSymbolTooltips(t);
  const grammarAbbreviationTooltips = getGrammarAbbreviationTooltips(t);
  const mainGenderMarkers = getMainGenderMarkers(getEntryNounGender(entry), t);

  const primaryPartOfSpeech = getPrimaryEntryPartOfSpeech(entry);
  const partOfSpeechLabel = getPartOfSpeechLabel(primaryPartOfSpeech, t);
  const partOfSpeechCode = getPartOfSpeechCode(primaryPartOfSpeech);
  const showInlinePos = partOfSpeechCode !== "" && partOfSpeechCode !== "n";
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
  const handleDialectViewChange = (dialect: DictionaryDialectCode) => {
    setViewDialect(dialect);

    if (isDetailView) {
      articleRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

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
      <DictionaryEntryHeading
        actions={actions}
        compoundRelations={compoundRelations}
        entry={entry}
        formSymbolTooltips={formSymbolTooltips}
        headingLevel={headingLevel}
        isDetailView={isDetailView}
        language={language}
        linkHeadword={linkHeadword}
        primaryDialectKey={primaryDialectKey}
        primaryForms={primaryForms}
        query={query}
        t={t}
        viewDialect={viewDialect}
      />

      <div className="mb-6 h-px w-full bg-line" />

      <div className="mb-6 space-y-3">
        <DictionaryEntryMeanings
          dialectMeanings={displayDialectMeanings}
          genderedMeanings={genderedMeanings}
          grammarAbbreviationTooltips={grammarAbbreviationTooltips}
          isDetailView={isDetailView}
          localizedSenseRows={localizedSenseRows}
          query={query}
          t={t}
        />
        <DictionaryEntryNotes
          grammarAbbreviationTooltips={grammarAbbreviationTooltips}
          isDetailView={isDetailView}
          notes={translationNotes}
          query={query}
          t={t}
        />
        <DictionaryEntryRelations
          formSymbolTooltips={formSymbolTooltips}
          grammarAbbreviationTooltips={grammarAbbreviationTooltips}
          isDetailView={isDetailView}
          query={query}
          relationRows={relationRows}
          t={t}
        />
        <DictionaryEntryMorphology
          formSymbolTooltips={formSymbolTooltips}
          grammarAbbreviationTooltips={grammarAbbreviationTooltips}
          greekEquivalents={greekEquivalents}
          greekSources={greekSources}
          hasAnnotatedPrimaryImperativeForms={
            hasAnnotatedPrimaryImperativeForms
          }
          hasPrimaryImperativeForms={hasPrimaryImperativeForms}
          primaryDialectKey={primaryDialectKey}
          primaryImperativeDisplayForms={primaryImperativeDisplayForms}
          primaryImperativeForms={primaryImperativeForms}
          query={query}
          t={t}
          variantRows={variantRows}
        />
      </div>

      {actions && !isDetailView ? (
        <div className="mt-7 border-t border-line pt-5">{actions}</div>
      ) : null}

      <DictionaryEntryDialectForms
        entry={entry}
        formSymbolTooltips={formSymbolTooltips}
        mainGenderMarkers={mainGenderMarkers}
        onDialectViewChange={handleDialectViewChange}
        partOfSpeechCode={partOfSpeechCode}
        partOfSpeechLabel={partOfSpeechLabel}
        query={query}
        remainingDialects={remainingDialects}
        showInlinePos={showInlinePos}
        t={t}
      />
    </article>
  );
}
