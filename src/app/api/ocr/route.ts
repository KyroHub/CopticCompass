import { NextResponse } from "next/server";

export const runtime = "nodejs";

const OCR_UPLOAD_FIELD_FALLBACKS = [
  "file",
  "image",
  "upload",
  "document",
  "photo",
  "files",
];

function getUploadFieldCandidates(incomingFieldName: string) {
  const preferred = process.env.OCR_UPLOAD_FIELD?.trim();
  const candidates = [preferred, incomingFieldName, ...OCR_UPLOAD_FIELD_FALLBACKS].filter(
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

function buildTargetUrl(requestUrl: string, ocrServiceUrl: string, formData: FormData) {
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

function collectForwardableTextFields(formData: FormData, excludedKeys: Set<string>) {
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
  const ocrServiceUrl = process.env.OCR_SERVICE_URL;
  if (!ocrServiceUrl) {
    return NextResponse.json(
      {
        success: false,
        error: "OCR_SERVICE_URL is not configured.",
      },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Expected multipart/form-data payload.",
      },
      { status: 400 },
    );
  }

  const fileEntry = getFirstFileEntry(formData);
  if (!fileEntry) {
    return NextResponse.json(
      {
        success: false,
        error: "No file found in multipart request.",
      },
      { status: 400 },
    );
  }

  const targetUrl = buildTargetUrl(request.url, ocrServiceUrl, formData);
  const uploadFieldCandidates = getUploadFieldCandidates(fileEntry.key);
  const passthroughTextFields = collectForwardableTextFields(
    formData,
    new Set<string>([fileEntry.key, "lang"]),
  );

  let lastFailureMessage = "OCR upstream request failed.";

  for (const uploadField of uploadFieldCandidates) {
    const upstreamFormData = new FormData();
    upstreamFormData.append(uploadField, fileEntry.file, fileEntry.file.name);

    for (const field of passthroughTextFields) {
      upstreamFormData.append(field.key, field.value);
    }

    const upstreamResponse = await fetch(targetUrl.toString(), {
      method: "POST",
      body: upstreamFormData,
    });

    if (!upstreamResponse.ok) {
      const upstreamErrorText = await upstreamResponse.text();
      lastFailureMessage = `OCR upstream failed: ${upstreamResponse.status} - ${upstreamErrorText}`;

      if (isUnexpectedFieldErrorMessage(upstreamErrorText)) {
        continue;
      }

      return NextResponse.json(
        {
          success: false,
          error: lastFailureMessage,
          upstreamStatus: upstreamResponse.status,
        },
        { status: upstreamResponse.status >= 400 && upstreamResponse.status < 600 ? upstreamResponse.status : 502 },
      );
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

  return NextResponse.json(
    {
      success: false,
      error: `${lastFailureMessage} Tried upload fields: ${uploadFieldCandidates.join(", ")}. Set OCR_UPLOAD_FIELD in environment to match the OCR backend.`,
    },
    { status: 502 },
  );
}
