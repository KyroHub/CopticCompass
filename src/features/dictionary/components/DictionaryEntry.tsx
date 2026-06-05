"use client";

import { ChevronDown } from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";

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
import type { DictionaryResultMode } from "@/features/dictionary/hooks/useDictionaryResultMode";
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
  resultMode?: DictionaryResultMode;
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
  resultMode = "compact",
  selectedDialect = DEFAULT_DICTIONARY_DIALECT_FILTER,
  headingLevel = "h2",
  linkHeadword = true,
}: DictionaryEntryCardProps) {
  const { language, t } = useLanguage();
  const detailsId = useId();
  const articleRef = useRef<HTMLElement>(null);
  const [viewDialect, setViewDialect] =
    useState<EntryDialectSelection>(selectedDialect);
  const [prevSelectedDialect, setPrevSelectedDialect] =
    useState<DialectFilter>(selectedDialect);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  if (selectedDialect !== prevSelectedDialect) {
    setPrevSelectedDialect(selectedDialect);
    setViewDialect(selectedDialect);
  }

  const isDetailView = headingLevel === "h1";
  const isCompactResult = !isDetailView && resultMode === "compact";
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
  const hasLongTranslationPreview =
    !isDetailView &&
    (genderedMeanings.length > 2 ||
      localizedSenseRows.length > 2 ||
      displayDialectMeanings.length > 1 ||
      localizedSenseRows.some(
        (group) =>
          (group.genderedRows?.length ?? 0) > 2 || group.meanings.length > 2,
      ) ||
      displayDialectMeanings.some((row) => row.meanings.length > 2));
  const canShowFullResultDetails =
    isDetailView || resultMode === "detailed" || isDetailsOpen;
  const detailSectionCount = [
    hasLongTranslationPreview,
    translationNotes.length > 0,
    relationRows.length > 0,
    hasPrimaryImperativeForms,
    variantRows.length > 0,
    greekSources.length > 0,
    greekEquivalents.length > 0,
    remainingDialects.length > 0,
  ].filter(Boolean).length;
  const hasSupplementalDetails =
    hasLongTranslationPreview ||
    translationNotes.length > 0 ||
    relationRows.length > 0 ||
    hasPrimaryImperativeForms ||
    variantRows.length > 0 ||
    greekSources.length > 0 ||
    greekEquivalents.length > 0 ||
    remainingDialects.length > 0;
  const detailSectionCountLabel = `${detailSectionCount} ${
    detailSectionCount === 1
      ? t("entry.detailSection")
      : t("entry.detailSections")
  }`;
  const supplementalDetails = (
    <>
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
        showRelations={canShowFullResultDetails}
        t={t}
      />
      <DictionaryEntryMorphology
        formSymbolTooltips={formSymbolTooltips}
        grammarAbbreviationTooltips={grammarAbbreviationTooltips}
        greekEquivalents={greekEquivalents}
        greekSources={greekSources}
        hasAnnotatedPrimaryImperativeForms={hasAnnotatedPrimaryImperativeForms}
        hasPrimaryImperativeForms={hasPrimaryImperativeForms}
        primaryDialectKey={primaryDialectKey}
        primaryImperativeDisplayForms={primaryImperativeDisplayForms}
        primaryImperativeForms={primaryImperativeForms}
        query={query}
        t={t}
        variantRows={variantRows}
      />
      <DictionaryEntryDialectForms
        compact={isCompactResult}
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
    </>
  );
  let supplementalContent: ReactNode = null;
  let articlePaddingClassName = "p-4 sm:p-5 md:p-6";

  if (isDetailView) {
    articlePaddingClassName = "p-8 md:p-10";
  } else if (resultMode === "detailed") {
    articlePaddingClassName = "p-5 sm:p-6 md:p-7";
  }

  if (isDetailView || resultMode === "detailed") {
    supplementalContent = (
      <div className="mb-6 space-y-3">{supplementalDetails}</div>
    );
  } else if (isCompactResult && hasSupplementalDetails) {
    supplementalContent = (
      <div className="mt-4 border-t border-line pt-3">
        <button
          type="button"
          aria-controls={detailsId}
          aria-expanded={isDetailsOpen}
          aria-label={`${isDetailsOpen ? t("entry.hideFullEntry") : t("entry.showFullEntry")} (${detailSectionCountLabel})`}
          onClick={() => setIsDetailsOpen((current) => !current)}
          className="flex h-10 w-full cursor-pointer select-none items-center justify-between gap-3 rounded-lg px-2 text-left text-sm font-semibold text-muted transition-colors hover:bg-elevated/70 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span>
              {isDetailsOpen
                ? t("entry.hideFullEntry")
                : t("entry.showFullEntry")}
            </span>
            <Badge tone="surface" size="xs" className="min-h-6">
              {detailSectionCountLabel}
            </Badge>
          </span>
          <ChevronDown
            className={cx(
              "h-4 w-4 shrink-0 transition-transform",
              isDetailsOpen && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>
        {isDetailsOpen ? (
          <div id={detailsId} className="mt-3 space-y-3">
            {supplementalDetails}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <article
      ref={articleRef}
      className={surfacePanelClassName({
        rounded: "lg",
        interactive: linkHeadword,
        className: cx(
          "group relative overflow-hidden",
          linkHeadword && "hover:border-accent/40 hover:bg-surface",
          articlePaddingClassName,
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

      <div
        className={cx("h-px w-full bg-line", isDetailView ? "mb-6" : "mb-4")}
      />

      <div className={cx(isDetailView ? "mb-6 space-y-3" : "mb-4 space-y-2")}>
        <DictionaryEntryMeanings
          dialectMeanings={displayDialectMeanings}
          genderedMeanings={genderedMeanings}
          grammarAbbreviationTooltips={grammarAbbreviationTooltips}
          compactPreview={isCompactResult}
          isDetailView={isDetailView}
          limitPreview={isCompactResult && !isDetailsOpen}
          localizedSenseRows={localizedSenseRows}
          query={query}
          t={t}
        />
      </div>

      {supplementalContent}

      {actions && !isDetailView ? (
        <div className="mt-7 border-t border-line pt-5">{actions}</div>
      ) : null}
    </article>
  );
}
