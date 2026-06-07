import { Badge } from "@/components/Badge";
import { surfacePanelClassName } from "@/components/SurfacePanel";
import type { GrammarLessonBundle } from "@/content/grammar/schema";
import {
  getGrammarConceptAnchorId,
  getGrammarSourceAnchorId,
  getOrderedLessonConcepts,
  getOrderedLessonSources,
} from "@/features/grammar/lib/grammarPresentation";
import { GrammarBlockRenderer } from "@/features/grammar/renderers/GrammarBlockRenderer";
import { getPublicationPath } from "@/features/publications/lib/publications";
import { cx } from "@/lib/classes";
import type { Language } from "@/types/i18n";

import type { ReactNode } from "react";

type GrammarLessonSemanticsProps = {
  lessonBundle: GrammarLessonBundle;
  language: Language;
  className?: string;
};

function getConceptRelations(
  lessonBundle: GrammarLessonBundle,
  relatedConceptIds: readonly string[],
) {
  const conceptMap = new Map(
    lessonBundle.concepts.map((concept) => [concept.id, concept] as const),
  );

  return relatedConceptIds
    .map((conceptId) => conceptMap.get(conceptId))
    .filter(
      (concept): concept is GrammarLessonBundle["concepts"][number] =>
        concept !== undefined,
    );
}

function SemanticPanel({
  title,
  eyebrow,
  count,
  className,
  density = "default",
  children,
}: {
  title: string;
  eyebrow: string;
  count?: number;
  className?: string;
  density?: "default" | "compact";
  children: ReactNode;
}) {
  return (
    <section
      className={surfacePanelClassName({
        shadow: "soft",
        className: cx("overflow-hidden", className),
      })}
    >
      <div
        className={cx(
          "border-b border-line",
          density === "compact" ? "px-4 py-3" : "px-5 py-4",
        )}
      >
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          {eyebrow}
        </p>
        <div className="flex items-center justify-between gap-4">
          <h2
            className={cx(
              "font-semibold text-ink",
              density === "compact" ? "text-base" : "text-lg",
            )}
          >
            {title}
          </h2>
          {typeof count === "number" ? (
            <span className="text-[11px] font-semibold tracking-[0.12em] text-muted">
              {String(count).padStart(2, "0")}
            </span>
          ) : null}
        </div>
      </div>
      <div className={density === "compact" ? "px-4 py-3.5" : "px-5 py-4"}>
        {children}
      </div>
    </section>
  );
}

export function GrammarLessonConceptSummary({
  lessonBundle,
  language,
  className,
}: GrammarLessonSemanticsProps) {
  const concepts = getOrderedLessonConcepts(lessonBundle);

  if (concepts.length === 0) {
    return null;
  }

  return (
    <SemanticPanel
      className={className}
      density="compact"
      eyebrow={language === "en" ? "Glossary" : "Begrippen"}
      title={language === "en" ? "Key concepts" : "Kernbegrippen"}
      count={concepts.length}
    >
      <div className="flex flex-wrap gap-1.5">
        {concepts.map((concept) => (
          <a
            key={concept.id}
            href={`#${getGrammarConceptAnchorId(concept.id)}`}
            className="inline-flex items-center rounded-full border border-coptic/20 bg-coptic-soft/70 px-2.5 py-1 text-xs font-medium text-coptic transition-colors hover:border-coptic/35 hover:bg-coptic-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coptic/30"
          >
            {concept.title[language]}
          </a>
        ))}
      </div>
    </SemanticPanel>
  );
}

export function GrammarLessonConceptGlossary({
  lessonBundle,
  language,
  className,
}: GrammarLessonSemanticsProps) {
  const concepts = getOrderedLessonConcepts(lessonBundle);

  if (concepts.length === 0) {
    return null;
  }

  return (
    <SemanticPanel
      className={className}
      eyebrow={language === "en" ? "Glossary" : "Begrippen"}
      title={language === "en" ? "Concept glossary" : "Begrippenlijst"}
      count={concepts.length}
    >
      <div className="space-y-5">
        {concepts.map((concept) => {
          const visibleTags = concept.tags
            .filter((tag) => !tag.startsWith("lesson-"))
            .slice(0, 2);
          const relatedConcepts = getConceptRelations(
            lessonBundle,
            concept.relatedConceptRefs,
          );

          return (
            <article
              key={concept.id}
              id={getGrammarConceptAnchorId(concept.id)}
              className="app-anchor-inline rounded-lg border border-line bg-elevated/70 px-4 py-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold text-ink">
                  {concept.title[language]}
                </h3>
                {visibleTags.map((tag) => (
                  <Badge key={tag} tone="neutral" size="xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              <GrammarBlockRenderer
                blocks={concept.definition[language]}
                language={language}
                lessonBundle={lessonBundle}
                className="mt-3"
              />

              {relatedConcepts.length > 0 ? (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    {language === "en"
                      ? "Related concepts"
                      : "Verwante begrippen"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {relatedConcepts.map((relatedConcept) => (
                      <a
                        key={relatedConcept.id}
                        href={`#${getGrammarConceptAnchorId(relatedConcept.id)}`}
                        className="inline-flex items-center rounded-full border border-line bg-surface/80 px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:border-coptic/35 hover:text-coptic"
                      >
                        {relatedConcept.title[language]}
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </SemanticPanel>
  );
}

export function GrammarLessonBibliography({
  lessonBundle,
  language,
  className,
}: GrammarLessonSemanticsProps) {
  const sources = getOrderedLessonSources(lessonBundle);
  const rightsStatement = lessonBundle.lesson.rights?.statement[language];

  if (sources.length === 0 && !rightsStatement) {
    return null;
  }

  return (
    <SemanticPanel
      className={className}
      eyebrow={language === "en" ? "Bibliography" : "Bibliografie"}
      title={language === "en" ? "Sources" : "Bronnen"}
      count={sources.length > 0 ? sources.length : undefined}
    >
      {rightsStatement ? (
        <p className="mb-4 text-sm leading-7 text-muted">{rightsStatement}</p>
      ) : null}

      {sources.length > 0 ? (
        <ol className="space-y-4">
          {sources.map((source) => {
            const sourceHref = source.publicationId
              ? getPublicationPath(source.publicationId, language)
              : source.url;

            return (
              <li
                key={source.id}
                id={getGrammarSourceAnchorId(source.id)}
                className="app-anchor-inline rounded-lg border border-line bg-elevated/70 px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    {sourceHref ? (
                      <a
                        href={sourceHref}
                        className="text-base font-semibold text-coptic underline underline-offset-4 transition-colors hover:text-ink"
                      >
                        {source.title}
                      </a>
                    ) : (
                      <p className="text-base font-semibold text-ink">
                        {source.title}
                      </p>
                    )}
                    {source.subtitle ? (
                      <p className="mt-1 text-sm text-muted">
                        {source.subtitle}
                      </p>
                    ) : null}
                    {source.author || source.year ? (
                      <p className="mt-2 text-sm text-muted">
                        {[source.author, source.year]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    ) : null}
                  </div>
                  {source.comingSoon ? (
                    <Badge tone="surface" size="xs">
                      {language === "en" ? "Coming soon" : "Binnenkort"}
                    </Badge>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}
    </SemanticPanel>
  );
}
