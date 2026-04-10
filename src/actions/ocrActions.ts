"use server";

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

function normalizeCandidateText(input: string) {
  return stripHtml(input).replace(/\s+/g, " ").trim();
}

function collectTextCandidates(payload: unknown, depth = 0): string[] {
  if (depth > 6 || payload == null) {
    return [];
  }

  if (typeof payload === "string") {
    const normalized = normalizeCandidateText(payload);
    return normalized ? [normalized] : [];
  }

  if (Array.isArray(payload)) {
    return payload.flatMap((entry) => collectTextCandidates(entry, depth + 1));
  }

  if (typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const collected: string[] = [];

  for (const [key, value] of Object.entries(record)) {
    const loweredKey = key.toLowerCase();
    if (
      OCR_TEXT_LIKE_KEYS.includes(loweredKey) &&
      typeof value === "string"
    ) {
      const normalized = normalizeCandidateText(value);
      if (normalized) {
        collected.push(normalized);
      }
      continue;
    }

    collected.push(...collectTextCandidates(value, depth + 1));
  }

  return collected;
}

function extractOcrText(payload: unknown): string {
  const candidates = collectTextCandidates(payload);
  return candidates.find((candidate) => candidate.length > 0) ?? "";
}

export async function processOCRImage(formData: FormData) {
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    throw new Error("No valid file uploaded.");
  }

  const ocrServiceUrl = process.env.OCR_SERVICE_URL;
  if (!ocrServiceUrl) {
    throw new Error("OCR_SERVICE_URL is not configured.");
  }

  const targetUrl = new URL(ocrServiceUrl);
  targetUrl.searchParams.set("lang", "cop");

  const uploadFieldCandidates = getOcrUploadFieldCandidates();
  let lastFailureMessage = "OCR request failed.";
  let sawSuccessfulResponse = false;

  for (const uploadField of uploadFieldCandidates) {
    const ocrFormData = new FormData();
    ocrFormData.append(uploadField, file, file.name);

    const response = await fetch(targetUrl.toString(), {
      method: "POST",
      body: ocrFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      lastFailureMessage = `OCR service failed: ${response.status} - ${errorText}`;

      if (isUnexpectedFieldErrorMessage(errorText)) {
        continue;
      }

      throw new Error(lastFailureMessage);
    }

    sawSuccessfulResponse = true;

    const contentType = response.headers.get("content-type") ?? "";
    const resultText = contentType.includes("application/json")
      ? extractOcrText(await response.json())
      : extractOcrText(await response.text());

    if (!resultText) {
      continue;
    }

    return resultText;
  }

  if (sawSuccessfulResponse) {
    return "";
  }

  throw new Error(
    `${lastFailureMessage} Tried OCR upload fields: ${uploadFieldCandidates.join(", ")}. Set OCR_UPLOAD_FIELD in .env.local to match your OCR backend.`,
  );
}
