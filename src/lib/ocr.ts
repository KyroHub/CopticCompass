import type { AppErrorCode } from "@/lib/errors";
import { normalizeWhitespace, stripHtml } from "@/lib/text";

const DEFAULT_OCR_UPLOAD_FIELD_FALLBACKS = [
  "file",
  "image",
  "upload",
  "document",
  "photo",
  "files",
];

const DEFAULT_OCR_TEXT_LIKE_KEYS = [
  "text",
  "extracted_text",
  "ocr_text",
  "output",
  "content",
  "transcript",
  "transcription",
  "result",
  "data",
  "message",
];

const DEFAULT_OCR_FORWARDABLE_QUERY_PARAMS = new Set<string>();
const DEFAULT_OCR_FORWARDABLE_TEXT_FIELDS = new Set<string>();

export type OcrErrorCode = Extract<
  AppErrorCode,
  "external_service_unavailable" | "rate_limited" | "validation_failed"
>;

type OcrFileEntry = {
  file: File;
  key: string;
};

export function buildOcrUploadFieldCandidates({
  fallbackFields = DEFAULT_OCR_UPLOAD_FIELD_FALLBACKS,
  incomingFieldName,
  preferredUploadField,
}: {
  fallbackFields?: readonly string[];
  incomingFieldName?: string;
  preferredUploadField?: string;
} = {}) {
  const candidates = [
    preferredUploadField,
    incomingFieldName,
    ...fallbackFields,
  ].filter((value): value is string => Boolean(value && value.length > 0));

  return Array.from(new Set(candidates));
}

/**
 * Detects upstream "wrong multipart field name" failures, which are the only
 * OCR upload failures the proxy treats as safe to retry with another field.
 */
export function isUnexpectedOcrUploadFieldError(value: string) {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("multererror: unexpected field") ||
    normalized.includes("unexpected field")
  );
}

export function getOcrUpstreamFailure(status: number): {
  code: OcrErrorCode;
  status: number;
} {
  if (status === 429) {
    return { code: "rate_limited", status: 429 };
  }

  if (status === 400 || status === 413 || status === 415) {
    return {
      code: "validation_failed",
      status: status === 413 ? 413 : 400,
    };
  }

  return { code: "external_service_unavailable", status: 502 };
}

function getTrimmedString(
  value: FormDataEntryValue | string | null | undefined,
) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function copyOcrTargetSearchParams({
  forwardableQueryParams,
  incomingUrl,
  targetUrl,
}: {
  forwardableQueryParams: ReadonlySet<string>;
  incomingUrl: URL | null;
  targetUrl: URL;
}) {
  if (!incomingUrl) {
    return;
  }

  for (const [key, value] of incomingUrl.searchParams.entries()) {
    if (forwardableQueryParams.has(key.toLowerCase())) {
      targetUrl.searchParams.set(key, value);
    }
  }
}

function getOcrTargetLanguage({
  defaultLang,
  formData,
  incomingUrl,
}: {
  defaultLang: string;
  formData?: FormData;
  incomingUrl: URL | null;
}) {
  return (
    getTrimmedString(incomingUrl?.searchParams.get("lang")) ??
    getTrimmedString(formData?.get("lang")) ??
    defaultLang
  );
}

export function buildOcrTargetUrl({
  baseUrl,
  defaultLang = "cop",
  formData,
  forwardableQueryParams = DEFAULT_OCR_FORWARDABLE_QUERY_PARAMS,
  requestUrl,
}: {
  baseUrl: URL | string;
  defaultLang?: string;
  formData?: FormData;
  forwardableQueryParams?: ReadonlySet<string>;
  requestUrl?: string;
}) {
  const targetUrl = new URL(baseUrl.toString());
  const incomingUrl = requestUrl ? new URL(requestUrl) : null;

  copyOcrTargetSearchParams({
    forwardableQueryParams,
    incomingUrl,
    targetUrl,
  });
  targetUrl.searchParams.set(
    "lang",
    getOcrTargetLanguage({ defaultLang, formData, incomingUrl }),
  );
  return targetUrl;
}

function normalizeOcrStringCandidate(input: string): string[] {
  const normalized = normalizeWhitespace(stripHtml(input));
  return normalized ? [normalized] : [];
}

/**
 * Recursively extracts text-like values from heterogeneous OCR responses while
 * bounding traversal depth so malformed provider payloads cannot explode work.
 */
function collectOcrTextCandidates({
  depth = 0,
  payload,
  textLikeKeys = DEFAULT_OCR_TEXT_LIKE_KEYS,
}: {
  depth?: number;
  payload: unknown;
  textLikeKeys?: readonly string[];
}): string[] {
  if (depth > 6 || payload === null || typeof payload === "undefined") {
    return [];
  }

  if (typeof payload === "string") {
    return normalizeOcrStringCandidate(payload);
  }

  if (Array.isArray(payload)) {
    return payload.flatMap((item) =>
      collectOcrTextCandidates({
        depth: depth + 1,
        payload: item,
        textLikeKeys,
      }),
    );
  }

  if (typeof payload !== "object") {
    return [];
  }

  return Object.entries(payload as Record<string, unknown>).flatMap(
    ([key, value]) => {
      if (
        typeof value === "string" &&
        textLikeKeys.includes(key.toLowerCase())
      ) {
        return normalizeOcrStringCandidate(value);
      }

      return collectOcrTextCandidates({
        depth: depth + 1,
        payload: value,
        textLikeKeys,
      });
    },
  );
}

export function extractOcrText(payload: unknown): string {
  const candidates = collectOcrTextCandidates({ payload });
  return candidates.find((candidate) => candidate.length > 0) ?? "";
}

export function getFirstMatchingOcrFile(
  formData: FormData,
  uploadFieldCandidates: readonly string[],
) {
  for (const fieldName of uploadFieldCandidates) {
    const value = formData.get(fieldName);
    if (value instanceof File) {
      return value;
    }
  }

  return null;
}

export function getFirstOcrFileEntry(formData: FormData): OcrFileEntry | null {
  for (const [key, value] of formData.entries()) {
    if (value instanceof File && value.size > 0) {
      return { key, file: value };
    }
  }

  return null;
}

export function collectForwardableOcrTextFields(
  formData: FormData,
  excludedKeys: Set<string>,
  forwardableTextFields = DEFAULT_OCR_FORWARDABLE_TEXT_FIELDS,
) {
  const fields: Array<{ key: string; value: string }> = [];

  for (const [key, value] of formData.entries()) {
    if (
      excludedKeys.has(key) ||
      !forwardableTextFields.has(key.toLowerCase())
    ) {
      continue;
    }

    if (typeof value === "string") {
      fields.push({ key, value });
    }
  }

  return fields;
}
