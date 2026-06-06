import "server-only";

import { createHfChatCompletion } from "@/lib/hf";
import { createOpenRouterChatCompletion } from "@/lib/openrouter";
import { createThothChatCompletion } from "@/lib/thoth";

export type ChatCompletionMessage = {
  content: string;
  role: "assistant" | "system" | "user";
};

export type ReasoningChatCompletionMessage = ChatCompletionMessage & {
  reasoning_details?: unknown;
};

type AssistantTextOptions = {
  fallbackText: string;
};

type OpenRouterAssistantTextOptions = AssistantTextOptions & {
  enableReasoning?: boolean;
};

type ThothAssistantTextOptions = AssistantTextOptions & {
  inputs?: Record<string, unknown>;
  query: string;
  user: string;
};

type OpenAiLikeChatCompletion = {
  choices?: Array<{
    message?: {
      content?: string | null;
    } | null;
  } | null> | null;
};

type OpenRouterLikeChatCompletion = {
  choices?: Array<{
    message?: {
      content?: string | null;
      reasoning_details?: unknown;
    } | null;
  } | null> | null;
};

type ThothLikeChatCompletion = {
  answer?: string | null;
};

/**
 * Preserves non-empty provider text exactly as returned while falling back for
 * empty, missing, or whitespace-only completions.
 */
export function normalizeAssistantResponseText(
  candidate: unknown,
  fallbackText: string,
) {
  return typeof candidate === "string" && candidate.trim().length > 0
    ? candidate
    : fallbackText;
}

/**
 * Extracts assistant text from OpenAI-compatible chat completions.
 */
export function normalizeOpenAiChatCompletionResponse(
  completion: OpenAiLikeChatCompletion,
  fallbackText: string,
) {
  return {
    responseText: normalizeAssistantResponseText(
      completion.choices?.[0]?.message?.content,
      fallbackText,
    ),
  };
}

/**
 * Extracts assistant text plus optional reasoning details from OpenRouter chat
 * completions.
 */
export function normalizeOpenRouterChatCompletionResponse(
  completion: OpenRouterLikeChatCompletion,
  fallbackText: string,
) {
  const message = completion.choices?.[0]?.message;

  return {
    responseText: normalizeAssistantResponseText(
      message?.content,
      fallbackText,
    ),
    reasoningDetails: message?.reasoning_details,
  };
}

/**
 * Extracts assistant text from THOTH/Dify chat completion responses.
 */
export function normalizeThothChatCompletionResponse(
  completion: ThothLikeChatCompletion,
  fallbackText: string,
) {
  return {
    responseText: normalizeAssistantResponseText(
      completion.answer,
      fallbackText,
    ),
  };
}

/**
 * Calls Hugging Face and returns normalized assistant text.
 */
export async function createHfAssistantText(
  messages: readonly ChatCompletionMessage[],
  options: AssistantTextOptions,
) {
  const completion = await createHfChatCompletion([...messages]);
  return normalizeOpenAiChatCompletionResponse(
    completion,
    options.fallbackText,
  );
}

/**
 * Calls OpenRouter and returns normalized assistant text plus reasoning details
 * when the provider includes them.
 */
export async function createOpenRouterAssistantText(
  messages: readonly ReasoningChatCompletionMessage[],
  options: OpenRouterAssistantTextOptions,
) {
  const completion = await createOpenRouterChatCompletion([...messages], {
    enableReasoning: options.enableReasoning,
  });

  return normalizeOpenRouterChatCompletionResponse(
    completion,
    options.fallbackText,
  );
}

/**
 * Calls THOTH/Dify and returns normalized assistant text.
 */
export async function createThothAssistantText(
  options: ThothAssistantTextOptions,
) {
  const completion = await createThothChatCompletion({
    ...(options.inputs ? { inputs: options.inputs } : {}),
    query: options.query,
    user: options.user,
  });

  return normalizeThothChatCompletionResponse(completion, options.fallbackText);
}
