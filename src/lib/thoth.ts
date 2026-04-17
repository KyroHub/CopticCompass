type ThothChatResponse = {
  answer?: string;
  conversation_id?: string;
  id?: string;
  message_id?: string;
};

type CreateThothChatCompletionOptions = {
  inputs?: Record<string, unknown>;
  query: string;
  user: string;
};

const THOTH_BASE_URL = process.env.THOTH_BASE_URL ?? "https://api.dify.ai/v1";
const THOTH_CHAT_TIMEOUT_MS = Number(process.env.THOTH_CHAT_TIMEOUT_MS ?? "60000");
const THOTH_RESPONSE_MODE = process.env.THOTH_RESPONSE_MODE ?? "blocking";

function getRequiredThothApiKey() {
  const apiKey = process.env.THOTH_API_KEY;
  if (!apiKey) {
    throw new Error("THOTH_API_KEY is not configured in environment variables.");
  }

  return apiKey;
}

export async function createThothChatCompletion(
  options: CreateThothChatCompletionOptions,
): Promise<ThothChatResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, THOTH_CHAT_TIMEOUT_MS);

  try {
    const response = await fetch(`${THOTH_BASE_URL}/chat-messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getRequiredThothApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: options.inputs ?? {},
        query: options.query,
        response_mode: THOTH_RESPONSE_MODE,
        user: options.user,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `THOTH chat completion failed: ${response.status} ${errorText}`,
      );
    }

    return (await response.json()) as ThothChatResponse;
  } finally {
    clearTimeout(timeout);
  }
}
