"use server";

const OCR_UPLOAD_FIELD_FALLBACKS = [
  "file",
  "image",
  "upload",
  "document",
  "photo",
  "files",
];

const _OCR_TEXT_LIKE_KEYS = [
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

function getOcrUploadFieldCandidates() {
  const preferred = process.env.OCR_UPLOAD_FIELD?.trim();
  const candidates = [preferred, ...OCR_UPLOAD_FIELD_FALLBACKS].filter(
    (value): value is string => Boolean(value && value.length > 0),
  );

  return Array.from(new Set(candidates));
}

function isUnexpectedFieldErrorMessage(value: string) {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("multererror: unexpected field") ||
    normalized.includes("unexpected field")
  );
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

function collectTextCandidatesFromArray(
  payload: unknown[],
  depth: number,
): string[] {
  return payload.flatMap((item) => collectTextCandidates(item, depth));
}

function collectTextCandidatesFromRecord(
  payload: Record<string, unknown>,
  depth: number,
): string[] {
  return Object.entries(payload).flatMap(([key, value]) => {
    if (
      typeof value === "string" &&
      _OCR_TEXT_LIKE_KEYS.includes(key.toLowerCase())
    ) {
      return normalizeStringCandidate(value);
    }

    return collectTextCandidates(value, depth);
  });
}

function collectTextCandidates(payload: unknown, depth = 0): string[] {
  if (depth > 6 || payload === null || typeof payload === "undefined") {
    return [];
  }

  if (typeof payload === "string") {
    return normalizeStringCandidate(payload);
  }

  if (Array.isArray(payload)) {
    return collectTextCandidatesFromArray(payload, depth + 1);
  }

  if (typeof payload !== "object") {
    return [];
  }

  return collectTextCandidatesFromRecord(
    payload as Record<string, unknown>,
    depth + 1,
  );
}

function extractOcrText(payload: unknown): string {
  const candidates = collectTextCandidates(payload);
  return candidates.find((candidate) => candidate.length > 0) ?? "";
}

function getUploadedOcrFile(formData: FormData): File {
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

  throw new Error("No valid file uploaded.");
}

function createOcrTargetUrl() {
  const ocrServiceUrl = process.env.OCR_SERVICE_URL;
  if (!ocrServiceUrl) {
    throw new Error("OCR_SERVICE_URL is not configured.");
  }

  const targetUrl = new URL(ocrServiceUrl);
  targetUrl.searchParams.set("lang", "cop");
  return targetUrl.toString();
}

async function extractOcrResponseText(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return extractOcrText(await response.json());
  }

  return extractOcrText(await response.text());
}

async function attemptOcrUpload(options: {
  file: File;
  targetUrl: string;
  uploadField: string;
}): Promise<OcrAttemptResult> {
  const ocrFormData = new FormData();
  ocrFormData.append(options.uploadField, options.file, options.file.name);

  const response = await fetch(options.targetUrl, {
    method: "POST",
    body: ocrFormData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    const message = `OCR service failed: ${response.status} - ${errorText}`;

    if (isUnexpectedFieldErrorMessage(errorText)) {
      return { kind: "retry", message };
    }

    return { kind: "fatal", message };
  }

  return {
    kind: "success",
    text: await extractOcrResponseText(response),
  };
}

export async function processOCRImage(formData: FormData): Promise<string> {
  const file = getUploadedOcrFile(formData);
  const targetUrl = createOcrTargetUrl();
  const uploadFieldCandidates = getOcrUploadFieldCandidates();
  let lastFailureMessage = "OCR request failed.";
  let sawSuccessfulResponse = false;

  for (const uploadField of uploadFieldCandidates) {
    const attempt = await attemptOcrUpload({
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

  throw new Error(
    `${lastFailureMessage} Tried OCR upload fields: ${uploadFieldCandidates.join(", ")}. Set OCR_UPLOAD_FIELD in .env.local to match your OCR backend.`,
  );
}
