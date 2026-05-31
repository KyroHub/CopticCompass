import {
  DICTIONARY_COMPLEMENTIZER_GOVERNMENT_FORMS,
  DICTIONARY_CONSTRUCTION_GOVERNMENT_FORMS,
  DICTIONARY_DIALECT_CODES,
  DICTIONARY_PREP_GOVERNMENT_FOR_DIALECT,
} from "@/features/dictionary/config";
import { MAX_DICTIONARY_SEARCH_QUERY_LENGTH } from "@/features/dictionary/search";

import {
  createLocalizedStringSchema,
  createVersionedEnvelopeSchema,
  type PublicOpenApiContext,
} from "./publicOpenApiShared";

/**
 * Builds the reusable OpenAPI components shared by the public API endpoints,
 * including shared parameters, error responses, and schema definitions.
 */
export function buildPublicOpenApiComponents(context: PublicOpenApiContext) {
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
    parameters: {
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
          enum: ["ALL", "V", "N", "ADJ", "ADV", "PREP"],
          default: "ALL",
        },
        example: "V",
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
    },
    responses: {
      BadRequest: {
        description: "Invalid query parameter or unsupported filter value.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
            examples: {
              invalidStatus: {
                value: {
                  error: "Invalid lesson status filter: preview",
                },
              },
              unknownLesson: {
                value: {
                  error: "Unknown lesson filter: missing-lesson",
                },
              },
            },
          },
        },
      },
      NotFound: {
        description: "Requested resource was not found.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
            example: {
              error: "Grammar lesson not found for slug: missing-lesson",
            },
          },
        },
      },
      Unauthorized: {
        description: "Authentication is required for this endpoint.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
            example: {
              error: "Sign in required to use Shenute AI.",
            },
          },
        },
      },
      TooManyRequests: {
        description: "The selected provider is rate-limited.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
            example: {
              error:
                "Hugging Face is currently rate-limited. Please retry in a moment or switch provider.",
            },
          },
        },
      },
      ServiceUnavailable: {
        description:
          "The backing service or required runtime configuration is unavailable.",
        content: {
          "application/json": {
            schema: {
              oneOf: [
                {
                  $ref: "#/components/schemas/ErrorResponse",
                },
                {
                  $ref: "#/components/schemas/OcrProxyError",
                },
              ],
            },
            examples: {
              shenuteUnavailable: {
                value: {
                  error: "Shenute AI is unavailable right now.",
                },
              },
              ocrUnavailable: {
                value: {
                  success: false,
                  code: "external_service_unavailable",
                  error:
                    "OCR could not read this image right now. Please try again.",
                  requestId: "ocr_00000000-0000-4000-8000-000000000000",
                },
              },
            },
          },
        },
      },
    },
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "sb-access-token",
        description:
          "Supabase-backed browser session cookie. Exact cookie names vary by deployment configuration.",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "string",
          },
        },
        additionalProperties: false,
      },
      DictionaryDialectForms: {
        type: "object",
        properties: {
          absolute: {
            type: "string",
            example: "ⲙⲟⲓ",
          },
          nominal: {
            type: "string",
            example: "ⲙⲁ-",
          },
          pronominal: {
            type: "string",
            example: "ⲙⲏⲓ=",
          },
          stative: {
            type: "string",
            example: "",
          },
          participles: {
            type: "array",
            items: {
              type: "string",
            },
          },
          variants: {
            type: "object",
            properties: {
              absolute: {
                type: "array",
                items: {
                  type: "string",
                },
              },
              nominal: {
                type: "array",
                items: {
                  type: "string",
                },
              },
              pronominal: {
                type: "array",
                items: {
                  type: "string",
                },
              },
              stative: {
                type: "array",
                items: {
                  type: "string",
                },
              },
              constructParticiples: {
                type: "array",
                items: {
                  type: "string",
                },
              },
            },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
      DictionaryDialectFormsMap: {
        type: "object",
        properties: {
          A: {
            $ref: "#/components/schemas/DictionaryDialectForms",
          },
          B: {
            $ref: "#/components/schemas/DictionaryDialectForms",
          },
          F: {
            $ref: "#/components/schemas/DictionaryDialectForms",
          },
          Fb: {
            $ref: "#/components/schemas/DictionaryDialectForms",
          },
          L: {
            $ref: "#/components/schemas/DictionaryDialectForms",
          },
          M: {
            $ref: "#/components/schemas/DictionaryDialectForms",
          },
          Sl: {
            $ref: "#/components/schemas/DictionaryDialectForms",
          },
          O: {
            $ref: "#/components/schemas/DictionaryDialectForms",
          },
          S: {
            $ref: "#/components/schemas/DictionaryDialectForms",
          },
          Sa: {
            $ref: "#/components/schemas/DictionaryDialectForms",
          },
          Sf: {
            $ref: "#/components/schemas/DictionaryDialectForms",
          },
        },
        additionalProperties: false,
      },
      DictionaryLocalizedStringArrays: {
        type: "object",
        properties: {
          en: {
            type: "array",
            items: {
              type: "string",
            },
          },
          nl: {
            type: "array",
            items: {
              type: "string",
            },
          },
        },
        additionalProperties: false,
      },
      DictionaryRelation: {
        type: "object",
        required: ["type", "targetId"],
        properties: {
          type: {
            type: "string",
            enum: ["CAUS_OF", "COMPOUND_WITH", "DERIVED_FROM", "SEE_ALSO"],
          },
          targetId: {
            type: "number",
            example: 13,
          },
          notes: {
            $ref: "#/components/schemas/DictionaryLocalizedStringArrays",
          },
          targetEntry: {
            $ref: "#/components/schemas/DictionaryEntryReference",
          },
        },
        additionalProperties: false,
      },
      DictionaryRelations: {
        type: "array",
        items: {
          $ref: "#/components/schemas/DictionaryRelation",
        },
      },
      DictionarySense: {
        type: "object",
        required: ["grammar"],
        properties: {
          dialects: {
            description:
              "Dialect codes when the entire sense, not merely an alternate translation, is dialect-restricted.",
            type: "array",
            items: {
              type: "string",
              enum: [...DICTIONARY_DIALECT_CODES],
            },
          },
          grammar: {
            $ref: "#/components/schemas/DictionarySenseGrammar",
          },
          meanings: {
            $ref: "#/components/schemas/DictionaryLocalizedStringArrays",
          },
          notes: {
            $ref: "#/components/schemas/DictionaryLocalizedStringArrays",
          },
        },
        additionalProperties: false,
      },
      DictionarySenseGrammar: {
        type: "object",
        required: ["pos"],
        properties: {
          affix: {
            type: "string",
            enum: ["PFX", "SFX"],
          },
          caseRole: {
            type: "string",
            enum: ["DAT", "OBJ"],
          },
          complementizerGovernment: {
            description:
              "Canonical Coptic complementizers introducing clausal complements governed by this verb sense.",
            type: "array",
            items: {
              type: "string",
              enum: [...DICTIONARY_COMPLEMENTIZER_GOVERNMENT_FORMS],
            },
          },
          constructionGovernment: {
            description:
              "Canonical fixed constructions governed by this verb sense, especially comparative or as-constructions.",
            type: "array",
            items: {
              type: "string",
              enum: [...DICTIONARY_CONSTRUCTION_GOVERNMENT_FORMS],
            },
          },
          derivation: {
            type: "string",
            enum: ["CAUS"],
          },
          form: {
            type: "string",
            enum: ["ABS", "PC", "STA", "VBAL"],
          },
          gender: {
            type: "string",
            enum: ["BOTH", "F", "M"],
          },
          mood: {
            type: "string",
            enum: ["IMP"],
          },
          number: {
            type: "string",
            enum: ["PL", "SG"],
          },
          polarity: {
            type: "string",
            enum: ["NEG"],
          },
          pos: {
            type: "string",
            enum: [
              "V",
              "N",
              "ADJ",
              "ADV",
              "CONJ",
              "INTJ",
              "OTHER",
              "PREP",
              "UNKNOWN",
              "PRON",
            ],
          },
          prepGovernment: {
            description:
              "Dialect-aware prepositional government mapping dialect codes to lists of canonical Coptic prepositional forms.",
            type: "object",
            properties: {
              S: {
                type: "array",
                items: {
                  type: "string",
                  enum: [...DICTIONARY_PREP_GOVERNMENT_FOR_DIALECT.S],
                },
              },
              B: {
                type: "array",
                items: {
                  type: "string",
                  enum: [...DICTIONARY_PREP_GOVERNMENT_FOR_DIALECT.B],
                },
              },
            },
            additionalProperties: false,
          },
          tags: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "N",
                "V",
                "ADJ",
                "ADV",
                "CONJ",
                "PREP",
                "PRON",
                "INTR",
                "TR",
                "STA",
                "IMP",
                "PC",
                "REFL",
                "AUX",
                "IMPERS.V",
                "IMPERS",
                "PFX",
                "SFX",
                "DAT",
                "OBJ",
                "NEG",
                "INDF",
                "Q",
                "CAUS",
                "SIM",
                "REL",
                "PL",
                "SG",
                "LIT",
                "VBAL",
                "ESP",
                "ABS",
              ],
            },
          },
          valency: {
            type: "string",
            enum: ["INTR", "TR"],
          },
          voice: {
            type: "string",
            enum: ["REFL"],
          },
        },
        additionalProperties: false,
      },
      DictionarySenses: {
        description:
          "Ordered grammar-scoped senses. Display badges are derived from each sense's grammar object.",
        type: "array",
        items: {
          $ref: "#/components/schemas/DictionarySense",
        },
      },
      DictionaryDialectMeaning: {
        type: "object",
        required: ["sourceLabel", "dialects"],
        properties: {
          sourceLabel: {
            type: "string",
            example: "BS",
          },
          dialects: {
            type: "array",
            items: {
              type: "string",
              enum: ["A", "B", "F", "L", "M", "O", "S"],
            },
            example: ["B", "S"],
          },
          meanings: {
            $ref: "#/components/schemas/DictionaryLocalizedStringArrays",
          },
          notes: {
            $ref: "#/components/schemas/DictionaryLocalizedStringArrays",
          },
        },
        additionalProperties: false,
      },
      DictionaryGenderedMeaningValues: {
        type: "object",
        properties: {
          m: {
            type: "string",
            example: "male servant",
          },
          f: {
            type: "string",
            example: "female servant",
          },
          pl: {
            type: "string",
            example: "servants",
          },
        },
        additionalProperties: false,
      },
      DictionaryGenderedMeaning: {
        type: "object",
        properties: {
          meanings: {
            type: "object",
            properties: {
              en: {
                $ref: "#/components/schemas/DictionaryGenderedMeaningValues",
              },
              nl: {
                $ref: "#/components/schemas/DictionaryGenderedMeaningValues",
              },
            },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
      DictionaryInflectedFormDetails: {
        type: "object",
        required: ["form"],
        properties: {
          form: {
            type: "string",
            example: "ⲟⲩⲣⲱⲟⲩ",
          },
          entryId: {
            type: "number",
            example: 20,
          },
          notes: {
            type: "array",
            items: {
              type: "string",
            },
          },
          uncertain: {
            type: "boolean",
          },
        },
        additionalProperties: false,
      },
      DictionaryInflectedFormValue: {
        oneOf: [
          {
            type: "string",
            example: "ⲟⲩⲣⲱⲟⲩ",
          },
          {
            $ref: "#/components/schemas/DictionaryInflectedFormDetails",
          },
        ],
      },
      DictionaryInflectionRoleMap: {
        type: "object",
        additionalProperties: {
          type: "array",
          items: {
            $ref: "#/components/schemas/DictionaryInflectedFormValue",
          },
        },
      },
      DictionaryInflectionDialectMap: {
        type: "object",
        additionalProperties: {
          $ref: "#/components/schemas/DictionaryInflectionRoleMap",
        },
      },
      DictionaryInflections: {
        type: "object",
        properties: {
          dual: {
            $ref: "#/components/schemas/DictionaryInflectionDialectMap",
          },
          feminine: {
            $ref: "#/components/schemas/DictionaryInflectionDialectMap",
          },
          imperative: {
            $ref: "#/components/schemas/DictionaryInflectionDialectMap",
          },
          masculine: {
            $ref: "#/components/schemas/DictionaryInflectionDialectMap",
          },
          plural: {
            $ref: "#/components/schemas/DictionaryInflectionDialectMap",
          },
        },
        additionalProperties: false,
      },
      DictionaryGreekContext: {
        type: "object",
        minProperties: 1,
        properties: {
          sources: {
            type: "array",
            minItems: 1,
            items: {
              type: "string",
            },
          },
          equivalents: {
            type: "array",
            minItems: 1,
            items: {
              type: "string",
            },
          },
        },
        additionalProperties: false,
      },
      DictionaryEntryReference: {
        type: "object",
        required: ["id", "headword", "dialects"],
        properties: {
          id: {
            type: "number",
            example: 2,
          },
          headword: {
            type: "string",
            example: "ϯ",
          },
          dialects: {
            $ref: "#/components/schemas/DictionaryDialectFormsMap",
          },
        },
        additionalProperties: false,
      },
      DictionaryClientEntry: {
        type: "object",
        required: ["id", "headword", "dialects", "senses", "etym"],
        properties: {
          id: {
            type: "number",
            example: 2,
          },
          headword: {
            type: "string",
            example: "ⲙⲟⲓ",
          },
          dialects: {
            $ref: "#/components/schemas/DictionaryDialectFormsMap",
          },
          greekContext: {
            $ref: "#/components/schemas/DictionaryGreekContext",
          },
          senses: {
            $ref: "#/components/schemas/DictionarySenses",
          },
          dialectMeanings: {
            type: "array",
            items: {
              $ref: "#/components/schemas/DictionaryDialectMeaning",
            },
          },
          genderedMeanings: {
            type: "array",
            items: {
              $ref: "#/components/schemas/DictionaryGenderedMeaning",
            },
          },
          etym: {
            type: "string",
            enum: ["Egy", "Gr", "Lat", "Sem", "Unknown"],
          },
          inflections: {
            $ref: "#/components/schemas/DictionaryInflections",
          },
          relations: {
            $ref: "#/components/schemas/DictionaryRelations",
          },
        },
        additionalProperties: false,
      },
      DictionarySearchPage: {
        type: "object",
        required: [
          "entries",
          "hasMore",
          "limit",
          "nextOffset",
          "offset",
          "totalEntries",
          "totalMatches",
        ],
        properties: {
          entries: {
            type: "array",
            items: {
              $ref: "#/components/schemas/DictionaryClientEntry",
            },
          },
          hasMore: {
            type: "boolean",
          },
          limit: {
            type: "integer",
          },
          nextOffset: {
            type: "integer",
            nullable: true,
          },
          offset: {
            type: "integer",
          },
          totalEntries: {
            type: "integer",
          },
          totalMatches: {
            type: "integer",
          },
        },
        additionalProperties: false,
      },
      ShenuteUiMessage: {
        type: "object",
        description:
          "AI SDK UIMessage-compatible object. Coptic Compass reads the role and text/image parts and preserves additional AI SDK fields.",
        required: ["role", "parts"],
        properties: {
          id: {
            type: "string",
          },
          role: {
            type: "string",
            enum: ["user", "assistant", "system"],
          },
          parts: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: true,
            },
          },
        },
        additionalProperties: true,
      },
      ShenuteRequest: {
        type: "object",
        required: ["messages"],
        properties: {
          id: {
            type: "string",
            description:
              "Optional Shenute session id used for conversation history and reasoning cache continuity.",
            example: "default",
          },
          inferenceProvider: {
            type: "string",
            enum: ["thoth", "openrouter", "gemini", "hf"],
            default: "thoth",
          },
          messages: {
            type: "array",
            minItems: 1,
            items: {
              $ref: "#/components/schemas/ShenuteUiMessage",
            },
          },
          pageContext: {
            type: "object",
            description:
              "Optional current-page context used to ground the answer.",
            additionalProperties: true,
          },
        },
        additionalProperties: false,
      },
      OcrUploadRequest: {
        type: "object",
        required: ["file"],
        properties: {
          file: {
            type: "string",
            format: "binary",
            description:
              "Image, PDF, or document file. The proxy forwards the first non-empty file field it receives.",
          },
          lang: {
            type: "string",
            description:
              "Optional language code. The query-string `lang` value takes precedence.",
            example: "cop",
          },
        },
        additionalProperties: true,
      },
      OcrProxyError: {
        type: "object",
        required: ["success", "code", "error"],
        properties: {
          success: {
            type: "boolean",
            enum: [false],
          },
          code: {
            type: "string",
            enum: [
              "external_service_unavailable",
              "rate_limited",
              "validation_failed",
            ],
          },
          error: {
            type: "string",
          },
          requestId: {
            type: "string",
            description:
              "Present on server-side OCR proxy failures for support correlation.",
          },
        },
        additionalProperties: false,
      },
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
            example:
              "List public lesson cards for the website or a mobile app.",
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
        required: [
          "id",
          "slug",
          "number",
          "status",
          "title",
          "summary",
          "tags",
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
        required: [
          "id",
          "lessonId",
          "kind",
          "title",
          "prompt",
          "items",
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
          kind: {
            type: "string",
            enum: [
              "translation",
              "multiple-choice",
              "short-answer",
              "reviewed",
            ],
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
    },
  };
}
