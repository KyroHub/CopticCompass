import type {
  ChatCompletionMessage,
  ReasoningChatCompletionMessage,
} from "@/lib/ai/chatCompletions";

import { getCachedReasoningDetails } from "./openRouterReasoningCache";

import type { UIMessage } from "ai";

export function extractMessageText(message: UIMessage): string {
  const candidate = message as { content?: unknown };
  if (typeof candidate.content === "string") {
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

export function toOpenAiMessages(
  messages: UIMessage[],
): ChatCompletionMessage[] {
  const openAiMessages: ChatCompletionMessage[] = [];

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

export function toGeminiMessages(messages: UIMessage[]) {
  return messages
    .map((message) => {
      const content = extractMessageText(message).trim();
      if (!content) {
        return undefined;
      }

      if (
        message.role === "system" ||
        message.role === "user" ||
        message.role === "assistant"
      ) {
        return { role: message.role, content };
      }

      return undefined;
    })
    .filter(
      (
        message,
      ): message is {
        role: "system" | "user" | "assistant";
        content: string;
      } => typeof message !== "undefined",
    );
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

export function toOpenRouterMessages(
  messages: UIMessage[],
  shenuteSessionId: string,
): ReasoningChatCompletionMessage[] {
  const openRouterMessages: ReasoningChatCompletionMessage[] = [];

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
        getCachedReasoningDetails(shenuteSessionId, content);

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

export function buildThothQuery(systemPrompt: string, messages: UIMessage[]) {
  const history = toOpenAiMessages(messages)
    .slice(-10)
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n\n");

  return [
    "Follow the instructions below exactly.",
    "[SYSTEM INSTRUCTIONS]",
    systemPrompt,
    "[CONVERSATION HISTORY]",
    history.length > 0 ? history : "No prior history provided.",
    "[TASK] Reply to the latest user request using the instructions and context above.",
  ].join("\n\n");
}
