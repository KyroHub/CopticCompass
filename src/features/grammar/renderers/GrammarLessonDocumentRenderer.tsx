import type {
  GrammarLessonBundle,
  GrammarSectionDocument,
} from "@/content/grammar/schema";
import { GrammarAbbreviation } from "@/features/grammar/components/GrammarAbbreviation";
import {
  GrammarLessonEndnotes,
  GrammarLessonSection,
} from "@/features/grammar/components/GrammarLessonPrimitives";
import {
  GrammarLessonConceptGlossary as GrammarLessonConceptGlossarySection,
  GrammarLessonBibliography as GrammarLessonBibliographySection,
} from "@/features/grammar/components/GrammarLessonSemantics";
import {
  getGrammarLessonAbbreviationAnchorId,
  getGrammarLessonAbbreviationSectionId,
} from "@/features/grammar/lib/grammarPresentation";
import type { Language } from "@/types/i18n";

import { GrammarBlockRenderer } from "./GrammarBlockRenderer";

import type { ReactNode } from "react";

type GrammarLessonDocumentRendererProps = {
  lessonBundle: GrammarLessonBundle;
  language: Language;
  renderSectionFooter?: (section: GrammarSectionDocument) => ReactNode;
};

/**
 * Renders the standard abbreviation appendix that appears after the lesson
 * sections and semantic reference material.
 */
function GrammarLessonAbbreviationAppendix({
  lessonId,
  language,
  index,
}: {
  lessonId: string;
  language: Language;
  index: number;
}) {
  const title =
    language === "en"
      ? "Abbreviations and symbols used in this lesson"
      : "Afkortingen en symbolen in deze les";
  const intro =
    language === "en"
      ? "These short labels and symbols appear throughout the lesson tables and explanations."
      : "Deze korte labels en symbolen komen doorheen de tabellen en uitleg van de les voor.";
  const entries = [
    {
      key: "masculine",
      label: (
        <GrammarAbbreviation className="small-caps">m</GrammarAbbreviation>
      ),
      description: language === "en" ? "masculine" : "mannelijk",
    },
    {
      key: "feminine",
      label: (
        <GrammarAbbreviation className="small-caps">
          {language === "en" ? "f" : "v"}
        </GrammarAbbreviation>
      ),
      description: language === "en" ? "feminine" : "vrouwelijk",
    },
    {
      key: "singular",
      label: (
        <GrammarAbbreviation className="small-caps">s</GrammarAbbreviation>
      ),
      description: language === "en" ? "singular" : "enkelvoud",
    },
    {
      key: "plural",
      label: (
        <GrammarAbbreviation className="small-caps">p</GrammarAbbreviation>
      ),
      description: language === "en" ? "plural" : "meervoud",
    },
    {
      key: "ipa",
      label: <GrammarAbbreviation>/.../</GrammarAbbreviation>,
      description:
        language === "en" ? "pronunciation in the IPA" : "uitspraak in het IPA",
    },
    {
      key: "nm",
      label: (
        <GrammarAbbreviation>
          N
          <sup>
            <em className="small-caps">m</em>
          </sup>
        </GrammarAbbreviation>
      ),
      description: language === "en" ? "proper noun" : "eigennaam",
    },
    {
      key: "enclitic-particle",
      label: (
        <GrammarAbbreviation>
          <span>≡</span>
          <span className="font-coptic">ⲁⲃⲅ</span>
        </GrammarAbbreviation>
      ),
      description:
        language === "en" ? "enclitic particle" : "enclitisch partikel",
    },
  ] as const;

  return (
    <GrammarLessonSection
      id={getGrammarLessonAbbreviationSectionId(lessonId)}
      index={index}
      title={title}
      defaultOpen={false}
      openOnHashMatch
    >
      <div className="space-y-4">
        <p className="leading-7 text-muted">{intro}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {entries.map((entry) => (
            <article
              key={entry.key}
              id={getGrammarLessonAbbreviationAnchorId(lessonId, entry.key)}
              className="app-anchor-inline rounded-lg border border-line bg-elevated/70 px-4 py-3"
            >
              <h3 className="text-base font-semibold text-ink">
                {entry.label}
              </h3>
              <p className="mt-2 text-sm leading-7 text-muted">
                {entry.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </GrammarLessonSection>
  );
}

/**
 * Orders the lesson sections according to the published section-order list.
 */
function getOrderedSections(
  lessonBundle: GrammarLessonBundle,
): GrammarSectionDocument[] {
  const sectionsById = new Map(
    lessonBundle.lesson.sections.map(
      (section) => [section.id, section] as const,
    ),
  );

  return lessonBundle.lesson.sectionOrder
    .map((sectionId) => sectionsById.get(sectionId))
    .filter(
      (section): section is GrammarSectionDocument => section !== undefined,
    );
}

/**
 * Renders the full published grammar lesson document, including sections,
 * glossary, bibliography, abbreviation appendix, and endnotes.
 */
export function GrammarLessonDocumentRenderer({
  lessonBundle,
  language,
  renderSectionFooter,
}: GrammarLessonDocumentRendererProps) {
  const orderedSections = getOrderedSections(lessonBundle);
  const endnotesTitle = language === "en" ? "Endnotes" : "Eindnoten";
  const appendixIndex = orderedSections.length + 1;

  return (
    <div className="space-y-4 font-sans leading-relaxed text-ink">
      {orderedSections.map((section, index) => (
        <GrammarLessonSection
          key={section.id}
          id={section.id}
          index={index + 1}
          title={section.title[language]}
          footer={renderSectionFooter?.(section)}
        >
          <GrammarBlockRenderer
            blocks={section.blocks[language]}
            currentSectionId={section.id}
            language={language}
            lessonBundle={lessonBundle}
          />
        </GrammarLessonSection>
      ))}

      <GrammarLessonConceptGlossarySection
        lessonBundle={lessonBundle}
        language={language}
      />
      <GrammarLessonBibliographySection
        lessonBundle={lessonBundle}
        language={language}
      />
      <GrammarLessonAbbreviationAppendix
        lessonId={lessonBundle.lesson.id}
        language={language}
        index={appendixIndex}
      />
      <GrammarLessonEndnotes title={endnotesTitle} />
    </div>
  );
}
