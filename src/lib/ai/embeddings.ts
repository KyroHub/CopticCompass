import "server-only";
import { embedMany } from "ai";

import { GEMINI_EMBEDDING_MODEL, getGeminiEmbeddingModel } from "@/lib/gemini";
import { HF_EMBEDDING_MODEL, generateHFEmbeddings } from "@/lib/hf";
import {
  OPENROUTER_EMBEDDING_MODEL,
  generateOpenRouterEmbeddings,
} from "@/lib/openrouter";

type TextEmbeddingProvider = "gemini" | "hf" | "openrouter";

type GenerateTextEmbeddingsOptions = {
  geminiOutputDimension: number;
  provider: TextEmbeddingProvider;
  values: readonly string[];
};

type TextEmbeddingsResult = {
  embeddings: number[][];
  model: string;
};

/**
 * Returns the configured provider model name stored with embedding metadata.
 */
export function getTextEmbeddingModelName(provider: TextEmbeddingProvider) {
  if (provider === "gemini") {
    return GEMINI_EMBEDDING_MODEL;
  }

  if (provider === "openrouter") {
    return OPENROUTER_EMBEDDING_MODEL;
  }

  return HF_EMBEDDING_MODEL;
}

/**
 * Returns the human-readable provider name used in logs and diagnostics.
 */
export function getTextEmbeddingProviderName(provider: TextEmbeddingProvider) {
  if (provider === "gemini") {
    return "Gemini";
  }

  if (provider === "openrouter") {
    return "OpenRouter";
  }

  return "Hugging Face";
}

/**
 * Generates text embeddings through the selected provider. Callers own
 * batching, validation, retries, and persistence so this wrapper remains a
 * narrow provider API primitive.
 */
export async function generateTextEmbeddings(
  options: GenerateTextEmbeddingsOptions,
): Promise<TextEmbeddingsResult> {
  if (options.provider === "gemini") {
    const { embeddings } = await embedMany({
      model: getGeminiEmbeddingModel(),
      values: [...options.values],
      providerOptions: {
        google: {
          outputDimensionality: options.geminiOutputDimension,
          taskType: "RETRIEVAL_DOCUMENT",
        },
      },
    });

    return {
      embeddings,
      model: GEMINI_EMBEDDING_MODEL,
    };
  }

  if (options.provider === "openrouter") {
    return {
      embeddings: await generateOpenRouterEmbeddings([...options.values]),
      model: OPENROUTER_EMBEDDING_MODEL,
    };
  }

  return {
    embeddings: await generateHFEmbeddings([...options.values]),
    model: HF_EMBEDDING_MODEL,
  };
}
