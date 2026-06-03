import {
  createLocalizedStringSchema,
  createVersionedEnvelopeSchema,
  type PublicOpenApiContext,
} from "./publicOpenApiShared";

export function buildPublicOpenApiGrammarSchemas(
  context: PublicOpenApiContext,
) {
  const {
    apiIndex,
    authorName,
    exampleConceptId,
    exampleLessonId,
    exampleLessonSlug,
    exampleSourceId,
    manifest,
  } = context;

  return {
    GrammarApiPathExample: {
      type: "object",
      required: ["path", "description"],
      properties: {
        path: {
          type: "string",
          example: "/api/v1/grammar/lessons?status=published",
        },
        description: {
          type: "string",
          example: "List public lesson cards for the website or a mobile app.",
        },
      },
      additionalProperties: false,
    },
    GrammarApiEndpointDescription: {
      type: "object",
      required: ["path", "description"],
      properties: {
        path: {
          type: "string",
        },
        description: {
          type: "string",
        },
        queryParameters: {
          type: "array",
          items: {
            type: "string",
          },
        },
      },
      additionalProperties: false,
    },
    GrammarRights: {
      type: "object",
      required: ["author", "copyrightHolder", "license", "statement"],
      properties: {
        author: {
          type: "string",
          example: authorName,
        },
        copyrightHolder: {
          type: "string",
          example: authorName,
        },
        license: {
          type: "string",
          enum: ["all-rights-reserved"],
          example: "all-rights-reserved",
        },
        statement: createLocalizedStringSchema(
          "Localized rights statement for the dataset or lesson.",
        ),
      },
      additionalProperties: false,
    },
    LocalizedString: createLocalizedStringSchema(
      "Localized text in English and Dutch.",
    ),
    GrammarBlock: {
      type: "object",
      description:
        "Structured rich-text block. Common variants include paragraph, heading, list, table, callout, exampleGroup, and exerciseGroup.",
      required: ["type"],
      properties: {
        type: {
          type: "string",
          example: "paragraph",
        },
      },
      additionalProperties: true,
    },
    GrammarInline: {
      type: "object",
      description:
        "Structured inline node used inside blocks. Common variants include text, coptic, strong, em, conceptRef, footnoteRef, and link.",
      required: ["type"],
      properties: {
        type: {
          type: "string",
          example: "text",
        },
      },
      additionalProperties: true,
    },
    LocalizedBlockArray: {
      type: "object",
      required: ["en", "nl"],
      properties: {
        en: {
          type: "array",
          items: {
            $ref: "#/components/schemas/GrammarBlock",
          },
        },
        nl: {
          type: "array",
          items: {
            $ref: "#/components/schemas/GrammarBlock",
          },
        },
      },
      additionalProperties: false,
    },
    GrammarLessonIndexItem: {
      type: "object",
      required: ["id", "slug", "number", "status", "title", "summary", "tags"],
      properties: {
        id: {
          type: "string",
          example: exampleLessonId,
        },
        slug: {
          type: "string",
          example: exampleLessonSlug,
        },
        number: {
          type: "integer",
          example: 1,
        },
        status: {
          type: "string",
          enum: ["published"],
          example: "published",
        },
        title: {
          $ref: "#/components/schemas/LocalizedString",
        },
        summary: {
          $ref: "#/components/schemas/LocalizedString",
        },
        tags: {
          type: "array",
          items: {
            type: "string",
          },
        },
      },
      additionalProperties: false,
    },
    GrammarManifest: {
      type: "object",
      required: [
        "schemaVersion",
        "datasetVersion",
        "generatedAt",
        "locales",
        "rights",
        "lessons",
      ],
      properties: {
        schemaVersion: {
          type: "string",
          example: manifest.schemaVersion,
        },
        datasetVersion: {
          type: "string",
          example: manifest.datasetVersion,
        },
        generatedAt: {
          type: "string",
          format: "date-time",
          example: manifest.generatedAt,
        },
        locales: {
          type: "array",
          items: {
            type: "string",
            enum: ["en", "nl"],
          },
        },
        rights: {
          $ref: "#/components/schemas/GrammarRights",
        },
        lessons: {
          type: "array",
          items: {
            $ref: "#/components/schemas/GrammarLessonIndexItem",
          },
        },
      },
      additionalProperties: false,
    },
    GrammarSectionDocument: {
      type: "object",
      required: [
        "id",
        "slug",
        "lessonId",
        "order",
        "title",
        "tags",
        "blocks",
        "conceptRefs",
        "exampleRefs",
        "exerciseRefs",
      ],
      properties: {
        id: {
          type: "string",
        },
        slug: {
          type: "string",
        },
        lessonId: {
          type: "string",
          example: exampleLessonId,
        },
        order: {
          type: "integer",
        },
        title: {
          $ref: "#/components/schemas/LocalizedString",
        },
        summary: {
          $ref: "#/components/schemas/LocalizedString",
        },
        tags: {
          type: "array",
          items: {
            type: "string",
          },
        },
        blocks: {
          $ref: "#/components/schemas/LocalizedBlockArray",
        },
        conceptRefs: {
          type: "array",
          items: {
            type: "string",
          },
        },
        exampleRefs: {
          type: "array",
          items: {
            type: "string",
          },
        },
        exerciseRefs: {
          type: "array",
          items: {
            type: "string",
          },
        },
      },
      additionalProperties: false,
    },
    GrammarLessonDocument: {
      type: "object",
      required: [
        "id",
        "slug",
        "number",
        "status",
        "title",
        "summary",
        "tags",
        "sectionOrder",
        "sections",
        "conceptRefs",
        "exerciseRefs",
        "sourceRefs",
      ],
      properties: {
        id: {
          type: "string",
          example: exampleLessonId,
        },
        slug: {
          type: "string",
          example: exampleLessonSlug,
        },
        number: {
          type: "integer",
          example: 1,
        },
        status: {
          type: "string",
          enum: ["published"],
        },
        title: {
          $ref: "#/components/schemas/LocalizedString",
        },
        summary: {
          $ref: "#/components/schemas/LocalizedString",
        },
        description: {
          $ref: "#/components/schemas/LocalizedString",
        },
        tags: {
          type: "array",
          items: {
            type: "string",
          },
        },
        rights: {
          $ref: "#/components/schemas/GrammarRights",
        },
        sectionOrder: {
          type: "array",
          items: {
            type: "string",
          },
        },
        sections: {
          type: "array",
          items: {
            $ref: "#/components/schemas/GrammarSectionDocument",
          },
        },
        conceptRefs: {
          type: "array",
          items: {
            type: "string",
          },
        },
        exerciseRefs: {
          type: "array",
          items: {
            type: "string",
          },
        },
        sourceRefs: {
          type: "array",
          items: {
            type: "string",
          },
        },
      },
      additionalProperties: false,
    },
    GrammarConceptDocument: {
      type: "object",
      required: [
        "id",
        "title",
        "definition",
        "tags",
        "relatedConceptRefs",
        "lessonRefs",
        "sourceRefs",
      ],
      properties: {
        id: {
          type: "string",
          example: exampleConceptId,
        },
        title: {
          $ref: "#/components/schemas/LocalizedString",
        },
        definition: {
          $ref: "#/components/schemas/LocalizedBlockArray",
        },
        tags: {
          type: "array",
          items: {
            type: "string",
          },
        },
        relatedConceptRefs: {
          type: "array",
          items: {
            type: "string",
          },
        },
        lessonRefs: {
          type: "array",
          items: {
            type: "string",
          },
        },
        sourceRefs: {
          type: "array",
          items: {
            type: "string",
          },
        },
      },
      additionalProperties: false,
    },
    GrammarExampleSegment: {
      type: "object",
      required: ["text"],
      properties: {
        text: {
          type: "string",
        },
        dictionaryEntryId: {
          type: "string",
        },
      },
      additionalProperties: false,
    },
    GrammarExampleDocument: {
      type: "object",
      required: [
        "id",
        "lessonId",
        "sectionId",
        "coptic",
        "translation",
        "conceptRefs",
        "dictionaryRefs",
        "tags",
      ],
      properties: {
        id: {
          type: "string",
        },
        lessonId: {
          type: "string",
          example: exampleLessonId,
        },
        sectionId: {
          type: "string",
        },
        coptic: {
          type: "string",
        },
        copticSegments: {
          type: "array",
          items: {
            $ref: "#/components/schemas/GrammarExampleSegment",
          },
        },
        transliteration: {
          type: "string",
        },
        translation: {
          $ref: "#/components/schemas/LocalizedString",
        },
        notes: {
          $ref: "#/components/schemas/LocalizedBlockArray",
        },
        conceptRefs: {
          type: "array",
          items: {
            type: "string",
          },
        },
        dictionaryRefs: {
          type: "array",
          items: {
            type: "string",
          },
        },
        dictionaryTokenOverrides: {
          type: "object",
          additionalProperties: {
            type: "string",
          },
        },
        tags: {
          type: "array",
          items: {
            type: "string",
          },
        },
      },
      additionalProperties: false,
    },
    GrammarExerciseItem: {
      type: "object",
      required: ["id", "prompt"],
      properties: {
        id: {
          type: "string",
        },
        prompt: {
          $ref: "#/components/schemas/LocalizedString",
        },
        answerSchema: {
          type: "object",
          properties: {
            kind: {
              type: "string",
              enum: ["free-text"],
            },
            minLength: {
              type: "integer",
            },
            maxLength: {
              type: "integer",
            },
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
    GrammarExerciseDocument: {
      type: "object",
      required: ["id", "lessonId", "kind", "title", "prompt", "items", "tags"],
      properties: {
        id: {
          type: "string",
        },
        lessonId: {
          type: "string",
          example: exampleLessonId,
        },
        sectionId: {
          type: "string",
        },
        kind: {
          type: "string",
          enum: ["translation", "multiple-choice", "short-answer", "reviewed"],
        },
        title: {
          $ref: "#/components/schemas/LocalizedString",
        },
        prompt: {
          $ref: "#/components/schemas/LocalizedBlockArray",
        },
        items: {
          type: "array",
          items: {
            $ref: "#/components/schemas/GrammarExerciseItem",
          },
        },
        tags: {
          type: "array",
          items: {
            type: "string",
          },
        },
      },
      additionalProperties: false,
    },
    GrammarFootnoteDocument: {
      type: "object",
      required: ["id", "lessonId", "content", "sourceRefs"],
      properties: {
        id: {
          type: "string",
        },
        lessonId: {
          type: "string",
          example: exampleLessonId,
        },
        content: {
          $ref: "#/components/schemas/LocalizedBlockArray",
        },
        sourceRefs: {
          type: "array",
          items: {
            type: "string",
          },
        },
      },
      additionalProperties: false,
    },
    GrammarSourceDocument: {
      type: "object",
      required: ["id", "title"],
      properties: {
        id: {
          type: "string",
          example: exampleSourceId,
        },
        title: {
          type: "string",
        },
        subtitle: {
          type: "string",
        },
        author: {
          type: "string",
        },
        year: {
          type: "string",
        },
        url: {
          type: "string",
          format: "uri",
        },
        publicationId: {
          type: "string",
        },
        comingSoon: {
          type: "boolean",
        },
      },
      additionalProperties: false,
    },
    GrammarLessonBundle: {
      type: "object",
      required: [
        "lesson",
        "concepts",
        "examples",
        "exercises",
        "footnotes",
        "sources",
      ],
      properties: {
        lesson: {
          $ref: "#/components/schemas/GrammarLessonDocument",
        },
        concepts: {
          type: "array",
          items: {
            $ref: "#/components/schemas/GrammarConceptDocument",
          },
        },
        examples: {
          type: "array",
          items: {
            $ref: "#/components/schemas/GrammarExampleDocument",
          },
        },
        exercises: {
          type: "array",
          items: {
            $ref: "#/components/schemas/GrammarExerciseDocument",
          },
        },
        footnotes: {
          type: "array",
          items: {
            $ref: "#/components/schemas/GrammarFootnoteDocument",
          },
        },
        sources: {
          type: "array",
          items: {
            $ref: "#/components/schemas/GrammarSourceDocument",
          },
        },
      },
      additionalProperties: false,
    },
    GrammarApiIndex: {
      type: "object",
      required: [
        "name",
        "description",
        "schemaVersion",
        "datasetVersion",
        "generatedAt",
        "locales",
        "rights",
        "lessonCounts",
        "apiBasePath",
        "staticDataBasePath",
        "endpoints",
        "examples",
      ],
      properties: {
        name: {
          type: "string",
          example: apiIndex.name,
        },
        description: {
          type: "string",
          example: apiIndex.description,
        },
        schemaVersion: {
          type: "string",
          example: apiIndex.schemaVersion,
        },
        datasetVersion: {
          type: "string",
          example: apiIndex.datasetVersion,
        },
        generatedAt: {
          type: "string",
          format: "date-time",
          example: apiIndex.generatedAt,
        },
        locales: {
          type: "array",
          items: {
            type: "string",
            enum: ["en", "nl"],
          },
        },
        rights: {
          $ref: "#/components/schemas/GrammarRights",
        },
        lessonCounts: {
          type: "object",
          required: ["published", "draft", "archived", "total"],
          properties: {
            published: {
              type: "integer",
              example: 1,
            },
            draft: {
              type: "integer",
              example: 0,
            },
            archived: {
              type: "integer",
              example: 0,
            },
            total: {
              type: "integer",
              example: 1,
            },
          },
          additionalProperties: false,
        },
        apiBasePath: {
          type: "string",
          example: apiIndex.apiBasePath,
        },
        staticDataBasePath: {
          type: "string",
          example: apiIndex.staticDataBasePath,
        },
        endpoints: {
          type: "array",
          items: {
            $ref: "#/components/schemas/GrammarApiEndpointDescription",
          },
        },
        examples: {
          type: "array",
          items: {
            $ref: "#/components/schemas/GrammarApiPathExample",
          },
        },
      },
      additionalProperties: false,
    },
    GrammarLessonIndexEnvelope: createVersionedEnvelopeSchema(
      "#/components/schemas/GrammarLessonIndexCollection",
      "Versioned lesson index response.",
    ),
    GrammarLessonIndexCollection: {
      type: "array",
      items: {
        $ref: "#/components/schemas/GrammarLessonIndexItem",
      },
    },
    GrammarLessonBundleEnvelope: createVersionedEnvelopeSchema(
      "#/components/schemas/GrammarLessonBundle",
      "Versioned lesson bundle response.",
    ),
    GrammarExampleCollectionEnvelope: createVersionedEnvelopeSchema(
      "#/components/schemas/GrammarExampleCollection",
      "Versioned example collection response.",
    ),
    GrammarExampleCollection: {
      type: "array",
      items: {
        $ref: "#/components/schemas/GrammarExampleDocument",
      },
    },
    GrammarExerciseCollectionEnvelope: createVersionedEnvelopeSchema(
      "#/components/schemas/GrammarExerciseCollection",
      "Versioned exercise collection response.",
    ),
    GrammarExerciseCollection: {
      type: "array",
      items: {
        $ref: "#/components/schemas/GrammarExerciseDocument",
      },
    },
    GrammarConceptCollectionEnvelope: createVersionedEnvelopeSchema(
      "#/components/schemas/GrammarConceptCollection",
      "Versioned concept collection response.",
    ),
    GrammarConceptCollection: {
      type: "array",
      items: {
        $ref: "#/components/schemas/GrammarConceptDocument",
      },
    },
    GrammarConceptEnvelope: createVersionedEnvelopeSchema(
      "#/components/schemas/GrammarConceptDocument",
      "Versioned concept response.",
    ),
    GrammarFootnoteCollectionEnvelope: createVersionedEnvelopeSchema(
      "#/components/schemas/GrammarFootnoteCollection",
      "Versioned footnote collection response.",
    ),
    GrammarFootnoteCollection: {
      type: "array",
      items: {
        $ref: "#/components/schemas/GrammarFootnoteDocument",
      },
    },
    GrammarSourceCollectionEnvelope: createVersionedEnvelopeSchema(
      "#/components/schemas/GrammarSourceCollection",
      "Versioned source collection response.",
    ),
    GrammarSourceCollection: {
      type: "array",
      items: {
        $ref: "#/components/schemas/GrammarSourceDocument",
      },
    },
    GrammarSourceEnvelope: createVersionedEnvelopeSchema(
      "#/components/schemas/GrammarSourceDocument",
      "Versioned source response.",
    ),
  };
}
