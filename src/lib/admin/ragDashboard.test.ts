import { describe, expect, it } from "vitest";

import {
  buildAdminRagBulkJsonErrorState,
  collectAdminRagBulkLogs,
  collectAdminRagDashboardLogs,
  formatAdminRagLogTimestamp,
  formatAdminRagNumber,
  getAdminRagEmbeddingProviderLabel,
  getFailedAdminRagBulkJsonResults,
  type AdminRagBulkJsonIngestionResponse,
} from "./ragDashboard";

describe("admin RAG dashboard primitives", () => {
  it("formats numbers with the active public locale", () => {
    expect(formatAdminRagNumber(1234567, "en")).toBe("1,234,567");
    expect(formatAdminRagNumber(1234567, "nl")).toBe("1.234.567");
  });

  it("formats valid log timestamps and preserves invalid values", () => {
    expect(formatAdminRagLogTimestamp("not-a-date", "en")).toBe("not-a-date");
    expect(
      formatAdminRagLogTimestamp("2026-01-02T03:04:05.000Z", "en"),
    ).toMatch(/\d/);
  });

  it("labels embedding providers for dashboard display", () => {
    expect(getAdminRagEmbeddingProviderLabel("gemini")).toBe("Gemini");
    expect(getAdminRagEmbeddingProviderLabel("openrouter")).toBe("OpenRouter");
    expect(getAdminRagEmbeddingProviderLabel("hf")).toBe("Hugging Face");
    expect(getAdminRagEmbeddingProviderLabel(undefined)).toBe("Hugging Face");
  });

  it("collects bulk JSON logs with their source path", () => {
    const state: AdminRagBulkJsonIngestionResponse = {
      chunksInserted: 2,
      embeddingProvider: "hf",
      filesDiscovered: 1,
      filesFailed: 0,
      filesSucceeded: 1,
      ingestId: "bulk-1",
      message: "ok",
      results: [
        {
          chunksInserted: 2,
          logs: [
            {
              message: "Inserted chunks",
              timestamp: "2026-01-02T03:04:05.000Z",
            },
          ],
          sourcePath: "JSON Source: data/dictionary.json",
          success: true,
        },
      ],
      success: true,
    };

    expect(collectAdminRagBulkLogs(state)).toEqual([
      {
        message: "Inserted chunks",
        sourcePath: "JSON Source: data/dictionary.json",
        timestamp: "2026-01-02T03:04:05.000Z",
      },
    ]);
  });

  it("dedupes dashboard logs and sorts valid timestamps", () => {
    const duplicate = {
      message: "started",
      timestamp: "2026-01-02T03:04:05.000Z",
    };

    expect(
      collectAdminRagDashboardLogs(
        [duplicate],
        [
          {
            message: "later",
            timestamp: "2026-01-02T03:04:06.000Z",
          },
        ],
        [duplicate],
      ),
    ).toEqual([
      duplicate,
      {
        message: "later",
        timestamp: "2026-01-02T03:04:06.000Z",
      },
    ]);
  });

  it("returns failed bulk JSON source results", () => {
    const state: AdminRagBulkJsonIngestionResponse = {
      chunksInserted: 0,
      embeddingProvider: "gemini",
      filesDiscovered: 2,
      filesFailed: 1,
      filesSucceeded: 1,
      ingestId: "bulk-1",
      message: "partial",
      results: [
        { sourcePath: "ok.json", success: true },
        { error: "empty", sourcePath: "empty.json", success: false },
      ],
      success: true,
    };

    expect(getFailedAdminRagBulkJsonResults(state)).toEqual([
      { error: "empty", sourcePath: "empty.json", success: false },
    ]);
  });

  it("builds a normalized bulk JSON error state", () => {
    expect(
      buildAdminRagBulkJsonErrorState({
        embeddingProvider: "openrouter",
        error: "Could not parse response",
        ingestId: "bulk-1",
        message: "Could not ingest JSON.",
      }),
    ).toEqual({
      chunksInserted: 0,
      embeddingProvider: "openrouter",
      error: "Could not parse response",
      filesDiscovered: 0,
      filesFailed: 0,
      filesSucceeded: 0,
      ingestId: "bulk-1",
      message: "Could not ingest JSON.",
      success: false,
    });
  });
});
