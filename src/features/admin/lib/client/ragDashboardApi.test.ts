import { describe, expect, it, vi } from "vitest";

import type { AdminRagStatusResponse } from "@/lib/admin/ragDashboard";

import {
  createAdminRagFileIngestionRequest,
  getAdminRagLiveLogTargets,
  requestAdminRagBulkJsonIngestion,
  requestAdminRagFileIngestion,
  requestAdminRagLiveLogs,
  requestAdminRagStatus,
} from "./ragDashboardApi";

import type { RagIngestionState } from "../ragIngestionTypes";

const apiMessages = {
  jsonError: "Could not ingest JSON.",
  loadError: "Could not load RAG status.",
  unknownRequestError: "Unknown request error.",
  uploadError: "Could not upload file.",
};

function createJsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    headers: {
      "Content-Type": "application/json",
    },
    status,
  });
}

function createStatusPayload(): AdminRagStatusResponse {
  return {
    chunkCount: 42,
    statuses: {
      dictionaryJsonRag: { healthy: true, label: "Dictionary JSON" },
      embeddingModel: { healthy: true, label: "Embedding model" },
      grammarJsonRag: { healthy: true, label: "Grammar JSON" },
      knowledgeBase: { healthy: true, label: "Knowledge base" },
      llm: { healthy: true, label: "LLM" },
      vectorDb: { healthy: true, label: "Vector database" },
    },
    success: true,
  };
}

describe("admin RAG dashboard client API", () => {
  it("loads and normalizes a successful status response", async () => {
    const payload = createStatusPayload();
    const fetcher = vi.fn(async () => createJsonResponse(payload));

    await expect(
      requestAdminRagStatus({
        fetcher: fetcher as unknown as typeof fetch,
        messages: apiMessages,
      }),
    ).resolves.toEqual({
      error: null,
      status: payload,
    });
    expect(fetcher).toHaveBeenCalledWith("/api/admin/rag/status", {
      cache: "no-store",
      method: "GET",
    });
  });

  it("summarizes malformed status responses for the controller", async () => {
    const fetcher = vi.fn(
      async () => new Response("<h1>Status failed</h1>", { status: 500 }),
    );

    await expect(
      requestAdminRagStatus({
        fetcher: fetcher as unknown as typeof fetch,
        messages: apiMessages,
      }),
    ).resolves.toEqual({
      error: "Status failed",
      status: null,
    });
  });

  it("collects live log targets for active file and bulk requests", () => {
    expect(
      getAdminRagLiveLogTargets({
        activeBulkIngestId: "bulk-1",
        activeIngestId: "file-1",
        bulkJsonPending: true,
        isPending: true,
      }),
    ).toEqual([
      { ingestId: "file-1", prefix: false },
      { ingestId: "bulk-1", prefix: true },
    ]);
  });

  it("loads live logs and ignores failed log targets", async () => {
    const log = {
      message: "Chunked source text",
      timestamp: "2026-01-02T03:04:05.000Z",
    };
    const fetcher = vi.fn(async (input: RequestInfo | URL) =>
      String(input).includes("file-1")
        ? createJsonResponse({ logs: [log], success: true })
        : new Response("{}", { status: 500 }),
    );

    await expect(
      requestAdminRagLiveLogs({
        fetcher: fetcher as unknown as typeof fetch,
        targets: [
          { ingestId: "file-1", prefix: false },
          { ingestId: "bulk-1", prefix: true },
        ],
      }),
    ).resolves.toEqual([log]);
    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "/api/admin/rag/logs?ingestId=file-1&prefix=0",
      {
        cache: "no-store",
        method: "GET",
      },
    );
  });

  it("posts bulk JSON ingestion requests and marks successful runs refreshable", async () => {
    const payload = {
      chunksInserted: 12,
      embeddingProvider: "gemini",
      filesDiscovered: 2,
      filesFailed: 0,
      filesSucceeded: 2,
      ingestId: "bulk-1",
      message: "JSON sources ingested.",
      success: true,
    };
    const fetcher = vi.fn(async () => createJsonResponse(payload));

    await expect(
      requestAdminRagBulkJsonIngestion({
        embeddingProvider: "gemini",
        fetcher: fetcher as unknown as typeof fetch,
        ingestId: "bulk-1",
        messages: apiMessages,
      }),
    ).resolves.toEqual({
      shouldRefreshStatus: true,
      state: payload,
    });
    expect(fetcher).toHaveBeenCalledWith("/api/admin/rag/ingest-json-sources", {
      body: JSON.stringify({
        embeddingProvider: "gemini",
        ingestId: "bulk-1",
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  });

  it("builds a bulk JSON error state when the route returns non-json text", async () => {
    const fetcher = vi.fn(
      async () => new Response("<p>Bulk ingest failed</p>", { status: 500 }),
    );

    await expect(
      requestAdminRagBulkJsonIngestion({
        embeddingProvider: "openrouter",
        fetcher: fetcher as unknown as typeof fetch,
        ingestId: "bulk-2",
        messages: apiMessages,
      }),
    ).resolves.toEqual({
      shouldRefreshStatus: false,
      state: {
        chunksInserted: 0,
        embeddingProvider: "openrouter",
        error: "Bulk ingest failed",
        filesDiscovered: 0,
        filesFailed: 0,
        filesSucceeded: 0,
        ingestId: "bulk-2",
        message: apiMessages.jsonError,
        success: false,
      },
    });
  });

  it("creates multipart file ingestion requests without mutating the source form data", () => {
    const source = new FormData();
    source.set("embedding_provider", "openrouter");

    const request = createAdminRagFileIngestionRequest(source, "file-1");

    expect(request.selectedProvider).toBe("openrouter");
    expect(request.formData.get("embedding_provider")).toBe("openrouter");
    expect(request.formData.get("ingest_id")).toBe("file-1");
    expect(source.get("ingest_id")).toBeNull();
  });

  it("posts file ingestion requests and normalizes successful responses", async () => {
    const formData = new FormData();
    const payload: RagIngestionState = {
      chunksInserted: 5,
      embeddingProvider: "hf",
      ingestId: "file-1",
      message: "File ingested.",
      ocrUsed: true,
      sourceName: "lexicon.pdf",
      success: true,
    };
    const fetcher = vi.fn(async () => createJsonResponse(payload));

    await expect(
      requestAdminRagFileIngestion({
        fetcher: fetcher as unknown as typeof fetch,
        formData,
        ingestId: "file-1",
        messages: apiMessages,
      }),
    ).resolves.toEqual({
      shouldRefreshStatus: true,
      state: payload,
    });
    expect(fetcher).toHaveBeenCalledWith("/api/admin/rag/ingest", {
      body: formData,
      method: "POST",
    });
  });

  it("summarizes malformed file ingestion responses with the active ingest id", async () => {
    const fetcher = vi.fn(
      async () => new Response("<p>Upload failed</p>", { status: 500 }),
    );

    await expect(
      requestAdminRagFileIngestion({
        fetcher: fetcher as unknown as typeof fetch,
        formData: new FormData(),
        ingestId: "file-2",
        messages: apiMessages,
      }),
    ).resolves.toEqual({
      shouldRefreshStatus: false,
      state: {
        error: "Upload failed",
        ingestId: "file-2",
        success: false,
      },
    });
  });
});
