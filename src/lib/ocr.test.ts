import { describe, expect, it } from "vitest";

import {
  buildOcrTargetUrl,
  buildOcrUploadFieldCandidates,
  collectForwardableOcrTextFields,
  extractOcrText,
  getFirstMatchingOcrFile,
  getFirstOcrFileEntry,
  getOcrUpstreamFailure,
  isUnexpectedOcrUploadFieldError,
} from "@/lib/ocr";

describe("OCR primitives", () => {
  it("orders upload field candidates from configured to fallback names", () => {
    expect(
      buildOcrUploadFieldCandidates({
        incomingFieldName: "file",
        preferredUploadField: "image",
      }),
    ).toEqual(["image", "file", "upload", "document", "photo", "files"]);
  });

  it("extracts normalized text from nested OCR payloads", () => {
    expect(
      extractOcrText({
        metadata: { ignored: 1 },
        result: {
          data: "<p> ⲡⲉϫⲉ&nbsp;ⲓⲏⲥⲟⲩⲥ </p>",
        },
      }),
    ).toBe("ⲡⲉϫⲉ ⲓⲏⲥⲟⲩⲥ");
  });

  it("builds OCR target URLs with request or form language overrides", () => {
    const formData = new FormData();
    formData.set("lang", "sahidic");

    expect(
      buildOcrTargetUrl({
        baseUrl: "https://ocr.example/run",
        formData,
        requestUrl: "https://site.example/api/ocr?lang=bohairic",
      }).toString(),
    ).toBe("https://ocr.example/run?lang=bohairic");
  });

  it("maps upstream statuses to public OCR failures", () => {
    expect(getOcrUpstreamFailure(429)).toEqual({
      code: "rate_limited",
      status: 429,
    });
    expect(getOcrUpstreamFailure(413)).toEqual({
      code: "validation_failed",
      status: 413,
    });
    expect(getOcrUpstreamFailure(500)).toEqual({
      code: "external_service_unavailable",
      status: 502,
    });
  });

  it("finds form files and forwardable text fields without reading request state", () => {
    const formData = new FormData();
    const file = new File(["image"], "scan.png", { type: "image/png" });
    formData.set("file", file);
    formData.set("note", "forward me");

    expect(getFirstMatchingOcrFile(formData, ["image", "file"])).toBe(file);
    expect(getFirstOcrFileEntry(formData)).toEqual({ key: "file", file });
    expect(
      collectForwardableOcrTextFields(
        formData,
        new Set<string>(["file"]),
        new Set<string>(["note"]),
      ),
    ).toEqual([{ key: "note", value: "forward me" }]);
  });

  it("detects retryable upload-field rejections", () => {
    expect(
      isUnexpectedOcrUploadFieldError("MulterError: Unexpected field"),
    ).toBe(true);
    expect(isUnexpectedOcrUploadFieldError("plain validation failure")).toBe(
      false,
    );
  });
});
