import {
  consumeRateLimit,
  getUserRateLimitIdentifier,
  hasAvailableRateLimitProtection,
} from "@/lib/rateLimit";

import { createShenuteErrorResponse } from "./chatErrors";

const SHENUTE_CHAT_RATE_LIMIT = 20;
const SHENUTE_CHAT_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const SHENUTE_MAX_REQUEST_BYTES = 200 * 1024;

export async function getShenuteRateLimitResponse(userId: string) {
  if (!hasAvailableRateLimitProtection()) {
    return createShenuteErrorResponse("external_service_unavailable", 503);
  }

  try {
    const result = await consumeRateLimit({
      identifier: getUserRateLimitIdentifier(userId),
      limit: SHENUTE_CHAT_RATE_LIMIT,
      namespace: "shenute:chat",
      windowMs: SHENUTE_CHAT_RATE_LIMIT_WINDOW_MS,
    });

    if (result.ok) {
      return null;
    }

    return createShenuteErrorResponse("rate_limited", 429, {
      "Retry-After": Math.max(
        1,
        Math.ceil(result.retryAfterMs / 1000),
      ).toString(),
    });
  } catch (error) {
    console.error("Shenute rate-limit check failed:", error);
    return createShenuteErrorResponse("external_service_unavailable", 503);
  }
}

export function getShenutePayloadSizeResponse(headers: Headers) {
  const contentLength = Number.parseInt(
    headers.get("content-length") ?? "",
    10,
  );

  if (
    !Number.isFinite(contentLength) ||
    contentLength <= SHENUTE_MAX_REQUEST_BYTES
  ) {
    return null;
  }

  return createShenuteErrorResponse("validation_failed", 413);
}
