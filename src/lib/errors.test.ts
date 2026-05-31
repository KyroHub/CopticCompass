import { describe, expect, it } from "vitest";

import {
  getPublicErrorMessage,
  getPublicErrorPayload,
  isAppErrorCode,
  jsonErrorResponse,
  toPublicError,
} from "./errors";
import { getPublicOcrErrorMessage } from "./ocrErrors";

describe("public error helpers", () => {
  it("returns context-specific copy when available", () => {
    expect(getPublicErrorMessage("unexpected", "en", "pdf")).toBe(
      "We could not create the PDF right now. Please try again.",
    );
  });

  it("falls back to default localized copy", () => {
    expect(getPublicErrorMessage("permission_denied", "nl", "profile")).toBe(
      "U hebt geen toestemming om dat te doen.",
    );
  });

  it("builds public payloads without technical details", () => {
    expect(
      getPublicErrorPayload({
        code: "external_service_unavailable",
        context: "shenute",
        requestId: "shenute_123",
      }),
    ).toEqual({
      success: false,
      code: "external_service_unavailable",
      error:
        "Shenute is having trouble answering right now. Please try again in a moment.",
      requestId: "shenute_123",
    });
  });

  it("maps thrown errors to public copy without leaking raw messages", () => {
    const payload = toPublicError(
      new Error("OCR_SERVICE_URL is missing from the server environment."),
      {
        context: "ocr",
        fallbackCode: "external_service_unavailable",
        requestId: "ocr_test",
      },
    );

    expect(payload).toEqual({
      success: false,
      code: "external_service_unavailable",
      error: "OCR could not read this image right now. Please try again.",
      requestId: "ocr_test",
    });
    expect(JSON.stringify(payload)).not.toContain("OCR_SERVICE_URL");
  });

  it("keeps known app error codes while replacing raw text", () => {
    const payload = toPublicError(
      {
        code: "rate_limited",
        message: "Upstream returned 429 with provider debug data.",
      },
      {
        context: "shenute",
      },
    );

    expect(payload).toEqual({
      success: false,
      code: "rate_limited",
      error: "Shenute is busy right now. Please wait a moment and try again.",
    });
    expect(JSON.stringify(payload)).not.toContain("provider debug data");
  });

  it("builds JSON error responses with cache and request-id guardrails", async () => {
    const response = jsonErrorResponse({
      context: "feedback",
      error: new Error("relation chat_feedback_events does not exist"),
      fallbackCode: "storage_unavailable",
      requestIdPrefix: "feedback",
      status: 503,
    });
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(payload).toMatchObject({
      success: false,
      code: "storage_unavailable",
      error: "Feedback is temporarily unavailable. Please try again later.",
    });
    expect(payload.requestId).toMatch(/^feedback_/);
    expect(JSON.stringify(payload)).not.toContain("chat_feedback_events");
  });

  it("recognizes only supported app error codes", () => {
    expect(isAppErrorCode("rate_limited")).toBe(true);
    expect(isAppErrorCode("database exploded")).toBe(false);
  });

  it("localizes OCR errors without exposing configuration details", () => {
    expect(
      getPublicOcrErrorMessage(
        new Error("OCR_SERVICE_URL is not configured."),
        "nl",
      ),
    ).toBe("OCR kon deze afbeelding nu niet lezen. Probeer het opnieuw.");
    expect(
      getPublicOcrErrorMessage(new Error("No valid file uploaded."), "en"),
    ).toBe("Please choose a readable image and try again.");
    expect(
      getPublicOcrErrorMessage(
        new Error("OCR uploads are limited to 8 MB."),
        "nl",
      ),
    ).toBe("OCR-uploads zijn beperkt tot 8 MB.");
  });
});
