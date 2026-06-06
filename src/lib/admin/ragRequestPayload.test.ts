import { describe, expect, it } from "vitest";

import {
  parseAdminRagIngestForm,
  parseAdminRagJsonSourcesRequest,
  toAdminRagBoolean,
  toAdminRagEmbeddingProvider,
} from "./ragRequestPayload";

describe("admin RAG request payload primitives", () => {
  it("normalizes supported embedding providers and defaults to HF", () => {
    expect(toAdminRagEmbeddingProvider("gemini")).toBe("gemini");
    expect(toAdminRagEmbeddingProvider("openrouter")).toBe("openrouter");
    expect(toAdminRagEmbeddingProvider("hf")).toBe("hf");
    expect(toAdminRagEmbeddingProvider("unknown")).toBe("hf");
    expect(toAdminRagEmbeddingProvider(null)).toBe("hf");
  });

  it("normalizes form checkbox values", () => {
    expect(toAdminRagBoolean("on")).toBe(true);
    expect(toAdminRagBoolean("true")).toBe(true);
    expect(toAdminRagBoolean("false")).toBe(false);
    expect(toAdminRagBoolean(undefined)).toBe(false);
  });

  it("parses an admin RAG ingest form", () => {
    const file = new File(["content"], "source.pdf", {
      type: "application/pdf",
    });
    const formData = new FormData();
    formData.set("ingest_id", " ingest-123 ");
    formData.set("file", file);
    formData.set("source_title", " Source Title ");
    formData.set("enable_ocr", "on");
    formData.set("force_ocr", "true");
    formData.set("embedding_provider", "openrouter");

    expect(parseAdminRagIngestForm(formData, "fallback-id")).toEqual({
      embeddingProvider: "openrouter",
      enableOcr: true,
      file,
      forceOcr: true,
      requestId: "ingest-123",
      sourceTitle: "Source Title",
      success: true,
    });
  });

  it("keeps the legacy pdf file alias and falls back to the file name", () => {
    const file = new File(["content"], "legacy.pdf", {
      type: "application/pdf",
    });
    const formData = new FormData();
    formData.set("pdf", file);

    expect(parseAdminRagIngestForm(formData, "fallback-id")).toEqual({
      embeddingProvider: "hf",
      enableOcr: false,
      file,
      forceOcr: false,
      requestId: "fallback-id",
      sourceTitle: "legacy.pdf",
      success: true,
    });
  });

  it("returns a typed missing-file result", () => {
    const formData = new FormData();
    formData.set("ingest_id", " ingest-123 ");

    expect(parseAdminRagIngestForm(formData, "fallback-id")).toEqual({
      reason: "missing_file",
      requestId: "ingest-123",
      success: false,
    });
  });

  it("parses JSON source ingestion request bodies", () => {
    expect(
      parseAdminRagJsonSourcesRequest(
        {
          embeddingProvider: "gemini",
          ingestId: " json-ingest ",
        },
        "fallback-id",
      ),
    ).toEqual({
      embeddingProvider: "gemini",
      ingestId: "json-ingest",
    });
  });

  it("falls back for invalid JSON source request bodies", () => {
    expect(parseAdminRagJsonSourcesRequest(null, "fallback-id")).toEqual({
      embeddingProvider: "hf",
      ingestId: "fallback-id",
    });
    expect(
      parseAdminRagJsonSourcesRequest(
        { embeddingProvider: "bad", ingestId: "   " },
        "fallback-id",
      ),
    ).toEqual({
      embeddingProvider: "hf",
      ingestId: "fallback-id",
    });
  });
});
