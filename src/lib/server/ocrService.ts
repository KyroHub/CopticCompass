import "server-only";
import { getPublicErrorMessage } from "@/lib/errors";
import {
  buildOcrTargetUrl as buildOcrTargetUrlPrimitive,
  buildOcrUploadFieldCandidates,
  collectForwardableOcrTextFields as collectForwardableOcrTextFieldsPrimitive,
  extractOcrText,
  getFirstMatchingOcrFile,
  getFirstOcrFileEntry as getFirstOcrFileEntryPrimitive,
  getOcrUpstreamFailure as getOcrUpstreamFailurePrimitive,
  isUnexpectedOcrUploadFieldError as isUnexpectedOcrUploadFieldErrorPrimitive,
} from "@/lib/ocr";
import type { OcrErrorCode } from "@/lib/ocr";
import { assertServerOnly } from "@/lib/server/assertServerOnly";

assertServerOnly("src/lib/server/ocrService.ts");

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

export type { OcrErrorCode };
export const collectForwardableOcrTextFields =
  collectForwardableOcrTextFieldsPrimitive;
export const getFirstOcrFileEntry = getFirstOcrFileEntryPrimitive;
export const getOcrUpstreamFailure = getOcrUpstreamFailurePrimitive;
export const isUnexpectedOcrUploadFieldError =
  isUnexpectedOcrUploadFieldErrorPrimitive;

export function getOcrServiceUrlOrThrow() {
  const ocrServiceUrl = process.env.OCR_SERVICE_URL;
  if (!ocrServiceUrl) {
    throw new Error(
      getPublicErrorMessage("external_service_unavailable", "en", "ocr"),
    );
  }

  validateOcrServiceUrl(ocrServiceUrl);
  return ocrServiceUrl;
}

function validateOcrServiceUrl(ocrServiceUrl: string) {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(ocrServiceUrl);
  } catch {
    throw new Error(
      getPublicErrorMessage("external_service_unavailable", "en", "ocr"),
    );
  }

  if (parsedUrl.protocol !== "https:") {
    throw new Error(
      getPublicErrorMessage("external_service_unavailable", "en", "ocr"),
    );
  }

  return parsedUrl;
}

/**
 * Orders possible multipart field names from most intentional to most generic.
 * This lets the OCR proxy adapt to upstream services that expect `image`,
 * `upload`, or another legacy field without exposing those retries to callers.
 */
export function getOcrUploadFieldCandidates(incomingFieldName?: string) {
  return buildOcrUploadFieldCandidates({
    incomingFieldName,
    preferredUploadField: process.env.OCR_UPLOAD_FIELD?.trim(),
  });
}

function getSafeOcrFailureMessage(status: number) {
  if (status === 400 || status === 413 || status === 415) {
    return getPublicErrorMessage("validation_failed", "en", "ocr");
  }

  return getPublicErrorMessage("external_service_unavailable", "en", "ocr");
}

export function getUploadedOcrFile(formData: FormData): File {
  const file = getFirstMatchingOcrFile(formData, getOcrUploadFieldCandidates());
  if (file) {
    return file;
  }

  throw new Error(getPublicErrorMessage("validation_failed", "en", "ocr"));
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
  return buildOcrTargetUrlPrimitive({
    baseUrl: validateOcrServiceUrl(ocrServiceUrl),
    defaultLang,
    formData,
    requestUrl,
  });
}

/**
 * Reads an OCR response as JSON or text and returns the first plausible
 * extracted text candidate instead of leaking provider-specific payload shape
 * into route handlers.
 */
export async function extractOcrResponseText(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return extractOcrText(await response.json());
  }

  return extractOcrText(await response.text());
}

/**
 * Performs one OCR upload attempt. A field-name mismatch is reported as a
 * retryable outcome; all other upstream failures become fatal client-safe
 * messages for the current request.
 */
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

/**
 * Attempts OCR extraction across the configured upload field candidates and
 * stops at the first successful non-empty text result. Empty successful
 * responses are preserved as empty OCR output rather than retried forever.
 */
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
