import { describe, expect, it } from "vitest";

import {
  getAiProviderTokenStatus,
  getConfiguredAiProviderLabels,
  hasAiProviderToken,
} from "./providerStatus";

describe("AI provider status primitives", () => {
  it("returns configured provider labels in dashboard display order", () => {
    expect(
      getConfiguredAiProviderLabels({
        GEMINI_API_KEY: "gemini-token",
        HF_TOKEN: "hf-token",
        OPENROUTER_API_KEY: "openrouter-token",
      }),
    ).toEqual(["Hugging Face", "Gemini", "OpenRouter"]);
  });

  it("ignores missing and empty provider tokens", () => {
    expect(
      getConfiguredAiProviderLabels({
        GEMINI_API_KEY: "",
        HF_TOKEN: undefined,
        OPENROUTER_API_KEY: "openrouter-token",
      }),
    ).toEqual(["OpenRouter"]);
  });

  it("summarizes configured providers for the RAG status response", () => {
    expect(
      getAiProviderTokenStatus({
        GEMINI_API_KEY: "gemini-token",
        HF_TOKEN: "hf-token",
      }),
    ).toEqual({
      configured: true,
      embeddingNote: "Provider token available",
      providerLabel: "Hugging Face + Gemini",
    });
  });

  it("summarizes the unconfigured provider state", () => {
    expect(getAiProviderTokenStatus({})).toEqual({
      configured: false,
      embeddingNote: "No provider token found",
      providerLabel: "No LLM providers configured",
    });
  });

  it("checks individual provider token availability", () => {
    const env = {
      GEMINI_API_KEY: "gemini-token",
      OPENROUTER_API_KEY: "",
      THOTH_API_KEY: "thoth-token",
    };

    expect(hasAiProviderToken(env, "gemini")).toBe(true);
    expect(hasAiProviderToken(env, "openrouter")).toBe(false);
    expect(hasAiProviderToken(env, "thoth")).toBe(true);
    expect(hasAiProviderToken(env, "hf")).toBe(false);
  });
});
