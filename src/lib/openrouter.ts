export type OpenRouterChatMessage = {
  content: string;
  role: "assistant" | "system" | "user";
  reasoning_details?: unknown;
};

type OpenRouterChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
      reasoning_details?: unknown;
    };
  }>;
};

export const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
export const OPENROUTER_CHAT_MODEL =
  process.env.OPENROUTER_CHAT_MODEL ?? "openrouter/free";
export const OPENROUTER_EMBEDDING_MODEL =
  process.env.OPENROUTER_EMBEDDING_MODEL ??
  "nvidia/llama-nemotron-embed-vl-1b-v2:free";

const OPENROUTER_EMBEDDING_TIMEOUT_MS = Number(
  process.env.OPENROUTER_EMBEDDING_TIMEOUT_MS ?? "120000",
);
const OPENROUTER_EMBEDDING_MAX_RETRIES = Number(
  process.env.OPENROUTER_EMBEDDING_MAX_RETRIES ?? "3",
);
const OPENROUTER_EMBEDDING_RETRY_BASE_MS = Number(
  process.env.OPENROUTER_EMBEDDING_RETRY_BASE_MS ?? "1500",
);

function getRequiredOpenRouterApiKey() {
  const token = process.env.OPENROUTER_API_KEY;
  if (!token) {
    throw new Error(
      "OPENROUTER_API_KEY is not configured in environment variables.",
    );
  }

  return token;
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function shouldRetryNetworkError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? `${error.message} ${(error as { cause?: unknown }).cause ?? ""}`
      : String(error);

  const normalized = message.toLowerCase();
  return (
    normalized.includes("econnreset") ||
    normalized.includes("timeout") ||
    normalized.includes("fetch failed") ||
    normalized.includes("429") ||
    normalized.includes("503") ||
    normalized.includes("gateway")
  );
}

async function createOpenRouterClient() {
  const { OpenAI } = await import("openai");

  const referer = process.env.OPENROUTER_HTTP_REFERER?.trim();
  const appTitle = process.env.OPENROUTER_APP_TITLE?.trim();
  const defaultHeaders: Record<string, string> = {};

  if (referer) {
    defaultHeaders["HTTP-Referer"] = referer;
  }

  if (appTitle) {
    defaultHeaders["X-OpenRouter-Title"] = appTitle;
  }

  return new OpenAI({
    apiKey: getRequiredOpenRouterApiKey(),
    baseURL: OPENROUTER_BASE_URL,
    ...(Object.keys(defaultHeaders).length > 0 ? { defaultHeaders } : {}),
  });
}

export async function createOpenRouterChatCompletion(
  messages: OpenRouterChatMessage[],
  options?: { enableReasoning?: boolean },
): Promise<OpenRouterChatCompletionResponse> {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getRequiredOpenRouterApiKey()}`,
      "Content-Type": "application/json",
      ...(process.env.OPENROUTER_HTTP_REFERER
        ? { "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER }
        : {}),
      ...(process.env.OPENROUTER_APP_TITLE
        ? { "X-OpenRouter-Title": process.env.OPENROUTER_APP_TITLE }
        : {}),
    },
    body: JSON.stringify({
      model: OPENROUTER_CHAT_MODEL,
      messages,
      ...(options?.enableReasoning ? { reasoning: { enabled: true } } : {}),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenRouter chat completion failed: ${response.status} ${errorText}`,
    );
  }

  return (await response.json()) as OpenRouterChatCompletionResponse;
}

export async function generateOpenRouterEmbeddings(
  texts: string[],
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const client = await createOpenRouterClient();

  for (
    let attempt = 1;
    attempt <= OPENROUTER_EMBEDDING_MAX_RETRIES;
    attempt += 1
  ) {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, OPENROUTER_EMBEDDING_TIMEOUT_MS);

    try {
      const response = await client.embeddings.create(
        {
          model: OPENROUTER_EMBEDDING_MODEL,
          input: texts,
          encoding_format: "float",
        },
        {
          signal: controller.signal,
        },
      );

      const embeddings = response.data
        .map((entry) => entry.embedding)
        .filter(
          (embedding): embedding is number[] =>
            Array.isArray(embedding) &&
            embedding.length > 0 &&
            embedding.every(
              (value) => typeof value === "number" && Number.isFinite(value),
            ),
        );

      if (embeddings.length !== texts.length) {
        throw new Error(
          `OpenRouter embeddings returned ${embeddings.length}/${texts.length} vectors.`,
        );
      }

      return embeddings;
    } catch (error) {
      if (
        attempt >= OPENROUTER_EMBEDDING_MAX_RETRIES ||
        !shouldRetryNetworkError(error)
      ) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          `OpenRouter embedding request failed after ${attempt} attempt(s): ${message}`,
        );
      }

      await delay(OPENROUTER_EMBEDDING_RETRY_BASE_MS * attempt);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("OpenRouter embedding request failed after retries.");
}
