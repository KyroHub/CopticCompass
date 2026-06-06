import { hasAiProviderToken } from "@/lib/ai/providerStatus";

import type { InferenceProvider, RagInferenceProvider } from "./chatTypes";

export function hasGeminiConfigured() {
  return hasAiProviderToken(process.env, "gemini");
}

export function hasOpenRouterConfigured() {
  return hasAiProviderToken(process.env, "openrouter");
}

export function toOptionalInferenceProvider(
  value: unknown,
): InferenceProvider | undefined {
  if (value === "gemini") {
    return "gemini";
  }

  if (value === "gemini_nmt") {
    return "gemini_nmt";
  }

  if (value === "hf") {
    return "hf";
  }

  if (value === "openrouter") {
    return "openrouter";
  }

  if (value === "thoth") {
    return "thoth";
  }

  return undefined;
}

export function toRagInferenceProvider(
  value: InferenceProvider,
): RagInferenceProvider {
  if (value === "thoth") {
    return "openrouter";
  }

  if (value === "gemini_nmt") {
    return "gemini";
  }

  return value;
}
