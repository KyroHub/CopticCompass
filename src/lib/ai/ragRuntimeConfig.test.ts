import { describe, expect, it } from "vitest";

import {
  DEFAULT_GEMINI_EMBEDDING_OUTPUT_DIMENSION,
  DEFAULT_RAG_VECTOR_DIMENSIONS,
  getRagVectorRuntimeConfig,
} from "./ragRuntimeConfig";

describe("RAG runtime config primitives", () => {
  it("returns the default vector runtime config", () => {
    expect(getRagVectorRuntimeConfig({})).toEqual({
      geminiEmbeddingOutputDimension: DEFAULT_GEMINI_EMBEDDING_OUTPUT_DIMENSION,
      vectorDimensions: DEFAULT_RAG_VECTOR_DIMENSIONS,
    });
  });

  it("reads configured vector runtime dimensions", () => {
    expect(
      getRagVectorRuntimeConfig({
        GEMINI_EMBEDDING_OUTPUT_DIMENSION: "1024",
        RAG_VECTOR_DIMENSIONS: "1536",
      }),
    ).toEqual({
      geminiEmbeddingOutputDimension: 1024,
      vectorDimensions: 1536,
    });
  });
});
