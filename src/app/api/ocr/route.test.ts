import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = {
  OCR_MAX_UPLOAD_BYTES: process.env.OCR_MAX_UPLOAD_BYTES,
  OCR_SERVICE_URL: process.env.OCR_SERVICE_URL,
  OCR_UPLOAD_FIELD: process.env.OCR_UPLOAD_FIELD,
};

type LoadOcrRouteOptions = {
  hasRateLimitProtection?: boolean;
  ocrServiceUrl?: string | null;
  rateLimitOk?: boolean;
};

function restoreEnv() {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function createOcrUploadRequest(options?: {
  file?: File | null;
  headers?: HeadersInit;
}) {
  const formData = new FormData();

  if (options?.file !== null) {
    formData.set(
      "file",
      options?.file ??
        new File(["fake image bytes"], "sample.png", { type: "image/png" }),
    );
  }

  return new Request("https://www.copticcompass.com/api/ocr?lang=cop", {
    method: "POST",
    body: formData,
    headers: options?.headers,
  });
}

async function loadOcrRoute(options?: LoadOcrRouteOptions) {
  vi.resetModules();

  if (options?.ocrServiceUrl === null) {
    delete process.env.OCR_SERVICE_URL;
  } else {
    process.env.OCR_SERVICE_URL =
      options?.ocrServiceUrl ?? "https://ocr.example/upload";
  }

  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ text: "ⲡⲉ" }), {
      headers: {
        "content-type": "application/json",
      },
      status: 200,
    }),
  );
  const consumeRateLimitMock = vi.fn().mockResolvedValue({
    ok: options?.rateLimitOk ?? true,
    retryAfterMs: 60_000,
  });

  vi.stubGlobal("fetch", fetchMock);
  vi.doMock("@/lib/rateLimit", () => ({
    consumeRateLimit: consumeRateLimitMock,
    getClientRateLimitIdentifier: vi.fn().mockResolvedValue("test-client"),
    hasAvailableRateLimitProtection: vi.fn(
      () => options?.hasRateLimitProtection ?? true,
    ),
  }));

  const mod = await import("./route");

  return {
    ...mod,
    consumeRateLimitMock,
    fetchMock,
  };
}

describe("OCR proxy route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    restoreEnv();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    restoreEnv();
  });

  it("returns public unavailable copy when OCR is not configured", async () => {
    const { fetchMock, POST } = await loadOcrRoute({ ocrServiceUrl: null });

    const response = await POST(
      new Request("https://www.copticcompass.com/api/ocr", {
        method: "POST",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload).toMatchObject({
      success: false,
      code: "external_service_unavailable",
      error: "OCR could not read this image right now. Please try again.",
    });
    expect(payload.requestId).toMatch(/^ocr_/);
    expect(JSON.stringify(payload)).not.toContain("OCR_SERVICE_URL");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns public validation copy for malformed multipart requests", async () => {
    const { fetchMock, POST } = await loadOcrRoute();

    const response = await POST(
      new Request("https://www.copticcompass.com/api/ocr", {
        method: "POST",
        body: "not multipart",
        headers: {
          "content-type": "text/plain",
        },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      success: false,
      code: "validation_failed",
      error: "Please choose a readable image and try again.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps upload limit errors helpful without adding request debug data", async () => {
    const { fetchMock, POST } = await loadOcrRoute();

    const response = await POST(
      createOcrUploadRequest({
        headers: {
          "content-length": String(9 * 1024 * 1024),
        },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(413);
    expect(payload).toEqual({
      success: false,
      code: "validation_failed",
      error: "OCR uploads are limited to 8 MB.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not expose upstream status or text when OCR upstream fails", async () => {
    const { fetchMock, POST } = await loadOcrRoute();
    fetchMock.mockResolvedValueOnce(
      new Response("raw upstream stack trace", {
        status: 500,
        statusText: "Internal Server Error",
      }),
    );

    const response = await POST(createOcrUploadRequest());
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload).toMatchObject({
      success: false,
      code: "external_service_unavailable",
      error: "OCR could not read this image right now. Please try again.",
    });
    expect(payload.requestId).toMatch(/^ocr_/);
    expect(payload).not.toHaveProperty("upstreamStatus");
    expect(JSON.stringify(payload)).not.toContain("raw upstream stack trace");
    expect(JSON.stringify(payload)).not.toContain("500");
  });

  it("sanitizes thrown upstream OCR errors", async () => {
    const { fetchMock, POST } = await loadOcrRoute();
    fetchMock.mockRejectedValueOnce(
      new Error("OCR_SERVICE_URL upstream connection refused"),
    );

    const response = await POST(createOcrUploadRequest());
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload).toMatchObject({
      success: false,
      code: "external_service_unavailable",
      error: "OCR could not read this image right now. Please try again.",
    });
    expect(payload.requestId).toMatch(/^ocr_/);
    expect(JSON.stringify(payload)).not.toContain("OCR_SERVICE_URL");
    expect(JSON.stringify(payload)).not.toContain("connection refused");
  });

  it("hides upload-field retry details when no upstream field is accepted", async () => {
    const { fetchMock, POST } = await loadOcrRoute();
    fetchMock.mockImplementation(
      () =>
        new Response("MulterError: Unexpected field", {
          status: 400,
        }),
    );

    const response = await POST(createOcrUploadRequest());
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload).toMatchObject({
      success: false,
      code: "external_service_unavailable",
      error: "OCR could not read this image right now. Please try again.",
    });
    expect(JSON.stringify(payload)).not.toContain("OCR_UPLOAD_FIELD");
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it("continues proxying successful upstream OCR responses", async () => {
    const { POST } = await loadOcrRoute();

    const response = await POST(createOcrUploadRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get("x-ocr-proxy")).toBe("coptic-compass");
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toEqual({ text: "ⲡⲉ" });
  });
});
