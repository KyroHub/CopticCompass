import type { UIMessage } from "ai";

export type InferenceProvider =
  | "gemini"
  | "gemini_nmt"
  | "hf"
  | "openrouter"
  | "thoth";

export type RagInferenceProvider = "gemini" | "hf" | "openrouter";

export type PageContext = {
  excerpt?: string;
  path?: string;
  title?: string;
  url?: string;
};

export type ShenuteChatRequestPayload = {
  id?: unknown;
  inferenceProvider?: unknown;
  messages: UIMessage[];
  pageContext?: unknown;
};

export type ContextDoc = {
  content: string;
  metadata?: Record<string, unknown> | null;
};
