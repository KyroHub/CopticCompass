import "server-only";
import { hasAiProviderToken } from "@/lib/ai/providerStatus";
import { tryParseJsonFromModelAnswer } from "@/lib/llm";
import { createThothChatCompletion } from "@/lib/thoth";

import { RAG_THOTH_ENABLED } from "./ragIngestionConfig";

export function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function shouldRetryNetworkError(error: unknown): boolean {
  let message: string;

  if (error instanceof Error) {
    message = `${error.message} ${(error as { cause?: unknown }).cause ?? ""}`;
  } else if (typeof error === "object" && error !== null) {
    const objectError = error as { code?: unknown; message?: unknown };
    message = `${objectError.message ?? ""} ${objectError.code ?? ""}`;
  } else {
    message = String(error);
  }

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

export function hasThothAvailable() {
  return RAG_THOTH_ENABLED && hasAiProviderToken(process.env, "thoth");
}

function buildThothIngestionUserId(
  userId: string,
  ingestId: string,
  tag: string,
) {
  return `ingest:${userId}:${ingestId}:${tag}`.slice(0, 200);
}

/**
 * Runs an optional THOTH structured task and normalizes failures into null.
 * Callers can keep deterministic fallback paths for local, staging, and
 * provider-outage scenarios.
 */
export async function runThothStructuredTask(options: {
  ingestId: string;
  prompt: string;
  taskTag: string;
  userId: string;
}) {
  if (!hasThothAvailable()) {
    return null;
  }

  try {
    const completion = await createThothChatCompletion({
      query: options.prompt,
      user: buildThothIngestionUserId(
        options.userId,
        options.ingestId,
        options.taskTag,
      ),
    });

    if (!completion.answer) {
      return null;
    }

    return tryParseJsonFromModelAnswer(completion.answer);
  } catch (error) {
    console.warn(
      `[RAG Ingestion] THOTH ${options.taskTag} task failed. Falling back to Gemini heuristics.`,
      error,
    );
    return null;
  }
}
