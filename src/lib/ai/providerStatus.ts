type AiProviderStatusEnv = Record<string, string | undefined>;
type AiProviderToken = "gemini" | "hf" | "openrouter" | "thoth";

export type AiProviderTokenStatus = {
  configured: boolean;
  embeddingNote: string;
  providerLabel: string;
};

const AI_PROVIDER_TOKEN_ENV_KEYS = {
  gemini: "GEMINI_API_KEY",
  hf: "HF_TOKEN",
  openrouter: "OPENROUTER_API_KEY",
  thoth: "THOTH_API_KEY",
} as const satisfies Record<AiProviderToken, string>;

const AI_PROVIDER_ENV_KEYS = [
  {
    envKey: "HF_TOKEN",
    label: "Hugging Face",
  },
  {
    envKey: "GEMINI_API_KEY",
    label: "Gemini",
  },
  {
    envKey: "OPENROUTER_API_KEY",
    label: "OpenRouter",
  },
] as const;

export function hasAiProviderToken(
  env: AiProviderStatusEnv,
  provider: AiProviderToken,
) {
  return Boolean(env[AI_PROVIDER_TOKEN_ENV_KEYS[provider]]);
}

export function getConfiguredAiProviderLabels(env: AiProviderStatusEnv) {
  return AI_PROVIDER_ENV_KEYS.flatMap(({ envKey, label }) =>
    env[envKey] ? [label] : [],
  );
}

export function getAiProviderTokenStatus(
  env: AiProviderStatusEnv,
): AiProviderTokenStatus {
  const configuredProviderLabels = getConfiguredAiProviderLabels(env);
  const configured = configuredProviderLabels.length > 0;

  return {
    configured,
    embeddingNote: configured
      ? "Provider token available"
      : "No provider token found",
    providerLabel: configured
      ? configuredProviderLabels.join(" + ")
      : "No LLM providers configured",
  };
}
