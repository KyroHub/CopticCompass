import "server-only";
import { getPublicErrorMessage, type AppErrorCode } from "@/lib/errors";
import {
  consumeRateLimit,
  getClientRateLimitIdentifier,
  hasAvailableRateLimitProtection,
} from "@/lib/rateLimit";
import { assertServerOnly } from "@/lib/server/assertServerOnly";

assertServerOnly("src/lib/server/ocrProtection.ts");

const DEFAULT_OCR_MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const OCR_RATE_LIMIT = 8;
const OCR_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

type OcrProtectionFailure = {
  code: Extract<
    AppErrorCode,
    "external_service_unavailable" | "rate_limited" | "validation_failed"
  >;
  message: string;
  retryAfterMs?: number;
  status: 413 | 429 | 503;
};

function readPositiveIntegerEnv(name: string, fallback: number) {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const OCR_MAX_UPLOAD_BYTES = readPositiveIntegerEnv(
  "OCR_MAX_UPLOAD_BYTES",
  DEFAULT_OCR_MAX_UPLOAD_BYTES,
);

function formatBytes(bytes: number) {
  const megabytes = bytes / (1024 * 1024);
  return `${Number.isInteger(megabytes) ? megabytes : megabytes.toFixed(1)} MB`;
}

export function getOcrUploadSizeFailure(
  size: number,
): OcrProtectionFailure | null {
  if (size <= OCR_MAX_UPLOAD_BYTES) {
    return null;
  }

  return {
    code: "validation_failed",
    status: 413,
    message: `OCR uploads are limited to ${formatBytes(OCR_MAX_UPLOAD_BYTES)}.`,
  };
}

export function getOcrContentLengthFailure(
  headers: Headers,
): OcrProtectionFailure | null {
  const contentLength = Number.parseInt(
    headers.get("content-length") ?? "",
    10,
  );

  if (!Number.isFinite(contentLength) || contentLength <= 0) {
    return null;
  }

  return getOcrUploadSizeFailure(contentLength);
}

export async function consumeOcrRateLimit(): Promise<OcrProtectionFailure | null> {
  if (!hasAvailableRateLimitProtection()) {
    return {
      code: "external_service_unavailable",
      status: 503,
      message: getPublicErrorMessage(
        "external_service_unavailable",
        "en",
        "ocr",
      ),
    };
  }

  try {
    const identifier = await getClientRateLimitIdentifier();
    const result = await consumeRateLimit({
      identifier,
      limit: OCR_RATE_LIMIT,
      namespace: "ocr",
      windowMs: OCR_RATE_LIMIT_WINDOW_MS,
    });

    if (result.ok) {
      return null;
    }

    return {
      code: "rate_limited",
      status: 429,
      retryAfterMs: result.retryAfterMs,
      message: getPublicErrorMessage("rate_limited", "en", "ocr"),
    };
  } catch (error) {
    console.error("OCR rate-limit check failed:", error);
    return {
      code: "external_service_unavailable",
      status: 503,
      message: getPublicErrorMessage(
        "external_service_unavailable",
        "en",
        "ocr",
      ),
    };
  }
}

export function getRetryAfterSeconds(retryAfterMs: number | undefined) {
  if (!retryAfterMs || retryAfterMs <= 0) {
    return undefined;
  }

  return Math.max(1, Math.ceil(retryAfterMs / 1000)).toString();
}
