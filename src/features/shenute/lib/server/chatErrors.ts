import {
  getPublicErrorMessage,
  jsonErrorResponse,
  type AppErrorCode,
} from "@/lib/errors";

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

export function isRateLimitError(error: unknown): boolean {
  const status = getErrorStatusCode(error);
  if (status === 429) {
    return true;
  }

  const message = getUnknownErrorMessage(error).toLowerCase();
  return message.includes("429") || message.includes("rate limit");
}

export function getShenuteProviderErrorMessage(
  error: unknown,
  logPrefix = "Gemini streaming failed:",
) {
  console.error(logPrefix, error);

  return getPublicErrorMessage("external_service_unavailable", "en", "shenute");
}

export function createShenuteErrorResponse(
  code: AppErrorCode,
  status: number,
  headers?: HeadersInit,
) {
  return jsonErrorResponse({
    context: "shenute",
    error: code,
    fallbackCode: code,
    headers,
    requestIdPrefix: "shenute",
    status,
  });
}
