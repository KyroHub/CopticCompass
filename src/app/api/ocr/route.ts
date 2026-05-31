import { jsonErrorResponse, type AppErrorCode } from "@/lib/errors";
import {
  consumeOcrRateLimit,
  getOcrContentLengthFailure,
  getOcrUploadSizeFailure,
  getRetryAfterSeconds,
} from "@/lib/server/ocrProtection";

export const runtime = "nodejs";

const OCR_UPLOAD_FIELD_FALLBACKS = [
  "file",
  "image",
  "upload",
  "document",
  "photo",
  "files",
];

type OcrErrorCode = Extract<
  AppErrorCode,
  "external_service_unavailable" | "rate_limited" | "validation_failed"
>;

function getUploadFieldCandidates(incomingFieldName: string) {
  const preferred = process.env.OCR_UPLOAD_FIELD?.trim();
  const candidates = [
    preferred,
    incomingFieldName,
    ...OCR_UPLOAD_FIELD_FALLBACKS,
  ].filter((value): value is string => Boolean(value && value.length > 0));

  return Array.from(new Set(candidates));
}

function isUnexpectedFieldErrorMessage(value: string) {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("multererror: unexpected field") ||
    normalized.includes("unexpected field")
  );
}

function createOcrErrorResponse(options: {
  code: OcrErrorCode;
  error?: string;
  retryAfterMs?: number;
  status: number;
}) {
  const headers = new Headers({
    "Cache-Control": "no-store",
  });
  const retryAfter = getRetryAfterSeconds(options.retryAfterMs);

  if (retryAfter) {
    headers.set("Retry-After", retryAfter);
  }

  return jsonErrorResponse({
    context: "ocr",
    error: options.code,
    fallbackCode: options.code,
    headers,
    publicMessage: options.error,
    requestIdPrefix: "ocr",
    status: options.status,
  });
}

function getOcrUpstreamFailure(status: number): {
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

function buildTargetUrl(
  requestUrl: string,
  ocrServiceUrl: string,
  formData: FormData,
) {
  const incomingUrl = new URL(requestUrl);
  const targetUrl = new URL(ocrServiceUrl);

  for (const [key, value] of incomingUrl.searchParams.entries()) {
    if (key.toLowerCase() === "lang") {
      continue;
    }

    targetUrl.searchParams.set(key, value);
  }

  const formLang = formData.get("lang");
  const queryLang = incomingUrl.searchParams.get("lang");
  const lang =
    (typeof queryLang === "string" && queryLang.trim().length > 0
      ? queryLang.trim()
      : null) ??
    (typeof formLang === "string" && formLang.trim().length > 0
      ? formLang.trim()
      : null) ??
    "cop";

  targetUrl.searchParams.set("lang", lang);
  return targetUrl;
}

function collectForwardableTextFields(
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

function getFirstFileEntry(formData: FormData) {
  for (const [key, value] of formData.entries()) {
    if (value instanceof File && value.size > 0) {
      return { key, file: value };
    }
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const ocrServiceUrl = process.env.OCR_SERVICE_URL;
    if (!ocrServiceUrl) {
      return createOcrErrorResponse({
        code: "external_service_unavailable",
        status: 503,
      });
    }

    const contentLengthFailure = getOcrContentLengthFailure(request.headers);
    if (contentLengthFailure) {
      return createOcrErrorResponse({
        code: contentLengthFailure.code,
        error: contentLengthFailure.message,
        retryAfterMs: contentLengthFailure.retryAfterMs,
        status: contentLengthFailure.status,
      });
    }

    const rateLimitFailure = await consumeOcrRateLimit();
    if (rateLimitFailure) {
      return createOcrErrorResponse({
        code: rateLimitFailure.code,
        error: rateLimitFailure.message,
        retryAfterMs: rateLimitFailure.retryAfterMs,
        status: rateLimitFailure.status,
      });
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return createOcrErrorResponse({
        code: "validation_failed",
        status: 400,
      });
    }

    const fileEntry = getFirstFileEntry(formData);
    if (!fileEntry) {
      return createOcrErrorResponse({
        code: "validation_failed",
        status: 400,
      });
    }

    const uploadSizeFailure = getOcrUploadSizeFailure(fileEntry.file.size);
    if (uploadSizeFailure) {
      return createOcrErrorResponse({
        code: uploadSizeFailure.code,
        error: uploadSizeFailure.message,
        status: uploadSizeFailure.status,
      });
    }

    const targetUrl = buildTargetUrl(request.url, ocrServiceUrl, formData);
    const uploadFieldCandidates = getUploadFieldCandidates(fileEntry.key);
    const passthroughTextFields = collectForwardableTextFields(
      formData,
      new Set<string>([fileEntry.key, "lang"]),
    );

    let lastFailure: { code: OcrErrorCode; status: number } = {
      code: "external_service_unavailable",
      status: 502,
    };
    let sawUploadFieldRejection = false;

    for (const uploadField of uploadFieldCandidates) {
      const upstreamFormData = new FormData();
      upstreamFormData.append(uploadField, fileEntry.file, fileEntry.file.name);

      for (const field of passthroughTextFields) {
        upstreamFormData.append(field.key, field.value);
      }

      let upstreamResponse: Response;
      try {
        upstreamResponse = await fetch(targetUrl.toString(), {
          method: "POST",
          body: upstreamFormData,
        });
      } catch (error) {
        console.error("OCR upstream request failed:", error);
        return createOcrErrorResponse({
          code: "external_service_unavailable",
          status: 502,
        });
      }

      if (!upstreamResponse.ok) {
        const upstreamErrorText = await upstreamResponse.text();

        if (isUnexpectedFieldErrorMessage(upstreamErrorText)) {
          sawUploadFieldRejection = true;
          continue;
        }

        lastFailure = getOcrUpstreamFailure(upstreamResponse.status);

        console.error("OCR upstream request failed", {
          status: upstreamResponse.status,
          statusText: upstreamResponse.statusText,
        });

        return createOcrErrorResponse(lastFailure);
      }

      const responseHeaders = new Headers();
      const contentType = upstreamResponse.headers.get("content-type");
      if (contentType) {
        responseHeaders.set("content-type", contentType);
      }
      responseHeaders.set("x-ocr-proxy", "coptic-compass");

      const responseBody = await upstreamResponse.arrayBuffer();
      return new Response(responseBody, {
        status: upstreamResponse.status,
        headers: responseHeaders,
      });
    }

    console.error("OCR upstream rejected all upload field candidates", {
      uploadFieldCandidates,
    });
    return createOcrErrorResponse(
      sawUploadFieldRejection
        ? { code: "external_service_unavailable", status: 502 }
        : lastFailure,
    );
  } catch (error) {
    console.error("OCR API failed:", error);
    return createOcrErrorResponse({
      code: "external_service_unavailable",
      status: 500,
    });
  }
}
