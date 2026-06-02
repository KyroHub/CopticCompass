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

export function stripHtml(input: string) {
  return input
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .trim();
}

export function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function hasThothAvailable() {
  return RAG_THOTH_ENABLED && Boolean(process.env.THOTH_API_KEY);
}

function buildThothIngestionUserId(
  userId: string,
  ingestId: string,
  tag: string,
) {
  return `ingest:${userId}:${ingestId}:${tag}`.slice(0, 200);
}

/**
 * Recovers JSON from model responses that may include prose, fenced code, or
 * partial object/array wrappers. This keeps THOTH and Gemini fallbacks tolerant
 * without trusting arbitrary text as structured data.
 */
export function tryParseJsonFromModelAnswer(answer: string): unknown {
  const trimmed = answer.trim();
  if (!trimmed) {
    return null;
  }

  const candidates: string[] = [trimmed];
  const fencedMatches = [...trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)];
  for (const match of fencedMatches) {
    if (match[1]) {
      candidates.push(match[1].trim());
    }
  }

  const firstArray = trimmed.indexOf("[");
  const lastArray = trimmed.lastIndexOf("]");
  if (firstArray >= 0 && lastArray > firstArray) {
    candidates.push(trimmed.slice(firstArray, lastArray + 1));
  }

  const firstObject = trimmed.indexOf("{");
  const lastObject = trimmed.lastIndexOf("}");
  if (firstObject >= 0 && lastObject > firstObject) {
    candidates.push(trimmed.slice(firstObject, lastObject + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {}
  }

  return null;
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

export function toStringArray(value: unknown, maxItems = 24) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  const unique = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "string") {
      continue;
    }

    const normalized = normalizeWhitespace(entry).slice(0, 120);
    if (!normalized) {
      continue;
    }

    unique.add(normalized);
    if (unique.size >= maxItems) {
      break;
    }
  }

  return Array.from(unique);
}

export function splitIntoSemanticSegments(value: string) {
  return value
    .split(/\n{2,}|(?<=[.!?])\s+/u)
    .map((segment) => normalizeWhitespace(segment))
    .filter((segment) => segment.length > 0);
}
