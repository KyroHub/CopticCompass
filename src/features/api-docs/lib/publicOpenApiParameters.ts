import { MAX_DICTIONARY_SEARCH_QUERY_LENGTH } from "@/features/dictionary/search";

import type { PublicOpenApiContext } from "./publicOpenApiShared";

export function buildPublicOpenApiParameters(context: PublicOpenApiContext) {
  const { exampleLessonId, exampleLessonSlug } = context;

  return {
    LessonStatusFilter: {
      name: "status",
      in: "query",
      required: false,
      description:
        "Optional explicit filter for the public published lesson set.",
      schema: {
        type: "string",
        enum: ["published"],
      },
      example: "published",
    },
    LessonFilter: {
      name: "lesson",
      in: "query",
      required: false,
      description:
        "Lesson slug or canonical lesson id. Examples: `lesson-1`, `grammar.lesson.01`.",
      schema: {
        type: "string",
      },
      examples: {
        slug: {
          value: exampleLessonSlug,
        },
        canonicalId: {
          value: exampleLessonId,
        },
      },
    },
    DictionaryQuery: {
      name: "q",
      in: "query",
      required: false,
      description:
        "Search query matched against Coptic headwords, dialect forms, inflected forms, English, Dutch, and Greek text.",
      schema: {
        type: "string",
        maxLength: MAX_DICTIONARY_SEARCH_QUERY_LENGTH,
      },
      example: "ⲙⲟⲓ",
    },
    DictionaryQueryAlias: {
      name: "query",
      in: "query",
      required: false,
      description: "Alias for `q`.",
      schema: {
        type: "string",
        maxLength: MAX_DICTIONARY_SEARCH_QUERY_LENGTH,
      },
    },
    DictionaryDialectFilter: {
      name: "dialect",
      in: "query",
      required: false,
      description:
        "Dialect filter. `ALL` searches across dialects; other values restrict results to entries with that dialect.",
      schema: {
        type: "string",
        enum: ["ALL", "S", "B", "A", "L", "F", "M"],
        default: "ALL",
      },
      example: "B",
    },
    DictionaryPartOfSpeechFilter: {
      name: "partOfSpeech",
      in: "query",
      required: false,
      description: "Part-of-speech filter used by the dictionary UI.",
      schema: {
        type: "string",
        enum: ["ALL", "V", "N", "ADJ", "ADV", "INTJ", "PREP"],
        default: "ALL",
      },
      example: "V",
    },
    DictionaryEtymologyFilter: {
      name: "etymology",
      in: "query",
      required: false,
      description:
        "Etymology or origin filter. `ALL` keeps the default broad search.",
      schema: {
        type: "string",
        enum: ["ALL", "Egy", "Gr", "Lat", "Sem", "Unknown"],
        default: "ALL",
      },
      example: "Gr",
    },
    DictionaryExactFilter: {
      name: "exact",
      in: "query",
      required: false,
      description:
        "When `true`, whole-token matching is used instead of substring matching.",
      schema: {
        type: "string",
        enum: ["true", "false"],
        default: "false",
      },
      example: "true",
    },
    DictionaryHasGreekFilter: {
      name: "hasGreek",
      in: "query",
      required: false,
      description:
        "When `true`, restricts results to entries with structured Greek sources or equivalents.",
      schema: {
        type: "string",
        enum: ["true", "false"],
        default: "false",
      },
      example: "true",
    },
    DictionaryHasInflectionsFilter: {
      name: "hasInflections",
      in: "query",
      required: false,
      description:
        "When `true`, restricts results to entries with structured inflected forms.",
      schema: {
        type: "string",
        enum: ["true", "false"],
        default: "false",
      },
      example: "true",
    },
    DictionaryHasRelatedEntriesFilter: {
      name: "hasRelatedEntries",
      in: "query",
      required: false,
      description:
        "When `true`, restricts results to entries with structured related entries.",
      schema: {
        type: "string",
        enum: ["true", "false"],
        default: "false",
      },
      example: "true",
    },
    DictionaryLimit: {
      name: "limit",
      in: "query",
      required: false,
      description:
        "Maximum number of entries to return. Values above 100 are capped.",
      schema: {
        type: "integer",
        minimum: 1,
        maximum: 100,
        default: 50,
      },
    },
    DictionaryOffset: {
      name: "offset",
      in: "query",
      required: false,
      description: "Zero-based result offset for pagination.",
      schema: {
        type: "integer",
        minimum: 0,
        default: 0,
      },
    },
    ShenuteProviderQuery: {
      name: "provider",
      in: "query",
      required: false,
      description:
        "Optional provider override. The JSON body `inferenceProvider` value takes precedence when both are supplied.",
      schema: {
        type: "string",
        enum: ["thoth", "openrouter", "gemini", "hf"],
        default: "thoth",
      },
    },
    OcrLanguage: {
      name: "lang",
      in: "query",
      required: false,
      description:
        "OCR language code forwarded to the upstream OCR service. Defaults to `cop`.",
      schema: {
        type: "string",
        default: "cop",
      },
      example: "cop",
    },
  };
}
