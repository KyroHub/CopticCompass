import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type UIMessage,
} from "ai";

import { getGeminiModel } from "@/lib/gemini";
import { createHfChatCompletion, type HfChatMessage } from "@/lib/hf";
import {
  createOpenRouterChatCompletion,
  type OpenRouterChatMessage,
} from "@/lib/openrouter";
import { getAuthenticatedUser } from "@/lib/supabase/authQueries";
import { hasSupabaseRuntimeEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;
export const runtime = "nodejs";

type InferenceProvider = "gemini" | "hf" | "openrouter";

type OpenRouterReasoningCacheEntry = {
  updatedAt: number;
  byAssistantContent: Map<string, unknown>;
};

type GlobalWithOpenRouterReasoningStore = typeof globalThis & {
  __copticOpenRouterReasoningStore?: Map<string, OpenRouterReasoningCacheEntry>;
};

const OPENROUTER_REASONING_TTL_MS = 4 * 60 * 60 * 1000;

function getOpenRouterReasoningStore() {
  const globalWithStore = globalThis as GlobalWithOpenRouterReasoningStore;
  if (!globalWithStore.__copticOpenRouterReasoningStore) {
    globalWithStore.__copticOpenRouterReasoningStore = new Map();
  }

  return globalWithStore.__copticOpenRouterReasoningStore;
}

function pruneOpenRouterReasoningStore(
  store: Map<string, OpenRouterReasoningCacheEntry>,
) {
  const now = Date.now();

  for (const [chatId, entry] of store.entries()) {
    if (now - entry.updatedAt > OPENROUTER_REASONING_TTL_MS) {
      store.delete(chatId);
    }
  }
}

function getCachedReasoningDetails(chatId: string, assistantContent: string) {
  const store = getOpenRouterReasoningStore();
  pruneOpenRouterReasoningStore(store);
  const entry = store.get(chatId);
  if (!entry) {
    return undefined;
  }

  entry.updatedAt = Date.now();
  return entry.byAssistantContent.get(assistantContent);
}

function cacheReasoningDetails(
  chatId: string,
  assistantContent: string,
  reasoningDetails: unknown,
) {
  if (!assistantContent || typeof reasoningDetails === "undefined") {
    return;
  }

  const store = getOpenRouterReasoningStore();
  pruneOpenRouterReasoningStore(store);
  const entry =
    store.get(chatId) ??
    ({
      updatedAt: Date.now(),
      byAssistantContent: new Map<string, unknown>(),
    } satisfies OpenRouterReasoningCacheEntry);

  entry.byAssistantContent.set(assistantContent, reasoningDetails);
  entry.updatedAt = Date.now();
  store.set(chatId, entry);
}

type PageContext = {
  excerpt?: string;
  path?: string;
  title?: string;
  url?: string;
};

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

function getUnknownErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function isRateLimitError(error: unknown): boolean {
  const status = getErrorStatusCode(error);
  if (status === 429) {
    return true;
  }

  const message = getUnknownErrorMessage(error).toLowerCase();
  return message.includes("429") || message.includes("rate limit");
}

function hasGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

function hasOpenRouterConfigured() {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

function extractMessageText(message: UIMessage): string {
  const candidate = message as { content?: unknown };
  if ("content" in candidate && typeof candidate.content === "string") {
    return candidate.content;
  }

  if (!Array.isArray(message.parts)) {
    return "";
  }

  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function toOpenAiMessages(messages: UIMessage[]): HfChatMessage[] {
  const openAiMessages: HfChatMessage[] = [];

  for (const message of messages) {
    const content = extractMessageText(message);
    if (!content) {
      continue;
    }

    if (message.role === "user") {
      openAiMessages.push({ role: "user", content });
      continue;
    }

    if (message.role === "assistant") {
      openAiMessages.push({ role: "assistant", content });
      continue;
    }

    if (message.role === "system") {
      openAiMessages.push({ role: "system", content });
    }
  }

  return openAiMessages;
}

function getMessageReasoningDetails(message: UIMessage): unknown {
  const candidate = message as {
    metadata?: unknown;
    reasoning_details?: unknown;
  };

  if (
    candidate.metadata &&
    typeof candidate.metadata === "object" &&
    "reasoning_details" in candidate.metadata
  ) {
    return (candidate.metadata as { reasoning_details?: unknown })
      .reasoning_details;
  }

  if ("reasoning_details" in candidate) {
    return candidate.reasoning_details;
  }

  return undefined;
}

function toOpenRouterMessages(
  messages: UIMessage[],
  chatId: string,
): OpenRouterChatMessage[] {
  const openRouterMessages: OpenRouterChatMessage[] = [];

  for (const message of messages) {
    const content = extractMessageText(message);
    if (!content) {
      continue;
    }

    if (message.role === "system") {
      openRouterMessages.push({ role: "system", content });
      continue;
    }

    if (message.role === "user") {
      openRouterMessages.push({ role: "user", content });
      continue;
    }

    if (message.role === "assistant") {
      const reasoningDetails =
        getMessageReasoningDetails(message) ??
        getCachedReasoningDetails(chatId, content);

      openRouterMessages.push({
        role: "assistant",
        content,
        ...(typeof reasoningDetails !== "undefined"
          ? { reasoning_details: reasoningDetails }
          : {}),
      });
    }
  }

  return openRouterMessages;
}

function toInferenceProvider(value: unknown): InferenceProvider {
  if (value === "gemini") {
    return "gemini";
  }

  if (value === "hf") {
    return "hf";
  }

  if (value === "openrouter") {
    return "openrouter";
  }

  return "gemini";
}

function createStaticAssistantStream(responseText: string) {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const textPartId = crypto.randomUUID();

      writer.write({ type: "start" });
      writer.write({ type: "start-step" });
      writer.write({ type: "text-start", id: textPartId });
      writer.write({ type: "text-delta", id: textPartId, delta: responseText });
      writer.write({ type: "text-end", id: textPartId });
      writer.write({ type: "finish-step" });
      writer.write({ type: "finish", finishReason: "stop" });
    },
  });

  return createUIMessageStreamResponse({ stream });
}

function toPageContext(value: unknown): PageContext {
  if (!value || typeof value !== "object") {
    return {};
  }

  const candidate = value as {
    excerpt?: unknown;
    path?: unknown;
    title?: unknown;
    url?: unknown;
  };

  const excerpt =
    typeof candidate.excerpt === "string"
      ? candidate.excerpt.replace(/\s+/g, " ").trim().slice(0, 2500)
      : undefined;
  const path =
    typeof candidate.path === "string"
      ? candidate.path.replace(/\s+/g, " ").trim().slice(0, 200)
      : undefined;
  const title =
    typeof candidate.title === "string"
      ? candidate.title.replace(/\s+/g, " ").trim().slice(0, 300)
      : undefined;
  const url =
    typeof candidate.url === "string"
      ? candidate.url.replace(/\s+/g, " ").trim().slice(0, 400)
      : undefined;

  return {
    excerpt,
    path,
    title,
    url,
  };
}

export async function POST(req: Request) {
  try {
    if (!hasSupabaseRuntimeEnv()) {
      return new Response(
        JSON.stringify({
          error: "Shenute AI chat is unavailable right now.",
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const supabase = await createClient();
    const authenticatedUser = await getAuthenticatedUser(supabase);

    if (!authenticatedUser) {
      return new Response(
        JSON.stringify({ error: "Sign in required to use Shenute AI chat." }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const payload: {
      id?: unknown;
      inferenceProvider?: unknown;
      messages: UIMessage[];
      pageContext?: unknown;
    } = await req.json();
    const { messages } = payload;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "No messages provided." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const inferenceProvider = toInferenceProvider(payload.inferenceProvider);
    const chatId =
      typeof payload.id === "string" && payload.id.trim().length > 0
        ? payload.id.trim()
        : "default";
    const pageContext = toPageContext(payload.pageContext);

    const latestMessage = messages[messages.length - 1];
    const latestMessageText = extractMessageText(latestMessage);

    let contextText = "";
    try {
      // TODO: wire vector lookup against coptic_documents when retrieval query is finalized.
      contextText = "Vector search is deferred pending exact query mechanisms.";
    } catch (error) {
      console.error("Vector search failed:", error);
    }

    const systemPrompt = `You are "Shenute AI", an expert scholar in the Coptic language (Sahidic/Bohairic dialects).
You are an intelligent assistant designed to help users learn, translate, and understand Coptic.
You have access to the Comprehensive Coptic Lexicon.

  The user is currently viewing this page on the website:
  - Path: ${pageContext.path ?? "unknown"}
  - Title: ${pageContext.title ?? "unknown"}
  - URL: ${pageContext.url ?? "unknown"}

  Visible text excerpt from the opened page:
  ${pageContext.excerpt && pageContext.excerpt.length > 0 ? pageContext.excerpt : "No page excerpt provided."}

Context relevant to the user's query:
${contextText}
`;

    if (inferenceProvider === "gemini") {
      const result = streamText({
        model: getGeminiModel(),
        system: systemPrompt,
        messages: await convertToModelMessages(messages),
      });

      return result.toUIMessageStreamResponse({
        onError: (error) => {
          if (error instanceof Error) {
            return error.message;
          }

          return "Unknown Gemini streaming error.";
        },
      });
    }

    if (inferenceProvider === "openrouter") {
      const completion = await createOpenRouterChatCompletion(
        [
          { role: "system" as const, content: systemPrompt },
          ...toOpenRouterMessages(messages, chatId),
          ...(latestMessageText
            ? []
            : [
                {
                  role: "user" as const,
                  content: "Please answer the latest user request.",
                },
              ]),
        ],
        { enableReasoning: true },
      );

      const openRouterMessage = completion?.choices?.[0]?.message as
        | {
            content?: string | null;
            reasoning_details?: unknown;
          }
        | undefined;
      const assistantText = openRouterMessage?.content;

      const responseText =
        typeof assistantText === "string" && assistantText.trim().length > 0
          ? assistantText
          : "I could not generate a response from OpenRouter right now.";

      if (typeof openRouterMessage?.reasoning_details !== "undefined") {
        cacheReasoningDetails(
          chatId,
          responseText,
          openRouterMessage.reasoning_details,
        );
      }

      return createStaticAssistantStream(responseText);
    }

    try {
      const completion = await createHfChatCompletion([
        { role: "system" as const, content: systemPrompt },
        ...toOpenAiMessages(messages),
        ...(latestMessageText
          ? []
          : [
              {
                role: "user" as const,
                content: "Please answer the latest user request.",
              },
            ]),
      ]);

      const assistantText = completion.choices[0]?.message?.content;
      const responseText =
        typeof assistantText === "string" && assistantText.trim().length > 0
          ? assistantText
          : "I could not generate a response from Hugging Face right now.";

      return createStaticAssistantStream(responseText);
    } catch (hfError) {
      if (!isRateLimitError(hfError)) {
        throw hfError;
      }

      console.warn("HF rate-limited, attempting provider fallback.", hfError);

      if (hasGeminiConfigured()) {
        try {
          const fallbackResult = streamText({
            model: getGeminiModel(),
            system: systemPrompt,
            messages: await convertToModelMessages(messages),
          });

          return fallbackResult.toUIMessageStreamResponse({
            onError: (error) => {
              if (error instanceof Error) {
                return error.message;
              }

              return "Unknown Gemini fallback streaming error.";
            },
          });
        } catch (geminiFallbackError) {
          console.error(
            "Gemini fallback failed after HF 429:",
            geminiFallbackError,
          );
        }
      }

      if (hasOpenRouterConfigured()) {
        try {
          const fallbackCompletion = await createOpenRouterChatCompletion(
            [
              { role: "system" as const, content: systemPrompt },
              ...toOpenRouterMessages(messages, chatId),
              ...(latestMessageText
                ? []
                : [
                    {
                      role: "user" as const,
                      content: "Please answer the latest user request.",
                    },
                  ]),
            ],
            { enableReasoning: true },
          );

          const openRouterMessage = fallbackCompletion.choices?.[0]?.message;
          const assistantText = openRouterMessage?.content;
          const responseText =
            typeof assistantText === "string" && assistantText.trim().length > 0
              ? assistantText
              : "I could not generate a response from OpenRouter right now.";

          if (typeof openRouterMessage?.reasoning_details !== "undefined") {
            cacheReasoningDetails(
              chatId,
              responseText,
              openRouterMessage.reasoning_details,
            );
          }

          return createStaticAssistantStream(responseText);
        } catch (openRouterFallbackError) {
          console.error(
            "OpenRouter fallback failed after HF 429:",
            openRouterFallbackError,
          );
        }
      }

      return new Response(
        JSON.stringify({
          error:
            "Hugging Face is currently rate-limited. Please retry in a moment or switch provider.",
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown AI error.";
    console.error("AI API Error:", error);

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
