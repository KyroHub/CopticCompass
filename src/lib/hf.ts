export type HfChatMessage = {
  content: string;
  role: "assistant" | "system" | "user";
};

const HF_ROUTER_BASE_URL = "https://router.huggingface.co/v1";
const HF_CHAT_MODEL =
  process.env.HF_CHAT_MODEL ?? "google/gemma-4-31B-it:novita";
export const HF_EMBEDDING_MODEL =
  process.env.HF_EMBEDDING_MODEL ?? "sentence-transformers/all-mpnet-base-v2";
const HF_CHAT_TIMEOUT_MS = Number(process.env.HF_CHAT_TIMEOUT_MS ?? "45000");
const HF_CHAT_MAX_RETRIES = Number(process.env.HF_CHAT_MAX_RETRIES ?? "3");
const HF_CHAT_RETRY_BASE_MS = Number(
  process.env.HF_CHAT_RETRY_BASE_MS ?? "1500",
);
const HF_EMBEDDING_TIMEOUT_MS = Number(
  process.env.HF_EMBEDDING_TIMEOUT_MS ?? "120000",
);
const HF_EMBEDDING_MAX_RETRIES = Number(
  process.env.HF_EMBEDDING_MAX_RETRIES ?? "3",
);
const HF_EMBEDDING_RETRY_BASE_MS = Number(
  process.env.HF_EMBEDDING_RETRY_BASE_MS ?? "1500",
);

function getRequiredHfToken() {
  const token = process.env.HF_TOKEN;
  if (!token) {
    throw new Error("HF_TOKEN is not configured in environment variables.");
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
    normalized.includes("socket")
  );
}

function getErrorStatusCode(error: unknown): number | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const candidate = error as { status?: unknown; cause?: unknown };
  if (typeof candidate.status === "number") {
    return candidate.status;
  }

  if (candidate.cause && typeof candidate.cause === "object") {
    const cause = candidate.cause as { status?: unknown };
    if (typeof cause.status === "number") {
      return cause.status;
    }
  }

  return undefined;
}

function isRetryableChatError(error: unknown): boolean {
  const status = getErrorStatusCode(error);
  if (status === 429 || status === 503 || status === 504) {
    return true;
  }

  return shouldRetryNetworkError(error);
}

function retryDelayForChatAttempt(error: unknown, attempt: number): number {
  if (!error || typeof error !== "object") {
    return HF_CHAT_RETRY_BASE_MS * attempt;
  }

  const headers = (error as { headers?: unknown }).headers;
  if (headers instanceof Headers) {
    const retryAfterHeader = headers.get("retry-after");
    if (retryAfterHeader) {
      const retryAfterSeconds = Number(retryAfterHeader);
      if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
        return retryAfterSeconds * 1000;
      }
    }
  }

  return HF_CHAT_RETRY_BASE_MS * attempt;
}

async function featureExtractionWithRetry(
  inputs: string | string[],
): Promise<unknown> {
  const { InferenceClient } = await import("@huggingface/inference");
  const client = new InferenceClient(getRequiredHfToken());

  for (let attempt = 1; attempt <= HF_EMBEDDING_MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, HF_EMBEDDING_TIMEOUT_MS);

    try {
      return await client.featureExtraction(
        {
          model: HF_EMBEDDING_MODEL,
          inputs,
          provider: "hf-inference",
        },
        {
          retry_on_error: true,
          signal: controller.signal,
        },
      );
    } catch (error) {
      if (
        attempt >= HF_EMBEDDING_MAX_RETRIES ||
        !shouldRetryNetworkError(error)
      ) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          `HF embedding request failed after ${attempt} attempt(s): ${message}`,
        );
      }

      await delay(HF_EMBEDDING_RETRY_BASE_MS * attempt);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("HF feature extraction failed after retries.");
}

function isNumberArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((entry) => typeof entry === "number" && Number.isFinite(entry))
  );
}

function meanPoolTokenEmbeddings(tokenEmbeddings: number[][]): number[] {
  if (tokenEmbeddings.length === 0 || tokenEmbeddings[0].length === 0) {
    throw new Error("HF featureExtraction returned empty token embeddings.");
  }

  const dims = tokenEmbeddings[0].length;
  const pooled = new Array<number>(dims).fill(0);

  for (const tokenEmbedding of tokenEmbeddings) {
    if (tokenEmbedding.length !== dims) {
      throw new Error(
        "HF featureExtraction returned inconsistent token dimensions.",
      );
    }

    for (let index = 0; index < dims; index += 1) {
      pooled[index] += tokenEmbedding[index];
    }
  }

  const divisor = tokenEmbeddings.length;
  for (let index = 0; index < dims; index += 1) {
    pooled[index] /= divisor;
  }

  return pooled;
}

function normalizeSingleEmbeddingOutput(output: unknown): number[] {
  if (isNumberArray(output)) {
    return output;
  }

  if (
    Array.isArray(output) &&
    output.length > 0 &&
    output.every((entry) => isNumberArray(entry))
  ) {
    return meanPoolTokenEmbeddings(output as number[][]);
  }

  if (
    Array.isArray(output) &&
    output.length > 0 &&
    Array.isArray(output[0]) &&
    (output[0] as unknown[]).every((entry) => isNumberArray(entry))
  ) {
    return meanPoolTokenEmbeddings(output[0] as number[][]);
  }

  throw new Error(
    "HF featureExtraction returned an unsupported embedding shape.",
  );
}

function normalizeBatchEmbeddingOutput(
  output: unknown,
  expectedCount: number,
): number[][] {
  if (expectedCount <= 0) {
    return [];
  }

  if (expectedCount === 1) {
    return [normalizeSingleEmbeddingOutput(output)];
  }

  if (
    Array.isArray(output) &&
    output.length === expectedCount &&
    output.every((entry) => isNumberArray(entry))
  ) {
    return output as number[][];
  }

  if (
    Array.isArray(output) &&
    output.length === expectedCount &&
    output.every(
      (entry) =>
        Array.isArray(entry) &&
        entry.length > 0 &&
        (entry as unknown[]).every((tokenEmbedding) =>
          isNumberArray(tokenEmbedding),
        ),
    )
  ) {
    return (output as number[][][]).map((tokenEmbeddings) =>
      meanPoolTokenEmbeddings(tokenEmbeddings),
    );
  }

  throw new Error(
    "HF featureExtraction returned an invalid batch embedding format.",
  );
}

export async function createHfChatCompletion(messages: HfChatMessage[]) {
  const { OpenAI } = await import("openai");

  const client = new OpenAI({
    baseURL: HF_ROUTER_BASE_URL,
    apiKey: getRequiredHfToken(),
    timeout: HF_CHAT_TIMEOUT_MS,
  });

  let lastError: unknown;

  for (let attempt = 1; attempt <= HF_CHAT_MAX_RETRIES; attempt += 1) {
    try {
      return await client.chat.completions.create({
        model: HF_CHAT_MODEL,
        messages,
      });
    } catch (error) {
      lastError = error;
      if (attempt >= HF_CHAT_MAX_RETRIES || !isRetryableChatError(error)) {
        throw error;
      }

      await delay(retryDelayForChatAttempt(error, attempt));
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : "Unknown HF chat error";
  throw new Error(`HF chat completion failed after retries: ${message}`);
}

export async function generateHFEmbeddings(
  texts: string[],
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const output = await featureExtractionWithRetry(
    texts.length === 1 ? texts[0] : texts,
  );

  return normalizeBatchEmbeddingOutput(output, texts.length);
}
