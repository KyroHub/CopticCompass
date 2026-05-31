import { streamText, type UIMessage } from "ai";

import { getGeminiModel } from "@/lib/gemini";
import { createHfChatCompletion } from "@/lib/hf";
import { createOpenRouterChatCompletion } from "@/lib/openrouter";
import { createThothChatCompletion } from "@/lib/thoth";

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

async function createOpenRouterAssistantResponse(
  options: Pick<
    ShenuteAssistantResponseOptions,
    "latestMessageText" | "messages" | "shenuteSessionId" | "systemPrompt"
  >,
) {
  const completion = await createOpenRouterChatCompletion(
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
      options.shenuteSessionId,
      responseText,
      openRouterMessage.reasoning_details,
    );
  }

  return createStaticAssistantStream(responseText);
}

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

async function createHuggingFaceResponseWithFallback(
  options: ShenuteAssistantResponseOptions,
) {
  try {
    const completion = await createHfChatCompletion([
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
    const completion = await createThothChatCompletion({
      query: buildThothQuery(options.systemPrompt, options.messages),
      user: options.authenticatedUserId,
    });

    const responseText =
      typeof completion.answer === "string" &&
      completion.answer.trim().length > 0
        ? completion.answer
        : "I could not generate a response from Shenute AI Expert right now.";

    return createStaticAssistantStream(responseText);
  }

  return createHuggingFaceResponseWithFallback(options);
}
