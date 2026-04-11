import { createGoogleGenerativeAI } from "@ai-sdk/google";

const GEMINI_CHAT_MODEL = process.env.GEMINI_CHAT_MODEL ?? "gemma-3-27b-it";
export const GEMINI_EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-2-preview";

let cachedGoogleAI: ReturnType<typeof createGoogleGenerativeAI> | null = null;

function getGoogleAI() {
  if (cachedGoogleAI) {
    return cachedGoogleAI;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  cachedGoogleAI = createGoogleGenerativeAI({ apiKey });
  return cachedGoogleAI;
}

export function getGeminiModel() {
  return getGoogleAI()(GEMINI_CHAT_MODEL);
}

export function getGeminiEmbeddingModel() {
  return getGoogleAI().embedding(GEMINI_EMBEDDING_MODEL);
}
