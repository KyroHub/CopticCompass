import { jsonErrorResponse } from "@/lib/errors";
import {
  consumeOcrRateLimit,
  getOcrContentLengthFailure,
  getOcrUploadSizeFailure,
  getRetryAfterSeconds,
} from "@/lib/server/ocrProtection";
import {
  buildOcrTargetUrl,
  collectForwardableOcrTextFields,
  getFirstOcrFileEntry,
  getOcrUploadFieldCandidates,
  getOcrUpstreamFailure,
  isUnexpectedOcrUploadFieldError,
  type OcrErrorCode,
} from "@/lib/server/ocrService";

export const runtime = "nodejs";

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

    const fileEntry = getFirstOcrFileEntry(formData);
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

    const targetUrl = buildOcrTargetUrl({
      formData,
      ocrServiceUrl,
      requestUrl: request.url,
    });
    const uploadFieldCandidates = getOcrUploadFieldCandidates(fileEntry.key);
    const passthroughTextFields = collectForwardableOcrTextFields(
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

        if (isUnexpectedOcrUploadFieldError(upstreamErrorText)) {
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
