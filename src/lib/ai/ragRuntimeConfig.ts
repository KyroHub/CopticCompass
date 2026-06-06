import { readNumberEnv, type EnvSource } from "@/lib/env";

export const DEFAULT_GEMINI_EMBEDDING_OUTPUT_DIMENSION = 3072;
export const DEFAULT_RAG_VECTOR_DIMENSIONS = 768;

type RagVectorRuntimeConfig = {
  geminiEmbeddingOutputDimension: number;
  vectorDimensions: number;
};

export function getRagVectorRuntimeConfig(
  env: EnvSource,
): RagVectorRuntimeConfig {
  return {
    geminiEmbeddingOutputDimension: readNumberEnv(
      env,
      "GEMINI_EMBEDDING_OUTPUT_DIMENSION",
      DEFAULT_GEMINI_EMBEDDING_OUTPUT_DIMENSION,
    ),
    vectorDimensions: readNumberEnv(
      env,
      "RAG_VECTOR_DIMENSIONS",
      DEFAULT_RAG_VECTOR_DIMENSIONS,
    ),
  };
}
