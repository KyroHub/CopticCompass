import { streamText, type UIMessage } from "ai";

import {
  createHfAssistantText,
  createOpenRouterAssistantText,
  createThothAssistantText,
} from "@/lib/ai/chatCompletions";
import { getGeminiModel } from "@/lib/gemini";

import {
  createShenuteErrorResponse,
  getShenuteProviderErrorMessage,
  isRateLimitError,
} from "./chatErrors";
import {
  buildThothQuery,
  toGeminiMessages,
  toOpenAiMessages,
  toOpenRouterMessages,
} from "./messageAdapters";
import { cacheReasoningDetails } from "./openRouterReasoningCache";
import {
  hasGeminiConfigured,
  hasOpenRouterConfigured,
} from "./providerSelection";
import { createStaticAssistantStream } from "./staticAssistantStream";

import type { InferenceProvider } from "./chatTypes";

type ShenuteAssistantResponseOptions = {
  authenticatedUserId: string;
  inferenceProvider: InferenceProvider;
  latestMessageText: string;
  messages: UIMessage[];
  shenuteSessionId: string;
  systemPrompt: string;
};

/**
 * Calls OpenRouter in non-streaming mode so reasoning details can be cached
 * before the text is wrapped back into an AI SDK-compatible stream.
 */
async function createOpenRouterAssistantResponse(
  options: Pick<
    ShenuteAssistantResponseOptions,
    "latestMessageText" | "messages" | "shenuteSessionId" | "systemPrompt"
  >,
) {
  const { reasoningDetails, responseText } =
    await createOpenRouterAssistantText(
      [
        { role: "system" as const, content: options.systemPrompt },
        ...toOpenRouterMessages(options.messages, options.shenuteSessionId),
        ...(options.latestMessageText
          ? []
          : [
              {
                role: "user" as const,
                content: "Please answer the latest user request.",
              },
            ]),
      ],
      {
        enableReasoning: true,
        fallbackText:
          "I could not generate a response from OpenRouter right now.",
      },
    );

  if (typeof reasoningDetails !== "undefined") {
    cacheReasoningDetails(
      options.shenuteSessionId,
      responseText,
      reasoningDetails,
    );
  }

  return createStaticAssistantStream(responseText);
}

/**
 * Uses Gemini's native streaming path and maps provider failures through the
 * shared Shenute public-error copy.
 */
function createGeminiStreamResponse(
  options: Pick<ShenuteAssistantResponseOptions, "messages" | "systemPrompt">,
  logPrefix = "Gemini streaming failed:",
) {
  const result = streamText({
    model: getGeminiModel(),
    system: options.systemPrompt,
    messages: toGeminiMessages(options.messages),
  });

  return result.toUIMessageStreamResponse({
    onError: (error) => getShenuteProviderErrorMessage(error, logPrefix),
  });
}

/**
 * Handles the Hugging Face provider path and falls back to configured Gemini or
 * OpenRouter providers only for HF rate-limit failures.
 */
async function createHuggingFaceResponseWithFallback(
  options: ShenuteAssistantResponseOptions,
) {
  try {
    const { responseText } = await createHfAssistantText(
      [
        { role: "system" as const, content: options.systemPrompt },
        ...toOpenAiMessages(options.messages),
        ...(options.latestMessageText
          ? []
          : [
              {
                role: "user" as const,
                content: "Please answer the latest user request.",
              },
            ]),
      ],
      {
        fallbackText:
          "I could not generate a response from Hugging Face right now.",
      },
    );

    return createStaticAssistantStream(responseText);
  } catch (hfError) {
    if (!isRateLimitError(hfError)) {
      throw hfError;
    }

    console.warn("HF rate-limited, attempting provider fallback.", hfError);

    if (hasGeminiConfigured()) {
      try {
        return createGeminiStreamResponse(
          options,
          "Gemini fallback streaming failed:",
        );
      } catch (geminiFallbackError) {
        console.error(
          "Gemini fallback failed after HF 429:",
          geminiFallbackError,
        );
      }
    }

    if (hasOpenRouterConfigured()) {
      try {
        return createOpenRouterAssistantResponse(options);
      } catch (openRouterFallbackError) {
        console.error(
          "OpenRouter fallback failed after HF 429:",
          openRouterFallbackError,
        );
      }
    }

    return createShenuteErrorResponse("rate_limited", 429);
  }
}

/**
 * Routes a Shenute request to the selected provider while normalizing every
 * provider's output into a UI message stream response.
 */
export async function createShenuteAssistantResponse(
  options: ShenuteAssistantResponseOptions,
) {
  if (
    options.inferenceProvider === "gemini" ||
    options.inferenceProvider === "gemini_nmt"
  ) {
    return createGeminiStreamResponse(options);
  }

  if (options.inferenceProvider === "openrouter") {
    return createOpenRouterAssistantResponse(options);
  }

  if (options.inferenceProvider === "thoth") {
    const { responseText } = await createThothAssistantText({
      fallbackText:
        "I could not generate a response from Shenute AI Expert right now.",
      query: buildThothQuery(options.systemPrompt, options.messages),
      user: options.authenticatedUserId,
    });

    return createStaticAssistantStream(responseText);
  }

  return createHuggingFaceResponseWithFallback(options);
}
