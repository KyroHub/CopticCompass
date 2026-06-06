import { normalizeWhitespace } from "@/lib/text";

type StructuredJsonChunk = {
  content: string;
  metadata: Record<string, unknown>;
};

export type StructuredJsonChunkMode = "default" | "compact";

type BuildStructuredJsonChunksOptions = {
  mode?: StructuredJsonChunkMode;
};

const IGNORED_TEXT_KEYS = new Set([
  "conceptrefs",
  "datasetversion",
  "dictionaryrefs",
  "generatedat",
  "id",
  "lessonid",
  "lessonrefs",
  "relatedconceptrefs",
  "schemaversion",
  "sectionid",
  "slug",
  "sourcerefs",
  "updatedat",
]);

const COMPACT_DICTIONARY_MAX_ENTRIES = 12;
const COMPACT_DICTIONARY_TARGET_CHARS = 2400;

type DictionaryEntry = {
  dialectMeanings?: unknown;
  dialects?: unknown;
  genderedMeanings?: unknown;
  headword?: unknown;
  senses?: unknown;
};

function uniqueStrings(values: string[]) {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const value of values) {
    const normalized = normalizeWhitespace(value);
    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(normalized);
  }

  return unique;
}

/**
 * Extracts human-readable text from nested JSON while favoring English
 * localized values and skipping schema/id fields that would pollute embeddings.
 */
function collectTextSegments(value: unknown, depth = 0): string[] {
  if (depth > 10 || value === null || typeof value === "undefined") {
    return [];
  }

  if (typeof value === "string") {
    const normalized = normalizeWhitespace(value);
    return normalized ? [normalized] : [];
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }

  if (Array.isArray(value)) {
    return uniqueStrings(
      value.flatMap((entry) => collectTextSegments(entry, depth + 1)),
    );
  }

  if (typeof value !== "object") {
    return [];
  }

  const record = value as Record<string, unknown>;

  if ("en" in record) {
    const englishSegments = collectTextSegments(record.en, depth + 1);
    if (englishSegments.length > 0) {
      return englishSegments;
    }
  }

  const collected: string[] = [];

  if (typeof record.text === "string") {
    collected.push(record.text);
  }

  if (typeof record.fallback === "string") {
    collected.push(record.fallback);
  }

  if (typeof record.coptic === "string") {
    collected.push(record.coptic);
  }

  for (const [key, childValue] of Object.entries(record)) {
    const normalizedKey = key.toLowerCase();
    if (
      normalizedKey === "en" ||
      normalizedKey === "text" ||
      normalizedKey === "fallback" ||
      normalizedKey === "coptic" ||
      IGNORED_TEXT_KEYS.has(normalizedKey)
    ) {
      continue;
    }

    collected.push(...collectTextSegments(childValue, depth + 1));
  }

  return uniqueStrings(collected);
}

function pickFirstText(...values: unknown[]) {
  for (const value of values) {
    const match = collectTextSegments(value)[0];
    if (match) {
      return match;
    }
  }

  return "";
}

function collectStringArray(value: unknown) {
  return Array.isArray(value)
    ? uniqueStrings(
        value.filter((item): item is string => typeof item === "string"),
      )
    : [];
}

function collectEnglishSenses(value: unknown) {
  if (!value || typeof value !== "object") {
    return [];
  }

  const senses = Array.isArray(value)
    ? value
    : Object.values(value as Record<string, unknown>);

  return uniqueStrings(
    senses.flatMap((sense) => {
      if (!sense || typeof sense !== "object" || Array.isArray(sense)) {
        return [];
      }

      return collectStringArray(
        (sense as { meanings?: { en?: unknown } }).meanings?.en,
      );
    }),
  );
}

function collectPartOfSpeechValues(value: unknown) {
  if (!value || typeof value !== "object") {
    return [];
  }

  const groups = Array.isArray(value)
    ? value
    : Object.values(value as Record<string, unknown>);

  return uniqueStrings(
    groups.flatMap((group) => {
      if (!group || typeof group !== "object" || Array.isArray(group)) {
        return [];
      }

      const grammar = (group as { grammar?: unknown }).grammar;
      if (!grammar || typeof grammar !== "object" || Array.isArray(grammar)) {
        return [];
      }

      const pos = (grammar as { pos?: unknown }).pos;
      return typeof pos === "string" ? [pos] : [];
    }),
  );
}

function collectEnglishGenderedMeanings(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return uniqueStrings(
    value.flatMap((group) => {
      if (!group || typeof group !== "object" || Array.isArray(group)) {
        return [];
      }

      return collectTextSegments(
        (group as { meanings?: { en?: unknown } }).meanings?.en,
      );
    }),
  );
}

function collectEnglishDialectMeanings(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return uniqueStrings(
    value.flatMap((group) => {
      if (!group || typeof group !== "object" || Array.isArray(group)) {
        return [];
      }

      return collectStringArray(
        (group as { meanings?: { en?: unknown } }).meanings?.en,
      );
    }),
  );
}

/**
 * Combines the dictionary meaning shapes into one deduplicated English gloss
 * list for vocabulary-oriented embedding chunks.
 */
function collectDictionaryEnglishMeanings(entry: DictionaryEntry) {
  return uniqueStrings([
    ...collectEnglishGenderedMeanings(entry.genderedMeanings),
    ...collectEnglishSenses(entry.senses),
    ...collectEnglishDialectMeanings(entry.dialectMeanings),
  ]);
}

/**
 * Converts a normalized dictionary JSON record into a vocabulary chunk. Entries
 * without a headword or part of speech are skipped because they cannot produce
 * useful retrieval metadata.
 */
function formatDictionaryEntry(
  entry: DictionaryEntry,
): StructuredJsonChunk | null {
  if (typeof entry.headword !== "string") {
    return null;
  }

  const partsOfSpeech = collectPartOfSpeechValues(entry.senses);
  if (partsOfSpeech.length === 0) {
    return null;
  }

  const dialects =
    entry.dialects && typeof entry.dialects === "object"
      ? (entry.dialects as Record<string, unknown>)
      : {};

  const dialectSummaries = Object.entries(dialects)
    .map(([dialectName, dialectValue]) => {
      if (!dialectValue || typeof dialectValue !== "object") {
        return "";
      }

      const absolute = (dialectValue as { absolute?: unknown }).absolute;
      return typeof absolute === "string" ? `${dialectName}: ${absolute}` : "";
    })
    .filter((dialect) => dialect.length > 0);

  const meanings = collectDictionaryEnglishMeanings(entry);
  const partOfSpeech = partsOfSpeech.join(", ");

  const contentParts = [
    `Coptic dictionary entry: ${entry.headword}.`,
    `Part of speech: ${partOfSpeech}.`,
    dialectSummaries.length > 0
      ? `Dialects: ${dialectSummaries.join(", ")}.`
      : "",
    meanings.length > 0 ? `English meanings: ${meanings.join(", ")}.` : "",
  ].filter((part) => part.length > 0);

  return {
    content: contentParts.join(" "),
    metadata: {
      type: "vocabulary",
      word: entry.headword,
      englishTranslation: meanings.join(", "),
      englishTranslations: meanings,
      translation: meanings.join(", "),
      partOfSpeech,
      partsOfSpeech,
    },
  };
}

/**
 * Packs many dictionary entry chunks into bounded batches for compact RAG
 * ingestion while preserving aggregate headword and translation metadata.
 */
function compactDictionaryChunks(chunks: StructuredJsonChunk[]) {
  const compacted: StructuredJsonChunk[] = [];
  let currentBatch: StructuredJsonChunk[] = [];
  let currentChars = 0;

  function flushCurrentBatch() {
    if (currentBatch.length === 0) {
      return;
    }

    const headwords = uniqueStrings(
      currentBatch.flatMap((chunk) =>
        typeof chunk.metadata.word === "string" ? [chunk.metadata.word] : [],
      ),
    );
    const partsOfSpeech = uniqueStrings(
      currentBatch.flatMap((chunk) =>
        typeof chunk.metadata.partOfSpeech === "string"
          ? [chunk.metadata.partOfSpeech]
          : [],
      ),
    );
    const englishTranslations = uniqueStrings(
      currentBatch.flatMap((chunk) => {
        if (Array.isArray(chunk.metadata.englishTranslations)) {
          return chunk.metadata.englishTranslations.filter(
            (value): value is string => typeof value === "string",
          );
        }

        if (typeof chunk.metadata.englishTranslation === "string") {
          return [chunk.metadata.englishTranslation];
        }

        return [];
      }),
    );

    compacted.push({
      content: [
        "Coptic dictionary entries:",
        ...currentBatch.map((chunk) => chunk.content),
      ].join("\n"),
      metadata: {
        batchMode: "compact",
        entryCount: currentBatch.length,
        headwords,
        englishTranslation: englishTranslations.join(", "),
        englishTranslations,
        partsOfSpeech,
        type: "vocabulary",
      },
    });

    currentBatch = [];
    currentChars = 0;
  }

  for (const chunk of chunks) {
    const nextChars = currentChars + chunk.content.length;
    if (
      currentBatch.length >= COMPACT_DICTIONARY_MAX_ENTRIES ||
      (currentBatch.length > 0 && nextChars > COMPACT_DICTIONARY_TARGET_CHARS)
    ) {
      flushCurrentBatch();
    }

    currentBatch.push(chunk);
    currentChars += chunk.content.length;
  }

  flushCurrentBatch();
  return compacted;
}

/**
 * Builds a fallback chunk for arbitrary structured records by pulling common
 * title, Coptic, translation, summary, and detail fields into retrieval text.
 */
function buildGenericRecordChunk(
  record: Record<string, unknown>,
): StructuredJsonChunk | null {
  const title = pickFirstText(
    record.title,
    record.name,
    record.label,
    record.id,
  );
  const coptic = pickFirstText(record.coptic);
  const translation = pickFirstText(record.translation);
  const summary = pickFirstText(
    record.summary,
    record.description,
    record.definition,
    record.prompt,
  );
  const detailText = uniqueStrings(
    collectTextSegments(
      record.blocks ?? record.content ?? record.notes ?? record,
    ),
  )
    .filter(
      (segment) =>
        segment !== title && segment !== coptic && segment !== translation,
    )
    .join(" ");

  const parts = [
    title ? `Title: ${title}.` : "",
    coptic ? `Coptic: ${coptic}.` : "",
    translation ? `Translation: ${translation}.` : "",
    summary ? `Summary: ${summary}.` : "",
    detailText ? `Details: ${detailText}.` : "",
  ].filter((part) => part.length > 0);

  if (parts.length === 0) {
    return null;
  }

  let type = "json_data";
  if (typeof record.coptic === "string") {
    type = "grammar_example";
  } else if (typeof record.prompt !== "undefined") {
    type = "grammar_exercise";
  } else if (typeof record.definition !== "undefined") {
    type = "grammar";
  }

  return {
    content: parts.join(" "),
    metadata: {
      ...(translation
        ? {
            englishTranslation: translation,
            englishTranslations: [translation],
            translation,
          }
        : {}),
      title: title || null,
      type,
    },
  };
}

/**
 * Handles exported grammar lesson bundles specially so lesson overview and
 * section chunks keep lesson metadata attached for retrieval filtering.
 */
function buildLessonChunks(lessonRecord: Record<string, unknown>) {
  const lesson = (
    lessonRecord.data &&
    typeof lessonRecord.data === "object" &&
    !Array.isArray(lessonRecord.data) &&
    "lesson" in (lessonRecord.data as Record<string, unknown>)
      ? (lessonRecord.data as Record<string, unknown>).lesson
      : lessonRecord.lesson
  ) as Record<string, unknown> | undefined;

  if (!lesson || typeof lesson !== "object") {
    return [] as StructuredJsonChunk[];
  }

  const lessonId = typeof lesson.id === "string" ? lesson.id : null;
  const lessonSlug = typeof lesson.slug === "string" ? lesson.slug : null;
  const lessonTitle = pickFirstText(lesson.title, lessonSlug, lessonId);
  const lessonSummary = pickFirstText(lesson.summary, lesson.description);
  const tags = Array.isArray(lesson.tags)
    ? lesson.tags.filter((tag): tag is string => typeof tag === "string")
    : [];

  const chunks: StructuredJsonChunk[] = [];

  chunks.push({
    content: [
      lessonTitle ? `Grammar lesson: ${lessonTitle}.` : "Grammar lesson.",
      lessonSummary ? `Overview: ${lessonSummary}.` : "",
      tags.length > 0 ? `Tags: ${tags.join(", ")}.` : "",
    ]
      .filter((part) => part.length > 0)
      .join(" "),
    metadata: {
      lessonId,
      lessonSlug,
      type: "grammar_lesson",
    },
  });

  const sections = Array.isArray(lesson.sections) ? lesson.sections : [];

  for (const sectionRaw of sections) {
    if (!sectionRaw || typeof sectionRaw !== "object") {
      continue;
    }

    const section = sectionRaw as Record<string, unknown>;
    const sectionTitle = pickFirstText(section.title, section.slug, section.id);
    const sectionSummary = pickFirstText(section.summary);
    const sectionText = uniqueStrings(
      collectTextSegments(section.blocks ?? section),
    )
      .filter((segment) => segment !== sectionTitle)
      .join(" ");

    const content = [
      sectionTitle ? `Lesson section: ${sectionTitle}.` : "",
      sectionSummary ? `Summary: ${sectionSummary}.` : "",
      sectionText ? `Content: ${sectionText}.` : "",
    ]
      .filter((part) => part.length > 0)
      .join(" ");

    if (!content) {
      continue;
    }

    chunks.push({
      content,
      metadata: {
        lessonId,
        lessonSlug,
        sectionId: typeof section.id === "string" ? section.id : null,
        sectionSlug: typeof section.slug === "string" ? section.slug : null,
        type: "grammar_lesson_section",
      },
    });
  }

  return chunks;
}

/**
 * Parses structured JSON source text into RAG chunks, preferring specialized
 * dictionary and grammar-lesson paths before falling back to generic records.
 */
export function buildStructuredJsonChunks(
  text: string,
  options: BuildStructuredJsonChunksOptions = {},
) {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  const mode = options.mode ?? "default";

  if (Array.isArray(parsed)) {
    const dictionaryChunks = parsed
      .map((entry) => formatDictionaryEntry(entry as DictionaryEntry))
      .filter((entry): entry is StructuredJsonChunk => Boolean(entry));

    if (
      dictionaryChunks.length === parsed.length &&
      dictionaryChunks.length > 0
    ) {
      return mode === "compact"
        ? compactDictionaryChunks(dictionaryChunks)
        : dictionaryChunks;
    }

    const genericChunks = parsed
      .map((entry) =>
        entry && typeof entry === "object"
          ? buildGenericRecordChunk(entry as Record<string, unknown>)
          : null,
      )
      .filter((entry): entry is StructuredJsonChunk => Boolean(entry));

    return genericChunks.length > 0 ? genericChunks : null;
  }

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const lessonChunks = buildLessonChunks(parsed as Record<string, unknown>);
  if (lessonChunks.length > 0) {
    return lessonChunks;
  }

  const record = parsed as Record<string, unknown>;

  if (Array.isArray(record.data)) {
    const genericDataChunks = record.data
      .map((entry) =>
        entry && typeof entry === "object"
          ? buildGenericRecordChunk(entry as Record<string, unknown>)
          : null,
      )
      .filter((entry): entry is StructuredJsonChunk => Boolean(entry));

    if (genericDataChunks.length > 0) {
      return genericDataChunks;
    }
  }

  const genericChunk = buildGenericRecordChunk(record);
  return genericChunk ? [genericChunk] : null;
}
