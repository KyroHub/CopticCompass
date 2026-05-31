import { describe, expect, it } from "vitest";

import {
  DICTIONARY_COMPLEMENTIZER_GOVERNMENT_FORMS,
  DICTIONARY_CONSTRUCTION_GOVERNMENT_FORMS,
  DICTIONARY_DIALECT_CODES,
  DICTIONARY_PREP_GOVERNMENT_FOR_DIALECT,
} from "@/features/dictionary/config";

import { getPublicOpenApiDocument } from "./publicOpenApi";

describe("public OpenAPI document", () => {
  it("describes the public API routes and docs metadata", () => {
    const document = getPublicOpenApiDocument() as {
      openapi: string;
      info: { title: string };
      paths: Record<string, unknown>;
      tags: Array<{ name: string }>;
      components: {
        parameters: Record<string, unknown>;
        schemas: Record<string, unknown>;
      };
    };

    expect(document.openapi).toBe("3.0.3");
    expect(document.info.title).toBe("Coptic Compass Public API");
    expect(Object.keys(document.paths)).toEqual(
      expect.arrayContaining([
        "/api/v1/grammar",
        "/api/v1/grammar/manifest",
        "/api/v1/grammar/lessons",
        "/api/v1/grammar/lessons/{slug}",
        "/api/v1/grammar/examples",
        "/api/v1/grammar/exercises",
        "/api/v1/grammar/concepts",
        "/api/v1/grammar/concepts/{id}",
        "/api/v1/grammar/footnotes",
        "/api/v1/grammar/sources",
        "/api/v1/grammar/sources/{id}",
        "/api/v1/dictionary/search",
        "/api/v1/dictionary/search-index",
        "/api/shenute",
        "/api/ocr",
      ]),
    );
    expect(document.tags.map((tag) => tag.name)).toEqual(
      expect.arrayContaining([
        "Index",
        "Lessons",
        "Examples",
        "Exercises",
        "Concepts",
        "Footnotes",
        "Sources",
        "Dictionary",
        "Shenute AI",
        "OCR",
      ]),
    );
    expect(document.components.parameters).toHaveProperty("LessonFilter");
    expect(document.components.parameters).toHaveProperty("DictionaryQuery");
    expect(document.components.schemas).toHaveProperty("GrammarApiIndex");
    expect(document.components.schemas).toHaveProperty(
      "GrammarLessonBundleEnvelope",
    );
    expect(document.components.schemas).toHaveProperty("DictionaryInflections");
    expect(document.components.schemas).toHaveProperty("DictionarySearchPage");
    expect(document.components.schemas).toHaveProperty("ShenuteRequest");
    expect(document.components.schemas).toHaveProperty("OcrUploadRequest");
    const ocrProxyErrorSchema = document.components.schemas.OcrProxyError as {
      additionalProperties?: boolean;
      properties: Record<string, { enum?: string[]; type?: string }>;
      required?: string[];
    };

    expect(ocrProxyErrorSchema.additionalProperties).toBe(false);
    expect((ocrProxyErrorSchema.required ?? []).sort()).toEqual(
      ["code", "error", "success"].sort(),
    );
    expect(ocrProxyErrorSchema.properties.code.enum).toEqual([
      "external_service_unavailable",
      "rate_limited",
      "validation_failed",
    ]);
    expect(ocrProxyErrorSchema.properties).not.toHaveProperty("upstreamStatus");
    const dictionaryClientEntrySchema = document.components.schemas
      .DictionaryClientEntry as {
      additionalProperties?: boolean;
      properties: Record<string, { enum?: string[] }>;
      required?: string[];
    };

    expect(dictionaryClientEntrySchema.additionalProperties).toBe(false);
    expect(Object.keys(dictionaryClientEntrySchema.properties).sort()).toEqual(
      [
        "dialectMeanings",
        "dialects",
        "etym",
        "genderedMeanings",
        "greekContext",
        "headword",
        "id",
        "inflections",
        "relations",
        "senses",
      ].sort(),
    );
    expect((dictionaryClientEntrySchema.required ?? []).sort()).toEqual(
      ["dialects", "etym", "headword", "id", "senses"].sort(),
    );
    expect(
      (
        document.components.schemas.DictionaryRelation as {
          properties: Record<string, unknown>;
        }
      ).properties,
    ).toHaveProperty("targetEntry");
    expect(dictionaryClientEntrySchema.properties.etym?.enum).toEqual([
      "Egy",
      "Gr",
      "Lat",
      "Sem",
      "Unknown",
    ]);
    expect(
      (
        document.components.schemas.DictionarySense as {
          properties: Record<string, { items?: { enum?: string[] } }>;
          required?: string[];
        }
      ).required ?? [],
    ).toContain("grammar");
    expect(
      (
        document.components.schemas.DictionarySense as {
          properties: Record<string, { items?: { enum?: string[] } }>;
        }
      ).properties.dialects.items?.enum,
    ).toEqual([...DICTIONARY_DIALECT_CODES]);
    expect(
      (
        document.components.schemas.DictionarySenseGrammar as {
          properties: Record<string, { items?: { enum?: string[] } }>;
          required?: string[];
        }
      ).required ?? [],
    ).toContain("pos");
    expect(
      (
        document.components.schemas.DictionarySenseGrammar as {
          properties: {
            prepGovernment: {
              properties: {
                S: { items: { enum: string[] } };
                B: { items: { enum: string[] } };
              };
            };
          };
        }
      ).properties.prepGovernment.properties.S.items.enum,
    ).toEqual([...DICTIONARY_PREP_GOVERNMENT_FOR_DIALECT.S]);
    expect(
      (
        document.components.schemas.DictionarySenseGrammar as {
          properties: {
            prepGovernment: {
              properties: {
                S: { items: { enum: string[] } };
                B: { items: { enum: string[] } };
              };
            };
          };
        }
      ).properties.prepGovernment.properties.B.items.enum,
    ).toEqual([...DICTIONARY_PREP_GOVERNMENT_FOR_DIALECT.B]);
    expect(
      (
        document.components.schemas.DictionarySenseGrammar as {
          properties: Record<string, { items?: { enum?: string[] } }>;
        }
      ).properties.complementizerGovernment.items?.enum,
    ).toEqual([...DICTIONARY_COMPLEMENTIZER_GOVERNMENT_FORMS]);
    expect(
      (
        document.components.schemas.DictionarySenseGrammar as {
          properties: Record<string, { items?: { enum?: string[] } }>;
        }
      ).properties.constructionGovernment.items?.enum,
    ).toEqual([...DICTIONARY_CONSTRUCTION_GOVERNMENT_FORMS]);
    expect(
      (
        document.components.schemas.DictionarySenses as {
          type?: string;
        }
      ).type,
    ).toBe("array");
    const dictionaryDialectFormsSchema = document.components.schemas
      .DictionaryDialectForms as {
      additionalProperties?: boolean;
      properties: Record<string, unknown>;
    };

    expect(dictionaryDialectFormsSchema.additionalProperties).toBe(false);
    expect(Object.keys(dictionaryDialectFormsSchema.properties).sort()).toEqual(
      [
        "absolute",
        "nominal",
        "participles",
        "pronominal",
        "stative",
        "variants",
      ].sort(),
    );
  });
});
