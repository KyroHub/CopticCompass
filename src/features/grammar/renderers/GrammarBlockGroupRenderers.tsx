"use client";

import CopticText from "@/components/CopticText";
import type { GrammarLessonBundle } from "@/content/grammar/schema";
import { ExerciseForm } from "@/features/grammar/components/ExerciseForm";
import { GrammarLessonCard } from "@/features/grammar/components/GrammarLessonPrimitives";
import { getEntryPath } from "@/lib/locale";
import type { Language } from "@/types/i18n";

import type { GrammarBlockRenderHelperProps } from "./grammarBlockRendererShared";

type GrammarExerciseGroupBlockProps = GrammarBlockRenderHelperProps & {
  exerciseIds: readonly string[];
};

type GrammarExampleGroupBlockProps = GrammarBlockRenderHelperProps & {
  columns?: 1 | 2;
  exampleIds: readonly string[];
};

/**
 * Renders the grouped exercise and example helper blocks referenced from the
 * structured grammar lesson content model.
 */
function renderExampleCopticText(text: string) {
  if (text.startsWith("Ø-")) {
    return (
      <>
        <sup className="text-sm font-semibold not-italic">Ø</sup>-
        <CopticText text={text.slice(2)} query="" />
      </>
    );
  }

  return <CopticText text={text} query="" />;
}

function renderDictionaryEntryHref(
  dictionaryEntryId: string,
  language: Language,
) {
  return getEntryPath(encodeURIComponent(dictionaryEntryId), language);
}

function renderExampleCopticSegments(
  coptic: string,
  dictionaryEntryId: string | undefined,
  index: number,
  language: Language,
) {
  const content = renderExampleCopticText(coptic);

  if (!dictionaryEntryId) {
    return <span key={`segment-${index}`}>{content}</span>;
  }

  return (
    <a
      key={`segment-${index}`}
      href={renderDictionaryEntryHref(dictionaryEntryId, language)}
      target="_blank"
      rel="noreferrer noopener"
      data-dictionary-entry-id={dictionaryEntryId}
      className="no-underline"
    >
      {content}
    </a>
  );
}

function getExerciseGroupItems(
  lessonBundle: GrammarLessonBundle | undefined,
  exerciseIds: readonly string[],
) {
  return (
    lessonBundle?.exercises.filter((exercise) =>
      exerciseIds.includes(exercise.id),
    ) ?? []
  );
}

function getExampleGroupItems(
  lessonBundle: GrammarLessonBundle | undefined,
  exampleIds: readonly string[],
) {
  return (
    lessonBundle?.examples.filter((example) =>
      exampleIds.includes(example.id),
    ) ?? []
  );
}

function normalizeTitleForComparison(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function shouldUseParentSectionExerciseChrome({
  currentSectionId,
  exercise,
  language,
  lessonBundle,
}: {
  currentSectionId: string | undefined;
  exercise: NonNullable<GrammarLessonBundle["exercises"][number]>;
  language: Language;
  lessonBundle: GrammarLessonBundle | undefined;
}) {
  if (!currentSectionId || exercise.sectionId !== currentSectionId) {
    return false;
  }

  const parentSection = lessonBundle?.lesson.sections.find(
    (section) => section.id === currentSectionId,
  );

  if (!parentSection) {
    return false;
  }

  return (
    normalizeTitleForComparison(exercise.title[language]) ===
    normalizeTitleForComparison(parentSection.title[language])
  );
}

/**
 * Resolves and renders the exercise-group block referenced by a lesson
 * document.
 */
export function GrammarExerciseGroupBlock({
  currentSectionId,
  exerciseIds,
  language,
  lessonBundle,
  renderBlocks,
}: GrammarExerciseGroupBlockProps) {
  const exercises = getExerciseGroupItems(lessonBundle, exerciseIds);

  if (exercises.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {exercises.map((exercise) => {
        const useParentSectionChrome = shouldUseParentSectionExerciseChrome({
          currentSectionId,
          exercise,
          language,
          lessonBundle,
        });
        const exerciseContent = (
          <div>
            {useParentSectionChrome ? null : (
              <h3 className="text-lg font-semibold text-ink">
                {exercise.title[language]}
              </h3>
            )}
            <div
              className={
                useParentSectionChrome
                  ? "text-sm leading-7 text-muted"
                  : "mt-2 text-sm leading-7 text-muted"
              }
            >
              {renderBlocks(exercise.prompt[language])}
            </div>
            <ExerciseForm
              lessonSlug={lessonBundle?.lesson.slug ?? exercise.lessonId}
              exerciseId={exercise.id}
              language={language}
              questions={exercise.items.map((item) => ({
                id: item.id,
                prompt: item.prompt[language],
                minLength: item.answerSchema?.minLength,
                maxLength: item.answerSchema?.maxLength,
              }))}
            />
          </div>
        );

        if (useParentSectionChrome && exercises.length === 1) {
          return <div key={exercise.id}>{exerciseContent}</div>;
        }

        return (
          <GrammarLessonCard
            key={exercise.id}
            tone="coptic"
            className="space-y-4 p-5"
          >
            {exerciseContent}
          </GrammarLessonCard>
        );
      })}
    </div>
  );
}

/**
 * Resolves and renders the example-group block referenced by a lesson
 * document, including the optional two-column layout.
 */
export function GrammarExampleGroupBlock({
  columns = 1,
  exampleIds,
  language,
  lessonBundle,
}: GrammarExampleGroupBlockProps) {
  const examples = getExampleGroupItems(lessonBundle, exampleIds);

  if (examples.length === 0) {
    return null;
  }

  const renderExampleContent = (example: (typeof examples)[number]) => {
    if (example.copticSegments && example.copticSegments.length > 0) {
      return example.copticSegments.map((segment, segmentIndex) =>
        renderExampleCopticSegments(
          segment.text,
          segment.dictionaryEntryId,
          segmentIndex,
          language,
        ),
      );
    }

    if (
      example.dictionaryRefs.length === 1 &&
      !/\s/.test(example.coptic.trim())
    ) {
      return (
        <a
          href={renderDictionaryEntryHref(
            example.dictionaryRefs[0] ?? "",
            language,
          )}
          target="_blank"
          rel="noreferrer noopener"
          data-dictionary-entry-id={example.dictionaryRefs[0]}
          className="no-underline"
        >
          {renderExampleCopticText(example.coptic)}
        </a>
      );
    }

    return renderExampleCopticText(example.coptic);
  };

  const renderExampleList = (items: typeof examples) => (
    <ul className="space-y-3">
      {items.map((example) => (
        <li key={example.id} className="leading-7 text-muted">
          <span className="text-xl text-coptic">
            {renderExampleContent(example)}
          </span>
          <span className="ml-3">{example.translation[language]}</span>
        </li>
      ))}
    </ul>
  );

  if (columns === 2 && examples.length > 1) {
    const splitIndex = Math.ceil(examples.length / 2);
    const firstColumn = examples.slice(0, splitIndex);
    const secondColumn = examples.slice(splitIndex);

    return (
      <GrammarLessonCard className="space-y-3">
        <div className="grid gap-6 md:grid-cols-2 md:gap-8">
          <div>{renderExampleList(firstColumn)}</div>
          <div>{renderExampleList(secondColumn)}</div>
        </div>
      </GrammarLessonCard>
    );
  }

  return (
    <GrammarLessonCard className="space-y-3">
      {renderExampleList(examples)}
    </GrammarLessonCard>
  );
}
