import type { InferenceProvider, RagInferenceProvider } from "./chatTypes";

export function hasGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function hasOpenRouterConfigured() {
  return Boolean(process.env.OPENROUTER_API_KEY);
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
