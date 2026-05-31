import { getPublicErrorMessage } from "@/lib/errors";
import type { Language } from "@/types/i18n";

const OCR_UNAVAILABLE_PATTERNS = [
  "ocr_service_url",
  "not configured",
  "ocr is temporarily unavailable",
  "could not read this image",
];

const OCR_VALIDATION_PATTERNS = ["no valid file", "readable image"];

function includesAnyPattern(value: string, patterns: string[]) {
  return patterns.some((pattern) => value.includes(pattern));
}

function getUploadLimitMessage(message: string, language: Language) {
  const limit = /limited to ([^.]+)\./i.exec(message)?.[1] ?? "8 MB";

  return language === "nl"
    ? `OCR-uploads zijn beperkt tot ${limit}.`
    : `OCR uploads are limited to ${limit}.`;
}

export function getPublicOcrErrorMessage(
  error: unknown,
  language: Language = "en",
) {
  const message = error instanceof Error ? error.message : "";
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("ocr uploads are limited")) {
    return getUploadLimitMessage(message, language);
  }

  if (normalizedMessage.includes("too many ocr requests")) {
    return getPublicErrorMessage("rate_limited", language, "ocr");
  }

  if (includesAnyPattern(normalizedMessage, OCR_UNAVAILABLE_PATTERNS)) {
    return getPublicErrorMessage(
      "external_service_unavailable",
      language,
      "ocr",
    );
  }

  if (includesAnyPattern(normalizedMessage, OCR_VALIDATION_PATTERNS)) {
    return getPublicErrorMessage("validation_failed", language, "ocr");
  }

  return getPublicErrorMessage("unexpected", language, "ocr");
}
