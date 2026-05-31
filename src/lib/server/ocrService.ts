import { getPublicErrorMessage, type AppErrorCode } from "@/lib/errors";
import { assertServerOnly } from "@/lib/server/assertServerOnly";

assertServerOnly("src/lib/server/ocrService.ts");

const OCR_UPLOAD_FIELD_FALLBACKS = [
  "file",
  "image",
  "upload",
  "document",
  "photo",
  "files",
];

const OCR_TEXT_LIKE_KEYS = [
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

export type OcrErrorCode = Extract<
  AppErrorCode,
  "external_service_unavailable" | "rate_limited" | "validation_failed"
>;

type OcrAttemptResult =
  | {
      kind: "retry";
      message: string;
    }
  | {
      kind: "success";
      text: string;
    }
  | {
      kind: "fatal";
      message: string;
    };

export function getOcrServiceUrlOrThrow() {
  const ocrServiceUrl = process.env.OCR_SERVICE_URL;
  if (!ocrServiceUrl) {
    throw new Error(
      getPublicErrorMessage("external_service_unavailable", "en", "ocr"),
    );
  }

  return ocrServiceUrl;
}

export function getOcrUploadFieldCandidates(incomingFieldName?: string) {
  const preferred = process.env.OCR_UPLOAD_FIELD?.trim();
  const candidates = [
    preferred,
    incomingFieldName,
    ...OCR_UPLOAD_FIELD_FALLBACKS,
  ].filter((value): value is string => Boolean(value && value.length > 0));

  return Array.from(new Set(candidates));
}

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

function copyOcrTargetSearchParams(targetUrl: URL, incomingUrl: URL | null) {
  if (!incomingUrl) {
    return;
  }

  for (const [key, value] of incomingUrl.searchParams.entries()) {
    if (key.toLowerCase() !== "lang") {
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

function getSafeOcrFailureMessage(status: number) {
  if (status === 400 || status === 413 || status === 415) {
    return getPublicErrorMessage("validation_failed", "en", "ocr");
  }

  return getPublicErrorMessage("external_service_unavailable", "en", "ocr");
}

function stripHtml(input: string) {
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

function normalizeStringCandidate(input: string): string[] {
  const normalized = stripHtml(input).replace(/\s+/g, " ").trim();
  return normalized ? [normalized] : [];
}

function collectTextCandidates(payload: unknown, depth = 0): string[] {
  if (depth > 6 || payload === null || typeof payload === "undefined") {
    return [];
  }

  if (typeof payload === "string") {
    return normalizeStringCandidate(payload);
  }

  if (Array.isArray(payload)) {
    return payload.flatMap((item) => collectTextCandidates(item, depth + 1));
  }

  if (typeof payload !== "object") {
    return [];
  }

  return Object.entries(payload as Record<string, unknown>).flatMap(
    ([key, value]) => {
      if (
        typeof value === "string" &&
        OCR_TEXT_LIKE_KEYS.includes(key.toLowerCase())
      ) {
        return normalizeStringCandidate(value);
      }

      return collectTextCandidates(value, depth + 1);
    },
  );
}

function extractOcrText(payload: unknown): string {
  const candidates = collectTextCandidates(payload);
  return candidates.find((candidate) => candidate.length > 0) ?? "";
}

export function getUploadedOcrFile(formData: FormData): File {
  for (const fieldName of getOcrUploadFieldCandidates()) {
    const value = formData.get(fieldName);
    if (value instanceof File) {
      return value;
    }
  }

  const fallback = formData.get("file");
  if (fallback instanceof File) {
    return fallback;
  }

  throw new Error(getPublicErrorMessage("validation_failed", "en", "ocr"));
}

export function getFirstOcrFileEntry(formData: FormData) {
  for (const [key, value] of formData.entries()) {
    if (value instanceof File && value.size > 0) {
      return { key, file: value };
    }
  }

  return null;
}

export function buildOcrTargetUrl({
  defaultLang = "cop",
  formData,
  ocrServiceUrl,
  requestUrl,
}: {
  defaultLang?: string;
  formData?: FormData;
  ocrServiceUrl: string;
  requestUrl?: string;
}) {
  const targetUrl = new URL(ocrServiceUrl);
  const incomingUrl = requestUrl ? new URL(requestUrl) : null;

  copyOcrTargetSearchParams(targetUrl, incomingUrl);
  targetUrl.searchParams.set(
    "lang",
    getOcrTargetLanguage({ defaultLang, formData, incomingUrl }),
  );
  return targetUrl;
}

export function collectForwardableOcrTextFields(
  formData: FormData,
  excludedKeys: Set<string>,
) {
  const fields: Array<{ key: string; value: string }> = [];

  for (const [key, value] of formData.entries()) {
    if (excludedKeys.has(key)) {
      continue;
    }

    if (typeof value === "string") {
      fields.push({ key, value });
    }
  }

  return fields;
}

export async function extractOcrResponseText(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return extractOcrText(await response.json());
  }

  return extractOcrText(await response.text());
}

async function attemptOcrTextUpload({
  file,
  signal,
  targetUrl,
  uploadField,
}: {
  file: File;
  signal?: AbortSignal;
  targetUrl: URL | string;
  uploadField: string;
}): Promise<OcrAttemptResult> {
  const ocrFormData = new FormData();
  ocrFormData.append(uploadField, file, file.name);

  const response = await fetch(targetUrl.toString(), {
    method: "POST",
    body: ocrFormData,
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    const message = getSafeOcrFailureMessage(response.status);

    if (isUnexpectedOcrUploadFieldError(errorText)) {
      return { kind: "retry", message };
    }

    console.error("OCR service request failed", {
      status: response.status,
      statusText: response.statusText,
    });

    return { kind: "fatal", message };
  }

  return {
    kind: "success",
    text: await extractOcrResponseText(response),
  };
}

export async function extractTextWithOcrService({
  file,
  targetUrl,
  uploadFieldCandidates = getOcrUploadFieldCandidates(),
}: {
  file: File;
  targetUrl: URL | string;
  uploadFieldCandidates?: readonly string[];
}) {
  let lastFailureMessage = getPublicErrorMessage(
    "external_service_unavailable",
    "en",
    "ocr",
  );
  let sawSuccessfulResponse = false;

  for (const uploadField of uploadFieldCandidates) {
    const attempt = await attemptOcrTextUpload({
      file,
      targetUrl,
      uploadField,
    });

    if (attempt.kind === "retry") {
      lastFailureMessage = attempt.message;
      continue;
    }

    if (attempt.kind === "fatal") {
      throw new Error(attempt.message);
    }

    sawSuccessfulResponse = true;
    if (attempt.text) {
      return attempt.text;
    }
  }

  if (sawSuccessfulResponse) {
    return "";
  }

  throw new Error(lastFailureMessage);
}
