import { describe, expect, it } from "vitest";

import {
  buildAdminRagErrorResponse,
  buildAdminRagFileIngestionResponse,
  buildAdminRagIngestionAccessFailureResponses,
  buildAdminRagJsonSourceEmptyFileResult,
  buildAdminRagJsonSourceErrorResult,
  buildAdminRagJsonSourceIngestionResult,
  buildAdminRagJsonSourcesIngestionResponse,
  buildAdminRagLogsAccessFailureResponses,
  buildAdminRagLogsSuccessResponse,
  getAdminRagErrorMessage,
  parseAdminRagLogsQuery,
} from "./ragIngestionRouteResponses";

describe("admin RAG ingestion route response helpers", () => {
  it("wraps route error payloads with status metadata", () => {
    expect(
      buildAdminRagErrorResponse(
        {
          success: false,
          error: "Only admins can ingest RAG documents.",
        },
        403,
      ),
    ).toEqual({
      init: { status: 403 },
      payload: {
        success: false,
        error: "Only admins can ingest RAG documents.",
      },
    });
  });

  it("builds shared file-ingestion access failure payloads", () => {
    expect(buildAdminRagIngestionAccessFailureResponses()).toEqual({
      runtimeUnavailable: {
        init: { status: 503 },
        payload: {
          success: false,
          error: "RAG ingestion is unavailable right now.",
        },
      },
      unauthenticated: {
        init: { status: 401 },
        payload: {
          success: false,
          error: "You must be signed in to ingest files.",
        },
      },
      forbidden: {
        init: { status: 403 },
        payload: {
          success: false,
          error: "Only admins can ingest RAG documents.",
        },
      },
    });
  });

  it("builds shared log-view access failure payloads", () => {
    expect(buildAdminRagLogsAccessFailureResponses()).toEqual({
      runtimeUnavailable: {
        init: { status: 503 },
        payload: {
          success: false,
          error: "RAG ingestion logs are unavailable right now.",
        },
      },
      unauthenticated: {
        init: { status: 401 },
        payload: {
          success: false,
          error: "You must be signed in to view RAG logs.",
        },
      },
      forbidden: {
        init: { status: 403 },
        payload: {
          success: false,
          error: "Only admins can view RAG logs.",
        },
      },
    });
  });

  it("parses RAG logs query parameters", () => {
    expect(
      parseAdminRagLogsQuery(
        "https://example.test/api/admin/rag/logs?ingestId=%20file-1%20&prefix=1",
      ),
    ).toEqual({
      success: true,
      ingestId: "file-1",
      prefix: true,
    });
    expect(
      parseAdminRagLogsQuery(
        "https://example.test/api/admin/rag/logs?ingestId=file-1&prefix=0",
      ),
    ).toEqual({
      success: true,
      ingestId: "file-1",
      prefix: false,
    });
  });

  it("builds the missing-ingest-id logs query response", () => {
    expect(
      parseAdminRagLogsQuery("https://example.test/api/admin/rag/logs"),
    ).toEqual({
      success: false,
      response: {
        init: { status: 400 },
        payload: {
          success: false,
          error: "Missing ingestId query parameter.",
        },
      },
    });
  });

  it("builds successful logs response payloads", () => {
    const logs = [
      {
        message: "Started ingestion",
        timestamp: "2026-01-02T03:04:05.000Z",
      },
    ];

    expect(
      buildAdminRagLogsSuccessResponse({
        ingestId: "file-1",
        prefix: false,
        logs,
      }),
    ).toEqual({
      payload: {
        success: true,
        ingestId: "file-1",
        prefix: false,
        logs,
      },
    });
  });

  it("adds request metadata to successful file ingestion results", () => {
    expect(
      buildAdminRagFileIngestionResponse({
        embeddingProvider: "hf",
        ingestId: "file-1",
        result: {
          success: true,
          chunksInserted: 5,
          message: "Ingested 5 chunks.",
          sourceName: "lexicon.pdf",
        },
      }),
    ).toEqual({
      payload: {
        success: true,
        chunksInserted: 5,
        embeddingProvider: "hf",
        ingestId: "file-1",
        message: "Ingested 5 chunks.",
        sourceName: "lexicon.pdf",
      },
    });
  });

  it("marks failed file ingestion responses as bad requests", () => {
    expect(
      buildAdminRagFileIngestionResponse({
        embeddingProvider: "openrouter",
        ingestId: "file-2",
        result: {
          success: false,
          error: "Could not extract enough text.",
        },
      }),
    ).toEqual({
      init: { status: 400 },
      payload: {
        success: false,
        embeddingProvider: "openrouter",
        error: "Could not extract enough text.",
        ingestId: "file-2",
      },
    });
  });

  it("builds per-source JSON ingestion results", () => {
    const logs = [
      {
        message: "Inserted chunks",
        timestamp: "2026-01-02T03:04:05.000Z",
      },
    ];

    expect(buildAdminRagJsonSourceEmptyFileResult("empty.json")).toEqual({
      success: false,
      sourcePath: "empty.json",
      error: "File is empty.",
    });
    expect(
      buildAdminRagJsonSourceIngestionResult({
        sourcePath: "dictionary.json",
        result: {
          success: true,
          chunksInserted: 12,
          logs,
        },
      }),
    ).toEqual({
      success: true,
      chunksInserted: 12,
      logs,
      sourcePath: "dictionary.json",
    });
    expect(
      buildAdminRagJsonSourceIngestionResult({
        sourcePath: "grammar.json",
        result: {
          success: false,
          logs,
        },
      }),
    ).toEqual({
      success: false,
      error: "Ingestion failed for this source file.",
      logs,
      sourcePath: "grammar.json",
    });
  });

  it("normalizes unknown JSON source ingestion errors", () => {
    expect(
      buildAdminRagJsonSourceErrorResult({
        error: new Error("Read failed"),
        sourcePath: "dictionary.json",
      }),
    ).toEqual({
      success: false,
      error: "Read failed",
      sourcePath: "dictionary.json",
    });
    expect(getAdminRagErrorMessage("bad value", "Fallback message")).toBe(
      "Fallback message",
    );
  });

  it("summarizes mixed bulk JSON source ingestion responses", () => {
    expect(
      buildAdminRagJsonSourcesIngestionResponse({
        chunksInserted: 8,
        embeddingProvider: "gemini",
        filesDiscovered: 2,
        ingestId: "bulk-1",
        results: [
          {
            success: true,
            chunksInserted: 8,
            sourcePath: "dictionary.json",
          },
          {
            success: false,
            error: "File is empty.",
            sourcePath: "grammar.json",
          },
        ],
      }),
    ).toEqual({
      payload: {
        success: true,
        chunksInserted: 8,
        embeddingProvider: "gemini",
        filesDiscovered: 2,
        filesFailed: 1,
        filesSucceeded: 1,
        ingestId: "bulk-1",
        message: "Ingested 8 chunks from 1/2 JSON sources. 1 failed.",
        results: [
          {
            success: true,
            chunksInserted: 8,
            sourcePath: "dictionary.json",
          },
          {
            success: false,
            error: "File is empty.",
            sourcePath: "grammar.json",
          },
        ],
      },
    });
  });

  it("marks all-failed bulk JSON source ingestions as server errors", () => {
    expect(
      buildAdminRagJsonSourcesIngestionResponse({
        chunksInserted: 0,
        embeddingProvider: "hf",
        filesDiscovered: 1,
        ingestId: "bulk-2",
        results: [
          {
            success: false,
            error: "File is empty.",
            sourcePath: "dictionary.json",
          },
        ],
      }),
    ).toMatchObject({
      init: { status: 500 },
      payload: {
        success: false,
        filesFailed: 1,
        filesSucceeded: 0,
        message: "Ingested 0 chunks from 0/1 JSON sources. 1 failed.",
      },
    });
  });
});
