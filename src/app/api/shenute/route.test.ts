import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
};

type LoadShenuteRouteOptions = {
  hfError?: unknown;
  openRouterConfigured?: boolean;
};

function restoreEnv() {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function createShenuteRequest() {
  return new Request("https://www.copticcompass.com/api/shenute", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: "session-1",
      inferenceProvider: "hf",
      messages: [
        {
          id: "message-1",
          role: "user",
          parts: [{ type: "text", text: "Explain ⲡⲉ." }],
        },
      ],
    }),
  });
}

async function loadShenuteRoute(options?: LoadShenuteRouteOptions) {
  vi.resetModules();
  restoreEnv();
  delete process.env.GEMINI_API_KEY;
  if (options?.openRouterConfigured) {
    process.env.OPENROUTER_API_KEY = "test-openrouter-key";
  } else {
    delete process.env.OPENROUTER_API_KEY;
  }

  const createOpenRouterChatCompletionMock = vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: "OpenRouter fallback answer.",
        },
      },
    ],
  });
  const createHfChatCompletionMock = vi.fn(async () => {
    if (options?.hfError) {
      throw options.hfError;
    }

    return {
      choices: [
        {
          message: {
            content: "Hugging Face answer.",
          },
        },
      ],
    };
  });
  const createUIMessageStreamResponseMock = vi.fn(
    () =>
      new Response("mock-ui-stream", {
        headers: {
          "content-type": "text/plain",
        },
      }),
  );

  vi.doMock("ai", () => ({
    createUIMessageStream: vi.fn(() => ({ stream: true })),
    createUIMessageStreamResponse: createUIMessageStreamResponseMock,
    generateText: vi.fn().mockResolvedValue({
      text: JSON.stringify({
        germanTranslation: "",
        grammaticalConcepts: [],
        keywords: [],
        translationTarget: null,
      }),
    }),
    streamText: vi.fn(),
  }));
  vi.doMock("@/actions/vectorSearch", () => ({
    searchCopticDocuments: vi.fn().mockResolvedValue([]),
    searchVocabularyByKeywords: vi.fn().mockResolvedValue([]),
  }));
  vi.doMock("@/lib/copticTranslator", () => ({
    requestNMTTranslation: vi.fn().mockResolvedValue(null),
  }));
  vi.doMock("@/lib/distillation", () => ({
    formatNMTForDistillation: vi.fn(),
    recordDistillationExample: vi.fn().mockResolvedValue(undefined),
  }));
  vi.doMock("@/lib/gemini", () => ({
    getGeminiModel: vi.fn(() => "gemini-test-model"),
  }));
  vi.doMock("@/lib/hf", () => ({
    createHfChatCompletion: createHfChatCompletionMock,
  }));
  vi.doMock("@/lib/openrouter", () => ({
    createOpenRouterChatCompletion: createOpenRouterChatCompletionMock,
  }));
  vi.doMock("@/lib/rateLimit", () => ({
    consumeRateLimit: vi.fn().mockResolvedValue({
      ok: true,
      retryAfterMs: 0,
    }),
    getUserRateLimitIdentifier: vi.fn(() => "shenute:user-1"),
    hasAvailableRateLimitProtection: vi.fn(() => true),
  }));
  vi.doMock("@/lib/supabase/authQueries", () => ({
    getAuthenticatedUser: vi.fn().mockResolvedValue({ id: "user-1" }),
  }));
  vi.doMock("@/lib/supabase/config", () => ({
    hasSupabaseRuntimeEnv: vi.fn(() => true),
  }));
  vi.doMock("@/lib/supabase/server", () => ({
    createClient: vi.fn().mockResolvedValue({}),
  }));
  vi.doMock("@/lib/thoth", () => ({
    createThothChatCompletion: vi.fn().mockResolvedValue({
      answer: "Thoth answer.",
    }),
  }));

  const mod = await import("./route");

  return {
    ...mod,
    createHfChatCompletionMock,
    createOpenRouterChatCompletionMock,
    createUIMessageStreamResponseMock,
  };
}

describe("Shenute route error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    restoreEnv();
  });

  it("returns public fallback copy when the selected provider throws", async () => {
    const { POST } = await loadShenuteRoute({
      hfError: new Error("HF_TOKEN missing: raw provider stack"),
    });

    const response = await POST(createShenuteRequest());
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toMatchObject({
      success: false,
      code: "external_service_unavailable",
      error:
        "Shenute is having trouble answering right now. Please try again in a moment.",
    });
    expect(payload.requestId).toMatch(/^shenute_/);
    expect(JSON.stringify(payload)).not.toContain("HF_TOKEN");
    expect(JSON.stringify(payload)).not.toContain("raw provider stack");
  });

  it("falls back to OpenRouter when Hugging Face is rate limited", async () => {
    const hfRateLimitError = Object.assign(
      new Error("429 HF_TOKEN quota exhausted"),
      {
        status: 429,
      },
    );
    const { createOpenRouterChatCompletionMock, POST } = await loadShenuteRoute(
      {
        hfError: hfRateLimitError,
        openRouterConfigured: true,
      },
    );

    const response = await POST(createShenuteRequest());

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("mock-ui-stream");
    expect(createOpenRouterChatCompletionMock).toHaveBeenCalled();
  });
});
