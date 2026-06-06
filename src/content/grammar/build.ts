import { enrichGrammarDatasetSnapshotWithDictionaryLinks } from "./dictionary-links.ts";
import { getGrammarDatasetSnapshot } from "./registry.ts";

import type {
  GrammarDatasetSnapshot,
  GrammarManifest,
  GrammarLessonBundle,
  GrammarLessonDocument,
  GrammarLessonIndexItem,
} from "./schema.ts";

/**
 * Collects the lesson-local bundle used by public lesson JSON, including
 * section-level exercises that may not be listed directly on the lesson root.
 */
function createGrammarLessonBundleFromSnapshot(
  lesson: GrammarLessonDocument,
  snapshot: GrammarDatasetSnapshot,
): GrammarLessonBundle {
  const enrichedLesson =
    snapshot.lessons.find((candidate) => candidate.id === lesson.id) ?? lesson;

  const exerciseIds = new Set(enrichedLesson.exerciseRefs);
  const sectionExerciseIds = new Set(
    enrichedLesson.sections.flatMap((section) => section.exerciseRefs),
  );
  const bundledExercises = snapshot.exercises.filter(
    (exercise) =>
      exerciseIds.has(exercise.id) || sectionExerciseIds.has(exercise.id),
  );
  const bundledFlashcardSeeds = snapshot.flashcardSeeds.filter(
    (seed) => seed.lessonId === enrichedLesson.id,
  );

  return {
    lesson: enrichedLesson,
    concepts: snapshot.concepts.filter((concept) =>
      enrichedLesson.conceptRefs.includes(concept.id),
    ),
    examples: snapshot.examples.filter(
      (example) => example.lessonId === enrichedLesson.id,
    ),
    exercises: bundledExercises,
    flashcardSeeds: bundledFlashcardSeeds,
    footnotes: snapshot.footnotes.filter(
      (footnote) => footnote.lessonId === enrichedLesson.id,
    ),
    sources: snapshot.sources.filter((source) =>
      enrichedLesson.sourceRefs.includes(source.id),
    ),
  };
}

export function createGrammarLessonBundle(
  lesson: GrammarLessonDocument,
  snapshot: GrammarDatasetSnapshot = getGrammarDatasetSnapshot(),
): GrammarLessonBundle {
  return createGrammarLessonBundleFromSnapshot(
    lesson,
    enrichGrammarDatasetSnapshotWithDictionaryLinks(snapshot),
  );
}

function createPublishedGrammarManifest(
  manifest: GrammarManifest,
  lessonIds: ReadonlySet<string>,
): GrammarManifest {
  return {
    ...manifest,
    lessons: manifest.lessons.filter((lesson) => lessonIds.has(lesson.id)),
  };
}

function createPublishedLessonIndex(
  lessons: readonly GrammarLessonIndexItem[],
) {
  return lessons.filter((lesson) => lesson.status === "published");
}

/**
 * Prunes the full authoring snapshot down to published lessons and then removes
 * dangling concept, source, exercise, example, footnote, and flashcard refs.
 */
export function createPublishedGrammarDatasetSnapshot(
  snapshot: GrammarDatasetSnapshot = getGrammarDatasetSnapshot(),
): GrammarDatasetSnapshot {
  const publishedManifestLessons = createPublishedLessonIndex(
    snapshot.manifest.lessons,
  );
  const publishedLessonIds = new Set(
    publishedManifestLessons.map((lesson) => lesson.id),
  );

  const publishedExamples = snapshot.examples.filter((example) =>
    publishedLessonIds.has(example.lessonId),
  );
  const publishedExampleIds = new Set(
    publishedExamples.map((example) => example.id),
  );

  const publishedExercises = snapshot.exercises.filter((exercise) =>
    publishedLessonIds.has(exercise.lessonId),
  );
  const publishedExerciseIds = new Set(
    publishedExercises.map((exercise) => exercise.id),
  );

  const publishedFootnotes = snapshot.footnotes.filter((footnote) =>
    publishedLessonIds.has(footnote.lessonId),
  );
  const publishedFlashcardSeeds = snapshot.flashcardSeeds.filter((seed) =>
    publishedLessonIds.has(seed.lessonId),
  );

  const publishedLessons = snapshot.lessons.filter((lesson) =>
    publishedLessonIds.has(lesson.id),
  );

  const publishedConceptIds = new Set(
    publishedLessons.flatMap((lesson) => lesson.conceptRefs),
  );
  const publishedConcepts = snapshot.concepts
    .filter(
      (concept) =>
        publishedConceptIds.has(concept.id) ||
        concept.lessonRefs.some((lessonId) => publishedLessonIds.has(lessonId)),
    )
    .map((concept) => ({
      ...concept,
      lessonRefs: concept.lessonRefs.filter((lessonId) =>
        publishedLessonIds.has(lessonId),
      ),
    }));
  const normalizedConceptIds = new Set(
    publishedConcepts.map((concept) => concept.id),
  );

  const publishedSourceIds = new Set(
    [
      ...publishedLessons.flatMap((lesson) => lesson.sourceRefs),
      ...publishedConcepts.flatMap((concept) => concept.sourceRefs),
      ...publishedFootnotes.flatMap((footnote) => footnote.sourceRefs),
    ].filter(Boolean),
  );
  const publishedSources = snapshot.sources.filter((source) =>
    publishedSourceIds.has(source.id),
  );
  const normalizedSourceIds = new Set(
    publishedSources.map((source) => source.id),
  );

  return {
    manifest: createPublishedGrammarManifest(
      snapshot.manifest,
      publishedLessonIds,
    ),
    lessons: publishedLessons.map((lesson) => ({
      ...lesson,
      conceptRefs: lesson.conceptRefs.filter((conceptId) =>
        normalizedConceptIds.has(conceptId),
      ),
      exerciseRefs: lesson.exerciseRefs.filter((exerciseId) =>
        publishedExerciseIds.has(exerciseId),
      ),
      sourceRefs: lesson.sourceRefs.filter((sourceId) =>
        normalizedSourceIds.has(sourceId),
      ),
      sections: lesson.sections.map((section) => ({
        ...section,
        conceptRefs: section.conceptRefs.filter((conceptId) =>
          normalizedConceptIds.has(conceptId),
        ),
        exampleRefs: section.exampleRefs.filter((exampleId) =>
          publishedExampleIds.has(exampleId),
        ),
        exerciseRefs: section.exerciseRefs.filter((exerciseId) =>
          publishedExerciseIds.has(exerciseId),
        ),
      })),
    })),
    concepts: publishedConcepts.map((concept) => ({
      ...concept,
      sourceRefs: concept.sourceRefs.filter((sourceId) =>
        normalizedSourceIds.has(sourceId),
      ),
    })),
    examples: publishedExamples.map((example) => ({
      ...example,
      conceptRefs: example.conceptRefs.filter((conceptId) =>
        normalizedConceptIds.has(conceptId),
      ),
    })),
    exercises: publishedExercises,
    flashcardSeeds: publishedFlashcardSeeds.map((seed) => ({
      ...seed,
      conceptRefs: seed.conceptRefs.filter((conceptId) =>
        normalizedConceptIds.has(conceptId),
      ),
      sourceRefs: seed.sourceRefs.filter((sourceId) =>
        normalizedSourceIds.has(sourceId),
      ),
    })),
    footnotes: publishedFootnotes.map((footnote) => ({
      ...footnote,
      sourceRefs: footnote.sourceRefs.filter((sourceId) =>
        normalizedSourceIds.has(sourceId),
      ),
    })),
    sources: publishedSources,
  };
}

/**
 * Builds the compact public export shape after dictionary-link enrichment and
 * publish filtering, keyed by lesson slug for stable static file output.
 */
export function createGrammarExportSnapshot(
  snapshot: GrammarDatasetSnapshot = getGrammarDatasetSnapshot(),
) {
  const enrichedSnapshot =
    enrichGrammarDatasetSnapshotWithDictionaryLinks(snapshot);
  const publishedSnapshot =
    createPublishedGrammarDatasetSnapshot(enrichedSnapshot);

  return {
    manifest: publishedSnapshot.manifest,
    lessons: Object.fromEntries(
      publishedSnapshot.lessons.map((lesson) => [
        lesson.slug,
        createGrammarLessonBundleFromSnapshot(lesson, publishedSnapshot),
      ]),
    ),
  };
}

/**
 * Enumerates every static grammar JSON file produced by the export script,
 * keeping the shared collection files and per-lesson bundles in one manifest.
 */
export function createGrammarStaticExportFiles(
  snapshot: GrammarDatasetSnapshot = getGrammarDatasetSnapshot(),
): GrammarStaticExportFile[] {
  const enrichedSnapshot =
    enrichGrammarDatasetSnapshotWithDictionaryLinks(snapshot);
  const publishedSnapshot =
    createPublishedGrammarDatasetSnapshot(enrichedSnapshot);
  const exportSnapshot = createGrammarExportSnapshot(enrichedSnapshot);
  const files: GrammarStaticExportFile[] = [
    {
      outputPath: "grammar/v1/manifest.json",
      payload: exportSnapshot.manifest,
    },
    {
      outputPath: "grammar/v1/concepts.json",
      payload: createGrammarVersionedExport(
        exportSnapshot.manifest,
        publishedSnapshot.concepts,
      ),
    },
    {
      outputPath: "grammar/v1/examples.json",
      payload: createGrammarVersionedExport(
        exportSnapshot.manifest,
        publishedSnapshot.examples,
      ),
    },
    {
      outputPath: "grammar/v1/exercises.json",
      payload: createGrammarVersionedExport(
        exportSnapshot.manifest,
        publishedSnapshot.exercises,
      ),
    },
    {
      outputPath: "grammar/v1/flashcards.json",
      payload: createGrammarVersionedExport(
        exportSnapshot.manifest,
        publishedSnapshot.flashcardSeeds,
      ),
    },
    {
      outputPath: "grammar/v1/footnotes.json",
      payload: createGrammarVersionedExport(
        exportSnapshot.manifest,
        publishedSnapshot.footnotes,
      ),
    },
    {
      outputPath: "grammar/v1/sources.json",
      payload: createGrammarVersionedExport(
        exportSnapshot.manifest,
        publishedSnapshot.sources,
      ),
    },
  ];

  publishedSnapshot.lessons.forEach((lesson) => {
    files.push({
      outputPath: `grammar/v1/lessons/${lesson.slug}.json`,
      payload: createGrammarVersionedExport(
        exportSnapshot.manifest,
        exportSnapshot.lessons[lesson.slug],
      ),
    });
  });

  return files;
}

export type GrammarVersionedExport<T> = {
  schemaVersion: GrammarManifest["schemaVersion"];
  datasetVersion: string;
  generatedAt: string;
  data: T;
};

type GrammarStaticExportFile = {
  outputPath: string;
  payload: unknown;
};

export function createGrammarVersionedExport<T>(
  manifest: GrammarManifest,
  data: T,
): GrammarVersionedExport<T> {
  return {
    schemaVersion: manifest.schemaVersion,
    datasetVersion: manifest.datasetVersion,
    generatedAt: manifest.generatedAt,
    data,
  };
}
